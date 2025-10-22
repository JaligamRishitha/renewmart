import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Route protection middleware component
const RouteProtection = ({ 
  children, 
  requiredRoles = [], 
  requiredPermissions = [],
  redirectTo = '/login',
  fallback = null,
  allowPublic = false 
}) => {
  const { isAuthenticated, isLoading, user, hasAnyRole, hasRole } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Allow public access if specified
  if (allowPublic) {
    return children;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have the required permissions to access this page.
          </p>
          {requiredRoles.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium text-foreground mb-1">Required roles:</p>
              <p className="text-muted-foreground">{requiredRoles.join(', ')}</p>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Go Back
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check permission-based access (if implemented)
  if (requiredPermissions.length > 0) {
    // This would need to be implemented based on your permission system
    // For now, we'll assume all authenticated users with proper roles have permissions
    console.log('Permission check not yet implemented');
  }

  // All checks passed, render children
  return children;
};

// Higher-order component for route protection
export const withRouteProtection = (Component, options = {}) => {
  return (props) => (
    <RouteProtection {...options}>
      <Component {...props} />
    </RouteProtection>
  );
};

// Route protection hooks
export const useRouteProtection = () => {
  const { isAuthenticated, user, hasAnyRole, hasRole } = useAuth();
  
  const canAccess = (requiredRoles = [], requiredPermissions = []) => {
    if (!isAuthenticated) return false;
    if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) return false;
    // Add permission checks here if needed
    return true;
  };

  const requireAuth = () => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }
  };

  const requireRole = (roles) => {
    requireAuth();
    if (!hasAnyRole(roles)) {
      throw new Error(`Required roles: ${roles.join(', ')}`);
    }
  };

  return {
    canAccess,
    requireAuth,
    requireRole,
    isAuthenticated,
    user,
    hasAnyRole,
    hasRole
  };
};

export default RouteProtection;
