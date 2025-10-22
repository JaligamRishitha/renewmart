#!/usr/bin/env python3
"""
Script to reset password hashes for demo users
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
from auth import get_password_hash
from sqlalchemy.orm import Session
from sqlalchemy import text

def reset_passwords():
    """Reset password hashes for demo users"""
    
    # Get database connection
    db = next(get_db())
    
    try:
        # Reset password for landowner
        landowner_password = get_password_hash("password123")
        db.execute(text("""
            UPDATE "user" 
            SET password_hash = :password_hash 
            WHERE email = 'landowner@renewmart.com'
        """), {"password_hash": landowner_password})
        
        # Reset password for admin
        admin_password = get_password_hash("password123")
        db.execute(text("""
            UPDATE "user" 
            SET password_hash = :password_hash 
            WHERE email = 'admin@renewmart.com'
        """), {"password_hash": admin_password})
        
        # Reset password for investor
        investor_password = get_password_hash("password123")
        db.execute(text("""
            UPDATE "user" 
            SET password_hash = :password_hash 
            WHERE email = 'investor@renewmart.com'
        """), {"password_hash": investor_password})
        
        db.commit()
        print("SUCCESS: Password hashes reset for all demo users!")
        print("You can now login with:")
        print("- landowner@renewmart.com / password123")
        print("- admin@renewmart.com / password123")
        print("- investor@renewmart.com / password123")
        
    except Exception as e:
        print(f"ERROR: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_passwords()
