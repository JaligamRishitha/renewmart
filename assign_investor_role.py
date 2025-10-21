#!/usr/bin/env python3
import sys
sys.path.append('backend')

from backend.database import engine
from sqlalchemy import text

def assign_investor_role():
    """Assign investor role to the test user"""
    conn = engine.connect()
    
    try:
        print("Assigning investor role to test user...")
        
        # Get the user ID
        result = conn.execute(text('SELECT user_id FROM "user" WHERE email = :email'), {"email": "testinvestor@example.com"})
        user = result.fetchone()
        
        if not user:
            print("User not found!")
            return
        
        user_id = user[0]
        print(f"Found user ID: {user_id}")
        
        # Assign investor role
        conn.execute(text('''
            INSERT INTO user_roles (user_id, role_key)
            VALUES (:user_id, :role_key)
            ON CONFLICT DO NOTHING
        '''), {
            "user_id": user_id,
            "role_key": "investor"
        })
        
        conn.commit()
        print("Investor role assigned successfully!")
        
        # Verify the role was assigned
        result = conn.execute(text('''
            SELECT ur.role_key 
            FROM user_roles ur 
            WHERE ur.user_id = :user_id
        '''), {"user_id": user_id})
        
        roles = [row[0] for row in result.fetchall()]
        print(f"User roles: {roles}")
        
    except Exception as e:
        print(f"Error assigning role: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    assign_investor_role()

