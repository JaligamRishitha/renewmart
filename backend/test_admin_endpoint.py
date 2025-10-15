import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

# Get admin users from database
from database import get_db
from sqlalchemy import text

db = next(get_db())
result = db.execute(text("SELECT email, roles FROM \"user\" WHERE 'administrator' = ANY(roles)")).fetchall()
print("Admin users in database:")
for r in result:
    print(f"  Email: {r.email}, Roles: {r.roles}")

print("\n" + "="*50 + "\n")

# Try to login with each admin user
if result:
    admin_email = result[0].email
    print(f"Testing with admin email: {admin_email}")
    
    # Try common passwords
    passwords = ["Admin@123", "admin123", "password"]
    
    for pwd in passwords:
        print(f"\nTrying password: {pwd}")
        try:
            login_response = requests.post(
                f"{BASE_URL}/users/login",
                json={"email": admin_email, "password": pwd}
            )
            print(f"Status: {login_response.status_code}")
            print(f"Response: {login_response.json()}")
            
            if login_response.status_code == 200:
                token = login_response.json().get("access_token") or login_response.json().get("token")
                if token:
                    print(f"\n✓ Login successful! Token: {token[:20]}...")
                    
                    # Test admin endpoint
                    print("\n" + "="*50)
                    print("Testing /lands/admin/projects endpoint:")
                    admin_response = requests.get(
                        f"{BASE_URL}/lands/admin/projects",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    print(f"Status: {admin_response.status_code}")
                    if admin_response.status_code == 200:
                        projects = admin_response.json()
                        print(f"Number of projects: {len(projects)}")
                        if projects:
                            print("\nFirst project:")
                            print(json.dumps(projects[0], indent=2))
                    else:
                        print(f"Error: {admin_response.text}")
                    break
        except Exception as e:
            print(f"Error: {e}")
else:
    print("No admin users found!")
    print("\nChecking all submitted projects:")
    submitted = db.execute(text("SELECT land_id, title, status FROM lands WHERE status='submitted'")).fetchall()
    print(f"Found {len(submitted)} submitted projects")
    for s in submitted:
        print(f"  - {s.title} ({s.land_id}) - Status: {s.status}")

