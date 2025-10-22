#!/usr/bin/env python3
"""
Test script to simulate the frontend API call
"""
import requests
import json

def test_frontend_api_call():
    """Test the API call that the frontend is making"""
    
    # This simulates what the frontend is calling
    land_id = "ff8f54a7-7e05-4d49-a71d-19a134eb3e5c"
    
    print("Testing frontend API calls...")
    
    # Test 1: New endpoint (what frontend should call)
    print(f"\n1. Testing new endpoint: /api/tasks/project/{land_id}/review")
    try:
        response = requests.get(f"http://127.0.0.1:8000/api/tasks/project/{land_id}/review")
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print("SUCCESS: Endpoint exists (needs auth)")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")
    
    # Test 2: Old endpoint with parameters (fallback)
    print(f"\n2. Testing fallback endpoint: /api/tasks with land_id={land_id}")
    try:
        params = {
            "land_id": land_id,
            "include_subtasks": True,
            "include_status": True,
            "status": "all"
        }
        response = requests.get("http://127.0.0.1:8000/api/tasks", params=params)
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print("SUCCESS: Fallback endpoint exists (needs auth)")
        else:
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")
    
    # Test 3: Check if server is running
    print(f"\n3. Testing server health")
    try:
        response = requests.get("http://127.0.0.1:8000/health")
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            print("SUCCESS: Server is running")
        else:
            print(f"Health response: {response.text}")
    except Exception as e:
        print(f"ERROR: Server not responding - {e}")

if __name__ == "__main__":
    test_frontend_api_call()
