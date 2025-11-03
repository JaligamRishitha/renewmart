from backend.database import engine
from sqlalchemy import text

def check_all_users():
    """Check all users in database"""
    conn = engine.connect()
    
    try:
        result = conn.execute(text("""
            SELECT u.user_id, u.email, u.first_name, u.last_name, u.is_active,
                   array_agg(ur.role_key) as roles
            FROM "user" u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.is_active
            ORDER BY u.email
        """))
        
        print("All users in database:")
        for row in result:
            roles = ', '.join(row[5]) if row[5] and row[5][0] else 'No roles'
            active_status = "Active" if row[4] else "Inactive"
            print(f"- {row[1]}: {row[2]} {row[3]} ({active_status}, Roles: {roles})")
            
    except Exception as e:
        print(f"Error checking users: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_all_users()