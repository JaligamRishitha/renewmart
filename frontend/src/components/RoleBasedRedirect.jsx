import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Helper function to get role-based dashboard route
const getRoleDashboard = (user) => {
  const userRoles = user?.roles || [];
  
  if (userRoles.includes('administrator')) {
    return '/admin-dashboard';
  } else if (userRoles.includes('landowner')) {
    return '/landowner-dashboard';
  } else if (userRoles.includes('investor')) {
    return '/investor-portal';
  } else if (userRoles.includes('re_sales_advisor') || 
             userRoles.includes('re_analyst') || 
             userRoles.includes('re_governance_lead')) {
    return '/reviewer-dashboard';
  } else if (userRoles.includes('reviewer') || 
             userRoles.includes('project_manager')) {
    return '/admin-dashboard';
  } else {
    return '/dashboard';
  }
};

const RoleBasedRedirect = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      const dashboard = getRoleDashboard(user);
      navigate(dashboard, { replace: true });
    }
  }, [user, isLoading, navigate]);

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

