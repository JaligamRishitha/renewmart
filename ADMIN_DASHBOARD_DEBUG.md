# Admin Dashboard Troubleshooting Guide

## Issue: Submitted projects not showing in Admin Dashboard

### Backend Verification ✓

The database query shows **2 submitted projects** exist:
```
Title: SE1
ID: 2d551f7a-c037-42ff-b85c-4e3c59adc281
Location: UK
Type: (empty)
Energy: solar
Landowner: Rishitha Jaligam (jaligamrishitha@gmail.com)
Status: submitted
```

### Admin User Credentials

**Email:** `admin@gmail.com`
**Name:** Aryan Sai
**Role:** administrator

### Troubleshooting Steps

#### 1. Check if Backend Server is Running

```bash
cd renewmart/backend
python server.py
```

The backend should be running on `http://localhost:8000`

#### 2. Check Admin Login

Login to the frontend with:
- **Email:** `admin@gmail.com`
- **Password:** (use the password set during user creation)

Common passwords to try:
- `Admin@123`
- `Admin123`
- `admin@123`

#### 3. Check Browser Console

Open browser DevTools (F12) and check the Console tab for errors:

**Look for:**
- Network errors (401, 403, 500)
- CORS errors
- Authentication errors
- API endpoint errors

#### 4. Check Network Tab

In DevTools Network tab, look for:

**Request:** `GET /api/lands/admin/projects`

**Expected Response:**
```json
[
  {
    "id": "2d551f7a-c037-42ff-b85c-4e3c59adc281",
    "landownerName": "Rishitha Jaligam",
    "landownerEmail": "jaligamrishitha@gmail.com",
    "location": "UK",
    "projectType": "Not specified",
    "energyType": "solar",
    "capacity": "60.00 MW",
    "status": "submitted",
    ...
  }
]
```

**Common Issues:**
- **401 Unauthorized:** Admin not logged in or token expired
- **403 Forbidden:** User doesn't have administrator role
- **404 Not Found:** API endpoint not registered
- **500 Internal Server Error:** Backend error

#### 5. Verify API Endpoint is Working

Open a new terminal and test the endpoint directly:

```bash
cd renewmart/backend

# First, get a token
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"YOUR_PASSWORD"}'

# Then use the token to test admin endpoint
curl -X GET http://localhost:8000/api/lands/admin/projects \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 6. Check Frontend State

Add console logs to see what's happening:

**In `admin-dashboard/index.jsx`, add:**

```javascript
useEffect(() => {
  console.log('Fetching admin data...');
  fetchAdminData();
}, [filters.status]);

const fetchAdminData = async () => {
  try {
    console.log('Calling API...');
    setLoading(true);
    setError(null);
    
    const statusFilter = filters.status ? { status_filter: filters.status } : {};
    console.log('Status filter:', statusFilter);
    
    const [projectsResponse, summaryResponse] = await Promise.all([
      landsAPI.getAdminProjects(statusFilter),
      landsAPI.getAdminSummary()
    ]);
    
    console.log('Projects response:', projectsResponse);
    console.log('Summary response:', summaryResponse);
    
    setProjects(projectsResponse);
    setSummaryData(summaryResponse);
  } catch (err) {
    console.error('Error fetching admin data:', err);
    console.error('Error details:', err.response?.data);
    setError('Failed to load admin data. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

#### 7. Check localStorage for Token

Open browser console and run:

```javascript
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));
```

If token is missing or invalid, logout and login again.

#### 8. Clear Browser Cache

Sometimes old code/data is cached:
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

#### 9. Check User Roles in Token

The JWT token should contain the admin role. Decode it at https://jwt.io to verify.

Expected payload:
```json
{
  "user_id": "...",
  "email": "admin@gmail.com",
  "roles": ["administrator"],
  ...
}
```

### Solution Steps

**Most Likely Issue:** User not logged in as admin or token expired

**Solution:**
1. Logout from frontend
2. Login with `admin@gmail.com` and correct password
3. Navigate to Admin Dashboard
4. Projects should now appear

**If still not working:**
1. Check backend server is running (`python server.py`)
2. Check backend logs for errors
3. Check browser console for errors
4. Verify API endpoint returns data (use curl or Postman)
5. Check if user has administrator role in database

