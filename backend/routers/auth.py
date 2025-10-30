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
from auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES, get_password_hash
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
        400: {"model": ErrorResponse, "description": "Bad Request"},
        401: {"model": ErrorResponse, "description": "Unauthorized"},
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Utility functions imported from auth.py

# API endpoints
@router.post("/register", 
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email, password, and basic information. Supports multiple user roles including landowner, investor, reviewer, and developer. Rate limited to 3 attempts per minute per IP. Optionally sends verification email.",
    response_description="Successfully created user with assigned roles",
    responses={
        201: {
            "description": "User created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "john.doe@example.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "phone": "+1234567890",
                        "is_active": True,
                        "roles": ["landowner"]
                    }
                }
            }
        },
        400: {
            "description": "Email already registered",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Email already registered",
                        "type": "validation_error"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Validation error",
                        "type": "validation_error",
                        "errors": [
                            {
                                "loc": ["body", "password"],
                                "msg": "Password must contain at least one uppercase letter",
                                "type": "value_error"
                            }
                        ]
                    }
                }
            }
        },
        429: {
            "description": "Rate limit exceeded - too many registration attempts",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Rate limit exceeded. Too many requests.",
                        "type": "rate_limit_error",
                        "retry_after": 60,
                        "limit": "3",
                        "window": "per minute"
                    }
                }
            }
        }
    }
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
        # Check if user already exists
        if get_user_by_email(db, user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            is_verified=False  # User starts unverified
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Ensure provided roles exist and assign them to the user
        try:
            if user_data.roles:
                for role_key in user_data.roles:
                    # Upsert role into lookup if missing (to satisfy FK constraints)
                    role = db.query(LuRole).filter(LuRole.role_key == role_key).first()
                    if not role:
                        role = LuRole(
                            role_key=role_key,
                            role_name=role_key.replace('_', ' ').title(),
                            description=f"Auto-created role for {role_key}"
                        )
                        db.add(role)
                        db.flush()

                    # Assign role to user if not already assigned
                    existing = db.query(UserRole).filter(
                        UserRole.user_id == db_user.user_id,
                        UserRole.role_key == role_key
                    ).first()
                    if not existing:
                        db.add(UserRole(user_id=db_user.user_id, role_key=role_key))
                db.commit()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
        
        # Send verification email if requested
        if send_verification:
            try:
                ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)
                code = "".join(secrets.choice(string.digits) for _ in range(6))
                key = f"verify:code:{user_data.email.lower()}"
                redis_service.set(key, {"code": code}, expire=ttl)
                
                # Add email sending to background tasks
                background_tasks.add_task(send_verification_email_async, user_data.email, code)
                
                try:
                    log_security_event("registration_verification_sent", {"email": user_data.email})
                except Exception:
                    pass
            except Exception as e:
                # Log but don't fail registration
                try:
                    log_security_event("registration_verification_failed", {"email": user_data.email, "error": str(e)})
                except Exception:
                    pass
        
        # Get user roles for response
        user_roles = db.query(UserRole).filter(UserRole.user_id == db_user.user_id).all()
        roles = [ur.role_key for ur in user_roles]
        
        try:
            log_security_event("user_registered", {"email": user_data.email, "roles": roles})
        except Exception:
            pass
        
        return UserResponse(
            user_id=str(db_user.user_id),
            email=db_user.email,
            first_name=db_user.first_name,
            last_name=db_user.last_name,
            phone=db_user.phone,
            is_active=db_user.is_active,
            is_verified=False,
            roles=roles
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Internal server error during user registration: {str(e)}"
        traceback.print_exc()
        try:
            log_security_event("registration_error", {"email": user_data.email, "error": str(e)})
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg
        )

