# Task Endpoint Fix

## Problem

The frontend was getting a `404 Not Found` error when trying to access:
```
GET http://127.0.0.1:8000/api/tasks
```

## Root Cause

**Double Prefix Issue**

In `backend/routers/tasks.py`:
```python
router = APIRouter(prefix="/tasks", tags=["tasks"])
```

In `backend/main.py` (BEFORE FIX):
```python
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
```

**Result:** `/api/tasks` + `/tasks` = `/api/tasks/tasks` ❌

This meant:
- Frontend was calling: `GET /api/tasks` 
- Backend was listening on: `GET /api/tasks/tasks`
- Result: **404 Not Found**

## Solution

Changed `backend/main.py`:
```python
app.include_router(tasks.router, prefix="/api", tags=["tasks"])
```

**Result:** `/api` + `/tasks` = `/api/tasks` ✅

Now:
- Frontend calls: `GET /api/tasks`
- Backend listens on: `GET /api/tasks`
- Result: **200 OK**

## Available Endpoints

After restarting the backend, these endpoints will be available:

### Task Management
- `GET /api/tasks` - Get all tasks (with filters)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/{task_id}` - Get task by ID
- `PUT /api/tasks/{task_id}` - Update task
- `DELETE /api/tasks/{task_id}` - Delete task
- `GET /api/tasks/{task_id}/history` - Get task history

### User-Specific
- `GET /api/tasks/assigned/me` - Get tasks assigned to current user
- `GET /api/tasks/created/me` - Get tasks created by current user

### Admin
- `GET /api/tasks/admin/all` - Get all tasks (admin only)

### Utilities
- `GET /api/tasks/types/list` - Get list of task types
- `GET /api/tasks/status/list` - Get list of task statuses
- `GET /api/tasks/priority/list` - Get list of task priorities
- `GET /api/tasks/stats/summary` - Get task statistics

## How to Apply

1. **The fix has already been applied** to `backend/main.py`

2. **Restart the backend server:**
   ```bash
   # Stop the current server (Ctrl+C if running)
   cd renewmart/backend
   python server.py
   ```

3. **Refresh your frontend:**
   - Just reload the page in your browser
   - The error should be gone!

## Verification

After restarting the backend, you can verify the endpoint works:

```bash
# Get a token first (replace with your credentials)
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# Test the tasks endpoint
curl -X GET http://localhost:8000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Or visit in your browser:
- http://localhost:8000/docs (Swagger UI)
- Look for the `/api/tasks` endpoints

## Summary

✅ **Fixed:** Removed double prefix `/api/tasks/tasks`
✅ **Now works:** Endpoint available at `/api/tasks`
✅ **Action needed:** Restart backend server

The project management page should now load without errors!

