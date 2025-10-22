// Route verification utility to ensure all routes are properly configured

/**
 * Verify that all hierarchical routes are properly set up
 * @returns {Object} Verification results
 */
export const verifyHierarchicalRoutes = () => {
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

  // Expected admin routes
  const expectedAdminRoutes = [
    '/admin/dashboard',
    '/admin/marketplace',
    '/admin/investor-interests',
    '/admin/document-review'
  ];

  // Expected landowner routes
  const expectedLandownerRoutes = [
    '/landowner/dashboard',
    '/landowner/project-status',
    '/landowner/document-upload',
    '/landowner/project-management'
  ];

  // Expected investor routes
  const expectedInvestorRoutes = [
    '/investor/portal'
  ];

  // Expected reviewer routes
  const expectedReviewerRoutes = [
    '/reviewer/dashboard',
    '/reviewer/document-review',
    '/reviewer/document-management'
  ];

  // Expected role-specific routes
  const expectedRoleSpecificRoutes = [
    '/sales-advisor/dashboard',
    '/analyst/dashboard',
    '/governance/dashboard',
    '/project-manager/dashboard'
  ];

  // Check if routes follow hierarchical pattern
  const checkRoutePattern = (route) => {
    const patterns = [
      /^\/admin\/[a-z-]+$/,           // /admin/dashboard
      /^\/landowner\/[a-z-]+$/,       // /landowner/dashboard
      /^\/investor\/[a-z-]+$/,        // /investor/portal
      /^\/reviewer\/[a-z-]+$/,        // /reviewer/dashboard
      /^\/sales-advisor\/[a-z-]+$/,   // /sales-advisor/dashboard
      /^\/analyst\/[a-z-]+$/,         // /analyst/dashboard
      /^\/governance\/[a-z-]+$/,      // /governance/dashboard
      /^\/project-manager\/[a-z-]+$/ // /project-manager/dashboard
    ];

    return patterns.some(pattern => pattern.test(route));
  };

  // Verify admin routes
  expectedAdminRoutes.forEach(route => {
    if (checkRoutePattern(route)) {
      results.routes.admin.push(route);
    } else {
      results.errors.push(`Admin route ${route} doesn't follow hierarchical pattern`);
      results.success = false;
    }
  });

  // Verify landowner routes
  expectedLandownerRoutes.forEach(route => {
    if (checkRoutePattern(route)) {
      results.routes.landowner.push(route);
    } else {
      results.errors.push(`Landowner route ${route} doesn't follow hierarchical pattern`);
      results.success = false;
    }
  });

  // Verify investor routes
  expectedInvestorRoutes.forEach(route => {
    if (checkRoutePattern(route)) {
      results.routes.investor.push(route);
    } else {
      results.errors.push(`Investor route ${route} doesn't follow hierarchical pattern`);
      results.success = false;
    }
  });

  // Verify reviewer routes
  expectedReviewerRoutes.forEach(route => {
    if (checkRoutePattern(route)) {
      results.routes.reviewer.push(route);
    } else {
      results.errors.push(`Reviewer route ${route} doesn't follow hierarchical pattern`);
      results.success = false;
    }
  });

  // Verify role-specific routes
  expectedRoleSpecificRoutes.forEach(route => {
    if (checkRoutePattern(route)) {
      results.routes.roleSpecific.push(route);
    } else {
      results.errors.push(`Role-specific route ${route} doesn't follow hierarchical pattern`);
      results.success = false;
    }
  });

  return results;
};

/**
 * Check if dashboard routes are properly configured
 * @param {Object} user - User object
 * @returns {Object} Dashboard route check results
 */
export const checkDashboardRoutes = (user) => {
  const results = {
    success: true,
    errors: [],
    warnings: [],
    dashboardRoutes: {}
  };

  const userRoles = user?.roles || [];

  // Expected dashboard routes for each role
  const expectedDashboards = {
    administrator: '/admin/dashboard',
    landowner: '/landowner/dashboard',
    investor: '/investor/portal',
    re_sales_advisor: '/sales-advisor/dashboard',
    re_analyst: '/analyst/dashboard',
    re_governance_lead: '/governance/dashboard',
    project_manager: '/project-manager/dashboard',
    reviewer: '/reviewer/dashboard'
  };

  // Check if user has appropriate dashboard route
  userRoles.forEach(role => {
    const expectedRoute = expectedDashboards[role];
    if (expectedRoute) {
      results.dashboardRoutes[role] = expectedRoute;
    } else {
      results.warnings.push(`No specific dashboard route defined for role: ${role}`);
    }
  });

  // Check if user has at least one dashboard route
  if (Object.keys(results.dashboardRoutes).length === 0) {
    results.errors.push('No dashboard route found for user roles');
    results.success = false;
  }

  return results;
};

/**
 * Verify navigation consistency
 * @param {Object} user - User object
 * @returns {Object} Navigation consistency check results
 */
export const checkNavigationConsistency = async (user) => {
  const results = {
    success: true,
    errors: [],
    warnings: [],
    navigation: {
      roleBased: null,
      menu: null,
      dashboard: null
    }
  };

  try {
    // Import navigation utilities dynamically
    const navigationModule = await import('./navigation');
    const { getRoleNavigation, getNavigationMenu, getDashboardRoute } = navigationModule;
    
    // Check role-based navigation
    try {
      const roleNav = getRoleNavigation(user);
      results.navigation.roleBased = roleNav;
    } catch (error) {
      results.errors.push(`Role-based navigation error: ${error.message}`);
      results.success = false;
    }

    // Check navigation menu
    try {
      const menu = getNavigationMenu(user);
      results.navigation.menu = menu;
    } catch (error) {
      results.errors.push(`Navigation menu error: ${error.message}`);
      results.success = false;
    }

    // Check dashboard route
    try {
      const dashboard = getDashboardRoute(user);
      results.navigation.dashboard = dashboard;
    } catch (error) {
      results.errors.push(`Dashboard route error: ${error.message}`);
      results.success = false;
    }

  } catch (error) {
    results.errors.push(`Navigation utilities import error: ${error.message}`);
    results.success = false;
  }

  return results;
};

/**
 * Comprehensive route verification
 * @param {Object} user - User object
 * @returns {Object} Complete verification results
 */
export const verifyAllRoutes = async (user) => {
  const hierarchicalCheck = verifyHierarchicalRoutes();
  const dashboardCheck = checkDashboardRoutes(user);
  const navigationCheck = await checkNavigationConsistency(user);

  return {
    success: hierarchicalCheck.success && dashboardCheck.success && navigationCheck.success,
    hierarchical: hierarchicalCheck,
    dashboard: dashboardCheck,
    navigation: navigationCheck,
    summary: {
      totalErrors: hierarchicalCheck.errors.length + dashboardCheck.errors.length + navigationCheck.errors.length,
      totalWarnings: hierarchicalCheck.warnings.length + dashboardCheck.warnings.length + navigationCheck.warnings.length,
      hasErrors: (hierarchicalCheck.errors.length + dashboardCheck.errors.length + navigationCheck.errors.length) > 0,
      hasWarnings: (hierarchicalCheck.warnings.length + dashboardCheck.warnings.length + navigationCheck.warnings.length) > 0
    }
  };
};