@router.post("/token", 
    response_model=Token,
    summary="Login for access token",
    description="Authenticate user credentials and return JWT access token for API access. Token expires after configured time period. Rate limited to 5 attempts per minute per IP.",
    response_description="JWT access token with user information",
    responses={
        200: {
            "description": "Authentication successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "user": {
                            "user_id": "123e4567-e89b-12d3-a456-426614174000",
                            "email": "john.doe@example.com",
                            "first_name": "John",
                            "last_name": "Doe",
                            "phone": "+1234567890",
                            "is_active": True,
                            "roles": ["landowner"]
                        }
                    }
                }
            }
        },
        401: {
            "description": "Authentication failed",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Incorrect email or password",
                        "type": "authentication_error"
                    }
                }
            }
        },
        422: {
            "description": "Invalid request format",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Invalid request format",
                        "type": "validation_error"
                    }
                }
            }
        },
        429: {
            "description": "Rate limit exceeded - too many login attempts",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Rate limit exceeded. Too many requests.",
                        "type": "rate_limit_error",
                        "retry_after": 60,
                        "limit": "5",
                        "window": "per minute"
                    }
                }
            }
        }
    }
)
@enhanced_limiter.limit(RateLimits.AUTH_LOGIN)
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # If user has no roles, attempt to infer and assign a default based on email pattern
    try:
        roles = user.get("roles") or []
        inferred_role = None
        email_lc = (user.get("email") or "").lower()
        if not roles:
            if email_lc.startswith("admin@"):
                inferred_role = "administrator"
            elif email_lc.startswith("landowner@"):
                inferred_role = "landowner"
            elif email_lc.startswith("investor@"):
                inferred_role = "investor"

        if inferred_role:
            # Ensure role exists in lookup
            role = db.query(LuRole).filter(LuRole.role_key == inferred_role).first()
            if not role:
                role = LuRole(
                    role_key=inferred_role,
                    role_name=inferred_role.replace('_', ' ').title(),
                    description=f"Auto-created role for {inferred_role}"
                )
                db.add(role)
                db.flush()
            # Assign to user if absent
            existing = db.query(UserRole).filter(
                UserRole.user_id == user["user_id"],
                UserRole.role_key == inferred_role
            ).first()
            if not existing:
                db.add(UserRole(user_id=user["user_id"], role_key=inferred_role))
            db.commit()
            # Refresh user with roles
            user = get_user_by_email(db, user["email"]) or user
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["user_id"])}, expires_delta=access_token_expires
    )

    return Token(access_token=access_token, token_type="bearer", user=user)

@router.get("/me", 
    response_model=UserResponse,
    summary="Get current user",
    description="Get the current authenticated user's profile information including roles and account status. Requires valid JWT token in Authorization header. Rate limited to 10 requests per minute per user.",
    response_description="Current user profile information",
    responses={
        200: {
            "description": "User profile retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "john.doe@example.com",
                        "first_name": "John",
                        "last_name": "Doe",
                        "phone": "+1234567890",
                        "is_active": True,
                        "roles": ["landowner", "investor"]
                    }
                }
            }
        },
        401: {
            "description": "Authentication required",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Not authenticated",
                        "type": "authentication_error"
                    }
                }
            }
        },
        403: {
            "description": "Token expired or invalid",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Token has expired",
                        "type": "token_error"
                    }
                }
            }
        },
        429: {
            "description": "Rate limit exceeded - too many requests",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Rate limit exceeded. Too many requests.",
                        "type": "rate_limit_error",
                        "retry_after": 60,
                        "limit": "10",
                        "window": "per minute"
                    }
                }
            }
        }
    }
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user profile"
        )

