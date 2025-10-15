"""
Test land creation and retrieval
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

# Test user credentials
TEST_USER = {
    "email": "jaligamrishitha@gmail.com",
    "password": "your_password_here"  # Update with actual password
}

def test_login():
    """Test login"""
    print("1. Testing Login...")
    response = requests.post(
        f"{BASE_URL}/users/login",
        json=TEST_USER
    )
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"   [OK] Login successful")
        return token
    else:
        print(f"   [FAIL] Login failed: {response.text[:200]}")
        return None

def test_create_land(token):
    """Test creating a land"""
    print("\n2. Testing Create Land...")
    
    headers = {"Authorization": f"Bearer {token}"}
    land_data = {
        "title": "Test Solar Farm",
        "location_text": "Test Location, TX",
        "coordinates": {"lat": 30.27, "lng": -97.74},
        "area_acres": 100.5,
        "energy_key": "solar",
        "capacity_mw": 25.0,
        "price_per_mwh": 45.50,
        "timeline_text": "12-18 months"
    }
    
    response = requests.post(
        f"{BASE_URL}/lands/",
        headers=headers,
        json=land_data
    )
    
    print(f"   Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        land_id = data.get("land_id")
        print(f"   [OK] Land created: {land_id}")
        print(f"   Title: {data.get('title')}")
        print(f"   Status: {data.get('status')}")
        return land_id
    else:
        print(f"   [FAIL] Creation failed")
        print(f"   Response: {response.text[:500]}")
        return None

def test_dashboard_summary(token):
    """Test dashboard summary"""
    print("\n3. Testing Dashboard Summary...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/lands/dashboard/summary",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   [OK] Summary retrieved")
        print(f"   Total Projects: {data.get('totalProjects')}")
        print(f"   Total Land Area: {data.get('totalLandArea')} acres")
        return True
    else:
        print(f"   [FAIL] {response.text[:200]}")
        return False

def test_dashboard_projects(token):
    """Test dashboard projects"""
    print("\n4. Testing Dashboard Projects...")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/lands/dashboard/projects",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"   [OK] Projects retrieved")
        print(f"   Number of projects: {len(data)}")
        for project in data:
            print(f"   - {project.get('name')} ({project.get('status')})")
        return True
    else:
        print(f"   [FAIL] {response.text[:200]}")
        return False

def run_test():
    """Run all tests"""
    print("="*60)
    print(" Testing Land Creation & Dashboard")
    print("="*60)
    
    # Login
    token = test_login()
    if not token:
        print("\n[FAIL] Cannot proceed without login")
        return False
    
    # Create land
    land_id = test_create_land(token)
    
    # Test dashboard endpoints
    test_dashboard_summary(token)
    test_dashboard_projects(token)
    
    print("\n" + "="*60)
    if land_id:
        print(" [SUCCESS] All tests passed!")
        print("="*60)
        return True
    else:
        print(" [FAIL] Land creation failed")
        print("="*60)
        return False

if __name__ == "__main__":
    try:
        success = run_complete()
        exit(0 if success else 1)
    except requests.exceptions.ConnectionError:
        print("\n[FAIL] Backend server is not running!")
        print("Start it with: python server.py")
        exit(1)
    except Exception as e:
        print(f"\n[FAIL] Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

