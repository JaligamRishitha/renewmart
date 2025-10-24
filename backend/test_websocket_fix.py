#!/usr/bin/env python3
"""
Test script to verify WebSocket authentication fix
"""
import asyncio
import websockets
import json
import requests

async def test_websocket_connection():
    """Test WebSocket connection after fixing authentication"""
    print("🧪 Testing WebSocket Connection Fix")
    print("=" * 50)
    
    # First, get a valid token by logging in
    print("1. Getting authentication token...")
    
    # You'll need to replace these with actual credentials
    login_data = {
        "email": "your-email@example.com",  # Replace with actual email
        "password": "your-password"        # Replace with actual password
    }
    
    try:
        # Try to login and get token
        response = requests.post("http://localhost:8000/api/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            print(f"✅ Got token: {token[:20]}...")
        else:
            print(f"❌ Login failed: {response.status_code}")
            print("Please update the credentials in this script")
            return
    except Exception as e:
        print(f"❌ Error getting token: {e}")
        print("Make sure the backend server is running")
        return
    
    # Test WebSocket connection
    print("\n2. Testing WebSocket connection...")
    try:
        async with websockets.connect(f"ws://localhost:8000/ws?token={token}") as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Wait for connection confirmation
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"✅ Received: {response_data}")
            except asyncio.TimeoutError:
                print("⚠️  No response received within 5 seconds")
            
            # Test sending a message
            print("\n3. Testing message sending...")
            test_message = {
                "type": "ping"
            }
            
            await websocket.send(json.dumps(test_message))
            print("✅ Ping message sent")
            
            # Wait for pong response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"✅ Received pong: {response_data}")
            except asyncio.TimeoutError:
                print("⚠️  No pong received within 5 seconds")
                
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: {e}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")

def test_backend_health():
    """Test if backend is running"""
    print("\n4. Testing backend health...")
    try:
        response = requests.get("http://localhost:8000/api/health")
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"⚠️  Backend returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
        return False

async def main():
    """Main test function"""
    print("🚀 Testing WebSocket Authentication Fix")
    print(f"📅 Test started at: {asyncio.get_event_loop().time()}")
    print()
    
    # Test backend health first
    if not test_backend_health():
        print("\n❌ Backend is not running. Please start the server first:")
        print("   python -m uvicorn main:app --reload")
        return
    
    # Test WebSocket connection
    await test_websocket_connection()
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")
    print("\n📝 Next steps:")
    print("1. The WebSocket authentication should now work")
    print("2. Try accessing the messaging features in the frontend")
    print("3. Check the browser console for any remaining errors")

if __name__ == "__main__":
    asyncio.run(main())
