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
import logging

logger = logging.getLogger(__name__)

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
            address=user_data.address,
            is_verified=False,  # initially not verified
            is_active=True
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
            # Always generate random 6-digit code for security
            code = "".join(secrets.choice(string.digits) for _ in range(6))
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
            phone=current_user.get("phone"),
            address=current_user.get("address"),
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
async def request_verification_code(
    request: Request, 
    background_tasks: BackgroundTasks, 
    payload: VerificationRequest, 
    db: Session = Depends(get_db)
):
    """
    Request an email verification code for a registered user.
    
    This endpoint:
    1. Validates that the user exists
    2. Checks if the user is already verified
    3. Generates a 6-digit verification code
    4. Stores it in Redis with TTL
    5. Sends the code via email
    """
    try:
        # Check if user exists
        user = get_user_by_email(db, payload.email)
        if not user:
            log_security_event("verification_request_failed", {"email": payload.email, "reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User not found. Please register first."
            )
        
        # Check if already verified
        if user.get("is_verified"):
            log_security_event("verification_request_failed", {"email": payload.email, "reason": "already_verified"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="User already verified"
            )
        
        # Generate verification code
        ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)  # Default 10 minutes
        # Always generate random 6-digit code for security
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        
        # Store code in Redis with TTL
        key = f"verify:code:{payload.email.lower()}"
        redis_service.set(key, {"code": code, "email": payload.email.lower()}, expire=ttl)
        
        # Send email asynchronously
        background_tasks.add_task(send_verification_email_async, payload.email, code)
        
        # Log security event
        log_security_event("verification_code_sent", {"email": payload.email})
        
        # Return response (never include code in production for security)
        response_data = {"ttl_seconds": ttl}
        # Only include debug code if explicitly enabled via environment variable
        if getattr(settings, "VERIFICATION_DEBUG_CODE", False):
            response_data["debug_code"] = code
            logger.warning(f"DEBUG MODE: Verification code for {payload.email} is {code}")
        
        return SuccessResponse(
            message="Verification code sent to your email. Please check your inbox and spam folder.",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("verification_request_error", {"email": payload.email, "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code. Please try again later."
        )


@router.post("/verify/confirm",
    response_model=UserResponse,
    summary="Confirm email verification code"
)
@enhanced_limiter.limit(RateLimits.API_WRITE)
async def confirm_verification_code(
    request: Request, 
    payload: VerificationConfirm, 
    db: Session = Depends(get_db)
):
    """
    Confirm email verification by validating the code.
    
    This endpoint:
    1. Validates the verification code from Redis
    2. Marks the user as verified in the database
    3. Deletes the verification code from Redis
    4. Returns the updated user information
    """
    try:
        # Check if user exists
        user = get_user_by_email(db, payload.email)
        if not user:
            log_security_event("verification_confirm_failed", {"email": payload.email, "reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="User not found"
            )
        
        # Check if already verified
        if user.get("is_verified"):
            log_security_event("verification_confirm_failed", {"email": payload.email, "reason": "already_verified"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already verified"
            )
        
        # Validate verification code
        key = f"verify:code:{payload.email.lower()}"
        stored = redis_service.get(key)
        
        if not stored:
            log_security_event("verification_confirm_failed", {"email": payload.email, "reason": "code_not_found"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code not found or expired. Please request a new code."
            )
        
        stored_code = stored.get("code")
        if not stored_code or stored_code != payload.code:
            log_security_event("verification_confirm_failed", {"email": payload.email, "reason": "invalid_code"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check and try again."
            )
        
        # Update user verification status
        db_user = db.query(User).filter(User.user_id == user["user_id"]).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in database"
            )
        
        db_user.is_verified = True
        db.commit()
        db.refresh(db_user)
        
        # Delete verification code from Redis
        redis_service.delete(key)
        
        # Get user roles
        user_roles = db.query(UserRole).filter(UserRole.user_id == db_user.user_id).all()
        roles = [ur.role_key for ur in user_roles]
        
        # Log successful verification
        log_security_event("email_verified", {"email": payload.email, "user_id": str(db_user.user_id)})
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("verification_confirm_error", {"email": payload.email, "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email. Please try again later."
        )
