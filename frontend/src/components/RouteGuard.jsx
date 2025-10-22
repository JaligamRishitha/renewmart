import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Route guard component for individual page protection
const RouteGuard = ({ 
  children, 
  allowedRoles = [], 
  allowedPermissions = [],
  redirectTo = null,
  onUnauthorized = null 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading, user, hasAnyRole } = useAuth();

  useEffect(() => {
    // Don't check while loading
    if (isLoading) return;

    // Check authentication
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    // Check role-based access
    if (allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
      if (onUnauthorized) {
        onUnauthorized();
        return;
      }

      // Default unauthorized handling
      navigate('/unauthorized', { 
        state: { 
          from: location.pathname,
          requiredRoles: allowedRoles,
          userRoles: user?.roles || []
        },
        replace: true 
      });
      return;
    }

    // Check permissions (if implemented)
    if (allowedPermissions.length > 0) {
      // This would need to be implemented based on your permission system
      console.log('Permission check not yet implemented for:', allowedPermissions);
    }

  }, [isAuthenticated, isLoading, user, allowedRoles, allowedPermissions, navigate, location, hasAnyRole, onUnauthorized]);

  // Show loading while checking
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated or authorized
  if (!isAuthenticated || (allowedRoles.length > 0 && !hasAnyRole(allowedRoles))) {
    return null;
  }

  return children;
};

// HOC for protecting components
export const withRouteGuard = (Component, options = {}) => {
  return (props) => (
    <RouteGuard {...options}>
      <Component {...props} />
    </RouteGuard>
  );
};

// Hook for route protection logic
export const useRouteGuard = () => {
  const { isAuthenticated, user, hasAnyRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const checkAccess = (allowedRoles = [], allowedPermissions = []) => {
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
      return false;
    }

    if (allowedRoles.length > 0 && !hasAnyRole(allowedRoles)) {
      navigate('/unauthorized', { 
        state: { 
          from: location.pathname,
          requiredRoles: allowedRoles,
          userRoles: user?.roles || []
        },
        replace: true 
      });
      return false;
    }

    return true;
  };

  const requireAuth = () => {
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
      return false;
    }
    return true;
  };

  const requireRole = (roles) => {
    if (!requireAuth()) return false;
    
    if (!hasAnyRole(roles)) {
      navigate('/unauthorized', { 
        state: { 
          from: location.pathname,
          requiredRoles: roles,
          userRoles: user?.roles || []
        },
        replace: true 
      });
      return false;
    }
    return true;
  };

  return {
    checkAccess,
    requireAuth,
    requireRole,
    isAuthenticated,
    user,
    hasAnyRole,
    hasRole
  };
};

export default RouteGuard;
