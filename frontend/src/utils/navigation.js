// Navigation utility for hierarchical routing structure

/**
 * Get role-based navigation routes
 * @param {Object} user - User object with roles
 * @returns {Object} Navigation routes for the user's role
 */
export const getRoleNavigation = (user) => {
  const userRoles = user?.roles || [];
  
  // Admin navigation
  if (userRoles.includes('administrator')) {
    return {
      dashboard: '/admin/dashboard',
      marketplace: '/admin/marketplace',
      investorInterests: '/admin/investor-interests',
      documentReview: '/admin/document-review',
      basePath: '/admin'
    };
  }
  
  // Landowner navigation
  if (userRoles.includes('landowner')) {
    return {
      dashboard: '/landowner/dashboard',
      projectStatus: '/landowner/project-status',
      documentUpload: '/landowner/document-upload',
      projectManagement: '/landowner/project-management',
      basePath: '/landowner'
    };
  }
  
  // Investor navigation
  if (userRoles.includes('investor')) {
    return {
      portal: '/investor/portal',
      basePath: '/investor'
    };
  }
  
  // RE Sales Advisor navigation
  if (userRoles.includes('re_sales_advisor')) {
    return {
      dashboard: '/sales-advisor/dashboard',
      projectDetails: '/sales-advisor/project',
      basePath: '/sales-advisor'
    };
  }
  
  // RE Analyst navigation
  if (userRoles.includes('re_analyst')) {
    return {
      dashboard: '/analyst/dashboard',
      projectDetails: '/analyst/project',
      basePath: '/analyst'
    };
  }
  
  // RE Governance Lead navigation
  if (userRoles.includes('re_governance_lead')) {
    return {
      dashboard: '/governance/dashboard',
      projectDetails: '/governance/project',
      basePath: '/governance'
    };
  }
  
  // Project Manager navigation
  if (userRoles.includes('project_manager')) {
    return {
      dashboard: '/project-manager/dashboard',
      basePath: '/project-manager'
    };
  }
  
  // General reviewer navigation
  if (userRoles.includes('reviewer')) {
    return {
      dashboard: '/reviewer/dashboard',
      documentReview: '/reviewer/document-review',
      documentManagement: '/reviewer/document-management',
      projectDetails: '/reviewer/project',
      basePath: '/reviewer'
    };
  }
  
  // Default navigation
  return {
    dashboard: '/dashboard',
    basePath: '/'
  };
};

/**
 * Get breadcrumb navigation for current path
 * @param {string} pathname - Current pathname
 * @param {Object} user - User object
 * @returns {Array} Breadcrumb items
 */
export const getBreadcrumbs = (pathname, user) => {
  const navigation = getRoleNavigation(user);
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [];
  
  // Add home breadcrumb
  breadcrumbs.push({
    label: 'Home',
    href: navigation.dashboard || '/dashboard'
  });
  
  // Build breadcrumbs from path segments
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip if it's a parameter (starts with :)
    if (segment.startsWith(':')) return;
    
    // Create label from segment
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Don't add current page as breadcrumb (it's usually the page title)
    if (index < pathSegments.length - 1) {
      breadcrumbs.push({
        label,
        href: currentPath
      });
    }
  });
  
  return breadcrumbs;
};

/**
 * Check if user can access a specific route
 * @param {string} route - Route to check
 * @param {Object} user - User object
 * @returns {boolean} Whether user can access the route
 */
