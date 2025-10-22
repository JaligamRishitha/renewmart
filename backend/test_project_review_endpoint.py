#!/usr/bin/env python3
"""
Test script for the new project review endpoint
"""
import requests
import json

# Test configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api"

def test_project_review_endpoint():
    """Test the new project review endpoint"""
    
    # You'll need to replace these with actual values from your database
    test_land_id = "ff8f54a7-7e05-4d49-a71d-19a134eb3e5c"  # Replace with actual land ID
    test_token = "your_auth_token_here"  # Replace with actual auth token
    
    headers = {
        "Authorization": f"Bearer {test_token}",
        "Content-Type": "application/json"
    }
    
    print(f"Testing project review endpoint for land ID: {test_land_id}")
    
    try:
        # Test the new endpoint
        url = f"{API_BASE}/tasks/project/{test_land_id}/review"
        print(f"Making request to: {url}")
        
        response = requests.get(url, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Response data:")
            print(json.dumps(data, indent=2))
            
            # Check if we have tasks with subtasks
            if isinstance(data, list) and len(data) > 0:
                print(f"\nFound {len(data)} tasks")
                for i, task in enumerate(data):
                    print(f"\nTask {i+1}:")
                    print(f"  - ID: {task.get('task_id')}")
                    print(f"  - Type: {task.get('task_type')}")
                    print(f"  - Status: {task.get('status')}")
                    print(f"  - Assigned Role: {task.get('assigned_role')}")
                    print(f"  - Subtasks: {len(task.get('subtasks', []))}")
                    
                    if task.get('subtasks'):
                        for j, subtask in enumerate(task['subtasks']):
                            print(f"    Subtask {j+1}: {subtask.get('title')} - {subtask.get('status')}")
            else:
                print("No tasks found or empty response")
        else:
            print(f"Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
    except Exception as e:
        print(f"Error: {e}")

def test_fallback_endpoint():
    """Test the fallback endpoint with parameters"""
    
    test_land_id = "ff8f54a7-7e05-4d49-a71d-19a134eb3e5c"
    test_token = "your_auth_token_here"
    
    headers = {
        "Authorization": f"Bearer {test_token}",
        "Content-Type": "application/json"
    }
    
    print(f"\nTesting fallback endpoint for land ID: {test_land_id}")
    
    try:
        # Test the fallback endpoint
        url = f"{API_BASE}/tasks"
        params = {
            "land_id": test_land_id,
            "include_subtasks": True,
            "include_status": True,
            "status": "all"
        }
        
        print(f"Making request to: {url}")
        print(f"With params: {params}")
        
        response = requests.get(url, headers=headers, params=params)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Fallback Success! Response data:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Fallback Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Fallback Error: {e}")

if __name__ == "__main__":
    print("Testing Project Review Endpoints")
    print("=" * 50)
    
    print("NOTE: You need to replace the test_land_id and test_token with actual values")
    print("1. Get a valid land ID from your database")
    print("2. Get a valid auth token by logging in")
    print("3. Update the variables in this script")
    print()
    
    # Uncomment these lines after updating the test values
    # test_project_review_endpoint()
    # test_fallback_endpoint()
    
    print("To run the tests:")
    print("1. Update test_land_id and test_token variables")
    print("2. Uncomment the test function calls")
    print("3. Run: python test_project_review_endpoint.py")
