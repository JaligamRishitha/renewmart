#!/usr/bin/env python3
"""
Script to reset password for landowner@gmail.com
"""
from database import get_db
from auth import get_password_hash
from sqlalchemy import text

def reset_landowner_password():
    """Reset password hash for landowner@gmail.com"""
    
    # Get database connection
    db = next(get_db())
    
    try:
        # Reset password for landowner@gmail.com
        new_password = "password123"
        landowner_password = get_password_hash(new_password)
        db.execute(text("""
            UPDATE "user" 
            SET password_hash = :password_hash 
            WHERE email = 'landowner@gmail.com'
        """), {"password_hash": landowner_password})
        
        db.commit()
        print(f"SUCCESS: Password reset for landowner@gmail.com!")
        print(f"You can now login with: landowner@gmail.com / {new_password}")
            
    except Exception as e:
        print(f"Error resetting password: {e}")

if __name__ == "__main__":
    reset_landowner_password()