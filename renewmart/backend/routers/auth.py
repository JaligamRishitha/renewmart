from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Optional
from database import get_db, get_user_by_email
from models.schemas import (
    UserCreate, UserResponse, UserLogin, Token, ErrorResponse, SuccessResponse,
    VerificationRequest, VerificationConfirm, PasswordResetRequest, PasswordResetVerify, PasswordReset
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
from email_service import send_verification_email_async, send_password_reset_email_async
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
        
        # Check if email was verified before registration (pre-registration verification)
        verify_key = f"verify:code:{user_data.email.lower()}"
        verified_key = f"verify:verified:{user_data.email.lower()}"
        verified_data = redis_service.get(verified_key)
        
        if not verified_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Email verification required. Please verify your email before registering."
            )

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

        # After successful registration, delete the pre-registration verification status
        verified_key = f"verify:verified:{user_data.email.lower()}"
        redis_service.delete(verified_key)

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
    summary="Request email verification code (pre-registration or post-registration)"
)
@enhanced_limiter.limit(RateLimits.AUTH_REGISTER)
async def request_verification_code(
    request: Request, 
    background_tasks: BackgroundTasks, 
    payload: VerificationRequest, 
    pre_register: bool = False,  # New parameter for pre-registration verification
    db: Session = Depends(get_db)
):
    """
    Request an email verification code.
    
    For pre-registration (pre_register=True):
    - Allows verification for emails that don't have accounts yet
    - Checks if email is already registered (prevents duplicate accounts)
    
    For post-registration (pre_register=False):
    - Requires user to exist
    - Checks if user is already verified
    """
    try:
        # Check if user exists
        user = get_user_by_email(db, payload.email)
        
        if pre_register:
            # Pre-registration verification: email should NOT be registered yet
            if user:
                log_security_event("verification_request_failed", {"email": payload.email, "reason": "email_already_registered"})
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail="Email is already registered. Please login instead."
                )
        else:
            # Post-registration verification: user must exist
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
        # Include pre_register flag to distinguish pre-registration verification
        key = f"verify:code:{payload.email.lower()}"
        redis_service.set(key, {
            "code": code, 
            "email": payload.email.lower(),
            "pre_register": pre_register
        }, expire=ttl)
        
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


