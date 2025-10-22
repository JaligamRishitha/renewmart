import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkRouteConfiguration, getDashboardRoute, checkSpecificRoute, getAllAvailableRoutes } from '../utils/routeChecker';
import { verifyAllRoutes } from '../utils/routeVerification';
import { simpleRouteVerification, getSimpleDashboardRoute, isRouteAccessible, getAvailableRoutes } from '../utils/simpleRouteVerification';
import Icon from './AppIcon';
import Button from './ui/Button';

const RouteDebugger = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [debugInfo, setDebugInfo] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [routeCheck, setRouteCheck] = useState(null);
  const [verificationResults, setVerificationResults] = useState(null);
  const [simpleVerification, setSimpleVerification] = useState(null);

  useEffect(() => {
    if (user) {
      const config = checkRouteConfiguration(user);
      setDebugInfo(config);
      
      // Simple verification (synchronous)
      const simple = simpleRouteVerification(user);
      setSimpleVerification(simple);
      
      const runVerification = async () => {
        try {
          const verification = await verifyAllRoutes(user);
          setVerificationResults(verification);
        } catch (error) {
          console.error('Verification error:', error);
          setVerificationResults({
            success: false,
            hierarchical: { success: true, errors: [], warnings: [] },
            dashboard: { success: true, errors: [], warnings: [] },
            navigation: { success: false, errors: [`Verification failed: ${error.message}`], warnings: [] },
            summary: { totalErrors: 1, totalWarnings: 0, hasErrors: true, hasWarnings: false }
          });
        }
      };
      
      runVerification();
    }
  }, [user]);

  const handleCheckRoute = () => {
    if (selectedRoute) {
      const check = checkSpecificRoute(selectedRoute, user);
      setRouteCheck(check);
    }
  };

  const handleNavigateToDashboard = () => {
    const dashboardRoute = getDashboardRoute(user);
    navigate(dashboardRoute);
  };

  const allRoutes = getAllAvailableRoutes();

  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg">
        <h2 className="text-xl font-semibold text-foreground mb-4">Route Debugger</h2>
        <p className="text-muted-foreground">Please login to debug routes.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-card border border-border rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Route Debugger</h2>
        <Button
          variant="outline"
          onClick={handleNavigateToDashboard}
          iconName="Home"
          iconSize={16}
        >
          Go to Dashboard
        </Button>
      </div>

      {/* Current User Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Current User</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
          <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
          <p><strong>Current Path:</strong> {location.pathname}</p>
          <p><strong>User Roles:</strong> {user?.roles?.join(', ') || 'None'}</p>
          <p><strong>User ID:</strong> {user?.user_id || 'Unknown'}</p>
        </div>
      </div>

      {/* Route Configuration Check */}
      {debugInfo && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">Route Configuration</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Valid:</strong> {debugInfo.isValid ? 'Yes' : 'No'}</p>
            <p><strong>Has Warnings:</strong> {debugInfo.hasWarnings ? 'Yes' : 'No'}</p>
            <p><strong>Available Routes:</strong> {debugInfo.routes.length}</p>
            
            {debugInfo.issues.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-600">Issues:</p>
                <ul className="list-disc list-inside space-y-1">
                  {debugInfo.issues.map((issue, index) => (
                    <li key={index} className="text-red-600">{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {debugInfo.warnings.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-yellow-600">Warnings:</p>
                <ul className="list-disc list-inside space-y-1">
                  {debugInfo.warnings.map((warning, index) => (
                    <li key={index} className="text-yellow-600">{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <p className="font-medium text-foreground">Available Routes:</p>
              <div className="max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside space-y-1">
                  {debugInfo.routes.map((route, index) => (
                    <li key={index} className="text-muted-foreground">{route}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Route Checker */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Check Specific Route</h3>
        <div className="flex gap-2 mb-3">
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
          >
            <option value="">Select a route to check</option>
            {allRoutes.map((route) => (
              <option key={route} value={route}>{route}</option>
            ))}
          </select>
          <Button
            onClick={handleCheckRoute}
            disabled={!selectedRoute}
            iconName="Search"
            iconSize={16}
          >
            Check
          </Button>
        </div>

        {routeCheck && (
          <div className="space-y-2 text-sm">
            <p><strong>Route:</strong> {routeCheck.route}</p>
            <p><strong>Can Access:</strong> {routeCheck.canAccess ? 'Yes' : 'No'}</p>
            <p><strong>In Navigation:</strong> {routeCheck.isInNavigation ? 'Yes' : 'No'}</p>
            <p><strong>Exists:</strong> {routeCheck.exists ? 'Yes' : 'No'}</p>
            {routeCheck.error && (
              <p className="text-red-600"><strong>Error:</strong> {routeCheck.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Simple Route Verification Results */}
      {simpleVerification && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">Simple Route Verification</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Success:</strong> {simpleVerification.success ? 'Yes' : 'No'}</p>
            <p><strong>Errors:</strong> {simpleVerification.errors.length}</p>
            <p><strong>Warnings:</strong> {simpleVerification.warnings.length}</p>
            
            {simpleVerification.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-600">Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {simpleVerification.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <p className="font-medium text-foreground">Available Routes:</p>
              <div className="max-h-32 overflow-y-auto">
                <ul className="list-disc list-inside space-y-1">
                  {Object.values(simpleVerification.routes).flat().map((route, index) => (
                    <li key={index} className="text-muted-foreground">{route}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Route Verification Results */}
      {verificationResults && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">Advanced Route Verification</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Overall Success:</strong> {verificationResults.success ? 'Yes' : 'No'}</p>
            <p><strong>Total Errors:</strong> {verificationResults.summary.totalErrors}</p>
            <p><strong>Total Warnings:</strong> {verificationResults.summary.totalWarnings}</p>
            
            {verificationResults.hierarchical.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-600">Hierarchical Route Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {verificationResults.hierarchical.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {verificationResults.dashboard.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-600">Dashboard Route Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {verificationResults.dashboard.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {verificationResults.navigation.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-red-600">Navigation Errors:</p>
                <ul className="list-disc list-inside space-y-1">
                  {verificationResults.navigation.errors.map((error, index) => (
                    <li key={index} className="text-red-600">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Route Info */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-2">Dashboard Route</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Expected Dashboard:</strong> {getSimpleDashboardRoute(user)}</p>
          <p><strong>Route Accessible:</strong> {isRouteAccessible(getSimpleDashboardRoute(user), user) ? 'Yes' : 'No'}</p>
          <Button
            variant="outline"
            onClick={() => navigate(getSimpleDashboardRoute(user))}
            iconName="ExternalLink"
            iconSize={16}
          >
            Navigate to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RouteDebugger;
