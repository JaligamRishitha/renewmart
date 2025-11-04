// Route checker utility to verify all routes are properly configured

import { getRoleNavigation, getNavigationMenu, canAccessRoute } from './navigation';

/**
 * Check if all hierarchical routes are properly configured
 * @param {Object} user - User object
 * @returns {Object} Route check results
 */
export const checkRouteConfiguration = (user) => {
  const userRoles = user?.roles || [];
  const issues = [];
  const warnings = [];
  const routes = [];

  // Define all expected routes
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
    salesAdvisor: [
      '/sales-advisor/dashboard'
    ],
    analyst: [
      '/analyst/dashboard'
    ],
    governance: [
      '/governance/dashboard'
    ],
    projectManager: [
      '/project-manager/dashboard'
    ]
  };

  // Check role-based navigation
  try {
    const navigation = getRoleNavigation(user);
    routes.push(...Object.values(navigation).filter(route => typeof route === 'string'));
  } catch (error) {
    issues.push(`Navigation utility error: ${error.message}`);
  }

  // Check navigation menu
  try {
    const menuItems = getNavigationMenu(user);
    routes.push(...menuItems.map(item => item.href));
  } catch (error) {
    issues.push(`Navigation menu error: ${error.message}`);
  }

  // Check route access
  const allRoutes = Object.values(expectedRoutes).flat();
  for (const route of allRoutes) {
    try {
      const canAccess = canAccessRoute(route, user);
      if (canAccess) {
        routes.push(route);
      }
    } catch (error) {
      warnings.push(`Route access check failed for ${route}: ${error.message}`);
    }
  }

  // Check for missing routes based on user roles
  if (userRoles.includes('administrator')) {
    const adminRoutes = expectedRoutes.admin;
    const missingAdminRoutes = adminRoutes.filter(route => !routes.includes(route));
    if (missingAdminRoutes.length > 0) {
      issues.push(`Missing admin routes: ${missingAdminRoutes.join(', ')}`);
    }
  }

  if (userRoles.includes('landowner')) {
    const landownerRoutes = expectedRoutes.landowner;
    const missingLandownerRoutes = landownerRoutes.filter(route => !routes.includes(route));
    if (missingLandownerRoutes.length > 0) {
      issues.push(`Missing landowner routes: ${missingLandownerRoutes.join(', ')}`);
    }
  }

  if (userRoles.includes('investor')) {
    const investorRoutes = expectedRoutes.investor;
    const missingInvestorRoutes = investorRoutes.filter(route => !routes.includes(route));
    if (missingInvestorRoutes.length > 0) {
      issues.push(`Missing investor routes: ${missingInvestorRoutes.join(', ')}`);
    }
  }

  if (userRoles.includes('reviewer')) {
    const reviewerRoutes = expectedRoutes.reviewer;
    const missingReviewerRoutes = reviewerRoutes.filter(route => !routes.includes(route));
    if (missingReviewerRoutes.length > 0) {
      issues.push(`Missing reviewer routes: ${missingReviewerRoutes.join(', ')}`);
    }
  }

  return {
    userRoles,
    routes: [...new Set(routes)], // Remove duplicates
    issues,
    warnings,
    isValid: issues.length === 0,
    hasWarnings: warnings.length > 0
  };
};

/**
 * Get dashboard route for user
 * @param {Object} user - User object
 * @returns {string} Dashboard route
 */
export const getDashboardRoute = (user) => {
  const userRoles = user?.roles || [];
  
  if (userRoles.includes('administrator')) {
    return '/admin/dashboard';
  } else if (userRoles.includes('landowner')) {
    return '/landowner/dashboard';
  } else if (userRoles.includes('investor')) {
    return '/investor/portal';
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
 * Check if a specific route exists and is accessible
 * @param {string} route - Route to check
 * @param {Object} user - User object
 * @returns {Object} Route check result
 */
export const checkSpecificRoute = (route, user) => {
  try {
    const canAccess = canAccessRoute(route, user);
    const navigation = getRoleNavigation(user);
    const isInNavigation = Object.values(navigation).includes(route);
    
    return {
      route,
      canAccess,
      isInNavigation,
      exists: canAccess && isInNavigation,
      userRoles: user?.roles || []
    };
  } catch (error) {
    return {
      route,
      canAccess: false,
      isInNavigation: false,
      exists: false,
      error: error.message,
      userRoles: user?.roles || []
    };
  }
};

/**
 * Get all available routes for debugging
 * @returns {Array} All available routes
 */
export const getAllAvailableRoutes = () => {
  return [
    // Public routes
    '/login',
    '/registration', 
    '/register',
    
    // General routes
    '/',
    '/marketplace',
    '/project-details/:landId',
    '/unauthorized',
    
    // Admin routes
    '/admin/dashboard',
    '/admin/marketplace',
    '/admin/investor-interests',
    '/admin/document-review',
    
    // Landowner routes
    '/landowner/dashboard',
    '/landowner/project-status',
    '/landowner/document-upload',
    '/landowner/project-management',
    
    // Investor routes
    '/investor/portal',
    
    // Reviewer routes
    '/reviewer/dashboard',
    '/reviewer/project/:landId',
    '/reviewer/document-review',
    '/reviewer/document-management',
    
    // Role-specific routes
    '/sales-advisor/dashboard',
    '/sales-advisor/project/:landId',
    '/analyst/dashboard',
    '/analyst/project/:landId',
    '/governance/dashboard',
    '/governance/project/:landId',
    '/project-manager/dashboard',
    
    // Legacy routes
    '/dashboard',
    '/admin-dashboard',
    '/admin-marketplace',
    '/admin-investor-interests',
    '/admin-document-review',
    '/investor-portal',
    '/document-upload',
    '/document-review',
    '/landowner-dashboard',
    '/landowner-project-status',
    '/reviewer-dashboard',
    '/reviewer-dashboard/project/:landId',
    '/project-management',
    '/document-management',
    '/sales-advisor-dashboard',
    '/analyst-dashboard',
    '/governance-dashboard',
    '/project-manager-dashboard'
  ];
};
