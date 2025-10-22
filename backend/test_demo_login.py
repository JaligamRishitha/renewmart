#!/usr/bin/env python3
"""
Test login with demo users
"""
import requests

def test_demo_login():
    """Test login with demo users"""
    
    demo_users = [
        {"username": "landowner@renewmart.com", "password": "password123"},
        {"username": "admin@renewmart.com", "password": "password123"},
        {"username": "investor@renewmart.com", "password": "password123"}
    ]
    
    print("Testing demo user login...")
    
    for user in demo_users:
        print(f"\nTesting: {user['username']}")
        try:
            response = requests.post(
                "http://127.0.0.1:8000/api/auth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data=f"username={user['username']}&password={user['password']}"
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"SUCCESS: Login successful!")
                print(f"User ID: {data.get('user_id')}")
                print(f"Roles: {data.get('roles')}")
                print(f"Token: {data.get('access_token', '')[:50]}...")
                return data
            else:
                print(f"FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"ERROR: {e}")
    
    return None

if __name__ == "__main__":
    test_demo_login()
