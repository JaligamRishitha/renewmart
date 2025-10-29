import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationMenu } from '../../utils/navigation';

const Sidebar = ({ isCollapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [hoveredItem, setHoveredItem] = useState(null);

  // Get role-based navigation items
  const navigationItems = getNavigationMenu(user) || [];

  const isActivePath = (path) => {
    return location?.pathname === path;
  };

  return (
    <aside className={`fixed left-0 top-16 bottom-0 bg-card border-r border-border z-100 transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-60'
    }`}>
      <div className="flex flex-col h-full">
        {/* Collapse Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!isCollapsed && (
            <h2 className="text-sm font-medium text-muted-foreground">Navigation</h2>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
          >
            <Icon name={isCollapsed ? 'ChevronRight' : 'ChevronLeft'} size={16} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems?.filter(item => item && (item.href || item.path)).map((item) => {
              const itemPath = item.href || item.path;
              return (
                <li key={itemPath}>
                  <Link
                    to={itemPath}
                    onMouseEnter={() => setHoveredItem(itemPath)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`relative flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-smooth group ${
                      isActivePath(itemPath)
                        ? 'text-primary bg-primary/10 border border-primary/20' :'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon 
                      name={item?.icon} 
                      size={18} 
                      className={isActivePath(itemPath) ? 'text-primary' : 'text-current'}
                    />
                    
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item?.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item?.description}
                        </div>
                      </div>
                    )}

                    {/* Active Indicator */}
                    {isActivePath(itemPath) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}

                    {/* Tooltip for Collapsed State */}
                    {isCollapsed && hoveredItem === itemPath && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-popover border border-border rounded-md shadow-moderate z-300 whitespace-nowrap">
                        <div className="font-medium text-sm">{item?.label}</div>
                        <div className="text-xs text-muted-foreground">{item?.description}</div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border">
          <div className={`flex items-center space-x-3 px-3 py-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="User" size={16} className="text-primary" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email?.split('@')[0] || 'User'
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    if (!user?.roles || user.roles.length === 0) return 'User';
                    
                    // Format role name - remove underscores and capitalize
                    const formatRole = (role) => {
                      return role
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    };
                    
                    // If user is administrator, show Administrator
                    if (user.roles.includes('administrator')) {
                      return 'Administrator';
                    }
                    
                    // Otherwise show formatted roles
                    return user.roles.map(formatRole).join(', ');
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;