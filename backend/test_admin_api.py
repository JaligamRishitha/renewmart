import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

print("Testing Admin API Endpoint\n" + "="*60 + "\n")

# Test with admin user
admin_email = "admin@gmail.com"
passwords_to_try = ["Admin@123", "admin123", "Admin123", "admin@123"]

print(f"Attempting to login as: {admin_email}\n")

for password in passwords_to_try:
    print(f"Trying password: {password}")
    try:
        login_response = requests.post(
            f"{BASE_URL}/users/login",
            json={"email": admin_email, "password": password},
            timeout=5
        )
        
        print(f"  Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            data = login_response.json()
            token = data.get("access_token") or data.get("token") or data.get("data", {}).get("access_token")
            
            if token:
                print(f"  ✓ Login successful! Token: {token[:30]}...\n")
                
                # Test admin projects endpoint
                print("="*60)
                print("Testing GET /lands/admin/projects")
                print("="*60 + "\n")
                
                admin_response = requests.get(
                    f"{BASE_URL}/lands/admin/projects",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                print(f"Status Code: {admin_response.status_code}")
                
                if admin_response.status_code == 200:
                    projects = admin_response.json()
                    print(f"✓ Success! Found {len(projects)} projects\n")
                    
                    for idx, project in enumerate(projects, 1):
                        print(f"Project {idx}:")
                        print(f"  ID: {project.get('id')}")
                        print(f"  Title: {project.get('title')}")
                        print(f"  Landowner: {project.get('landownerName')} ({project.get('landownerEmail')})")
                        print(f"  Location: {project.get('location')}")
                        print(f"  Type: {project.get('projectType')}")
                        print(f"  Energy: {project.get('energyType')}")
                        print(f"  Capacity: {project.get('capacity')}")
                        print(f"  Status: {project.get('status')}")
                        print()
                else:
                    print(f"✗ Error Response:")
                    print(admin_response.text)
                
                # Test admin summary endpoint
                print("\n" + "="*60)
                print("Testing GET /lands/admin/summary")
                print("="*60 + "\n")
                
                summary_response = requests.get(
                    f"{BASE_URL}/lands/admin/summary",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10
                )
                
                print(f"Status Code: {summary_response.status_code}")
                
                if summary_response.status_code == 200:
                    summary = summary_response.json()
                    print(f"✓ Success!\n")
                    print(json.dumps(summary, indent=2))
                else:
                    print(f"✗ Error Response:")
                    print(summary_response.text)
                
                break  # Exit loop on successful login
            else:
                print(f"  ✗ No token in response: {data}\n")
        else:
            print(f"  Response: {login_response.json()}\n")
            
    except Exception as e:
        print(f"  ✗ Error: {e}\n")

print("\n" + "="*60)
print("Test Complete")

