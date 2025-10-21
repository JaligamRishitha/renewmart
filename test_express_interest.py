#!/usr/bin/env python3
import requests
import json
import uuid

def test_express_interest():
    """Test the express interest functionality"""
    base_url = "http://127.0.0.1:8000"
    
    print("Testing Express Interest Functionality...")
    
    # First, let's try to register a test investor user
    print("\n1. Creating test investor user...")
    register_data = {
        "email": "testinvestor@example.com",
        "password": "TestPass123!",
        "confirm_password": "TestPass123!",
        "first_name": "Test",
        "last_name": "Investor",
        "phone": "+1234567890"
    }
    
    try:
        response = requests.post(f"{base_url}/api/users/register", json=register_data)
        print(f"Registration status: {response.status_code}")
        if response.status_code == 201:
            print("User registered successfully")
        elif response.status_code == 400:
            print("User might already exist, continuing...")
        else:
            print(f"Registration error: {response.text}")
    except Exception as e:
        print(f"Registration error: {e}")
    
    # Try to login
    print("\n2. Attempting to login...")
    login_data = {
        "email": "testinvestor@example.com",
        "password": "TestPass123!"
    }
    
    try:
        response = requests.post(f"{base_url}/api/users/login", json=login_data)
        print(f"Login status: {response.status_code}")
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print("Login successful!")
        else:
            print(f"Login error: {response.text}")
            return
    except Exception as e:
        print(f"Login error: {e}")
        return
    
    # Check if there are any published lands
    print("\n3. Checking for published lands...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    try:
        response = requests.get(f"{base_url}/api/lands", headers=headers)
        print(f"Lands API status: {response.status_code}")
        if response.status_code == 200:
            lands = response.json()
            print(f"Found {len(lands)} lands")
            if lands:
                published_lands = [land for land in lands if land.get('status') == 'published']
                print(f"Found {len(published_lands)} published lands")
                if published_lands:
                    land_id = published_lands[0]['land_id']
                    print(f"Using land ID: {land_id}")
                else:
                    print("No published lands found")
                    return
            else:
                print("No lands found")
                return
        else:
            print(f"Lands API error: {response.text}")
            return
    except Exception as e:
        print(f"Lands API error: {e}")
        return
    
    # Try to express interest
    print("\n4. Attempting to express interest...")
    interest_data = {
        "land_id": land_id,
        "interest_level": "high",
        "investment_amount": 1000000,
        "comments": "I am very interested in this renewable energy project!",
        "contact_preference": "email"
    }
    
    try:
        response = requests.post(f"{base_url}/api/investors/interest", json=interest_data, headers=headers)
        print(f"Express interest status: {response.status_code}")
        if response.status_code == 201:
            print("Interest expressed successfully!")
            print(f"Response: {response.json()}")
        else:
            print(f"Express interest error: {response.text}")
    except Exception as e:
        print(f"Express interest error: {e}")
    
    # Check admin investor interests
    print("\n5. Checking admin investor interests...")
    try:
        response = requests.get(f"{base_url}/api/lands/admin/investor-interests", headers=headers)
        print(f"Admin interests status: {response.status_code}")
        if response.status_code == 200:
            interests = response.json()
            print(f"Found {len(interests)} investor interests")
            for interest in interests:
                print(f"  - {interest.get('projectTitle')} by {interest.get('investorName')}")
        else:
            print(f"Admin interests error: {response.text}")
    except Exception as e:
        print(f"Admin interests error: {e}")

if __name__ == '__main__':
    test_express_interest()
