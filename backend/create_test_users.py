#!/usr/bin/env python3
"""
Script to create test users for development
"""
import requests
import json

def create_test_users():
    """Create test users with proper credentials"""
    
    test_users = [
        {
            "email": "landowner@test.com",
            "password": "Password123!",
            "confirm_password": "Password123!",
            "first_name": "Test",
            "last_name": "Landowner",
            "roles": ["landowner"]
        },
        {
            "email": "admin@test.com", 
            "password": "Admin123!",
            "confirm_password": "Admin123!",
            "first_name": "Test",
            "last_name": "Admin",
            "roles": ["administrator"]
        },
        {
            "email": "reviewer@test.com",
            "password": "Reviewer123!",
            "confirm_password": "Reviewer123!",
            "first_name": "Test",
            "last_name": "Reviewer",
            "roles": ["reviewer"]
        }
    ]
    
    print("Creating test users...")
    
    for user in test_users:
        print(f"\nCreating user: {user['email']}")
        try:
            response = requests.post(
                "http://127.0.0.1:8000/api/auth/register",
                headers={"Content-Type": "application/json"},
                json=user
            )
            
            if response.status_code == 200:
                print(f"SUCCESS: {user['email']} created!")
            elif response.status_code == 422:
                print(f"VALIDATION ERROR: {response.text}")
            else:
                print(f"ERROR: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"EXCEPTION: {e}")

def test_login():
    """Test login with created users"""
    
    test_credentials = [
        {"username": "landowner@test.com", "password": "Password123!"},
        {"username": "admin@test.com", "password": "Admin123!"},
        {"username": "reviewer@test.com", "password": "Reviewer123!"}
    ]
    
    print("\nTesting login...")
    
    for creds in test_credentials:
        print(f"\nTesting login: {creds['username']}")
        try:
            response = requests.post(
                "http://127.0.0.1:8000/api/auth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data=f"username={creds['username']}&password={creds['password']}"
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
    # Create test users
    create_test_users()
    
    # Test login
    test_login()
