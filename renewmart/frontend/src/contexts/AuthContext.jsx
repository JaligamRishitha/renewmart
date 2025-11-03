import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');

        if (token && userData && userData !== 'undefined') {
          const user = JSON.parse(userData);
          
          // Verify token is still valid
          try {
            const currentUser = await authAPI.getCurrentUser();
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: { user: currentUser, token },
            });
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      console.log('AuthContext: Attempting login with credentials:', { email: credentials.email });
      const response = await authAPI.login(credentials);
      console.log('AuthContext: Login response:', response);
      
      const { access_token, user } = response;

      if (!access_token || !user) {
        throw new Error('Invalid response from server');
      }

      // Store in localStorage (use roles returned by backend)
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token: access_token },
      });

      return { success: true, user };
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
      const errorStatus = error.response?.status;
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      });
      
      // Return both error message and status code for better error handling in UI
      return { 
        success: false, 
        error: { 
          message: errorMessage,
          status: errorStatus 
        }
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      
      const user = await authAPI.register(userData);
      
      // Registration successful, but user needs to login
      // For demo purposes, we'll auto-login after registration
      const loginResponse = await authAPI.login({
        email: userData.email,
        password: userData.password
      });
      
      const { access_token, user: loggedInUser } = loginResponse;

      // Store in localStorage
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(loggedInUser));

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: loggedInUser, token: access_token },
      });

      return { success: true, user: loggedInUser };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage,
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Update user function
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData,
    });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return state.user?.roles?.includes(role) || false;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    if (!state.user?.roles) return false;
    return roles.some(role => state.user.roles.includes(role));
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('administrator');
  };

  // Check if user is reviewer
  const isReviewer = () => {
    return hasRole('reviewer');
  };

  // Check if user is owner
  const isOwner = () => {
    return hasRole('landowner');
  };

  // Check if user is investor
  const isInvestor = () => {
    return hasRole('investor');
  };

  // Check if user is project manager
  const isProjectManager = () => {
    return hasRole('project_manager');
  };

  // Check if user is RE Sales Advisor
  const isSalesAdvisor = () => {
    return hasRole('re_sales_advisor');
  };

  // Check if user is RE Analyst
  const isAnalyst = () => {
    return hasRole('re_analyst');
  };

  // Check if user is RE Governance Lead
  const isGovernanceLead = () => {
    return hasRole('re_governance_lead');
  };

  // Check if user has reviewer role (any type)
  const isAnyReviewer = () => {
    return hasAnyRole(['reviewer', 're_sales_advisor', 're_analyst', 're_governance_lead', 'project_manager']);
  };

  // Get user's primary role for navigation
  const getPrimaryRole = () => {
    if (!state.user?.roles) return 'guest';
    
    const roles = state.user.roles;
    
    // Priority order for role determination
    if (roles.includes('administrator')) return 'administrator';
    if (roles.includes('project_manager')) return 'project_manager';
    if (roles.includes('re_sales_advisor')) return 're_sales_advisor';
    if (roles.includes('re_analyst')) return 're_analyst';
    if (roles.includes('re_governance_lead')) return 're_governance_lead';
    if (roles.includes('reviewer')) return 'reviewer';
    if (roles.includes('landowner')) return 'landowner';
    if (roles.includes('investor')) return 'investor';
    
    return 'user';
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
    hasRole,
    hasAnyRole,
    isAdmin,
    isReviewer,
    isOwner,
    isInvestor,
    isProjectManager,
    isSalesAdvisor,
    isAnalyst,
    isGovernanceLead,
    isAnyReviewer,
    getPrimaryRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;