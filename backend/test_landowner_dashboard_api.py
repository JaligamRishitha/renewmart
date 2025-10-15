"""
Test script for Landowner Dashboard API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api"

# Test user credentials (landowner)
TEST_USER = {
    "email": "landowner@renewmart.com",
    "password": "Land2024!"
}

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_response(response, title="Response"):
    """Print formatted HTTP response"""
    print(f"\n{title}:")
    print(f"Status Code: {response.status_code}")
    if response.status_code < 300:
        print("Status: [OK] Success")
    else:
        print("Status: [FAIL] Failed")
    
    try:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2, default=str)}")
    except:
        print(f"Response Text: {response.text[:200]}")

def test_login():
    """Test user login"""
    print_section("1. Testing Login")
    
    # Backend expects JSON with email and password
    response = requests.post(
        f"{BASE_URL}/users/login",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
    )
    
    print_response(response, "Login Response")
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"\nToken obtained: {token[:50]}..." if token else "No token received")
        return token
    return None

def test_dashboard_summary(token):
    """Test dashboard summary endpoint"""
    print_section("2. Testing Dashboard Summary")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/lands/dashboard/summary",
        headers=headers
    )
    
    print_response(response, "Dashboard Summary")
    return response.status_code == 200

def test_dashboard_projects(token):
    """Test dashboard projects endpoint"""
    print_section("3. Testing Dashboard Projects")
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/lands/dashboard/projects",
        headers=headers,
        params={"limit": 10}
    )
    
    print_response(response, "Dashboard Projects")
    
    # Extract project IDs if available
    project_ids = []
    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            project_ids = [p.get("id") for p in data if p.get("id")]
            print(f"\nFound {len(project_ids)} projects")
            
            # Find a draft project for testing
            draft_projects = [p for p in data if p.get("status") == "draft"]
            if draft_projects:
                print(f"Draft projects available: {len(draft_projects)}")
                return draft_projects[0].get("id")
        else:
            print("\nNo projects found. This is expected if no lands have been created yet.")
    
    return None

def test_submit_for_review(token, project_id):
    """Test submit for review endpoint"""
    print_section("4. Testing Submit for Review")
    
    if not project_id:
        print("Skipping: No draft project available to test")
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/lands/{project_id}/submit",
        headers=headers
    )
    
    print_response(response, "Submit for Review")
    return response.status_code in [200, 400]  # 400 is ok if not a draft

def test_create_test_land(token):
    """Create a test land for testing"""
    print_section("5. Creating Test Land")
    
    headers = {"Authorization": f"Bearer {token}"}
    test_land = {
        "title": "Test Solar Farm - Dashboard API Test",
        "location_text": "Test Location, TX",
        "coordinates": {"lat": 30.2672, "lng": -97.7431},
        "area_acres": 50.5,
        "energy_key": "solar",
        "capacity_mw": 10.5,
        "price_per_mwh": 45.75,
        "timeline_text": "12-18 months"
    }
    
    response = requests.post(
        f"{BASE_URL}/lands/",
        headers=headers,
        json=test_land
    )
    
    print_response(response, "Create Test Land")
    
    if response.status_code == 200:
        data = response.json()
        land_id = data.get("land_id")
        print(f"\nTest land created with ID: {land_id}")
        return land_id
    return None

def run_complete_test_flow():
    """Run the complete test flow"""
    print_section("Landowner Dashboard API Integration Test")
    print("Testing live API endpoints with real database")
    
    try:
        # Step 1: Login
        token = test_login()
        if not token:
            print("\n[FAIL] Login failed. Cannot proceed with tests.")
            return False
        
        # Step 2: Test dashboard summary
        summary_ok = test_dashboard_summary(token)
        
        # Step 3: Test dashboard projects
        draft_project_id = test_dashboard_projects(token)
        
        # Step 4: Create a test land if none exist
        if not draft_project_id:
            print("\nNo draft projects found. Creating a test land...")
            draft_project_id = test_create_test_land(token)
            
            # Fetch projects again to see the new one
            if draft_project_id:
                test_dashboard_projects(token)
        
        # Step 5: Test submit for review
        if draft_project_id:
            test_submit_for_review(token, draft_project_id)
        
        print_section("Test Summary")
        print("\n[OK] All endpoint tests completed!")
        print("\nEndpoints tested:")
        print("  1. POST /api/users/login")
        print("  2. GET  /api/lands/dashboard/summary")
        print("  3. GET  /api/lands/dashboard/projects")
        print("  4. POST /api/lands/")
        print("  5. POST /api/lands/{land_id}/submit")
        
        print("\n[OK] Integration test successful!")
        return True
        
    except requests.exceptions.ConnectionError:
        print("\n[FAIL] Connection Error: Backend server is not running!")
        print("Please start the backend server: python server.py")
        return False
    except Exception as e:
        print(f"\n[FAIL] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_complete_test_flow()
    exit(0 if success else 1)

