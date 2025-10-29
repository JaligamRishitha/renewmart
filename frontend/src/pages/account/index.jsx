import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, authAPI } from '../../services/api';
import EditProfileModal from '../../components/ui/EditProfileModal';

const Account = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserDetails();
    }
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch user profile from API - use auth/me for roles and is_verified
      const userWithRoles = await authAPI.getCurrentUser();
      
      // Also fetch from users/me to get created_at and updated_at
      let userWithTimestamps = {};
      try {
        userWithTimestamps = await usersAPI.getProfile();
      } catch (err) {
        console.warn('Could not fetch user timestamps:', err);
      }
      
      // Merge data from both endpoints, prioritizing auth/me for roles and verification status
      const mergedUserData = {
        ...userWithTimestamps,
        ...userWithRoles,
        roles: userWithRoles.roles || user?.roles || [],
        is_verified: userWithRoles.is_verified !== undefined ? userWithRoles.is_verified : (user?.is_verified || false)
      };
      
      setUserDetails(mergedUserData);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details. Please try again.');
      // Fallback to basic user data from auth context
      setUserDetails(user);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatRole = (role) => {
    const roleMap = {
      'administrator': 'Administrator',
      'landowner': 'Landowner',
      'investor': 'Investor',
      'reviewer': 'Reviewer',
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead',
      'project_manager': 'Project Manager'
    };
    return roleMap[role] || role;
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      'administrator': 'System administrator with full access to all features',
      'landowner': 'Property owner seeking renewable energy opportunities',
      'investor': 'Investment professional focused on renewable energy assets',
      'reviewer': 'Technical reviewer evaluating project feasibility',
      're_sales_advisor': 'Sales professional managing client relationships',
      're_analyst': 'Technical and financial analysis specialist',
      're_governance_lead': 'Compliance and regulatory specialist',
      'project_manager': 'Operations professional overseeing project development'
    };
    return descriptions[role] || 'User role';
  };

  const handleProfileUpdateSuccess = (updatedUser) => {
    setUserDetails(updatedUser);
    // Refresh the user details to get latest data
    fetchUserDetails();
  };

  const displayUser = userDetails || user;
  const userRole = user?.roles?.[0] || 'landowner';

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole={userRole}
        notifications={{}}
      />
      
      <main className="pt-20 pb-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                My Account
              </h1>
              <p className="text-muted-foreground font-body">
                View and manage your profile information
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <Button
                variant="default"
                size="lg"
                onClick={() => setIsEditModalOpen(true)}
                iconName="Edit"
                iconPosition="left"
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={20} className="text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUserDetails}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <span className="ml-4 text-muted-foreground text-lg">Loading profile...</span>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg shadow-elevation-2 p-6 lg:p-8">
              {/* Basic Information Section */}
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon name="User" size={32} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-heading font-semibold text-foreground">
                      {displayUser?.first_name && displayUser?.last_name 
                        ? `${displayUser.first_name} ${displayUser.last_name}`
                        : displayUser?.name || 'User'
                      }
                    </h2>
                    <p className="text-muted-foreground">{displayUser?.email || 'No email'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground flex items-center">
                      <Icon name="User" size={18} className="mr-2 text-primary" />
                      Basic Information
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          First Name
                        </label>
                        <p className="text-foreground text-base">
                          {displayUser?.first_name || 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Last Name
                        </label>
                        <p className="text-foreground text-base">
                          {displayUser?.last_name || 'Not provided'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Email Address
                        </label>
                        <p className="text-foreground text-base">{displayUser?.email || 'Not provided'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Phone Number
                        </label>
                        <p className="text-foreground text-base">{displayUser?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground flex items-center">
                      <Icon name="Shield" size={18} className="mr-2 text-primary" />
                      Account Status
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Account Status
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${displayUser?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-foreground text-base">
                            {displayUser?.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Email Verification
                        </label>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${displayUser?.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <span className="text-foreground text-base">
                            {displayUser?.is_verified ? 'Verified' : 'Pending Verification'}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          User ID
                        </label>
                        <p className="text-foreground text-sm font-mono">
                          {displayUser?.user_id || 'Not available'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles and Permissions Section */}
              {displayUser?.roles && displayUser.roles.length > 0 && (
                <div className="mb-8 pb-8 border-b border-border">
                  <h3 className="text-lg font-medium text-foreground flex items-center mb-4">
                    <Icon name="Users" size={18} className="mr-2 text-primary" />
                    Roles & Permissions
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayUser.roles.map((role, index) => (
                      <div key={index} className="bg-muted/50 rounded-lg p-4 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-foreground">{formatRole(role)}</h4>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        </div>
                        <p className="text-sm text-muted-foreground">{getRoleDescription(role)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Activity Section */}
              <div className="mb-8 pb-8 border-b border-border">
                <h3 className="text-lg font-medium text-foreground flex items-center mb-4">
                  <Icon name="Clock" size={18} className="mr-2 text-primary" />
                  Account Activity
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">
                      Member Since
                    </label>
                    <p className="text-foreground text-base">{formatDate(displayUser?.created_at)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground block mb-1">
                      Last Updated
                    </label>
                    <p className="text-foreground text-base">{formatDate(displayUser?.updated_at)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              {(displayUser?.company || displayUser?.address || displayUser?.bio) && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-foreground flex items-center mb-4">
                    <Icon name="Info" size={18} className="mr-2 text-primary" />
                    Additional Information
                  </h3>
                  
                  <div className="space-y-4">
                    {displayUser?.company && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Company
                        </label>
                        <p className="text-foreground text-base">{displayUser.company}</p>
                      </div>
                    )}
                    
                    {displayUser?.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Address
                        </label>
                        <p className="text-foreground text-base">{displayUser.address}</p>
                      </div>
                    )}
                    
                    {displayUser?.bio && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">
                          Bio
                        </label>
                        <p className="text-foreground text-base whitespace-pre-line">{displayUser.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <Icon name="ArrowLeft" size={16} className="mr-2" />
                  Go Back
                </Button>
                <Button onClick={() => setIsEditModalOpen(true)}>
                  <Icon name="Edit" size={16} className="mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        userData={displayUser}
        onSuccess={handleProfileUpdateSuccess}
      />
    </div>
  );
};

export default Account;

