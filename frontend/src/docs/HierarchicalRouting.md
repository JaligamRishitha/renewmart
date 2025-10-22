# Hierarchical Routing Structure

This document outlines the new hierarchical routing structure implemented for the RenewMart application with role-based URL prefixes.

## Overview

The application now uses a hierarchical routing structure where each role has its own URL namespace:

- **Admin routes**: `/admin/*`
- **Landowner routes**: `/landowner/*`
- **Investor routes**: `/investor/*`
- **Reviewer routes**: `/reviewer/*`
- **Role-specific routes**: `/sales-advisor/*`, `/analyst/*`, `/governance/*`, `/project-manager/*`

## Route Structure

### Admin Routes (`/admin/*`)
```
/admin/dashboard              - Admin dashboard
/admin/marketplace            - Admin marketplace management
/admin/investor-interests     - Investor interests management
/admin/document-review        - Admin document review
```

### Landowner Routes (`/landowner/*`)
```
/landowner/dashboard          - Landowner dashboard
/landowner/project-status     - Project status tracking
/landowner/document-upload    - Document upload
/landowner/project-management - Project management
```

### Investor Routes (`/investor/*`)
```
/investor/portal              - Investor portal
```

### Reviewer Routes (`/reviewer/*`)
```
/reviewer/dashboard           - Reviewer dashboard
/reviewer/project/:landId     - Project details
/reviewer/document-review     - Document review
/reviewer/document-management - Document management
```

### Role-Specific Routes

#### RE Sales Advisor (`/sales-advisor/*`)
```
/sales-advisor/dashboard      - Sales advisor dashboard
/sales-advisor/project/:landId - Project details
```

#### RE Analyst (`/analyst/*`)
```
/analyst/dashboard            - Analyst dashboard
/analyst/project/:landId      - Project details
```

#### RE Governance Lead (`/governance/*`)
```
/governance/dashboard         - Governance dashboard
/governance/project/:landId   - Project details
```

#### Project Manager (`/project-manager/*`)
```
/project-manager/dashboard    - Project manager dashboard
```

## Navigation Utilities

### `getRoleNavigation(user)`
Returns navigation routes based on user's role:

```javascript
import { getRoleNavigation } from '../utils/navigation';

const navigation = getRoleNavigation(user);
// Returns:
// {
//   dashboard: '/admin/dashboard',
//   marketplace: '/admin/marketplace',
//   basePath: '/admin'
// }
```

### `getNavigationMenu(user)`
Returns navigation menu items for the user's role:

```javascript
import { getNavigationMenu } from '../utils/navigation';

const menuItems = getNavigationMenu(user);
// Returns array of menu items with label, href, and icon
```

### `canAccessRoute(route, user)`
Checks if user can access a specific route:

```javascript
import { canAccessRoute } from '../utils/navigation';

const canAccess = canAccessRoute('/admin/dashboard', user);
// Returns boolean
```

## Role-Based Redirects

The `RoleBasedRedirect` component now redirects users to their role-specific dashboard:

- **Administrator** → `/admin/dashboard`
- **Landowner** → `/landowner/dashboard`
- **Investor** → `/investor/portal`
- **RE Sales Advisor** → `/sales-advisor/dashboard`
- **RE Analyst** → `/analyst/dashboard`
- **RE Governance Lead** → `/governance/dashboard`
- **Project Manager** → `/project-manager/dashboard`
- **Reviewer** → `/reviewer/dashboard`

## Backward Compatibility

Legacy routes are maintained for backward compatibility:

```
/admin-dashboard              → /admin/dashboard
/landowner-dashboard          → /landowner/dashboard
/investor-portal              → /investor/portal
/reviewer-dashboard           → /reviewer/dashboard
/document-upload              → /landowner/document-upload
/document-review              → /reviewer/document-review
```

## Implementation Examples

### 1. Navigation Links
```jsx
import { Link } from 'react-router-dom';
import { getRoleNavigation } from '../utils/navigation';

const MyComponent = () => {
  const { user } = useAuth();
  const navigation = getRoleNavigation(user);
  
  return (
    <Link to={navigation.dashboard}>
      Dashboard
    </Link>
  );
};
```

### 2. Programmatic Navigation
```jsx
import { useNavigate } from 'react-router-dom';
import { getDashboardRoute } from '../utils/navigation';

const MyComponent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleNavigate = () => {
    const dashboardRoute = getDashboardRoute(user);
    navigate(dashboardRoute);
  };
  
  return <button onClick={handleNavigate}>Go to Dashboard</button>;
};
```

### 3. Route Protection
```jsx
import { ProtectedRoute } from '../components/ProtectedRoute';

<Route path="/admin/dashboard" element={
  <AdminRoute>
    <AdminDashboard />
  </AdminRoute>
} />
```

## Benefits

### 1. **Clear URL Structure**
- Easy to understand role-based organization
- Intuitive navigation paths
- SEO-friendly URLs

### 2. **Role-Based Security**
- Clear separation of concerns
- Easy to implement role-based access control
- Reduced security vulnerabilities

### 3. **Maintainability**
- Organized code structure
- Easy to add new role-specific features
- Clear separation of functionality

### 4. **User Experience**
- Intuitive navigation
- Role-appropriate interfaces
- Consistent URL patterns

## Migration Guide

### For Developers

1. **Update Navigation Links**
   ```jsx
   // Old
   <Link to="/admin-dashboard">Dashboard</Link>
   
   // New
   <Link to="/admin/dashboard">Dashboard</Link>
   ```

2. **Update Programmatic Navigation**
   ```jsx
   // Old
   navigate('/admin-dashboard');
   
   // New
   const navigation = getRoleNavigation(user);
   navigate(navigation.dashboard);
   ```

3. **Update Route Definitions**
   ```jsx
   // Old
   <Route path="/admin-dashboard" element={<AdminDashboard />} />
   
   // New
   <Route path="/admin/dashboard" element={
     <AdminRoute>
       <AdminDashboard />
     </AdminRoute>
   } />
   ```

### For Users

- **Automatic Redirects**: Users are automatically redirected to the new URL structure
- **Bookmark Updates**: Users may need to update bookmarks to use new URLs
- **Legacy Support**: Old URLs continue to work for backward compatibility

## Testing

### 1. **Route Testing**
```javascript
// Test role-based redirects
expect(getRoleDashboard(adminUser)).toBe('/admin/dashboard');
expect(getRoleDashboard(landownerUser)).toBe('/landowner/dashboard');
```

### 2. **Navigation Testing**
```javascript
// Test navigation menu generation
const adminMenu = getNavigationMenu(adminUser);
expect(adminMenu).toContainEqual({
  label: 'Dashboard',
  href: '/admin/dashboard',
  icon: 'LayoutDashboard'
});
```

### 3. **Access Control Testing**
```javascript
// Test route access
expect(canAccessRoute('/admin/dashboard', adminUser)).toBe(true);
expect(canAccessRoute('/admin/dashboard', landownerUser)).toBe(false);
```

## Future Enhancements

### 1. **Nested Routes**
- Implement nested routing for complex role hierarchies
- Add sub-role specific routes

### 2. **Dynamic Route Generation**
- Generate routes based on user permissions
- Dynamic menu generation

### 3. **Route Analytics**
- Track route usage patterns
- Optimize navigation based on user behavior

## Conclusion

The hierarchical routing structure provides a clean, organized, and secure way to manage role-based navigation in the RenewMart application. It improves maintainability, user experience, and security while maintaining backward compatibility.
