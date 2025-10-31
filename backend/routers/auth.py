from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
from database import get_db, get_user_by_email
from models.schemas import (
    UserCreate, UserResponse, UserLogin, Token, ErrorResponse, SuccessResponse,
    VerificationRequest, VerificationConfirm
)
from models.users import User, UserRole
from models.lookup_tables import LuRole
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash
)
from pydantic import ValidationError
from rate_limiter import enhanced_limiter, RateLimits
from redis_service import redis_service
from config import settings
import secrets
import string
from logs import log_security_event
from email_service import send_verification_email_async

router = APIRouter(
    tags=["authentication"],
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    }
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# ==========================
# Register User
# ==========================
@router.post("/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (verification optional)"
)
@enhanced_limiter.limit(RateLimits.AUTH_REGISTER)
async def register_user(
    request: Request,
    background_tasks: BackgroundTasks,
    user_data: UserCreate,
    send_verification: bool = False,
    db: Session = Depends(get_db)
):
    try:
        # Check if email already exists
        if get_user_by_email(db, user_data.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Hash password
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            is_verified=False,  # initially not verified
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        # Assign roles
        for role_key in user_data.roles:
            role = db.query(LuRole).filter(LuRole.role_key == role_key).first()
            if role:
                user_role = UserRole(user_id=db_user.user_id, role_key=role_key)
                db.add(user_role)
        db.commit()

        # Optional verification
        if send_verification:
            ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)
            code = "123456" if getattr(settings, "DEBUG", True) else "".join(secrets.choice(string.digits) for _ in range(6))
            key = f"verify:code:{user_data.email.lower()}"
            redis_service.set(key, {"code": code}, expire=ttl)
            background_tasks.add_task(send_verification_email_async, user_data.email, code)
            log_security_event("verification_code_sent", {"email": user_data.email})

        # Prepare response
        user_roles = db.query(UserRole).filter(UserRole.user_id == db_user.user_id).all()
        roles = [ur.role_key for ur in user_roles]

        return UserResponse(
            user_id=str(db_user.user_id),
            email=db_user.email,
            first_name=db_user.first_name,
            last_name=db_user.last_name,
            phone=db_user.phone,
            is_active=db_user.is_active,
            is_verified=db_user.is_verified,
            roles=roles
        )

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Validation error: {str(e)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("registration_error", {"email": user_data.email, "error": str(e)})
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")


# ==========================
# Login (Token)
# ==========================
@router.post("/token",
    response_model=Token,
    summary="Login and get JWT token"
)
@enhanced_limiter.limit(RateLimits.AUTH_LOGIN)
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user["user_id"])}, expires_delta=access_token_expires)

    return Token(access_token=access_token, token_type="bearer", user=user)


# ==========================
# Get Current User
# ==========================
@router.get("/me",
    response_model=UserResponse,
    summary="Get current logged-in user"
)
@enhanced_limiter.limit(RateLimits.AUTH_TOKEN_REFRESH)
async def read_users_me(request: Request, current_user: dict = Depends(get_current_user)):
    try:
        return UserResponse(
            user_id=str(current_user["user_id"]),
            email=current_user["email"],
            first_name=current_user["first_name"],
            last_name=current_user["last_name"],
            phone=current_user["phone"],
            is_active=current_user["is_active"],
            is_verified=current_user.get("is_verified", False),
            roles=current_user["roles"]
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve user profile")


# ==========================
# Verification (Optional)
# ==========================
@router.post("/verify/request",
    response_model=SuccessResponse,
    summary="Request email verification code"
)
@enhanced_limiter.limit(RateLimits.AUTH_REGISTER)
async def request_verification_code(request: Request, background_tasks: BackgroundTasks, payload: VerificationRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.get("is_verified"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already verified")

    ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)
    code = "123456" if getattr(settings, "DEBUG", True) else "".join(secrets.choice(string.digits) for _ in range(6))
    key = f"verify:code:{payload.email.lower()}"
    redis_service.set(key, {"code": code}, expire=ttl)
    background_tasks.add_task(send_verification_email_async, payload.email, code)

    return SuccessResponse(
        message="Verification code sent.",
        data={"ttl_seconds": ttl, "debug_code": code if getattr(settings, "DEBUG", True) else None}
    )


@router.post("/verify/confirm",
    response_model=UserResponse,
    summary="Confirm email verification code"
)
@enhanced_limiter.limit(RateLimits.API_WRITE)
async def confirm_verification_code(request: Request, payload: VerificationConfirm, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    key = f"verify:code:{payload.email.lower()}"
    stored = redis_service.get(key)
    if not stored or stored.get("code") != payload.code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    db_user = db.query(User).filter(User.user_id == user["user_id"]).first()
    db_user.is_verified = True
    db.commit()
    db.refresh(db_user)

    redis_service.delete(key)

    user_roles = db.query(UserRole).filter(UserRole.user_id == db_user.user_id).all()
    roles = [ur.role_key for ur in user_roles]

    return UserResponse(
        user_id=str(db_user.user_id),
        email=db_user.email,
        first_name=db_user.first_name,
        last_name=db_user.last_name,
        phone=db_user.phone,
        is_active=db_user.is_active,
        is_verified=True,
        roles=roles
    )
