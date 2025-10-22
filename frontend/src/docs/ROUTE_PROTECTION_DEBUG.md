# Route Protection Debug Guide

## Issue: `/admin-dashboard` Not Working as Protected Route

### Current Route Structure

**✅ Hierarchical Routes (Recommended):**
- `/admin/dashboard` - Admin Dashboard
- `/admin/marketplace` - Admin Marketplace  
- `/admin/investor-interests` - Admin Investor Interests
- `/admin/document-review` - Admin Document Review

**✅ Legacy Routes (Also Available):**
- `/admin-dashboard` - Admin Dashboard (legacy)
- `/admin-marketplace` - Admin Marketplace (legacy)
- `/admin-investor-interests` - Admin Investor Interests (legacy)
- `/admin-document-review` - Admin Document Review (legacy)

### Why `/admin-dashboard` Might Not Work

**1. Authentication Issues**
- User not logged in
- User session expired
- Authentication token invalid

**2. Role-Based Access Issues**
- User doesn't have `administrator` role
- User roles not properly assigned
- Role checking failing

**3. Route Protection Issues**
- `AdminRoute` component not working
- Route protection logic failing
- Component import issues

### Debug Steps

#### Step 1: Check Authentication Status
```javascript
// In browser console
console.log('Auth Status:', localStorage.getItem('authToken'));
console.log('User Data:', JSON.parse(localStorage.getItem('user') || '{}'));
```

#### Step 2: Check User Roles
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('User Roles:', user.roles);
console.log('Has Admin Role:', user.roles?.includes('administrator'));
```

#### Step 3: Test Route Access
1. Go to `/debug/routes` to check route verification
2. Check if `/admin-dashboard` is accessible
3. Verify route protection is working

#### Step 4: Check Console Errors
- Open browser DevTools
- Check Console tab for errors
- Look for authentication or route protection errors

### Common Solutions

#### Solution 1: Use Hierarchical Routes
Instead of `/admin-dashboard`, use:
```
http://localhost:5173/admin/dashboard
```

#### Solution 2: Check User Authentication
1. Make sure you're logged in
2. Verify user has administrator role
3. Check authentication token is valid

#### Solution 3: Test Route Protection
1. Go to `/debug/routes`
2. Check route verification results
3. Test navigation to dashboard

### Route Protection Logic

**AdminRoute Component:**
```javascript
// Requires 'administrator' role
<AdminRoute>
  <AdminDashboard />
</AdminRoute>
```

**User Must Have:**
- Valid authentication token
- `administrator` role in user.roles array
- Active user session

### Testing Commands

#### Start Development Server
```bash
npm start
```

#### Check Available Routes
```bash
# Navigate to debug page
http://localhost:5173/debug/routes
```

#### Test Authentication
```bash
# Check if user is logged in
# Check user roles
# Verify route access
```

### Expected Behavior

**✅ Working Route Protection:**
1. User logs in with administrator role
2. Navigates to `/admin-dashboard`
3. `AdminRoute` checks user role
4. If authorized, shows AdminDashboard
5. If not authorized, redirects to login or shows error

**❌ Common Issues:**
1. User not logged in → Redirects to login
2. User lacks admin role → Shows "Access Denied"
3. Route protection failing → Shows error or blank page
4. Component import issues → Shows error in console

### Debug Checklist

- [ ] User is authenticated
- [ ] User has administrator role
- [ ] Route is properly defined
- [ ] AdminRoute component is working
- [ ] No console errors
- [ ] Development server is running
- [ ] Route protection is enabled

### Quick Fixes

#### Fix 1: Use Correct URL
```
# Instead of:
http://localhost:5173/admin-dashboard

# Use:
http://localhost:5173/admin/dashboard
```

#### Fix 2: Check User Role
```javascript
// In browser console
const user = JSON.parse(localStorage.getItem('user') || '{}');
if (!user.roles?.includes('administrator')) {
  console.log('User needs administrator role');
}
```

#### Fix 3: Test Route Protection
1. Go to `/debug/routes`
2. Check if route is accessible
3. Verify user permissions
4. Test navigation

### Support

If issues persist:
1. Check browser console for errors
2. Use `/debug/routes` for detailed analysis
3. Verify user authentication and roles
4. Test with different user accounts
5. Check route protection configuration
