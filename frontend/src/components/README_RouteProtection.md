# Route Protection System

This document outlines the comprehensive route protection system implemented for the RenewMart application.

## Overview

The route protection system provides multiple layers of security:
1. **Authentication Protection** - Ensures users are logged in
2. **Role-Based Access Control** - Restricts access based on user roles
3. **Permission-Based Access** - Future implementation for granular permissions
4. **Route Guards** - Individual page protection

## Components

### 1. ProtectedRoute Component
**Location**: `src/components/ProtectedRoute.jsx`

Main component for protecting routes with role-based access control.

**Usage**:
```jsx
import ProtectedRoute, { AdminRoute, ReviewerRoute, OwnerRoute } from './components/ProtectedRoute';

// Basic protection
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>

// Role-specific protection
<AdminRoute>
  <AdminDashboard />
</AdminRoute>

<ReviewerRoute>
  <ReviewerDashboard />
</ReviewerRoute>

<OwnerRoute>
  <LandownerDashboard />
</OwnerRoute>
```

**Available Role Components**:
- `AdminRoute` - Administrator only
- `ReviewerRoute` - Reviewers, administrators, and specific reviewer roles
- `OwnerRoute` - Landowners and administrators
- `InvestorRoute` - Investors and administrators
- `ProjectManagerRoute` - Project managers and administrators
- `SalesAdvisorRoute` - RE Sales Advisors and administrators
- `AnalystRoute` - RE Analysts and administrators
- `GovernanceLeadRoute` - RE Governance Leads and administrators

### 2. RouteProtection Component
**Location**: `src/components/RouteProtection.jsx`

Advanced route protection with middleware-like functionality.

**Usage**:
```jsx
import RouteProtection from './components/RouteProtection';

<RouteProtection 
  requiredRoles={['administrator', 'project_manager']}
  requiredPermissions={['manage_users']}
  redirectTo="/unauthorized"
>
  <AdminPanel />
</RouteProtection>
```

### 3. RouteGuard Component
**Location**: `src/components/RouteGuard.jsx`

Individual page protection with hooks and HOCs.

**Usage**:
```jsx
import RouteGuard, { withRouteGuard, useRouteGuard } from './components/RouteGuard';

// Component protection
<RouteGuard allowedRoles={['administrator']}>
  <AdminPage />
</RouteGuard>

// HOC protection
const ProtectedComponent = withRouteGuard(MyComponent, {
  allowedRoles: ['administrator']
});

// Hook usage
const { requireAuth, requireRole, checkAccess } = useRouteGuard();
```

### 4. AuthContext Enhancements
**Location**: `src/contexts/AuthContext.jsx`

Enhanced authentication context with additional role checking methods.

**New Methods**:
- `isInvestor()` - Check if user is investor
- `isProjectManager()` - Check if user is project manager
- `isSalesAdvisor()` - Check if user is RE Sales Advisor
- `isAnalyst()` - Check if user is RE Analyst
- `isGovernanceLead()` - Check if user is RE Governance Lead
- `isAnyReviewer()` - Check if user has any reviewer role
- `getPrimaryRole()` - Get user's primary role for navigation

## Route Configuration

### Public Routes
Routes accessible without authentication:
- `/login` - Login page
- `/registration` - User registration
- `/register` - Alternative registration
- `/unauthorized` - Access denied page

### Protected Routes by Role

#### Administrator Routes
- `/admin-dashboard` - Main admin dashboard
- `/admin-marketplace` - Admin marketplace management
- `/admin-investor-interests` - Investor interests management
- `/admin-document-review` - Admin document review

#### Reviewer Routes
- `/document-review` - Document review interface
- `/reviewer-dashboard` - Reviewer dashboard
- `/document-management` - Document management
- `/sales-advisor-dashboard` - RE Sales Advisor specific
- `/analyst-dashboard` - RE Analyst specific
- `/governance-dashboard` - RE Governance Lead specific

