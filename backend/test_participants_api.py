#!/usr/bin/env python3
"""
Test script for the participants API endpoint
"""
import requests
import json

def test_participants_api():
    """Test the participants API endpoint"""
    
    # Test data
    base_url = "http://localhost:8000"
    land_id = "ff8f54a7-7e05-4d49-a71d-19a134eb3e5c"
    
    # You'll need to get a valid token first
    # This is just a test structure
    headers = {
        "Authorization": "Bearer YOUR_TOKEN_HERE",
        "Content-Type": "application/json"
    }
    
    try:
        # Test the participants endpoint
        url = f"{base_url}/api/messaging/project/{land_id}/participants"
        print(f"Testing URL: {url}")
        
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Participants: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Error testing API: {e}")

if __name__ == "__main__":
    test_participants_api()
