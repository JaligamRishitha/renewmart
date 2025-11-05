import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';
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
  const [openRoles, setOpenRoles] = useState({});

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

  const getRolePermissions = (role) => {
    const permissions = {
      'administrator': [
        'Full system access and control',
        'Manage all users and roles',
        'Access all dashboards and portals',
        'Publish/unpublish projects',
        'Review and approve all documents',
        'Manage marketplace listings',
        'View all investor interests',
        'System configuration and settings'
      ],
      'landowner': [
        'Create and manage projects',
        'Upload project documents',
        'View project status and reviews',
        'Submit projects for review',
        'Track project progress',
        'Manage project details',
        'View reviewer feedback'
      ],
      'investor': [
        'Browse marketplace projects',
        'Express interest in projects',
        'View published project details',
        'Access investor portal',
        'Save projects to watchlist',
        'Manage investment interests',
        'View project availability'
      ],
      're_sales_advisor': [
        'Review land valuation documents',
        'Review sale contracts',
        'Review topographical surveys',
        'Review grid connectivity documents',
        'Approve/reject assigned documents',
        'Upload site images for projects',
        'Access reviewer dashboard',
        'View project details'
      ],
      're_analyst': [
        'Review financial models',
        'Analyze project financials',
        'Approve/reject financial documents',
        'Access analyst dashboard',
        'View project details',
        'Provide financial analysis'
      ],
      're_governance_lead': [
        'Review land valuation documents',
        'Review ownership documents',
        'Review zoning approvals',
        'Review environmental impact assessments',
        'Review government NOCs',
        'Approve/reject assigned documents',
        'Access governance dashboard',
        'Ensure regulatory compliance'
      ],
      'project_manager': [
        'Manage project operations',
        'Coordinate project activities',
        'Access project management tools',
        'View project status',
        'Oversee project development'
      ],
      'reviewer': [
        'Review project documents',
        'Evaluate project feasibility',
        'Approve/reject documents',
        'Access reviewer dashboard',
        'Provide technical feedback'
      ]
    };
    return permissions[role] || ['Basic user access'];
  };

  const handleProfileUpdateSuccess = (updatedUser) => {
    setUserDetails(updatedUser);
    // Refresh the user details to get latest data
    fetchUserDetails();
  };

  const toggleRole = (roleIndex) => {
    setOpenRoles(prev => ({
      ...prev,
      [roleIndex]: !prev[roleIndex]
    }));
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
                My Profile
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
              {/* User Profile Header */}
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

              {/* Basic Information and Account Activity Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground flex items-center">
                    <Icon name="User" size={18} className="mr-2 text-primary" />
                    Basic Information
                  </h3>

                  {/* Grid for user details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-foreground text-base">
                        {displayUser?.email || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-1">
                        Phone Number
                      </label>
                      <p className="text-foreground text-base">
                        {displayUser?.phone || 'Not provided'}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground block mb-1">
                        Address
                      </label>
                      <p className="text-foreground text-base">
                        {displayUser?.address || 'N/A'}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground block mb-1">
                        Email Verification
                      </label>
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            displayUser?.is_verified ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        ></div>
                        <span className="text-foreground text-base">
                          {displayUser?.is_verified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Activity Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground flex items-center">
                    <Icon name="Clock" size={18} className="mr-2 text-primary" />
                    Account Activity
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-1">
                        Member Since
                      </label>
                      <p className="text-foreground text-base">
                        {formatDate(displayUser?.created_at)}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground block mb-1">
                        Last Updated
                      </label>
                      <p className="text-foreground text-base">
                        {formatDate(displayUser?.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

                {/* Roles & Permissions Accordion */}
                {displayUser?.roles && displayUser.roles.length > 0 && (
                  <div className="mb-8 pb-8 border-b border-border">
                    <h3 className="text-lg font-medium text-foreground flex items-center mb-4">
                      <Icon name="Users" size={18} className="mr-2 text-primary" />
                      Roles & Permissions
                    </h3>

                    <div className="space-y-2">
                      {displayUser.roles.map((role, index) => {
                        const permissions = getRolePermissions(role);
                        const isOpen = openRoles[index] || false;

                        return (
                          <div
                            key={index}
                            className="border border-border rounded-lg bg-muted/50 overflow-hidden"
                          >
                            <button
                              onClick={() => toggleRole(index)}
                              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-smooth focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              <div className="flex items-center space-x-2">
                                <Icon name="Shield" size={16} className="text-primary" />
                                <span className="font-medium text-foreground">
                                  {formatRole(role)}
                                </span>
                              </div>
                              <Icon
                                name={isOpen ? 'ChevronUp' : 'ChevronDown'}
                                size={18}
                                className="text-muted-foreground"
                              />
                            </button>

                            {isOpen && (
                              <div className="px-4 pb-4 border-t border-border bg-background">
                                <p className="text-sm text-muted-foreground mb-3 mt-3">
                                  {getRoleDescription(role)}
                                </p>
                                <h5 className="text-sm font-medium text-foreground mb-2">
                                  Permissions:
                                </h5>
                                <ul className="space-y-1.5">
                                  {permissions.map((permission, permIndex) => (
                                    <li
                                      key={permIndex}
                                      className="flex items-start space-x-2 text-sm text-muted-foreground"
                                    >
                                      <Icon
                                        name="CheckCircle"
                                        size={14}
                                        className="text-success mt-0.5 flex-shrink-0"
                                      />
                                      <span>{permission}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Account;

