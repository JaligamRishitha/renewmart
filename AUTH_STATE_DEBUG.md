# Authentication State Debug Guide

## Problem
Getting "Not authenticated" error when posting to `/api/lands/` even though you're logged in.

## Root Causes

### 1. Token Not in localStorage
**Check**: Open browser DevTools (F12) → Console → Type:
```javascript
localStorage.getItem('authToken')
```

**If null/undefined**: You need to log in again.

### 2. Token Expired
JWT tokens expire after 30 minutes. If you logged in more than 30 minutes ago, the token is invalid.

**Solution**: Log out and log back in.

### 3. Page Refresh Clears State
If you refresh the page while on a form, the AuthContext might not reinitialize properly.

**Solution**: Navigate away and back, or refresh and wait 2-3 seconds for auth to initialize.

## Quick Fixes

### Option 1: Re-login (Recommended)
1. Click "Logout" in the header
2. Log back in with your credentials
3. Try creating a land again

### Option 2: Hard Refresh
1. Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Wait for page to fully load
3. Try again

### Option 3: Clear Storage and Login
```javascript
// In browser console (F12)
localStorage.clear();
// Then reload page and login
location.reload();
```

## Testing Authentication

### Test 1: Check if Token Exists
```javascript
// In browser console
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', localStorage.getItem('user'));
```

### Test 2: Verify Token is Being Sent
1. Open DevTools (F12) → Network tab
2. Try to create a land
3. Click on the POST request to `/api/lands/`
4. Check "Request Headers"
5. Look for: `Authorization: Bearer eyJ...`

**If missing**: Token isn't being sent → Re-login needed

### Test 3: Check Token Validity
```javascript
// In browser console
fetch('http://localhost:8000/api/users/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
.then(r => r.json())
.then(d => console.log('Token valid:', d))
.catch(e => console.log('Token invalid:', e));
```

## Prevention

### Keep Session Alive
If you're working for extended periods:

1. **Enable "Remember Me"** (if available)
2. **Refresh before 30 minutes** - Set a reminder
3. **Test small changes frequently** - Don't wait long between saves

### Development Tip
Add this to your browser console to see auth status:
```javascript
setInterval(() => {
  const token = localStorage.getItem('authToken');
  console.log('[Auth Check]', token ? '✓ Authenticated' : '✗ Not Authenticated');
}, 60000); // Check every minute
```

## Common Scenarios

### Scenario 1: "I was logged in, but now I'm not"
**Cause**: Token expired (30 min timeout)  
**Fix**: Log out and log back in

### Scenario 2: "I just logged in but still getting error"
**Cause**: Auth state not fully initialized  
**Fix**: Wait 2-3 seconds or refresh the page

### Scenario 3: "Works in one tab but not another"
**Cause**: localStorage is shared but React state isn't  
**Fix**: Refresh the other tab or use only one tab

### Scenario 4: "Worked yesterday, doesn't work today"
**Cause**: Token from yesterday is long expired  
**Fix**: Always log in fresh each day

## Error Messages Explained

| Error Message | Status | Meaning | Fix |
|--------------|--------|---------|-----|
| "Not authenticated" | 401 | No token or invalid token | Re-login |
| "Could not validate credentials" | 401 | Token format wrong or expired | Re-login |
| "Token has expired" | 403 | JWT expired (>30 min old) | Re-login |
| "Insufficient permissions" | 403 | Wrong role for endpoint | Check your role |

## For Developers

### Extend Token Lifetime (Development Only)
```python
# backend/auth.py
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
```

### Add Token Refresh
The current implementation doesn't have automatic token refresh. Consider adding:
1. Refresh tokens
2. Silent token renewal
3. "Keep me logged in" option

---

## Quick Diagnosis Checklist

Run this in your browser console:
```javascript
// Auth Diagnostic
console.log('=== AUTH DIAGNOSTIC ===');
console.log('Token exists:', !!localStorage.getItem('authToken'));
console.log('User exists:', !!localStorage.getItem('user'));
console.log('Token preview:', localStorage.getItem('authToken')?.substring(0, 20) + '...');

// Check if token is expired
try {
  const token = localStorage.getItem('authToken');
  if (token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expDate = new Date(payload.exp * 1000);
    const now = new Date();
    console.log('Token expires:', expDate.toLocaleString());
    console.log('Is expired:', expDate < now);
    console.log('Time remaining:', Math.round((expDate - now) / 1000 / 60), 'minutes');
  }
} catch (e) {
  console.log('Error parsing token:', e.message);
}
console.log('======================');
```

---

**Bottom Line**: If you're getting "Not authenticated", 99% of the time the fix is to **log out and log back in**. 🔄

