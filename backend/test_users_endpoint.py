import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_users_endpoint():
    print("=" * 70)
    print("TESTING USERS ENDPOINT")
    print("=" * 70)
    print()
    
    # Step 1: Login as admin
    print("Step 1: Login as admin")
    print("-" * 70)
    
    login_data = {
        "email": "admin@renewmart.com",
        "password": "Admin2024!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/login", json=login_data)
        print(f"Login Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print("[OK] Login successful")
            print(f"Token: {token[:50]}...")
        else:
            print(f"[FAIL] Login failed: {response.text}")
            return
    except Exception as e:
        print(f"[FAIL] Login error: {str(e)}")
        return
    
    print()
    
    # Step 2: Test GET /users/ without filters
    print("Step 2: Test GET /users/ (all users)")
    print("-" * 70)
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/users/", headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"[OK] Found {len(users)} users")
            for user in users[:3]:  # Show first 3
                print(f"  - {user.get('first_name')} {user.get('last_name')} ({user.get('email')})")
        else:
            print(f"[FAIL] Request failed")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
    
    print()
    
    # Step 3: Test with role filter
    print("Step 3: Test GET /users/?role=re_sales_advisor")
    print("-" * 70)
    
    try:
        response = requests.get(
            f"{BASE_URL}/users/",
            headers=headers,
            params={"role": "re_sales_advisor"}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"[OK] Found {len(users)} sales advisors")
            for user in users:
                print(f"  - {user.get('first_name')} {user.get('last_name')} ({user.get('email')})")
        else:
            print(f"[FAIL] Request failed")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
    
    print()
    
    # Step 4: Test with role and is_active filters
    print("Step 4: Test GET /users/?role=re_analyst&is_active=true")
    print("-" * 70)
    
    try:
        response = requests.get(
            f"{BASE_URL}/users/",
            headers=headers,
            params={"role": "re_analyst", "is_active": True}
        )
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"[OK] Found {len(users)} active analysts")
            for user in users:
                print(f"  - {user.get('first_name')} {user.get('last_name')} ({user.get('email')})")
        else:
            print(f"[FAIL] Request failed")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
    
    print()
    print("=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    test_users_endpoint()

