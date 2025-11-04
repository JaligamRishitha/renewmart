#!/usr/bin/env python3
"""
Script to restart the backend server
"""
import subprocess
import sys
import time
import os

def restart_server():
    """Restart the backend server"""
    print("Stopping existing server processes...")
    
    try:
        # Kill existing Python processes that might be running the server
        subprocess.run(["taskkill", "/F", "/IM", "python.exe"], capture_output=True)
        subprocess.run(["taskkill", "/F", "/IM", "uvicorn.exe"], capture_output=True)
        time.sleep(2)
        print("Existing processes stopped.")
    except Exception as e:
        print(f"Note: {e}")
    
    print("Starting new server...")
    try:
        host = os.getenv("HOST", "127.0.0.1")
        port = os.getenv("PORT", os.getenv("BACKEND_HOST_PORT", "1313"))
        # Start the server
        subprocess.Popen([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", host, 
            "--port", str(port), 
            "--reload"
        ], cwd=os.getcwd())
        print("Server started successfully!")
        print(f"Server should be available at: http://{host}:{port}")
        print(f"API docs at: http://{host}:{port}/docs")
    except Exception as e:
        print(f"Error starting server: {e}")

if __name__ == "__main__":
    restart_server()
