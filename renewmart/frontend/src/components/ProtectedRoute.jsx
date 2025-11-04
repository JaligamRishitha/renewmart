import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/login',
  fallback = null 
}) => {
  const { isAuthenticated, isLoading, user, hasAnyRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
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

  // Check role-based access if roles are specified
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    // Show fallback component or redirect to unauthorized page
    if (fallback) {
      return fallback;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground max-w-md">
            You don't have the required permissions to access this page.
            {requiredRoles.length > 0 && (
              <span className="block mt-2 text-sm">
                Required roles: {requiredRoles.join(', ')}
              </span>
            )}
          </p>
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return children;
};

// Higher-order component for role-based protection
export const withRoleProtection = (Component, requiredRoles = []) => {
  return (props) => (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Specific role-based route components
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

export const ReviewerRoute = ({ children, ...props }) => (
  <ProtectedRoute 
    requiredRoles={[
      'reviewer', 
      'administrator',
      're_sales_advisor',
      're_analyst',
      'project_manager',
      're_governance_lead'
    ]} 
    {...props}
  >
    {children}
  </ProtectedRoute>
);

export const OwnerRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['landowner', 'administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

// Investor-specific route
export const InvestorRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['investor', 'administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

// Project Manager route
export const ProjectManagerRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['project_manager', 'administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

// RE Sales Advisor specific route
export const SalesAdvisorRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['re_sales_advisor', 'administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

// RE Analyst specific route
export const AnalystRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['re_analyst', 'administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

// RE Governance Lead specific route
export const GovernanceLeadRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredRoles={['re_governance_lead', 'administrator']} {...props}>
    {children}
  </ProtectedRoute>
);

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

// Public route component (redirects to dashboard if already authenticated)
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    // Redirect to role-specific dashboard or intended destination
    const roleDashboard = getRoleDashboard(user);
    const from = location.state?.from || roleDashboard;
    return <Navigate to={from} replace />;
  }

  return children;
};

export default ProtectedRoute;