export const canAccessRoute = (route, user) => {
  const userRoles = user?.roles || [];
  
  // Admin can access everything
  if (userRoles.includes('administrator')) return true;
  
  // Check role-based access
  if (route.startsWith('/admin/')) {
    return userRoles.includes('administrator');
  }
  
  if (route.startsWith('/landowner/')) {
    return userRoles.includes('landowner') || userRoles.includes('administrator');
  }
  
  if (route.startsWith('/investor/')) {
    return userRoles.includes('investor') || userRoles.includes('administrator');
  }
  
  if (route.startsWith('/reviewer/')) {
    return userRoles.includes('reviewer') || 
           userRoles.includes('re_sales_advisor') ||
           userRoles.includes('re_analyst') ||
           userRoles.includes('re_governance_lead') ||
           userRoles.includes('project_manager') ||
           userRoles.includes('administrator');
  }
  
  if (route.startsWith('/sales-advisor/')) {
    return userRoles.includes('re_sales_advisor') || userRoles.includes('administrator');
  }
  
  if (route.startsWith('/analyst/')) {
    return userRoles.includes('re_analyst') || userRoles.includes('administrator');
  }
  
  if (route.startsWith('/governance/')) {
    return userRoles.includes('re_governance_lead') || userRoles.includes('administrator');
  }
  
  if (route.startsWith('/project-manager/')) {
    return userRoles.includes('project_manager') || userRoles.includes('administrator');
  }
  
  // General routes accessible to all authenticated users
  return true;
};

/**
 * Get navigation menu items for user's role
 * @param {Object} user - User object
 * @returns {Array} Navigation menu items
 */
export const getNavigationMenu = (user) => {
  const userRoles = user?.roles || [];
  
  if (userRoles.includes('administrator')) {
    return [
      { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
      { label: 'Marketplace', href: '/admin/marketplace', icon: 'Store' },
      { label: 'Investor Interests', href: '/admin/investor-interests', icon: 'Users' },
      { label: 'Document Review', href: '/admin/document-review', icon: 'FileCheck' }
    ];
  }
  
  if (userRoles.includes('landowner')) {
    return [
      { label: 'Dashboard', href: '/landowner/dashboard', icon: 'LayoutDashboard' },
      { label: 'Project Status', href: '/landowner/project-status', icon: 'BarChart3' },
      { label: 'Document Upload', href: '/landowner/document-upload', icon: 'Upload' },
      { label: 'Project Management', href: '/landowner/project-management', icon: 'Settings' }
    ];
  }
  
  if (userRoles.includes('investor')) {
    return [
      { label: 'Portal', href: '/investor/portal', icon: 'LayoutDashboard' }
    ];
  }
  
  if (userRoles.includes('re_sales_advisor')) {
    return [
      { label: 'Dashboard', href: '/sales-advisor/dashboard', icon: 'LayoutDashboard' }
    ];
  }
  
  if (userRoles.includes('re_analyst')) {
    return [
      { label: 'Dashboard', href: '/analyst/dashboard', icon: 'LayoutDashboard' }
    ];
  }
  
  if (userRoles.includes('re_governance_lead')) {
    return [
      { label: 'Dashboard', href: '/governance/dashboard', icon: 'LayoutDashboard' }
    ];
  }
  
  if (userRoles.includes('project_manager')) {
    return [
      { label: 'Dashboard', href: '/project-manager/dashboard', icon: 'LayoutDashboard' }
    ];
  }
  
  if (userRoles.includes('reviewer')) {
    return [
      { label: 'Dashboard', href: '/reviewer/dashboard', icon: 'LayoutDashboard' },
      { label: 'Document Review', href: '/reviewer/document-review', icon: 'FileCheck' },
      { label: 'Document Management', href: '/reviewer/document-management', icon: 'Folder' }
    ];
  }
  
  return [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' }
  ];
};

/**
 * Get the appropriate dashboard route for a user
 * @param {Object} user - User object
 * @returns {string} Dashboard route
 */
export const getDashboardRoute = (user) => {
  const navigation = getRoleNavigation(user);
  return navigation.dashboard || '/dashboard';
};

/**
 * Get the base path for a user's role
 * @param {Object} user - User object
 * @returns {string} Base path
 */
export const getBasePath = (user) => {
  const navigation = getRoleNavigation(user);
  return navigation.basePath || '/';
};
