#!/usr/bin/env python3
"""
Test document versions API endpoint
"""
import requests
import json
import os

def test_document_versions():
    """Test the document versions endpoint"""
    base_url = os.getenv("API_BASE_URL") or f"http://127.0.0.1:{os.getenv('PORT', os.getenv('BACKEND_HOST_PORT', '1313'))}"
    
    # Test data
    land_id = "ff8f54a7-7e05-4d49-a71d-19a134eb3e5c"
    document_type = "land-valuation"
    
    # Test endpoint
    url = f"{base_url}/api/documents/land/{land_id}/versions/{document_type}"
    
    print(f"Testing endpoint: {url}")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Found {len(data)} document versions")
            for doc in data:
                print(f"  - Version {doc.get('version_number', 'N/A')}: {doc.get('file_name', 'N/A')}")
        else:
            print(f"Error: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to server. Make sure the backend is running.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_document_versions()