#### Landowner Routes
- `/landowner-dashboard` - Landowner dashboard
- `/landowner-project-status` - Project status tracking
- `/document-upload` - Document upload
- `/project-management` - Project management

#### Investor Routes
- `/investor-portal` - Investor portal

#### General Protected Routes
- `/dashboard` - General dashboard
- `/marketplace` - Public marketplace
- `/project-details/:landId` - Project details (authenticated users)

## Implementation Examples

### 1. Basic Route Protection
```jsx
// In Routes.jsx
<Route path="/admin-dashboard" element={
  <AdminRoute>
    <AdminDashboard />
  </AdminRoute>
} />
```

### 2. Custom Role Protection
```jsx
<Route path="/special-page" element={
  <ProtectedRoute requiredRoles={['administrator', 'project_manager']}>
    <SpecialPage />
  </ProtectedRoute>
} />
```

### 3. Component-Level Protection
```jsx
// In a component
import { useRouteGuard } from '../components/RouteGuard';

const MyComponent = () => {
  const { requireAuth, requireRole } = useRouteGuard();
  
  useEffect(() => {
    requireRole(['administrator']);
  }, []);
  
  return <div>Protected content</div>;
};
```

### 4. HOC Protection
```jsx
import { withRouteGuard } from '../components/RouteGuard';

const ProtectedComponent = withRouteGuard(MyComponent, {
  allowedRoles: ['administrator', 'project_manager']
});
```

## Error Handling

### Unauthorized Access
When users try to access restricted routes:
1. **Not Authenticated** - Redirected to `/login`
2. **Wrong Role** - Redirected to `/unauthorized` with role information
3. **Loading State** - Shows loading spinner while checking access

### Unauthorized Page
The `/unauthorized` page provides:
- Clear explanation of access denial
- Required roles information
- User's current roles
- Navigation options (Go Back, Go to Dashboard)
- Help text for requesting access

## Security Features

### 1. Token Validation
- Automatic token validation on route access
- Token expiration handling
- Automatic logout on invalid tokens

### 2. Role Hierarchy
- Administrator has access to all routes
- Role-specific access control
- Multiple role support per user

### 3. Route State Management
- Preserves intended destination for redirects
- Maintains navigation history
- Handles deep linking with authentication

### 4. Loading States
- Prevents flash of unauthorized content
- Smooth loading transitions
- User feedback during access checks

## Best Practices

### 1. Route Organization
- Group routes by role requirements
- Use descriptive route names
- Implement consistent protection patterns

### 2. Error Handling
- Provide clear error messages
- Offer alternative navigation options
- Log unauthorized access attempts

### 3. Performance
- Minimize authentication checks
- Cache role information
- Optimize loading states

### 4. User Experience
- Smooth redirects
- Clear access denied messages
- Helpful navigation options

## Future Enhancements

### 1. Permission System
- Granular permission-based access
- Resource-specific permissions
- Dynamic permission loading

### 2. Advanced Route Guards
- Route-level middleware
- Conditional route rendering
- Dynamic route generation

### 3. Audit Logging
- Access attempt logging
- Security event tracking
- Compliance reporting

## Testing

### 1. Unit Tests
- Test role checking functions
- Test route protection logic
- Test error handling

### 2. Integration Tests
- Test complete authentication flow
- Test role-based redirects
- Test unauthorized access handling

### 3. E2E Tests
- Test user journey with different roles
- Test access denial scenarios
- Test navigation flows

## Troubleshooting

### Common Issues
1. **Infinite Redirects** - Check role requirements and user roles
2. **Loading Loops** - Verify authentication state management
3. **Access Denied Errors** - Check role assignments and route requirements

### Debug Tools
- Browser DevTools for route state
- Console logging for authentication checks
- Network tab for API calls

## Conclusion

The route protection system provides comprehensive security for the RenewMart application with multiple layers of protection, clear error handling, and excellent user experience. The system is extensible and maintainable, supporting future enhancements while providing robust security for the current application.
