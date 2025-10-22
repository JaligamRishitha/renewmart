#!/usr/bin/env python3
"""
Test authentication and create test users if needed
"""
import requests
import json

def test_auth():
    """Test authentication with different credentials"""
    
    # Test credentials
    test_credentials = [
        {"username": "landowner@example.com", "password": "password123"},
        {"username": "landowner@gmail.com", "password": "password123"},
        {"username": "admin@example.com", "password": "admin123"},
        {"username": "test@example.com", "password": "test123"},
    ]
    
    print("Testing authentication...")
    
    for creds in test_credentials:
        print(f"\nTrying: {creds['username']}")
        try:
            response = requests.post(
                "http://127.0.0.1:8000/api/auth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data=f"username={creds['username']}&password={creds['password']}"
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"SUCCESS: Login successful!")
                print(f"Token: {data.get('access_token', 'No token')[:50]}...")
                print(f"User ID: {data.get('user_id', 'No user ID')}")
                print(f"Roles: {data.get('roles', 'No roles')}")
                return data
            else:
                print(f"FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"ERROR: {e}")
    
    print("\nNo valid credentials found. You may need to create a test user.")
    return None

def create_test_user():
    """Create a test landowner user"""
    print("\nCreating test landowner user...")
    
    try:
        # First, try to register a new user
        user_data = {
            "email": "testlandowner@example.com",
            "password": "password123",
            "first_name": "Test",
            "last_name": "Landowner",
            "roles": ["landowner"]
        }
        
        response = requests.post(
            "http://127.0.0.1:8000/api/auth/register",
            headers={"Content-Type": "application/json"},
            json=user_data
        )
        
        if response.status_code == 200:
            print("SUCCESS: Test user created!")
            print(f"Response: {response.text}")
            return True
        else:
            print(f"FAILED: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR creating user: {e}")
        return False

if __name__ == "__main__":
    # Test existing credentials
    auth_result = test_auth()
    
    if not auth_result:
        # Try to create a test user
        create_test_user()
        
        # Test again with new user
        print("\nTesting with new user...")
        test_auth()
