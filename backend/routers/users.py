from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import timedelta
from uuid import UUID
from pydantic import validator
import logging

from database import get_db
from models.schemas import (
    User, UserCreate, UserUpdate, UserLogin, Token, MessageResponse,
    UserRole, UserRoleCreate, LuRole
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
    """Get user by ID. Admins can view anyone, users can view themselves, reviewers can view users on same projects, and landowners can view reviewers assigned to their projects."""
    user_roles = current_user.get("roles", [])
    is_admin = "administrator" in user_roles
    is_self = str(current_user["user_id"]) == str(user_id)
    is_landowner = "landowner" in user_roles
    
    # Admins and viewing own profile is always allowed
    if not (is_admin or is_self):
        # Check if the requesting user and target user share any projects (for reviewers)
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
        
        # If not shared projects, check if landowner can view reviewers assigned to their projects
        if not shared_result or shared_result.count == 0:
            if is_landowner:
                # Check if the target user is assigned to any tasks on lands owned by the current user
                landowner_reviewer_query = text("""
                    SELECT COUNT(*) as count
                    FROM tasks t
                    JOIN lands l ON t.land_id = l.land_id
                    WHERE l.landowner_id = CAST(:current_user_id AS uuid)
                      AND t.assigned_to = CAST(:target_user_id AS uuid)
                """)
                
                landowner_result = db.execute(landowner_reviewer_query, {
                    "current_user_id": str(current_user["user_id"]),
                    "target_user_id": str(user_id)
                }).fetchone()
                
                if not landowner_result or landowner_result.count == 0:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to view this user's information"
                    )
            else:
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

class UserCreateWithRoles(UserCreate):
    roles: List[str] = []
    confirm_password: Optional[str] = None  # Optional for admin-created users
    
    @validator('confirm_password', always=True)
    def set_confirm_password(cls, v, values):
        # If confirm_password not provided, automatically set it to password
        if v is None and 'password' in values:
            return values['password']
        return v

@router.post("/admin/create", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    user_data: UserCreateWithRoles,
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user with roles (admin only)."""
    try:
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
            "is_active": user_data.is_active if user_data.is_active is not None else True
        }).fetchone()
        
        user_id = result.user_id
        
        # Assign roles if provided
        if user_data.roles:
            for role_key in user_data.roles:
                # Verify role exists
                role_check = text("SELECT role_key FROM lu_roles WHERE role_key = :role_key")
                if not db.execute(role_check, {"role_key": role_key}).fetchone():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid role: {role_key}"
                    )
                
                # Assign role
                role_insert = text("""
                    INSERT INTO user_roles (user_id, role_key)
                    VALUES (:user_id, :role_key)
                    ON CONFLICT (user_id, role_key) DO NOTHING
                """)
                db.execute(role_insert, {
                    "user_id": str(user_id),
                    "role_key": role_key
                })
        
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
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )