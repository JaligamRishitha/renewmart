// Simple route verification utility that doesn't rely on dynamic imports

/**
 * Simple route verification that works in browser environment
 * @param {Object} user - User object
 * @returns {Object} Verification results
 */
export const simpleRouteVerification = (user) => {
  const results = {
    success: true,
    errors: [],
    warnings: [],
    routes: {
      admin: [],
      landowner: [],
      investor: [],
      reviewer: [],
      roleSpecific: []
    }
  };

  const userRoles = user?.roles || [];

  // Expected routes for each role
  const expectedRoutes = {
    admin: [
      '/admin/dashboard',
      '/admin/marketplace',
      '/admin/investor-interests',
      '/admin/document-review'
    ],
    landowner: [
      '/landowner/dashboard',
      '/landowner/project-status',
      '/landowner/document-upload',
      '/landowner/project-management'
    ],
    investor: [
      '/investor/portal'
    ],
    reviewer: [
      '/reviewer/dashboard',
      '/reviewer/document-review',
      '/reviewer/document-management'
    ],
    roleSpecific: [
      '/sales-advisor/dashboard',
      '/analyst/dashboard',
      '/governance/dashboard',
      '/project-manager/dashboard'
    ]
  };

  // Check if user has appropriate routes based on roles
  if (userRoles.includes('administrator')) {
    results.routes.admin = expectedRoutes.admin;
  }

  if (userRoles.includes('landowner')) {
    results.routes.landowner = expectedRoutes.landowner;
  }

  if (userRoles.includes('investor')) {
    results.routes.investor = expectedRoutes.investor;
  }

  if (userRoles.includes('reviewer')) {
    results.routes.reviewer = expectedRoutes.reviewer;
  }

  if (userRoles.includes('re_sales_advisor') || userRoles.includes('re_analyst') || 
      userRoles.includes('re_governance_lead') || userRoles.includes('project_manager')) {
    results.routes.roleSpecific = expectedRoutes.roleSpecific;
  }

  // Check if user has at least one route
  const totalRoutes = Object.values(results.routes).flat().length;
  if (totalRoutes === 0) {
    results.errors.push('No routes found for user roles');
    results.success = false;
  }

  return results;
};

/**
 * Get dashboard route for user (simple version)
 * @param {Object} user - User object
 * @returns {string} Dashboard route
 */
export const getSimpleDashboardRoute = (user) => {
  const userRoles = user?.roles || [];
  
  if (userRoles.includes('administrator')) {
    return '/admin/dashboard';
  } else if (userRoles.includes('landowner')) {
    return '/landowner/dashboard';
  } else if (userRoles.includes('investor')) {
    return '/investor/dashboard';
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

/**
 * Check if a route is accessible for user
 * @param {string} route - Route to check
 * @param {Object} user - User object
 * @returns {boolean} Whether route is accessible
 */
export const isRouteAccessible = (route, user) => {
  const userRoles = user?.roles || [];
  
  // Admin routes
  if (route.startsWith('/admin/')) {
    return userRoles.includes('administrator');
  }
  
  // Landowner routes
  if (route.startsWith('/landowner/')) {
    return userRoles.includes('landowner');
  }
  
  // Investor routes
  if (route.startsWith('/investor/')) {
    return userRoles.includes('investor');
  }
  
  // Reviewer routes
  if (route.startsWith('/reviewer/')) {
    return userRoles.includes('reviewer');
  }
  
  // Role-specific routes
  if (route.startsWith('/sales-advisor/')) {
    return userRoles.includes('re_sales_advisor');
  }
  
  if (route.startsWith('/analyst/')) {
    return userRoles.includes('re_analyst');
  }
  
  if (route.startsWith('/governance/')) {
    return userRoles.includes('re_governance_lead');
  }
  
  if (route.startsWith('/project-manager/')) {
    return userRoles.includes('project_manager');
  }
  
  // General dashboard
  if (route === '/dashboard') {
    return true; // All authenticated users can access general dashboard
  }
  
  return false;
};

/**
 * Get all available routes for user
 * @param {Object} user - User object
 * @returns {Array} Available routes
 */
export const getAvailableRoutes = (user) => {
  const userRoles = user?.roles || [];
  const routes = [];
  
  if (userRoles.includes('administrator')) {
    routes.push('/admin/dashboard', '/admin/marketplace', '/admin/investor-interests', '/admin/document-review');
  }
  
  if (userRoles.includes('landowner')) {
    routes.push('/landowner/dashboard', '/landowner/project-status', '/landowner/document-upload', '/landowner/project-management');
  }
  
  if (userRoles.includes('investor')) {
    routes.push('/investor/portal');
  }
  
  if (userRoles.includes('reviewer')) {
    routes.push('/reviewer/dashboard', '/reviewer/document-review', '/reviewer/document-management');
  }
  
  if (userRoles.includes('re_sales_advisor')) {
    routes.push('/sales-advisor/dashboard');
  }
  
  if (userRoles.includes('re_analyst')) {
    routes.push('/analyst/dashboard');
  }
  
  if (userRoles.includes('re_governance_lead')) {
    routes.push('/governance/dashboard');
  }
  
  if (userRoles.includes('project_manager')) {
    routes.push('/project-manager/dashboard');
  }
  
  // Add general routes
  routes.push('/dashboard', '/marketplace');
  
  return [...new Set(routes)]; // Remove duplicates
};
