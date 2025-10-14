"""
Test script for registration and email verification flow.

This script tests:
1. User registration with verification email
2. Verification code request
3. Verification code confirmation
4. Complete registration flow
"""

import requests
import time
import json
from typing import Dict, Any, Optional

BASE_URL = "http://localhost:8000/api/auth"

# Test user data
TEST_USER = {
    "email": "test.user@example.com",
    "password": "TestPass123!",
    "confirm_password": "TestPass123!",
    "first_name": "Test",
    "last_name": "User",
    "phone": "+1234567890",
    "roles": ["landowner"]
}


def print_section(title: str):
    """Print a section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_response(response: requests.Response, show_body: bool = True):
    """Print response details"""
    print(f"Status: {response.status_code}")
    if show_body:
        try:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        except:
            print(f"Response: {response.text}")


def test_basic_registration():
    """Test 1: Basic registration without verification"""
    print_section("Test 1: Basic Registration (No Verification)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/register",
            json=TEST_USER
        )
        print_response(response)
        
        if response.status_code == 201:
            print("[PASS] Registration successful")
            return response.json()
        elif response.status_code == 400 and "already registered" in response.text:
            print("[WARN] User already exists (expected if running multiple times)")
            return None
        else:
            print("[FAIL] Registration failed")
            return None
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return None


def test_register_with_verification():
    """Test 2: Registration with automatic verification email"""
    print_section("Test 2: Register with Verification Email")
    
    # Use a different email to avoid conflicts
    test_user = TEST_USER.copy()
    test_user["email"] = f"verified.{TEST_USER['email']}"
    
    try:
        response = requests.post(
            f"{BASE_URL}/register-with-verification",
            json=test_user
        )
        print_response(response)
        
        if response.status_code == 201:
            data = response.json()
            print("[PASS] Registration with verification successful")
            
            # Extract verification code if in debug mode
            if "data" in data and "debug_code" in data["data"]:
                code = data["data"]["debug_code"]
                print(f"[CODE] Debug verification code: {code}")
                return {"email": test_user["email"], "code": code}
            return {"email": test_user["email"], "code": None}
        elif response.status_code == 400 and "already registered" in response.text:
            print("[WARN] User already exists")
            return None
        else:
            print("[FAIL] Registration failed")
            return None
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return None


def test_request_verification_code(email: str):
    """Test 3: Request verification code for existing user"""
    print_section("Test 3: Request Verification Code")
    
    try:
        response = requests.post(
            f"{BASE_URL}/verify/request",
            json={"email": email}
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            print("[PASS] Verification code requested successfully")
            
            # Extract verification code if in debug mode
            if "data" in data and "debug_code" in data["data"]:
                code = data["data"]["debug_code"]
                print(f"[CODE] Debug verification code: {code}")
                return code
            return None
        else:
            print("[FAIL] Verification code request failed")
            return None
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return None


def test_confirm_verification(email: str, code: str):
    """Test 4: Confirm verification code"""
    print_section("Test 4: Confirm Verification Code")
    
    try:
        response = requests.post(
            f"{BASE_URL}/verify/confirm",
            json={"email": email, "code": code}
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            print("[PASS] Verification confirmed successfully")
            print(f"  User is now verified: {data.get('is_verified', False)}")
            return True
        else:
            print("[FAIL] Verification confirmation failed")
            return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False


def test_login(email: str, password: str):
    """Test 5: Login with verified user"""
    print_section("Test 5: Login with Verified User")
    
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data={"username": email, "password": password}
        )
        print_response(response)
        
        if response.status_code == 200:
            data = response.json()
            print("[PASS] Login successful")
            print(f"  Token: {data.get('access_token', '')[:50]}...")
            return data.get("access_token")
        else:
            print("[FAIL] Login failed")
            return None
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return None


def test_email_speed():
    """Test 6: Check email sending doesn't block the request"""
    print_section("Test 6: Email Sending Performance Test")
    
    test_user = TEST_USER.copy()
    test_user["email"] = f"speed.test.{int(time.time())}@example.com"
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/register-with-verification",
            json=test_user,
            timeout=10  # 10 second timeout
        )
        end_time = time.time()
        
        elapsed = end_time - start_time
        
        print(f"Request completed in: {elapsed:.2f} seconds")
        print_response(response)
        
        if response.status_code == 201:
            if elapsed < 3.0:
                print("[PASS] Email sending is non-blocking (fast response)")
                return True
            else:
                print("[WARN] Response took longer than expected, but succeeded")
                return True
        else:
            print("[FAIL] Registration failed")
            return False
    except requests.exceptions.Timeout:
        print("[FAIL] Request timed out (email sending might be blocking)")
        return False
    except Exception as e:
        print(f"[FAIL] Error: {str(e)}")
        return False


def run_complete_flow():
    """Run the complete registration and verification flow"""
    print_section("COMPLETE REGISTRATION & VERIFICATION FLOW TEST")
    
    results = {
        "basic_registration": False,
        "register_with_verification": False,
        "verification_confirm": False,
        "login": False,
        "email_speed": False
    }
    
    # Test 1: Basic registration
    results["basic_registration"] = test_basic_registration() is not None
    time.sleep(1)
    
    # Test 2: Register with verification
    reg_data = test_register_with_verification()
    results["register_with_verification"] = reg_data is not None
    time.sleep(1)
    
    # Test 3 & 4: If we have registration data, test verification
    if reg_data and reg_data.get("code"):
        email = reg_data["email"]
        code = reg_data["code"]
        
        # Test verification confirmation
        results["verification_confirm"] = test_confirm_verification(email, code)
        time.sleep(1)
        
        # Test 5: Login after verification
        if results["verification_confirm"]:
            token = test_login(email, TEST_USER["password"])
            results["login"] = token is not None
            time.sleep(1)
    elif reg_data:
        # No debug code, request one
        email = reg_data["email"]
        code = test_request_verification_code(email)
        if code:
            results["verification_confirm"] = test_confirm_verification(email, code)
            if results["verification_confirm"]:
                token = test_login(email, TEST_USER["password"])
                results["login"] = token is not None
    
    # Test 6: Email speed test
    time.sleep(1)
    results["email_speed"] = test_email_speed()
    
    # Print summary
    print_section("TEST SUMMARY")
    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)
    
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status}: {test_name.replace('_', ' ').title()}")
    
    print(f"\nTotal: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("\n[SUCCESS] All tests passed!")
    else:
        print(f"\n[WARNING] {total_tests - passed_tests} test(s) failed")
    
    return results


if __name__ == "__main__":
    print("""
================================================================
  RenewMart Registration & Verification Test Suite
  Testing email verification and registration endpoints
================================================================
    """)
    
    print("Prerequisites:")
    print("1. Backend server running at http://localhost:8000")
    print("2. Redis server running")
    print("3. DEBUG=true in settings.toml (to see verification codes)")
    print("\nStarting tests...\n")
    
    try:
        results = run_complete_flow()
    except KeyboardInterrupt:
        print("\n\n[WARNING] Tests interrupted by user")
    except Exception as e:
        print(f"\n\n[ERROR] Test suite failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

