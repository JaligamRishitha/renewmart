import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Icon from './AppIcon';

const RouteTest = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    if (user) {
      const results = {
        isAuthenticated,
        isLoading,
        userRoles: user?.roles || [],
        hasAdminRole: user?.roles?.includes('administrator'),
        currentPath: location.pathname,
        userData: user
      };
      setTestResults(results);
    }
  }, [user, isAuthenticated, isLoading, location]);

  const testRouteAccess = (route) => {
    try {
      navigate(route);
      return { success: true, route };
    } catch (error) {
      return { success: false, error: error.message, route };
    }
  };

  const testRoutes = [
    { path: '/admin/dashboard', label: 'Admin Dashboard (Hierarchical)' },
    { path: '/admin-dashboard', label: 'Admin Dashboard (Legacy)' },
    { path: '/admin/marketplace', label: 'Admin Marketplace (Hierarchical)' },
    { path: '/admin-marketplace', label: 'Admin Marketplace (Legacy)' },
    { path: '/debug/routes', label: 'Route Debugger' }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">Route Protection Test</h1>
          
          {/* Current Status */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">Current Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
                <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
                <p><strong>Current Path:</strong> {location.pathname}</p>
              </div>
              <div>
                <p><strong>User Roles:</strong> {testResults.userRoles?.join(', ') || 'None'}</p>
                <p><strong>Has Admin Role:</strong> {testResults.hasAdminRole ? 'Yes' : 'No'}</p>
                <p><strong>User ID:</strong> {user?.user_id || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Route Tests */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Test Routes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testRoutes.map((route) => (
                <div key={route.path} className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-foreground">{route.label}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testRouteAccess(route.path)}
                      iconName="ExternalLink"
                      iconSize={16}
                    >
                      Test
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{route.path}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="default"
                onClick={() => navigate('/admin/dashboard')}
                iconName="LayoutDashboard"
                iconSize={16}
              >
                Go to Admin Dashboard (Hierarchical)
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/admin-dashboard')}
                iconName="LayoutDashboard"
                iconSize={16}
              >
                Go to Admin Dashboard (Legacy)
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/debug/routes')}
                iconName="Bug"
                iconSize={16}
              >
                Open Route Debugger
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                iconName="LogIn"
                iconSize={16}
              >
                Go to Login
              </Button>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="mt-6 bg-warning/10 border border-warning/20 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-warning mb-3">Troubleshooting</h2>
            <div className="space-y-2 text-sm">
              <p><strong>If routes don't work:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Check if you're logged in</li>
                <li>Verify you have administrator role</li>
                <li>Check browser console for errors</li>
                <li>Try the hierarchical routes first</li>
                <li>Use the route debugger for detailed analysis</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteTest;
