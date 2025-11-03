import sys
import os
from sqlalchemy import text
from passlib.context import CryptContext

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Import database connection
from database import get_db

# Set up password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def main():
    # Connect to database
    db = next(get_db())
    
    try:
        # Check if landowner@gmail.com exists
        landowner = db.execute(
            text("SELECT user_id, email, password, is_active FROM \"user\" WHERE email = 'landowner@gmail.com'")
        ).fetchone()
        
        if landowner:
            print(f"Found landowner: {landowner.email}, Active: {landowner.is_active}")
            
            # Reset password to 'password123'
            new_password = "password123"
            hashed_password = get_password_hash(new_password)
            
            # Update the password
            db.execute(
                text("UPDATE \"user\" SET password = :password WHERE email = 'landowner@gmail.com'"),
                {"password": hashed_password}
            )
            db.commit()
            
            # Verify the user is active
            if not landowner.is_active:
                db.execute(
                    text("UPDATE \"user\" SET is_active = TRUE WHERE email = 'landowner@gmail.com'")
                )
                db.commit()
                print("Activated landowner account")
            
            print(f"Reset password for landowner@gmail.com to '{new_password}'")
            
            # Check roles
            roles = db.execute(
                text("""
                    SELECT r.role_key, r.role_name 
                    FROM user_role ur 
                    JOIN role r ON ur.role_id = r.role_id 
                    JOIN "user" u ON ur.user_id = u.user_id 
                    WHERE u.email = 'landowner@gmail.com'
                """)
            ).fetchall()
            
            print("Current roles:")
            for role in roles:
                print(f"  - {role.role_key}: {role.role_name}")
            
            # Ensure landowner role exists
            landowner_role = db.execute(
                text("SELECT role_id FROM role WHERE role_key = 'landowner'")
            ).fetchone()
            
            if not landowner_role:
                print("Error: Landowner role does not exist in the database")
                return
            
            # Check if user has landowner role
            has_landowner_role = False
            for role in roles:
                if role.role_key == 'landowner':
                    has_landowner_role = True
                    break
            
            # Add landowner role if missing
            if not has_landowner_role:
                db.execute(
                    text("""
                        INSERT INTO user_role (user_id, role_id) 
                        VALUES (:user_id, :role_id)
                    """),
                    {"user_id": landowner.user_id, "role_id": landowner_role.role_id}
                )
                db.commit()
                print("Added landowner role to the user")
            
            print("\nLogin credentials:")
            print(f"Email: landowner@gmail.com")
            print(f"Password: {new_password}")
            print(f"Role: landowner")
            
        else:
            print("Landowner user not found in the database")
    
    except Exception as e:
        print(f"Error: {str(e)}")
        db.rollback()

if __name__ == "__main__":
    main()