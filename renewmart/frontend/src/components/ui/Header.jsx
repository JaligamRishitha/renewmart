import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleNavigation } from '../../utils/navigation';
import NotificationPanel from './NotificationPanel';
import NotificationBellButton from './NotificationBellButton';

const Header = ({ userRole = 'landowner', notifications = {} }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Function to get role display name
  const getRoleDisplayName = (roles) => {
    if (!roles || roles.length === 0) return 'Guest';
    
    // Helper function to format role name (remove underscores, capitalize)
    const formatRoleName = (role) => {
      return role
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };
    
    // Priority order for role display
    if (roles.includes('administrator')) return 'Admin Portal';
    if (roles.includes('investor')) return 'Investor Portal';
    if (roles.includes('landowner')) return 'Landowner Portal';
    
    // Check for reviewer roles
    const reviewerRoles = roles.filter(role => 
      ['re_analyst', 're_sales_advisor', 're_governance_lead'].includes(role)
    );
    if (reviewerRoles.length > 0) {
      return `${formatRoleName(reviewerRoles[0])} Portal`;
    }
    
    // Check for generic reviewer role
    if (roles.includes('reviewer')) return 'Reviewer Portal';
    
    // Fallback to first role with formatting
    return roles[0] ? `${formatRoleName(roles[0])} Portal` : 'Guest';
  };

  // Get role-based navigation
  const roleNavigation = getRoleNavigation(user);

  const navigationItems = [
    {
      label: 'Market Place',
      path: roleNavigation.portal || '/investor/portal',
      icon: 'Store',
      roles: ['investor'],
      badge: notifications?.opportunities || 0
    },
    {
      label: 'Dashboard',
      path: roleNavigation.dashboard || '/dashboard',
      icon: 'LayoutDashboard',
      roles: ['landowner', 'admin', 'reviewer', 'investor'],
      badge: 0
    },
    {
      label: 'Projects',
      path: roleNavigation.projectStatus || roleNavigation.dashboard || '/dashboard',
      icon: 'FolderOpen',
      roles: ['landowner', 'admin', 'reviewer'],
      badge: 0
    },
    {
      label: 'My Interest',
      path: roleNavigation.myInterests || '/investor/my-interests',
      icon: 'Heart',
      roles: ['investor'],
      badge: notifications?.interests || 0
    }
  ];

  const moreMenuItems = [
    {
      label: 'Account',
      path: '/account',
      icon: 'User',
      roles: ['landowner', 'admin', 'investor', 'reviewer'],
      badge: notifications?.account || 0
    },
    {
      label: 'Logout',
      path: null,
      icon: 'LogOut',
      roles: ['landowner', 'admin', 'investor', 'reviewer'],
      isLogout: true
    }
  ];

  const filteredNavItems = navigationItems?.filter(item => 
    item?.roles?.includes(userRole)
  );

  const filteredMoreItems = moreMenuItems?.filter(item => 
    item?.roles?.includes(userRole)
  );

  const handleNavigation = (path, isLogout = false) => {
    if (isLogout) {
      handleLogout();
      return;
    }
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsMobileMenuOpen(false);
      setIsMoreMenuOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMoreMenuOpen && !event?.target?.closest('.more-menu-container')) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-elevation-1">
      <div className="max-w-9xl mx-auto">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Logo */}
          <div 
            className="flex items-center cursor-pointer transition-smooth hover:opacity-80"
            onClick={() => handleNavigation('/')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Leaf" size={20} color="white" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-semibold text-lg text-foreground leading-tight">
                  RenewMart - {getRoleDisplayName(user?.roles || [])}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {filteredNavItems?.map((item) => {
              const itemPath = item?.href || item?.path;
              return (
                <button
                  key={itemPath}
                  onClick={() => handleNavigation(itemPath)}
                  className={`
                    relative flex items-center space-x-2 px-4 py-2 rounded-lg font-body font-medium text-sm
                    transition-smooth hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring
                    ${isActivePath(itemPath) 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-foreground hover:text-primary'
                    }
                  `}
                >
                  <Icon name={item?.icon} size={18} />
                  <span>{item?.label}</span>
                  {item?.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {item?.badge > 99 ? '99+' : item?.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Notifications Bell Icon */}
            <NotificationBellButton onOpen={() => setIsNotificationPanelOpen(true)} />

            {/* More Menu */}
            {filteredMoreItems?.length > 0 && (
              <div className="relative more-menu-container">
                <button
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-body font-medium text-sm text-foreground hover:bg-muted hover:text-primary transition-smooth focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <Icon name="MoreHorizontal" size={18} />
                  <span>More</span>
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-elevation-2 py-2 animate-fade-in">
                    {filteredMoreItems?.map((item, index) => {
                      const itemPath = item?.href || item?.path;
                      return (
                        <button
                          key={itemPath || index}
                          onClick={() => handleNavigation(itemPath, item?.isLogout)}
                        className={`w-full flex items-center space-x-3 px-4 py-2 text-sm font-body hover:bg-muted transition-smooth ${
                          item?.isLogout ? 'text-red-600 hover:text-red-700' : 'text-popover-foreground'
                        }`}
                      >
                          <Icon name={item?.icon} size={16} />
                          <span>{item?.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-foreground hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={24} />
          </button>
        </div>
      </div>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <div className="relative bg-card border-r border-border h-full w-80 max-w-[80vw] shadow-elevation-3 animate-slide-in">
            <nav className="p-4 space-y-2">
              {filteredNavItems?.map((item) => {
                const itemPath = item?.href || item?.path;
                return (
                  <button
                    key={itemPath}
                    onClick={() => handleNavigation(itemPath)}
                    className={`
                      relative w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-body font-medium text-base
                      transition-smooth focus:outline-none focus:ring-2 focus:ring-ring
                      ${isActivePath(itemPath) 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-foreground hover:bg-muted hover:text-primary'
                      }
                    `}
                  >
                    <Icon name={item?.icon} size={20} />
                    <span className="flex-1 text-left">{item?.label}</span>
                    {item?.badge > 0 && (
                      <span className="bg-accent text-accent-foreground text-xs font-medium px-2 py-1 rounded-full min-w-[24px] text-center">
                        {item?.badge > 99 ? '99+' : item?.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredMoreItems?.length > 0 && (
                <>
                  <div className="border-t border-border my-4" />
                  {filteredMoreItems?.map((item, index) => {
                    const itemPath = item?.href || item?.path;
                    return (
                      <button
                        key={itemPath || index}
                        onClick={() => handleNavigation(itemPath, item?.isLogout)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-body font-medium text-base hover:bg-muted transition-smooth focus:outline-none focus:ring-2 focus:ring-ring ${
                        item?.isLogout ? 'text-red-600 hover:text-red-700' : 'text-foreground hover:text-primary'
                      }`}
                    >
                        <Icon name={item?.icon} size={20} />
                        <span className="flex-1 text-left">{item?.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Notification Panel Slide-out */}
      <NotificationPanel 
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        currentUser={user}
      />
    </header>
  );
};

export default Header;