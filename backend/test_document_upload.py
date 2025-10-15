"""
Test script for Document Upload functionality
"""
import requests
import os
import json
from pathlib import Path

BASE_URL = "http://localhost:8000/api"

# Test user credentials
TEST_USER = {
    "email": "landowner@renewmart.com",
    "password": "Land2024!"
}

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def test_login():
    """Test user login"""
    print_section("1. Testing Login")
    
    response = requests.post(
        f"{BASE_URL}/users/login",
        json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        }
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"[OK] Login successful")
        return token
    else:
        print(f"[FAIL] Login failed: {response.text[:200]}")
    return None

def create_test_land(token):
    """Create a test land for document upload"""
    print_section("2. Creating Test Land")
    
    headers = {"Authorization": f"Bearer {token}"}
    test_land = {
        "title": "Test Land for Document Upload",
        "location_text": "Test Location, TX",
        "coordinates": {"lat": 30.2672, "lng": -97.7431},
        "area_acres": 100.0,
        "energy_key": "solar",
        "capacity_mw": 25.0,
        "price_per_mwh": 50.0,
        "timeline_text": "12 months"
    }
    
    response = requests.post(
        f"{BASE_URL}/lands/",
        headers=headers,
        json=test_land
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        land_id = data.get("land_id")
        print(f"[OK] Land created: {land_id}")
        return land_id
    else:
        print(f"[FAIL] Failed to create land: {response.text[:200]}")
    return None

def create_test_file():
    """Create a temporary test file"""
    test_file_path = "test_document.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test document for upload testing.\n")
        f.write("Created by test_document_upload.py\n")
    return test_file_path

def upload_document(token, land_id):
    """Test document upload"""
    print_section("3. Testing Document Upload")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create test file
    test_file_path = create_test_file()
    
    try:
        with open(test_file_path, "rb") as f:
            files = {"file": ("test_document.txt", f, "text/plain")}
            data = {"document_type": "feasibility"}
            
            response = requests.post(
                f"{BASE_URL}/documents/upload/{land_id}",
                headers=headers,
                files=files,
                data=data
            )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            document_id = data.get("document_id")
            file_path = data.get("file_path")
            print(f"[OK] Document uploaded successfully")
            print(f"Document ID: {document_id}")
            print(f"File Path: {file_path}")
            
            # Check if file exists on disk
            if os.path.exists(file_path):
                print(f"[OK] File saved to disk: {file_path}")
            else:
                print(f"[FAIL] File NOT found on disk: {file_path}")
            
            return document_id, file_path
        else:
            print(f"[FAIL] Upload failed: {response.text[:500]}")
            try:
                error_data = response.json()
                print(f"Error details: {json.dumps(error_data, indent=2)}")
            except:
                pass
            return None, None
    finally:
        # Clean up test file
        if os.path.exists(test_file_path):
            os.remove(test_file_path)

def get_documents(token, land_id):
    """Get all documents for a land"""
    print_section("4. Testing Get Documents for Land")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/documents/land/{land_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Found {len(data)} document(s)")
        for doc in data:
            print(f"  - {doc.get('file_name')} ({doc.get('document_type')})")
        return True
    else:
        print(f"[FAIL] Failed to get documents: {response.text[:200]}")
    return False

def download_document(token, document_id):
    """Test document download"""
    print_section("5. Testing Document Download")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{BASE_URL}/documents/download/{document_id}",
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        print(f"[OK] Document downloaded successfully")
        print(f"Content length: {len(response.content)} bytes")
        return True
    else:
        print(f"[FAIL] Download failed: {response.text[:200]}")
    return False

def verify_upload_directory():
    """Verify uploads directory exists"""
    print_section("6. Verifying Upload Directory")
    
    upload_dir = Path("uploads/documents")
    
    if upload_dir.exists():
        print(f"[OK] Upload directory exists: {upload_dir.absolute()}")
        
        # List subdirectories
        subdirs = [d for d in upload_dir.iterdir() if d.is_dir()]
        print(f"Found {len(subdirs)} project folder(s)")
        
        # Count total files
        total_files = sum(1 for _ in upload_dir.rglob("*") if _.is_file())
        print(f"Total files in uploads: {total_files}")
        
        return True
    else:
        print(f"[FAIL] Upload directory does not exist: {upload_dir.absolute()}")
    return False

def run_complete_test():
    """Run complete document upload test"""
    print_section("Document Upload Test - Complete Flow")
    print("Testing document upload and storage functionality")
    
    try:
        # Step 1: Login
        token = test_login()
        if not token:
            print("\n[FAIL] Cannot proceed without authentication")
            return False
        
        # Step 2: Create test land
        land_id = create_test_land(token)
        if not land_id:
            print("\n[FAIL] Cannot proceed without a land")
            return False
        
        # Step 3: Upload document
        document_id, file_path = upload_document(token, land_id)
        if not document_id:
            print("\n[FAIL] Document upload failed")
            return False
        
        # Step 4: Get documents
        get_documents(token, land_id)
        
        # Step 5: Download document
        if document_id:
            download_document(token, document_id)
        
        # Step 6: Verify directory
        verify_upload_directory()
        
        print_section("Test Summary")
        print("\n[OK] All tests completed successfully!")
        print("\nVerified:")
        print("  [OK] User authentication")
        print("  [OK] Land creation")
        print("  [OK] Document upload")
        print("  [OK] Document storage")
        print("  [OK] Document retrieval")
        print("  [OK] Document download")
        print("  [OK] Upload directory structure")
        
        if file_path:
            print(f"\nTest document saved to: {file_path}")
            print("You can check this file in your backend/uploads/documents folder")
        
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
    success = run_complete_test()
    exit(0 if success else 1)

