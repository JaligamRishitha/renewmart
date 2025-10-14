#!/usr/bin/env python3
"""
Create a test user for jaligamrishitha@gmail.com
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database import get_db
from models.users import User, UserRole
from auth import get_password_hash
from sqlalchemy.exc import IntegrityError

def create_test_user():
    """Create test user with email jaligamrishitha@gmail.com"""
    db = next(get_db())
    
    email = "jaligamrishitha@gmail.com"
    password = "Test@123"
    
    try:
        # Check if user already exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"[OK] User already exists: {email}")
            print(f"  User ID: {existing.user_id}")
            print(f"  Name: {existing.first_name} {existing.last_name}")
            
            # Get roles
            roles = db.query(UserRole).filter(UserRole.user_id == existing.user_id).all()
            if roles:
                print(f"  Roles: {[r.role_key for r in roles]}")
            else:
                print(f"  Roles: None")
            
            # Update password
            print(f"\nUpdating password to: {password}")
            existing.password_hash = get_password_hash(password)
            db.commit()
            print("[OK] Password updated successfully!")
            return True
        
        # Create new user
        print(f"Creating new user: {email}")
        hashed_password = get_password_hash(password)
        
        new_user = User(
            email=email,
            password_hash=hashed_password,
            first_name="Rishitha",
            last_name="Jaligam",
            phone="+1234567890",
            is_verified=True,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Add landowner role
        user_role = UserRole(
            user_id=new_user.user_id,
            role_key="landowner"
        )
        db.add(user_role)
        db.commit()
        
        print(f"[OK] User created successfully!")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  Name: Rishitha Jaligam")
        print(f"  Role: landowner")
        print(f"  User ID: {new_user.user_id}")
        
        return True
        
    except IntegrityError as e:
        db.rollback()
        print(f"[ERROR] Error: {str(e)}")
        return False
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("="*60)
    print("Creating Test User")
    print("="*60)
    print()
    
    success = create_test_user()
    
    print()
    print("="*60)
    if success:
        print("[SUCCESS] You can now login with:")
        print("  Email: jaligamrishitha@gmail.com")
        print("  Password: Test@123")
        print("  Role: landowner")
    else:
        print("[FAILED] Check errors above")
    print("="*60)
    
    sys.exit(0 if success else 1)

