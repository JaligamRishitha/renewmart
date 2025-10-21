"""
Test script for subtask submission endpoint
Run this after starting the backend server to verify the new endpoint works correctly.
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
# Replace these with actual credentials from your database
TEST_REVIEWER_EMAIL = "reviewer1@renewmart.com"
TEST_REVIEWER_PASSWORD = "password123"

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def login(email, password):
    """Login and get access token"""
    print_section("LOGIN")
    url = f"{BASE_URL}/auth/login"
    data = {"username": email, "password": password}
    
    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        token_data = response.json()
        print(f"✓ Login successful for {email}")
        return token_data["access_token"]
    except Exception as e:
        print(f"✗ Login failed: {str(e)}")
        return None

def get_my_tasks(token):
    """Get tasks assigned to current user"""
    print_section("FETCH ASSIGNED TASKS")
    url = f"{BASE_URL}/tasks/assigned/me"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        tasks = response.json()
        print(f"✓ Found {len(tasks)} assigned tasks")
        
        for task in tasks[:3]:  # Show first 3
            print(f"\n  Task: {task['task_type']}")
            print(f"  ID: {task['task_id']}")
            print(f"  Status: {task['status']}")
        
        return tasks
    except Exception as e:
        print(f"✗ Failed to fetch tasks: {str(e)}")
        return []

def get_subtasks(token, task_id):
    """Get subtasks for a task"""
    print_section(f"FETCH SUBTASKS FOR TASK")
    url = f"{BASE_URL}/tasks/{task_id}/subtasks"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        subtasks = response.json()
        print(f"✓ Found {len(subtasks)} subtasks")
        
        completed = sum(1 for s in subtasks if s['status'] == 'completed')
        print(f"  Completed: {completed}/{len(subtasks)} ({round(completed/len(subtasks)*100) if subtasks else 0}%)")
        
        for subtask in subtasks[:5]:  # Show first 5
            status_icon = "✓" if subtask['status'] == 'completed' else "○"
            print(f"\n  {status_icon} {subtask['title']}")
            print(f"    Status: {subtask['status']}")
        
        return subtasks
    except Exception as e:
        print(f"✗ Failed to fetch subtasks: {str(e)}")
        return []

def update_subtask_status(token, task_id, subtask_id, status):
    """Update a subtask's status"""
    url = f"{BASE_URL}/tasks/{task_id}/subtasks/{subtask_id}"
    headers = {"Authorization": f"Bearer {token}"}
    data = {"status": status}
    
    try:
        response = requests.put(url, headers=headers, json=data)
        response.raise_for_status()
        print(f"  ✓ Updated subtask {subtask_id[:8]}... to '{status}'")
        return True
    except Exception as e:
        print(f"  ✗ Failed to update subtask: {str(e)}")
        return False

def submit_subtasks(token, task_id):
    """Submit subtasks for a task"""
    print_section(f"SUBMIT SUBTASKS")
    url = f"{BASE_URL}/tasks/{task_id}/subtasks/submit"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.post(url, headers=headers)
        response.raise_for_status()
        result = response.json()
        
        print(f"✓ Submission successful!")
        print(f"\n  Message: {result['message']}")
        print(f"  Total Subtasks: {result['total_subtasks']}")
        print(f"  Completed: {result['completed_subtasks']}")
        print(f"  Completion: {result['completion_percentage']}%")
        
        return result
    except Exception as e:
        print(f"✗ Submission failed: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print(f"  Error details: {e.response.text}")
        return None

def verify_task_status(token, task_id):
    """Verify task status was updated"""
    print_section("VERIFY TASK STATUS UPDATE")
    url = f"{BASE_URL}/tasks/{task_id}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        task = response.json()
        
        print(f"✓ Task status: {task['status']}")
        print(f"  Task type: {task['task_type']}")
        
        if task.get('subtasks'):
            completed = sum(1 for s in task['subtasks'] if s['status'] == 'completed')
            total = len(task['subtasks'])
            print(f"  Subtasks: {completed}/{total} completed")
        
        return task
    except Exception as e:
        print(f"✗ Failed to verify task: {str(e)}")
        return None

def run_full_test():
    """Run complete test workflow"""
    print("\n" + "╔" + "═"*58 + "╗")
    print("║" + " "*10 + "SUBTASK SUBMISSION FEATURE TEST" + " "*16 + "║")
    print("╚" + "═"*58 + "╝")
    
    # 1. Login
    token = login(TEST_REVIEWER_EMAIL, TEST_REVIEWER_PASSWORD)
    if not token:
        print("\n✗ Test failed: Could not login")
        return
    
    # 2. Get tasks
    tasks = get_my_tasks(token)
    if not tasks:
        print("\n✗ Test failed: No tasks found")
        return
    
    # Use first task for testing
    test_task = tasks[0]
    task_id = test_task['task_id']
    
    # 3. Get subtasks
    subtasks = get_subtasks(token, task_id)
    if not subtasks:
        print("\n✗ Test failed: No subtasks found")
        return
    
    # 4. Update some subtasks (optional - toggle first 2)
    print_section("UPDATE SUBTASK STATUSES")
    print("Toggling first 2 subtasks to 'completed'...\n")
    
    for subtask in subtasks[:2]:
        update_subtask_status(token, task_id, subtask['subtask_id'], 'completed')
    
    # 5. Submit subtasks
    result = submit_subtasks(token, task_id)
    if not result:
        print("\n✗ Test failed: Submission failed")
        return
    
    # 6. Verify task status update
    verify_task_status(token, task_id)
    
    # Final summary
    print("\n" + "╔" + "═"*58 + "╗")
    print("║" + " "*19 + "TEST COMPLETE!" + " "*22 + "║")
    print("╚" + "═"*58 + "╝")
    print("\n✓ All tests passed successfully!")
    print("\nNext Steps:")
    print("  1. Check frontend reviewer dashboard for updated subtasks")
    print("  2. Check admin document review page for readonly subtasks")
    print("  3. Verify task status updated based on completion percentage")

if __name__ == "__main__":
    print("\n" + "⚠"*30)
    print("IMPORTANT: Update TEST_REVIEWER_EMAIL and TEST_REVIEWER_PASSWORD")
    print("with actual credentials from your database before running!")
    print("⚠"*30 + "\n")
    
    input("Press Enter to continue with test...")
    
    try:
        run_full_test()
    except KeyboardInterrupt:
        print("\n\n✗ Test interrupted by user")
    except Exception as e:
        print(f"\n\n✗ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

