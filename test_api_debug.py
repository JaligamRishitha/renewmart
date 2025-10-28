#!/usr/bin/env python3
"""
Test script to debug the actual API endpoint
"""

import requests
import json

def test_api_endpoint():
    """Test the actual API endpoint to see what's wrong"""
    
    print("🧪 Testing API Endpoint")
    print("=" * 30)
    
    # Test the backend endpoint directly
    base_url = "http://localhost:8000"
    
    # First, let's check if the backend is running
    try:
        health_response = requests.get(f"{base_url}/api/health/", timeout=5)
        print(f"✅ Backend is running: {health_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend is not running: {e}")
        print("Please start the backend server first!")
        return
    
    # Test the reviewer endpoint
    test_document_id = "123e4567-e89b-12d3-a456-426614174000"  # Sample UUID
    
    print(f"\n🔍 Testing endpoint: POST /api/reviewer/documents/{test_document_id}/claim")
    
    # Test with query parameters (what we're sending now)
    try:
        response = requests.post(
            f"{base_url}/api/reviewer/documents/{test_document_id}/claim",
            params={"reason": "Test reason"},
            timeout=10
        )
        print(f"Query params response: {response.status_code}")
        print(f"Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Query params failed: {e}")
    
    # Test with body parameters (what we were sending before)
    try:
        response = requests.post(
            f"{base_url}/api/reviewer/documents/{test_document_id}/claim",
            json={"reason": "Test reason"},
            timeout=10
        )
        print(f"Body params response: {response.status_code}")
        print(f"Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Body params failed: {e}")
    
    print("\n🎯 Next Steps:")
    print("1. Check if backend is running")
    print("2. Check the exact error message")
    print("3. Verify the endpoint URL")
    print("4. Check authentication")

if __name__ == "__main__":
    test_api_endpoint()
