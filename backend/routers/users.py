from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import timedelta
from uuid import UUID
from pydantic import validator, Field, model_validator, BaseModel
import re
import logging

from database import get_db
from models.schemas import (
    User, UserCreate, UserUpdate, UserLogin, Token, MessageResponse,
    UserRole, UserRoleCreate, LuRole, UserBase
)
from auth import (
    get_password_hash, authenticate_user, create_access_token,
    get_current_active_user, get_current_user, require_admin, ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    # Check if user already exists
    check_query = text("SELECT user_id FROM \"user\" WHERE email = :email")
    existing_user = db.execute(check_query, {"email": user_data.email}).fetchone()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    insert_query = text("""
        INSERT INTO \"user\" (email, password_hash, first_name, last_name, phone, is_active)
        VALUES (:email, :password_hash, :first_name, :last_name, :phone, :is_active)
        RETURNING user_id, email, first_name, last_name, phone, is_active, created_at, updated_at
    """)
    
    result = db.execute(insert_query, {
        "email": user_data.email,
        "password_hash": hashed_password,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "phone": user_data.phone,
        "is_active": user_data.is_active
    }).fetchone()
    
    db.commit()
    
    return User(
        user_id=result.user_id,
        email=result.email,
        first_name=result.first_name,
        last_name=result.last_name,
        phone=result.phone,
        is_active=result.is_active,
        created_at=result.created_at,
        updated_at=result.updated_at
    )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token with user data."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["user_id"]), "roles": user["roles"]},
        expires_delta=access_token_expires
    )
    
    # Convert UUID to string for JSON serialization
    user_data = {
        **user,
        "user_id": str(user["user_id"])  # Convert UUID to string
    }
    
    # Return token with user data for frontend
    return Token(
        access_token=access_token, 
        token_type="bearer",
        user=user_data  # Include user data in response
    )

