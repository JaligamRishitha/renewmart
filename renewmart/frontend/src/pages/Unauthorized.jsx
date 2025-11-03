import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/AppIcon';
import Button from '../components/ui/Button';

const Unauthorized = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { from, requiredRoles = [], userRoles = [] } = location.state || {};

  const handleGoBack = () => {
    if (from) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md mx-auto p-6 text-center">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <Icon name="ShieldX" size={40} className="text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Access Denied
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-6">
          You don't have the required permissions to access this page.
        </p>

        {/* Role Information */}
        {requiredRoles.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-foreground mb-2">Required Roles:</h3>
            <div className="flex flex-wrap gap-2">
              {requiredRoles.map((role, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-sm font-medium"
                >
                  {role.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Current User Roles */}
        {userRoles.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-foreground mb-2">Your Roles:</h3>
            <div className="flex flex-wrap gap-2">
              {userRoles.map((role, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-secondary/10 text-secondary text-sm font-medium"
                >
                  {role.replace(/_/g, ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleGoBack}
            iconName="ArrowLeft"
            iconSize={16}
          >
            Go Back
          </Button>
          <Button
            variant="default"
            onClick={handleGoHome}
            iconName="Home"
            iconSize={16}
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-3">
            <Icon name="Info" size={20} className="text-blue-600 mt-0.5" />
            <div className="text-left">
              <h4 className="font-medium text-blue-900 mb-1">Need Access?</h4>
              <p className="text-sm text-blue-700">
                If you believe you should have access to this page, please contact your administrator 
                or check your role assignments.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
