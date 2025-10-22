#!/usr/bin/env python3
"""
Simple test script to verify the new project review endpoint
"""
import requests
import json

def test_endpoint():
    """Test the new project review endpoint"""
    
    # Test without authentication first to see the error
    url = "http://127.0.0.1:8000/api/tasks/project/ff8f54a7-7e05-4d49-a71d-19a134eb3e5c/review"
    
    print(f"Testing endpoint: {url}")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("SUCCESS: Endpoint exists but requires authentication (expected)")
        elif response.status_code == 404:
            print("ERROR: Endpoint not found - server may need restart")
        elif response.status_code == 200:
            print("SUCCESS: Endpoint working!")
            data = response.json()
            print(f"Data: {json.dumps(data, indent=2)}")
        else:
            print(f"WARNING: Unexpected status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server - is it running?")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_endpoint()
