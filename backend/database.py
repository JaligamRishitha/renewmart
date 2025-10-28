from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from config import settings
from typing import Optional, List
from uuid import UUID
import os

# Get database URL with environment variable fallback
# Prefer explicit environment variables to ensure overrides work even without Dynaconf prefix
DATABASE_URL = (
    os.getenv("RENEWMART_DATABASE_URL")
    or os.getenv("DATABASE_URL")
    or settings.DATABASE_URL
)

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    echo=settings.get('DATABASE_ECHO', False),  # Use settings for echo
    pool_size=settings.get('DATABASE_POOL_SIZE', 10),
    max_overflow=settings.get('DATABASE_MAX_OVERFLOW', 20),
    pool_pre_ping=True
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Helper function to reset a database session
def reset_session(db: Session):
    """Reset a database session to a clean state"""
    try:
        db.rollback()
    except Exception:
        pass  # Ignore rollback errors
    try:
        db.close()
    except Exception:
        pass  # Ignore close errors

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        # If there's an exception, ensure the session is properly closed
        try:
            db.rollback()
        except Exception:
            pass  # Ignore rollback errors
        raise e
    finally:
        try:
            db.close()
        except Exception:
            pass  # Ignore close errors

# Helper function to get user by email (for auth compatibility)
def get_user_by_id(db: Session, user_id: str) -> Optional[dict]:
    """Get user by user ID."""
    # Use SQLite-compatible aggregation when running against SQLite
    is_sqlite = DATABASE_URL.lower().startswith("sqlite")
    if is_sqlite:
        query = text(
            """
            SELECT u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                   u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at,
                   GROUP_CONCAT(ur.role_key) AS roles
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            WHERE u.user_id = :user_id
            GROUP BY u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                     u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at
            """
        )
    else:
        query = text(
            """
            SELECT u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                   u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at,
                   STRING_AGG(ur.role_key, ',') AS roles
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            WHERE u.user_id = :user_id
            GROUP BY u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                     u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at
            """
        )
    
    result = db.execute(query, {"user_id": user_id}).fetchone()
    if not result:
        return None
    
    # Convert to dict and parse roles
    user_dict = dict(result._mapping)
    if user_dict.get("roles"):
        user_dict["roles"] = [role.strip() for role in user_dict["roles"].split(",") if role.strip()]
    else:
        user_dict["roles"] = []
    
    return user_dict

def get_user_roles(db: Session, user_id: str) -> List[str]:
    """Get user roles by user ID."""
    query = text("""
        SELECT role_key
        FROM user_roles
        WHERE user_id = :user_id
        ORDER BY assigned_at
    """)
    
    results = db.execute(query, {"user_id": user_id}).fetchall()
    return [row.role_key for row in results]

def get_user_by_email(db: Session, email: str) -> Optional[dict]:
    """Get user by email address."""
    # Use SQLite-compatible aggregation when running against SQLite
    is_sqlite = DATABASE_URL.lower().startswith("sqlite")
    if is_sqlite:
        query = text(
            """
            SELECT u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                   u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at,
                   GROUP_CONCAT(ur.role_key) AS roles
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            WHERE u.email = :email
            GROUP BY u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                     u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at
            """
        )
    else:
        query = text(
            """
            SELECT u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                   u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at,
                   COALESCE(array_agg(ur.role_key) FILTER (WHERE ur.role_key IS NOT NULL), '{}') as roles
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            WHERE u.email = :email
            GROUP BY u.user_id, u.email, u.password_hash, u.first_name, u.last_name,
                     u.phone, u.is_verified, u.is_active, u.created_at, u.updated_at
            """
        )
    
    result = db.execute(query, {"email": email}).fetchone()
    
    if not result:
        return None
    
    return {
        "user_id": result.user_id,
        "email": result.email,
        "password_hash": result.password_hash,
        "first_name": result.first_name,
        "last_name": result.last_name,
        "phone": result.phone,
        "is_verified": result.is_verified,
        "is_active": result.is_active,
        "created_at": result.created_at,
        "updated_at": result.updated_at,
        "roles": result.roles
    }

# Import User model from schemas for compatibility
from models.schemas import User