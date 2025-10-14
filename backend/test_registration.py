#!/usr/bin/env python3
"""
Test user registration endpoint
"""
import sys
import requests
from pathlib import Path

def test_registration():
    """Test user registration"""
    print("="*60)
    print("TESTING USER REGISTRATION")
    print("="*60)
    
    base_url = "http://localhost:8000"
    register_url = f"{base_url}/api/auth/register"
    
    test_user = {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "confirm_password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "phone": "+1234567890",
        "roles": ["landowner"]
    }
    
    print(f"\nRegistering user: {test_user['email']}")
    print(f"URL: {register_url}")
    print(f"Payload: {test_user}")
    
    try:
        response = requests.post(register_url, json=test_user, timeout=10)
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("\n[SUCCESS] User registered successfully!")
            data = response.json()
            print(f"User ID: {data.get('user_id')}")
            print(f"Email: {data.get('email')}")
            print(f"Roles: {data.get('roles')}")
            return True
        else:
            print(f"\n[ERROR] Registration failed!")
            try:
                error_data = response.json()
                print(f"Error detail: {error_data.get('detail')}")
            except:
                pass
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"\n[ERROR] Cannot connect to backend at {base_url}")
        print("Make sure backend is running: python server.py")
        return False
    except Exception as e:
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n>> Testing Registration Endpoint...\n")
    success = test_registration()
    print("\n" + "="*60 + "\n")
    sys.exit(0 if success else 1)

