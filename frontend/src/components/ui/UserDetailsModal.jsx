import React, { useState, useEffect } from 'react';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../services/api';
import EditProfileModal from './EditProfileModal';

const UserDetailsModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserDetails();
    }
  }, [isOpen, user]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to get detailed user profile from API
      try {
        const detailedUser = await usersAPI.getProfile();
        setUserDetails(detailedUser);
      } catch (apiError) {
        // Fallback to basic user data from auth context
        console.warn('Could not fetch detailed profile, using basic user data:', apiError);
        setUserDetails(user);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError('Failed to load user details');
      setUserDetails(user); // Fallback to basic user data
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
    // Refresh the user details
    fetchUserDetails();
  };

  if (!isOpen) return null;

  const displayUser = userDetails || user;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg shadow-elevation-3 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="User" size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Account Details</h2>
              <p className="text-sm text-muted-foreground">Complete user information</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading user details...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
              <p className="text-error mb-4">{error}</p>
              <Button onClick={fetchUserDetails} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground flex items-center">
                    <Icon name="User" size={18} className="mr-2 text-primary" />
                    Basic Information
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-foreground">
                        {displayUser?.first_name && displayUser?.last_name 
                          ? `${displayUser.first_name} ${displayUser.last_name}`
                          : displayUser?.name || 'Not provided'
                        }
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                      <p className="text-foreground">{displayUser?.email || 'Not provided'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                      <p className="text-foreground">{displayUser?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground flex items-center">
                    <Icon name="Shield" size={18} className="mr-2 text-primary" />
                    Account Status
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Status</label>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${displayUser?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-foreground">
                          {displayUser?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${displayUser?.is_verified ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="text-foreground">
                          {displayUser?.is_verified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roles and Permissions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground flex items-center">
                  <Icon name="Users" size={18} className="mr-2 text-primary" />
                  Roles & Permissions
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayUser?.roles?.map((role, index) => (
                    <div key={index} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{formatRole(role)}</h4>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-muted-foreground">{getRoleDescription(role)}</p>
                    </div>
                  )) || (
                    <div className="col-span-2 text-center py-4 text-muted-foreground">
                      No roles assigned
                    </div>
                  )}
                </div>
              </div>

              {/* Account Activity */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground flex items-center">
                  <Icon name="Clock" size={18} className="mr-2 text-primary" />
                  Account Activity
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                    <p className="text-foreground">{formatDate(displayUser?.created_at)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                    <p className="text-foreground">{formatDate(displayUser?.updated_at)}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(displayUser?.company || displayUser?.address || displayUser?.bio) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground flex items-center">
                    <Icon name="Info" size={18} className="mr-2 text-primary" />
                    Additional Information
                  </h3>
                  
                  <div className="space-y-3">
                    {displayUser?.company && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Company</label>
                        <p className="text-foreground">{displayUser.company}</p>
                      </div>
                    )}
                    
                    {displayUser?.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="text-foreground">{displayUser.address}</p>
                      </div>
                    )}
                    
                    {displayUser?.bio && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Bio</label>
                        <p className="text-foreground">{displayUser.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => setIsEditModalOpen(true)}>
            <Icon name="Edit" size={16} className="mr-2" />
            Edit Profile
          </Button>
        </div>
      </div>
      
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

export default UserDetailsModal;
