# Routing Debug Guide

## Overview
This guide helps you debug routing issues in the RenewMart application, particularly dashboard access problems.

## Quick Debug Steps

### 1. Access the Route Debugger
Navigate to `/debug/routes` in your browser to access the comprehensive route debugging tool.

### 2. Check Current User Status
The debugger will show:
- Authentication status
- User roles
- Current path
- Available routes

### 3. Verify Dashboard Route
The debugger will show the expected dashboard route for your user role and provide a button to navigate directly to it.

## Hierarchical Route Structure

### Admin Routes (`/admin/*`)
- `/admin/dashboard` - Admin Dashboard
- `/admin/marketplace` - Admin Marketplace
- `/admin/investor-interests` - Admin Investor Interests
- `/admin/document-review` - Admin Document Review

### Landowner Routes (`/landowner/*`)
- `/landowner/dashboard` - Landowner Dashboard
- `/landowner/project-status` - Project Status
- `/landowner/document-upload` - Document Upload
- `/landowner/project-management` - Project Management

### Investor Routes (`/investor/*`)
- `/investor/portal` - Investor Portal

### Reviewer Routes (`/reviewer/*`)
- `/reviewer/dashboard` - Reviewer Dashboard
- `/reviewer/document-review` - Document Review
- `/reviewer/document-management` - Document Management

### Role-Specific Routes
- `/sales-advisor/dashboard` - Sales Advisor Dashboard
- `/analyst/dashboard` - Analyst Dashboard
- `/governance/dashboard` - Governance Dashboard
- `/project-manager/dashboard` - Project Manager Dashboard

## Common Issues and Solutions

### Issue 1: "Not able to open dashboard"
**Possible Causes:**
1. User not authenticated
2. User has no roles assigned
3. Route protection blocking access
4. Component import issues

**Solutions:**
1. Check authentication status in debugger
2. Verify user roles are assigned
3. Check route protection configuration
4. Verify component imports in Routes.jsx

### Issue 2: "Access Denied" errors
**Possible Causes:**
1. User lacks required roles
2. Route protection misconfiguration
3. Role-based redirect issues

**Solutions:**
1. Check user roles in debugger
2. Verify route protection settings
3. Check RoleBasedRedirect component

### Issue 3: Navigation not working
**Possible Causes:**
1. Route not defined
2. Component not imported
3. Navigation utility errors

**Solutions:**
1. Check route definitions in Routes.jsx
2. Verify component imports
3. Test navigation utilities

## Debug Tools Available

### 1. Route Debugger (`/debug/routes`)
- Shows current user status
- Lists available routes
- Tests specific routes
- Shows verification results

### 2. Route Checker Utilities
- `checkRouteConfiguration()` - Check route setup
- `getDashboardRoute()` - Get user's dashboard route
- `checkSpecificRoute()` - Test specific route access

### 3. Route Verification
- `verifyHierarchicalRoutes()` - Verify route structure
- `checkDashboardRoutes()` - Check dashboard configuration
- `checkNavigationConsistency()` - Verify navigation setup

## Testing Steps

### 1. Test Authentication
```javascript
// Check if user is authenticated
const { isAuthenticated, user } = useAuth();
console.log('Authenticated:', isAuthenticated);
console.log('User:', user);
```

### 2. Test Role Assignment
```javascript
// Check user roles
const { user } = useAuth();
console.log('User roles:', user?.roles);
```

### 3. Test Dashboard Route
```javascript
// Get expected dashboard route
import { getDashboardRoute } from '../utils/routeChecker';
const dashboardRoute = getDashboardRoute(user);
console.log('Dashboard route:', dashboardRoute);
```

### 4. Test Route Access
```javascript
// Check if route is accessible
import { checkSpecificRoute } from '../utils/routeChecker';
const routeCheck = checkSpecificRoute('/admin/dashboard', user);
console.log('Route accessible:', routeCheck.canAccess);
```

## Route Protection Types

### 1. PublicRoute
- No authentication required
- Used for login, registration

### 2. ProtectedRoute
- Authentication required
- Basic access control

### 3. Role-Based Routes
- `AdminRoute` - Administrator access
- `OwnerRoute` - Landowner access
- `InvestorRoute` - Investor access
- `ReviewerRoute` - Reviewer access
- `SalesAdvisorRoute` - Sales Advisor access
- `AnalystRoute` - Analyst access
- `GovernanceLeadRoute` - Governance Lead access
- `ProjectManagerRoute` - Project Manager access

## Navigation Structure

### Role-Based Navigation
Each role has a specific navigation structure:

```javascript
// Admin navigation
{
  dashboard: '/admin/dashboard',
  marketplace: '/admin/marketplace',
  investorInterests: '/admin/investor-interests',
  documentReview: '/admin/document-review',
  basePath: '/admin'
}

// Landowner navigation
{
  dashboard: '/landowner/dashboard',
  projectStatus: '/landowner/project-status',
  documentUpload: '/landowner/document-upload',
  projectManagement: '/landowner/project-management',
  basePath: '/landowner'
}
```

### Navigation Menu
The navigation menu is generated based on user roles and provides hierarchical access to all available routes.

## Troubleshooting Checklist

- [ ] User is authenticated
- [ ] User has appropriate roles
- [ ] Route is defined in Routes.jsx
- [ ] Component is imported
- [ ] Route protection is configured
- [ ] Navigation utilities are working
- [ ] No console errors
- [ ] Build is successful

## Common Error Messages

### "Access Denied"
- Check user roles
- Verify route protection
- Check navigation permissions

### "Route not found"
- Check route definition
- Verify component import
- Check route path spelling

### "Component not found"
- Check component import
- Verify component exists
- Check file path

## Best Practices

1. **Always use hierarchical routes** - Follow the pattern `/role/feature`
2. **Test route protection** - Verify access control works
3. **Check navigation consistency** - Ensure all routes are accessible
4. **Use debug tools** - Leverage the route debugger for troubleshooting
5. **Verify user roles** - Ensure users have appropriate permissions

## Support

If you continue to experience routing issues:

1. Use the Route Debugger at `/debug/routes`
2. Check browser console for errors
3. Verify user authentication and roles
4. Test individual route access
5. Check route protection configuration

The debug tools will provide detailed information about what's working and what needs to be fixed.