@router.post("/register-with-verification", 
    response_model=SuccessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register and send verification email",
    description="Register a new user and automatically send a verification email. User must verify email before they can login.",
)
@enhanced_limiter.limit(RateLimits.AUTH_REGISTER)
async def register_with_verification(
    request: Request,
    background_tasks: BackgroundTasks,
    user_data: UserCreate, 
    db: Session = Depends(get_db)
):
    """Register user and automatically send verification code"""
    try:
        # Check if user already exists
        if get_user_by_email(db, user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            password_hash=hashed_password,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            phone=user_data.phone,
            is_verified=False
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Ensure provided roles exist and assign them to the user
        try:
            if user_data.roles:
                for role_key in user_data.roles:
                    # Upsert role into lookup if missing
                    role = db.query(LuRole).filter(LuRole.role_key == role_key).first()
                    if not role:
                        role = LuRole(
                            role_key=role_key,
                            role_name=role_key.replace('_', ' ').title(),
                            description=f"Auto-created role for {role_key}"
                        )
                        db.add(role)
                        db.flush()

                    # Assign role to user if not already
                    existing = db.query(UserRole).filter(
                        UserRole.user_id == db_user.user_id,
                        UserRole.role_key == role_key
                    ).first()
                    if not existing:
                        db.add(UserRole(user_id=db_user.user_id, role_key=role_key))
                db.commit()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
        
        # Generate and send verification code
        ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)
        code = "".join(secrets.choice(string.digits) for _ in range(6))
        key = f"verify:code:{user_data.email.lower()}"
        redis_service.set(key, {"code": code}, expire=ttl)
        
        # Send email in background using FastAPI BackgroundTasks
        try:
            background_tasks.add_task(send_verification_email_async, user_data.email, code)
            log_security_event("user_registered_with_verification", {"email": user_data.email})
        except Exception as e:
            log_security_event("verification_email_failed", {"email": user_data.email, "error": str(e)})
        
        data = {
            "user_id": str(db_user.user_id),
            "email": db_user.email,
            "ttl_seconds": ttl,
            "message": "Please check your email for the verification code"
        }
        
        if getattr(settings, "DEBUG", False):
            data["debug_code"] = code
        
        return SuccessResponse(
            message="Registration successful. Verification code sent to your email.",
            data=data
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            log_security_event("registration_error", {"email": user_data.email, "error": str(e)})
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/verify/request",
    response_model=SuccessResponse,
    summary="Request email verification code",
    description="Generate and send a verification code to the user's email. In development, the code is returned in the response.",
)
@enhanced_limiter.limit(RateLimits.AUTH_REGISTER)
async def request_verification_code(
    request: Request,
    background_tasks: BackgroundTasks,
    payload: VerificationRequest,
    db: Session = Depends(get_db)
):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.get("is_verified"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already verified")

    ttl = getattr(settings, "VERIFICATION_CODE_TTL", 600)
    code = "".join(secrets.choice(string.digits) for _ in range(6))
    key = f"verify:code:{payload.email.lower()}"
    stored = redis_service.set(key, {"code": code}, expire=ttl)

    # Send email in background using FastAPI BackgroundTasks
    email_error = None
    try:
        background_tasks.add_task(send_verification_email_async, payload.email, code)
    except Exception as e:
        email_error = str(e)
        # Log but do not fail the request; users can still see code in dev
        try:
            log_security_event("verification_email_send_failed", {"email": payload.email, "error": str(e)})
        except Exception:
            pass

    try:
        log_security_event("verification_code_requested", {"email": payload.email, "success": bool(stored)})
    except Exception:
        pass

    data = {"ttl_seconds": ttl}
    if getattr(settings, "DEBUG", False):
        data["debug_code"] = code
        if email_error:
            data["email_warning"] = "Email sending queued (may fail in background)"

    return SuccessResponse(message="Verification code sent (check email)", data=data)

@router.post("/verify/confirm",
    response_model=UserResponse,
    summary="Confirm email verification code",
    description="Validate the verification code and mark the user as verified.",
)
@enhanced_limiter.limit(RateLimits.API_WRITE)
async def confirm_verification_code(request: Request, payload: VerificationConfirm, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    key = f"verify:code:{payload.email.lower()}"
    stored = redis_service.get(key)
    if not stored or stored.get("code") != payload.code:
        try:
            log_security_event("verification_code_failed", {"email": payload.email})
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code")

    db_user = db.query(User).filter(User.user_id == user["user_id"]).first()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db_user.is_verified = True
    db.commit()
    db.refresh(db_user)

    redis_service.delete(key)

    user_roles = db.query(UserRole).filter(UserRole.user_id == db_user.user_id).all()
    roles = [ur.role_key for ur in user_roles]

    try:
        log_security_event("user_verified", {"email": payload.email})
    except Exception:
        pass

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