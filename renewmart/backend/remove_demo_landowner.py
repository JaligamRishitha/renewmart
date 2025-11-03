#!/usr/bin/env python3
"""
Script to remove demo landowner user
"""
from database import get_db
from sqlalchemy import text

def remove_demo_landowner():
    """Remove demo landowner user from database"""
    
    # Get database connection
    db = next(get_db())
    
    try:
        # First remove user roles
        db.execute(text("""
            DELETE FROM user_roles 
            WHERE user_id = (SELECT user_id FROM "user" WHERE email = 'landowner@renewmart.com')
        """))
        
        # Then remove the user
        db.execute(text("""
            DELETE FROM "user" 
            WHERE email = 'landowner@renewmart.com'
        """))
        
        db.commit()
        print("SUCCESS: Demo landowner user has been removed from the database!")
        print("You can now log in with your actual database credentials.")
            
    except Exception as e:
        print(f"Error removing demo landowner: {e}")

if __name__ == "__main__":
    remove_demo_landowner()