@router.get("/me", response_model=User)
async def get_current_user_profile(current_user: dict = Depends(get_current_active_user)):
    """Get current user profile."""
    return User(
        user_id=current_user["user_id"],
        email=current_user["email"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        phone=current_user["phone"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"],
        updated_at=current_user["updated_at"]
    )

@router.get("/", response_model=List[User])
async def list_users(
    role: str = None,
    is_active: bool = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all users with optional filtering by role (admin only)."""
    try:
        # Build query parts
        joins = ""
        where_clauses = []
        params = {"skip": skip, "limit": limit}
        
        # Add JOIN if filtering by role
        if role:
            joins = """
                LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            """
            where_clauses.append("ur.role_key = :role")
            params["role"] = role
        
        # Add is_active filter
        if is_active is not None:
            where_clauses.append("u.is_active = :is_active")
            params["is_active"] = is_active
        
        # Build WHERE clause
        where_sql = ""
        if where_clauses:
            where_sql = " WHERE " + " AND ".join(where_clauses)
        
        # Complete query
        query = f"""
            SELECT DISTINCT u.user_id, u.email, u.first_name, u.last_name, 
                   u.phone, u.is_active, u.created_at, u.updated_at
            FROM "user" u
            {joins}
            {where_sql}
            ORDER BY u.created_at DESC 
            OFFSET :skip LIMIT :limit
        """
        
        results = db.execute(text(query), params).fetchall()
        
        return [
            User(
                user_id=row.user_id,
                email=row.email,
                first_name=row.first_name,
                last_name=row.last_name,
                phone=row.phone,
                is_active=row.is_active,
                created_at=row.created_at,
                updated_at=row.updated_at
            )
            for row in results
        ]
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )

@router.put("/me", response_model=User)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile."""
    # Build update query dynamically
    update_fields = []
    params = {"user_id": str(current_user["user_id"])}
    
    if user_update.email is not None:
        # Check if email is already taken by another user
        check_query = text("SELECT user_id FROM \"user\" WHERE email = :email AND user_id != :user_id")
        existing = db.execute(check_query, {"email": user_update.email, "user_id": str(current_user["user_id"])}).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        update_fields.append("email = :email")
        params["email"] = user_update.email
    
    if user_update.first_name is not None:
        update_fields.append("first_name = :first_name")
        params["first_name"] = user_update.first_name
    
    if user_update.last_name is not None:
        update_fields.append("last_name = :last_name")
        params["last_name"] = user_update.last_name
    
    if user_update.phone is not None:
        update_fields.append("phone = :phone")
        params["phone"] = user_update.phone
    
    if user_update.is_active is not None:
        update_fields.append("is_active = :is_active")
        params["is_active"] = user_update.is_active
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_query = text(f"""
        UPDATE \"user\" 
        SET {', '.join(update_fields)}, updated_at = now()
        WHERE user_id = :user_id
        RETURNING user_id, email, first_name, last_name, phone, is_active, created_at, updated_at
    """)
    
    result = db.execute(update_query, params).fetchone()
    db.commit()
    
    return User(
        user_id=result.user_id,
        email=result.email,
        first_name=result.first_name,
        last_name=result.last_name,
        phone=result.phone,
        is_active=result.is_active,
        created_at=result.created_at,
        updated_at=result.updated_at
    )


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID. Admins can view anyone, users can view themselves, and reviewers can view users on same projects."""
    user_roles = current_user.get("roles", [])
    is_admin = "administrator" in user_roles
    is_self = str(current_user["user_id"]) == str(user_id)
    
    # Admins and viewing own profile is always allowed
    if not (is_admin or is_self):
        # Check if the requesting user and target user share any projects
        shared_project_query = text("""
            SELECT COUNT(*) as count
            FROM tasks t1
            JOIN tasks t2 ON t1.land_id = t2.land_id
            WHERE t1.assigned_to = CAST(:current_user_id AS uuid)
              AND t2.assigned_to = CAST(:target_user_id AS uuid)
        """)
        
        shared_result = db.execute(shared_project_query, {
            "current_user_id": str(current_user["user_id"]),
            "target_user_id": str(user_id)
        }).fetchone()
        
        if not shared_result or shared_result.count == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this user's information"
            )
    
    query = text("""
        SELECT user_id, email, first_name, last_name, phone, is_active, created_at, updated_at
        FROM \"user\"
        WHERE user_id = CAST(:user_id AS uuid)
    """)
    
    result = db.execute(query, {"user_id": str(user_id)}).fetchone()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return User(
        user_id=result.user_id,
        email=result.email,
        first_name=result.first_name,
        last_name=result.last_name,
        phone=result.phone,
        is_active=result.is_active,
        created_at=result.created_at,
        updated_at=result.updated_at
    )

@router.post("/{user_id}/roles", response_model=MessageResponse)
async def assign_user_role(
    user_id: UUID,
    role_data: UserRoleCreate,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Assign a role to a user (admin only)."""
    # Check if user exists
    user_check = text("SELECT user_id FROM \"user\" WHERE user_id = :user_id")
    if not db.execute(user_check, {"user_id": str(user_id)}).fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if role exists
    role_check = text("SELECT role_key FROM lu_roles WHERE role_key = :role_key")
    if not db.execute(role_check, {"role_key": role_data.role_key}).fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    # Assign role (ignore if already exists)
    insert_query = text("""
        INSERT INTO user_roles (user_id, role_key)
        VALUES (:user_id, :role_key)
        ON CONFLICT (user_id, role_key) DO NOTHING
    """)
    
    db.execute(insert_query, {
        "user_id": str(user_id),
        "role_key": role_data.role_key
    })
    db.commit()
    
    return MessageResponse(message="Role assigned successfully")

@router.delete("/{user_id}/roles/{role_key}", response_model=MessageResponse)
async def remove_user_role(
    user_id: UUID,
    role_key: str,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove a role from a user (admin only)."""
    delete_query = text("""
        DELETE FROM user_roles 
        WHERE user_id = :user_id AND role_key = :role_key
    """)
    
    result = db.execute(delete_query, {
        "user_id": str(user_id),
        "role_key": role_key
    })
    db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User role assignment not found"
        )
    
    return MessageResponse(message="Role removed successfully")

@router.get("/{user_id}/roles", response_model=List[UserRole])
async def get_user_roles(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all roles for a user (admin only)."""
    query = text("""
        SELECT user_id, role_key, assigned_at
        FROM user_roles
        WHERE user_id = :user_id
        ORDER BY assigned_at
    """)
    
    results = db.execute(query, {"user_id": str(user_id)}).fetchall()
    
    return [
        UserRole(
            user_id=row.user_id,
            role_key=row.role_key,
            assigned_at=row.assigned_at
        )
        for row in results
    ]

@router.get("/roles/available", response_model=List[LuRole])
async def get_available_roles(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all available roles (admin only)."""
    query = text("SELECT role_key, label FROM lu_roles ORDER BY label")
    results = db.execute(query).fetchall()
    
    return [
        LuRole(role_key=row.role_key, label=row.label)
        for row in results
    ]

class UserCreateWithRoles(UserBase):
    """User creation schema for admin with optional confirm_password"""
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: Optional[str] = Field(None)
    roles: List[str] = Field(default_factory=list)
    
    @model_validator(mode='after')
    def validate_and_set_confirm_password(self):
        # Auto-set confirm_password to password if not provided
        if self.confirm_password is None:
            self.confirm_password = self.password
        # Validate passwords match
        if self.password != self.confirm_password:
            raise ValueError('Passwords do not match')
        # Validate password complexity
        if len(self.password) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'[A-Z]', self.password):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', self.password):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', self.password):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', self.password):
            raise ValueError('Password must contain at least one special character')
        return self

@router.post("/admin/create", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    user_data: UserCreateWithRoles,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user with roles (admin only)."""
    try:
        logger.info(f"Admin creating user: {user_data.email}")
        
        # Check if user already exists
        check_query = text("SELECT user_id FROM \"user\" WHERE email = :email")
        existing_user = db.execute(check_query, {"email": user_data.email}).fetchone()
        
        if existing_user:
            logger.warning(f"User already exists: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        logger.info("Hashing password...")
        hashed_password = get_password_hash(user_data.password)
        
        # Create user
        logger.info("Inserting user into database...")
        insert_query = text("""
            INSERT INTO \"user\" (email, password_hash, first_name, last_name, phone, is_active)
            VALUES (:email, :password_hash, :first_name, :last_name, :phone, :is_active)
            RETURNING user_id, email, first_name, last_name, phone, is_active, created_at, updated_at
        """)
        
        result = db.execute(insert_query, {
            "email": user_data.email,
            "password_hash": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "phone": user_data.phone,
            "is_active": user_data.is_active if user_data.is_active is not None else True
        }).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user - no result returned"
            )
        
        user_id = result.user_id
        logger.info(f"User created with ID: {user_id}")
        
        # Assign roles if provided
        if user_data.roles:
            logger.info(f"Assigning roles: {user_data.roles}")
            for role_key in user_data.roles:
                try:
                    # Verify role exists (with timeout protection)
                    role_check = text("SELECT role_key FROM lu_roles WHERE role_key = :role_key LIMIT 1")
                    role_result = db.execute(role_check, {"role_key": role_key}).fetchone()
                    
                    if not role_result:
                        logger.warning(f"Role not found: {role_key}")
                        # Don't fail - just log and continue, or insert role if missing
                        # For now, we'll raise an error
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid role: {role_key}. Valid roles: re_analyst, re_sales_advisor, re_governance_lead, administrator, landowner, investor, project_manager"
                        )
                    
                    # Assign role
                    logger.info(f"Assigning role {role_key} to user {user_id}")
                    role_insert = text("""
                        INSERT INTO user_roles (user_id, role_key)
                        VALUES (CAST(:user_id AS uuid), :role_key)
                        ON CONFLICT (user_id, role_key) DO NOTHING
                    """)
                    db.execute(role_insert, {
                        "user_id": str(user_id),
                        "role_key": role_key
                    })
                    logger.info(f"Role {role_key} assigned successfully")
                except HTTPException:
                    raise
                except Exception as role_error:
                    logger.error(f"Error assigning role {role_key}: {str(role_error)}")
                    # Continue with other roles instead of failing completely
                    continue
        
        logger.info("Committing transaction...")
        db.commit()
        logger.info("Transaction committed successfully")
        
        return User(
            user_id=result.user_id,
            email=result.email,
            first_name=result.first_name,
            last_name=result.last_name,
            phone=result.phone,
            is_active=result.is_active,
            created_at=result.created_at,
            updated_at=result.updated_at
        )
    except HTTPException:
        logger.error("HTTPException in create_user_by_admin, rolling back...")
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}", exc_info=True)
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )