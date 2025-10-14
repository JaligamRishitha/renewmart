#!/usr/bin/env python3
"""
Test script to verify backend API is accessible
"""
import sys
import requests
import time
from pathlib import Path

def test_backend_connectivity():
    """Test backend API connectivity"""
    print("="*60)
    print("BACKEND API CONNECTIVITY TEST")
    print("="*60)
    
    base_url = "http://localhost:8000"
    api_url = f"{base_url}/api"
    
    tests = [
        {"name": "Root Endpoint", "url": base_url, "method": "GET"},
        {"name": "Health Check", "url": f"{base_url}/health", "method": "GET"},
        {"name": "API Info", "url": f"{api_url}/info", "method": "GET"},
    ]
    
    print(f"\nTesting backend at: {base_url}")
    print(f"Testing API at: {api_url}\n")
    
    all_passed = True
    
    for test in tests:
        try:
            print(f"\n[TEST] {test['name']}")
            print(f"  URL: {test['url']}")
            
            response = requests.request(
                method=test['method'],
                url=test['url'],
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"  Status: {response.status_code} [OK]")
                print(f"  Response Time: {response.elapsed.total_seconds():.3f}s")
                
                # Try to parse JSON
                try:
                    data = response.json()
                    print(f"  Response Keys: {list(data.keys())}")
                except:
                    pass
            else:
                print(f"  Status: {response.status_code} [WARNING]")
                all_passed = False
                
        except requests.exceptions.ConnectionError:
            print(f"  [X] FAILED - Cannot connect to backend")
            print(f"  Make sure backend is running on {base_url}")
            all_passed = False
            
        except requests.exceptions.Timeout:
            print(f"  [X] FAILED - Request timeout")
            all_passed = False
            
        except Exception as e:
            print(f"  [X] FAILED - {str(e)}")
            all_passed = False
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    if all_passed:
        print("\n[SUCCESS] All connectivity tests passed!")
        print("\nBackend is running and accessible.")
        print(f"Frontend should connect to: {api_url}")
        return True
    else:
        print("\n[ERROR] Some tests failed!")
        print("\n>> TROUBLESHOOTING:")
        print("1. Make sure backend is running:")
        print("   cd renewmart/backend")
        print("   python server.py")
        print(f"\n2. Try accessing {base_url} in your browser")
        print(f"\n3. Check if port 8000 is already in use")
        return False

if __name__ == "__main__":
    print("\n>> Starting Backend Connectivity Tests...\n")
    success = test_backend_connectivity()
    print("\n" + "="*60 + "\n")
    sys.exit(0 if success else 1)