@router.post("/verify/pre-register/confirm",
    response_model=SuccessResponse,
    summary="Confirm pre-registration email verification code"
)
@enhanced_limiter.limit(RateLimits.API_WRITE)
async def confirm_pre_register_verification_code(
    request: Request, 
    payload: VerificationConfirm, 
    db: Session = Depends(get_db)
):
    """
    Confirm pre-registration email verification by validating the code.
    
    This endpoint:
    1. Validates the verification code from Redis
    2. Stores verification status in Redis (for later use during registration)
    3. Deletes the verification code from Redis
    4. Returns success response
    """
    try:
        # Check if email is already registered
        user = get_user_by_email(db, payload.email)
        if user:
            log_security_event("verification_confirm_failed", {"email": payload.email, "reason": "email_already_registered"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered. Please login instead."
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
        
        # Check if this is a pre-registration verification
        if not stored.get("pre_register", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification code is for post-registration verification. Please use the correct endpoint."
            )
        
        stored_code = stored.get("code")
        if not stored_code or stored_code != payload.code:
            log_security_event("verification_confirm_failed", {"email": payload.email, "reason": "invalid_code"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please check and try again."
            )
        
        # Store verification status in Redis (valid for 1 hour to allow registration)
        verified_key = f"verify:verified:{payload.email.lower()}"
        redis_service.set(verified_key, {
            "email": payload.email.lower(),
            "verified_at": str(datetime.now())
        }, expire=3600)  # 1 hour TTL
        
        # Delete verification code from Redis
        redis_service.delete(key)
        
        # Log successful verification
        log_security_event("pre_register_email_verified", {"email": payload.email})
        
        return SuccessResponse(
            message="Email verified successfully. You can now proceed with registration.",
            data={"email": payload.email}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("pre_register_verification_confirm_error", {"email": payload.email, "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify email. Please try again later."
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
        
        # Check if this is a pre-registration verification (should use pre-register endpoint)
        if stored.get("pre_register", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification code is for pre-registration. Please use the pre-registration confirmation endpoint."
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


# ==========================
# Password Reset
# ==========================
@router.post("/password-reset/request",
    response_model=SuccessResponse,
    summary="Request password reset code"
)
@enhanced_limiter.limit(RateLimits.AUTH_REGISTER)
async def request_password_reset_code(
    request: Request, 
    background_tasks: BackgroundTasks, 
    payload: PasswordResetRequest, 
    db: Session = Depends(get_db)
):
    """
    Request a password reset code via email.
    
    This endpoint:
    1. Checks if user exists
    2. Generates a 6-digit reset code
    3. Stores code in Redis with TTL
    4. Sends code via email
    """
    try:
        # Check if user exists
        user = get_user_by_email(db, payload.email)
        if not user:
            # Don't reveal if email exists for security
            log_security_event("password_reset_request_failed", {"email": payload.email, "reason": "user_not_found"})
            # Return success even if user doesn't exist (security best practice)
            return SuccessResponse(
                message="If an account exists with this email, a password reset code has been sent.",
                data={"ttl_seconds": getattr(settings, "VERIFICATION_CODE_TTL", 600)}
            )
        
        # Generate reset code
        ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)  # Default 10 minutes
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        
        # Store code in Redis with TTL
        key = f"password_reset:code:{payload.email.lower()}"
        redis_service.set(key, {
            "code": code, 
            "email": payload.email.lower(),
            "created_at": str(datetime.now())
        }, expire=ttl)
        
        # Send email asynchronously
        background_tasks.add_task(send_password_reset_email_async, payload.email, code)
        
        # Log security event
        log_security_event("password_reset_code_sent", {"email": payload.email})
        
        # Return response
        response_data = {"ttl_seconds": ttl}
        if getattr(settings, "VERIFICATION_DEBUG_CODE", False):
            response_data["debug_code"] = code
            logger.warning(f"DEBUG MODE: Password reset code for {payload.email} is {code}")
        
        return SuccessResponse(
            message="If an account exists with this email, a password reset code has been sent. Please check your inbox and spam folder.",
            data=response_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("password_reset_request_error", {"email": payload.email, "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset code. Please try again later."
        )


@router.post("/password-reset/verify",
    response_model=SuccessResponse,
    summary="Verify password reset code"
)
@enhanced_limiter.limit(RateLimits.API_WRITE)
async def verify_password_reset_code(
    request: Request, 
    payload: PasswordResetVerify, 
    db: Session = Depends(get_db)
):
    """
    Verify password reset code.
    
    This endpoint:
    1. Validates the reset code from Redis
    2. Stores verification status in Redis (for later use during password reset)
    3. Deletes the reset code from Redis
    4. Returns success response
    """
    try:
        # Check if user exists
        user = get_user_by_email(db, payload.email)
        if not user:
            log_security_event("password_reset_verify_failed", {"email": payload.email, "reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Validate reset code
        key = f"password_reset:code:{payload.email.lower()}"
        stored = redis_service.get(key)
        
        if not stored:
            log_security_event("password_reset_verify_failed", {"email": payload.email, "reason": "code_not_found"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset code not found or expired. Please request a new code."
            )
        
        stored_code = stored.get("code")
        if not stored_code or stored_code != payload.code:
            log_security_event("password_reset_verify_failed", {"email": payload.email, "reason": "invalid_code"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset code. Please check and try again."
            )
        
        # Store verification status in Redis (valid for 15 minutes to allow password reset)
        verified_key = f"password_reset:verified:{payload.email.lower()}"
        redis_service.set(verified_key, {
            "email": payload.email.lower(),
            "verified_at": str(datetime.now())
        }, expire=900)  # 15 minutes TTL
        
        # Delete reset code from Redis
        redis_service.delete(key)
        
        # Log successful verification
        log_security_event("password_reset_code_verified", {"email": payload.email})
        
        return SuccessResponse(
            message="Password reset code verified successfully. You can now set a new password.",
            data={"email": payload.email}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("password_reset_verify_error", {"email": payload.email, "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify password reset code. Please try again later."
        )


@router.post("/password-reset/reset",
    response_model=SuccessResponse,
    summary="Reset password with verified code"
)
@enhanced_limiter.limit(RateLimits.API_WRITE)
async def reset_password(
    request: Request, 
    payload: PasswordReset, 
    db: Session = Depends(get_db)
):
    """
    Reset password using verified reset code.
    
    This endpoint:
    1. Validates that code was verified
    2. Updates user password in database
    3. Deletes verification status from Redis
    4. Returns success response
    """
    try:
        # Check if user exists
        user = get_user_by_email(db, payload.email)
        if not user:
            log_security_event("password_reset_failed", {"email": payload.email, "reason": "user_not_found"})
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if code was verified
        verified_key = f"password_reset:verified:{payload.email.lower()}"
        verified_data = redis_service.get(verified_key)
        
        if not verified_data:
            log_security_event("password_reset_failed", {"email": payload.email, "reason": "not_verified"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset code not verified. Please verify the code first."
            )
        
        # Update user password
        db_user = db.query(User).filter(User.user_id == user["user_id"]).first()
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in database"
            )
        
        # Hash new password
        hashed_password = get_password_hash(payload.new_password)
        db_user.password_hash = hashed_password
        db.commit()
        db.refresh(db_user)
        
        # Delete verification status from Redis
        redis_service.delete(verified_key)
        
        # Log successful password reset
        log_security_event("password_reset_successful", {"email": payload.email, "user_id": str(db_user.user_id)})
        
        return SuccessResponse(
            message="Password reset successfully. You can now login with your new password.",
            data={"email": payload.email}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_security_event("password_reset_error", {"email": payload.email, "error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password. Please try again later."
        )
