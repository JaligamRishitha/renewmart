#!/usr/bin/env python3
import requests
import json

def assign_investor_role_via_api():
    """Assign investor role to test user via API"""
    base_url = "http://149.102.158.71:1312"
    
    print("Assigning investor role via API...")
    
    # First, login as admin
    print("1. Logging in as admin...")
    admin_login_data = {
        "email": "admin@renewmart.com",
        "password": "Admin2024!"
    }
    
    try:
        response = requests.post(f"{base_url}/api/users/login", json=admin_login_data)
        print(f"Admin login status: {response.status_code}")
        if response.status_code == 200:
            token_data = response.json()
            admin_token = token_data.get("access_token")
            print("Admin login successful!")
        else:
            print(f"Admin login error: {response.text}")
            return
    except Exception as e:
        print(f"Admin login error: {e}")
        return
    
    # Get the test user ID
    print("\n2. Getting test user ID...")
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{base_url}/api/users/", headers=headers)
        print(f"Users list status: {response.status_code}")
        if response.status_code == 200:
            users = response.json()
            test_user = None
            for user in users:
                if user.get('email') == 'testinvestor@example.com':
                    test_user = user
                    break
            
            if test_user:
                user_id = test_user['user_id']
                print(f"Found test user ID: {user_id}")
            else:
                print("Test user not found!")
                return
        else:
            print(f"Users list error: {response.text}")
            return
    except Exception as e:
        print(f"Users list error: {e}")
        return
    
    # Assign investor role
    print("\n3. Assigning investor role...")
    role_data = {
        "role_key": "investor"
    }
    
    try:
        response = requests.post(f"{base_url}/api/users/{user_id}/roles", json=role_data, headers=headers)
        print(f"Role assignment status: {response.status_code}")
        if response.status_code == 200:
            print("Investor role assigned successfully!")
        else:
            print(f"Role assignment error: {response.text}")
    except Exception as e:
        print(f"Role assignment error: {e}")
    
    # Verify the role was assigned
    print("\n4. Verifying role assignment...")
    try:
        response = requests.get(f"{base_url}/api/users/{user_id}/roles", headers=headers)
        print(f"User roles status: {response.status_code}")
        if response.status_code == 200:
            roles = response.json()
            print(f"User roles: {[role['role_key'] for role in roles]}")
        else:
            print(f"User roles error: {response.text}")
    except Exception as e:
        print(f"User roles error: {e}")

if __name__ == '__main__':
    assign_investor_role_via_api()

