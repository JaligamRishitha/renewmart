import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper function to get role-based dashboard route with hierarchical structure
const getRoleDashboard = (user) => {
  const userRoles = user?.roles || [];
  
  if (userRoles.includes('administrator')) {
    return '/admin/dashboard';
  } else if (userRoles.includes('landowner')) {
    return '/landowner/dashboard';
  } else if (userRoles.includes('investor')) {
    return '/investor/portal';
  } else if (userRoles.includes('re_sales_advisor')) {
    return '/sales-advisor/dashboard';
  } else if (userRoles.includes('re_analyst')) {
    return '/analyst/dashboard';
  } else if (userRoles.includes('re_governance_lead')) {
    return '/governance/dashboard';
  } else if (userRoles.includes('project_manager')) {
    return '/project-manager/dashboard';
  } else if (userRoles.includes('reviewer')) {
    return '/reviewer/dashboard';
  } else {
    return '/dashboard';
  }
};

const RoleBasedRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const lastUserKey = useRef(null);

  useEffect(() => {
    // Only navigate if user is loaded and we have a user
    if (!isLoading && user) {
      const dashboard = getRoleDashboard(user);
      
      // Create a stable key from user ID and roles to detect actual user changes
      const userKey = `${user.id || user.user_id || 'unknown'}_${(user.roles || []).join(',')}`;
      
      // Check if we're already on the target dashboard - if so, don't navigate
      if (location.pathname === dashboard) {
        lastUserKey.current = userKey;
        return;
      }
      
      // Only navigate if:
      // 1. We're on root or dashboard route (where redirect is expected)
      // 2. User has actually changed (different user or roles) OR we haven't navigated yet
      if ((location.pathname === '/' || location.pathname === '/dashboard')) {
        if (lastUserKey.current !== userKey) {
          lastUserKey.current = userKey;
          navigate(dashboard, { replace: true });
        }
      }
    } else if (!isLoading && !user) {
      // Reset when user logs out
      lastUserKey.current = null;
    }
  }, [user, isLoading, navigate, location.pathname]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};

export default RoleBasedRedirect;

