import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds for document uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    console.log('API Interceptor: Adding auth token:', token ? 'Present' : 'Missing');
    console.log('API Interceptor: Request URL:', config.url);
    console.log('API Interceptor: Request method:', config.method);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Interceptor: Authorization header set');
    } else {
      console.log('API Interceptor: No auth token found');
    }
    return config;
  },
  (error) => {
    console.log('API Interceptor: Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('API Interceptor: Response received:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('API Interceptor: Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    
    if (error.response?.status === 401) {
      console.log('API Interceptor: 401 Unauthorized - removing auth token');
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    try {
      console.log('API: Attempting login with:', { email: credentials.email });
      
      // Backend expects OAuth2PasswordRequestForm format
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      
      const response = await api.post('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('API: Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Login error:', error);
      throw error;
    }
  },
  
  register: async (userData) => {
    try {
      console.log('API: Registration data received:', { ...userData, password: '***' });
      
      // Transform frontend form data to backend format
      const registrationData = {
        email: userData.email,
        password: userData.password,
        confirm_password: userData.confirm_password || userData.confirmPassword || userData.password,
        first_name: userData.first_name || userData.firstName,
        last_name: userData.last_name || userData.lastName,
        phone: userData.phone || null,
        address: userData.address || null
      };

      // Only include roles when user selected a role; otherwise rely on backend default
      if (userData.role) {
        registrationData.roles = [userData.role];
      }
      
      console.log('API: Sending registration request to:', `${api.defaults.baseURL}/auth/register`);
      console.log('API: Registration payload:', { ...registrationData, password: '***' });
      
      const response = await api.post('/auth/register', registrationData);
      console.log('API: Registration successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Registration error:', error);
      console.error('API: Error response:', error.response?.data);
      console.error('API: Error status:', error.response?.status);
      console.error('API: Request URL:', error.config?.url);
      console.error('API: Request baseURL:', error.config?.baseURL);
      throw error;
    }
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
  
  requestVerificationCode: async (email) => {
    try {
      console.log('API: Requesting verification code for:', email);
      const response = await api.post('/auth/verify/request', { email });
      console.log('API: Verification code requested:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Request verification code error:', error);
      throw error;
    }
  },
  
  confirmVerificationCode: async (email, code) => {
    try {
      console.log('API: Confirming verification code for:', email);
      const response = await api.post('/auth/verify/confirm', { email, code });
      console.log('API: Verification confirmed:', response.data);
      return response.data;
    } catch (error) {
      console.error('API: Confirm verification code error:', error);
      throw error;
    }
  }
};

// Users API
export const usersAPI = {
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
  
  updateProfile: async (profileData) => {
    const response = await api.put('/users/me', profileData);
    return response.data;
  },
  
  getUsers: async (params = {}) => {
    const response = await api.get('/users/', { params });
    return response.data;
  },
  
  getUserById: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  
  createUser: async (userData, roles = []) => {
    console.log('Creating user with data:', { ...userData, roles });
    try {
      const response = await api.post('/users/admin/create', { ...userData, roles }, {
        timeout: 30000 // 30 second timeout
      });
      console.log('User created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please check if the database is accessible.');
      }
      throw error;
    }
  },
  
  getAvailableRoles: async () => {
    const response = await api.get('/users/roles/available');
    return response.data;
  },
  
  assignRole: async (userId, roleKey) => {
    const response = await api.post(`/users/${userId}/roles`, { role_key: roleKey });
    return response.data;
  },
  
  removeRole: async (userId, roleKey) => {
    const response = await api.delete(`/users/${userId}/roles/${roleKey}`);
    return response.data;
  },
  
  getUserRoles: async (userId) => {
    const response = await api.get(`/users/${userId}/roles`);
    return response.data;
  }
};

// Lands API
export const landsAPI = {
  getLands: async (params = {}) => {
    const response = await api.get('/lands/', { params });
    return response.data;
  },
  
  getLandById: async (landId) => {
    const response = await api.get(`/lands/${landId}`);
    return response.data;
  },
  
  // Alias for getLandById for compatibility
  getLand: async (landId) => {
    const response = await api.get(`/lands/${landId}`);
    return response.data;
  },
  
  createLand: async (landData) => {
    const response = await api.post('/lands/', landData);
    return response.data;
  },
  
  updateLand: async (landId, landData) => {
    const response = await api.put(`/lands/${landId}`, landData);
    return response.data;
  },
  
  deleteLand: async (landId) => {
    const response = await api.delete(`/lands/${landId}`);
    return response.data;
  },
  
  submitForReview: async (landId) => {
    const response = await api.post(`/lands/${landId}/submit`);
    return response.data;
  },
  
  updateLandStatus: async (landId, status) => {
    const response = await api.put(`/lands/${landId}/status`, { status });
    return response.data;
  },
  
  updateLandVisibility: async (landId, visibility) => {
    const response = await api.put(`/lands/${landId}/visibility`, { visibility });
    return response.data;
  },
  
  getMyLands: async (params = {}) => {
    const response = await api.get('/lands/my-lands', { params });
    return response.data;
  },
  
  getPublicLands: async (params = {}) => {
    const response = await api.get('/lands/public', { params });
    return response.data;
  },
  
  // Landowner Dashboard
  getDashboardSummary: async () => {
    const response = await api.get('/lands/dashboard/summary');
    return response.data;
  },
  
  getDashboardProjects: async (params = {}) => {
    const response = await api.get('/lands/dashboard/projects', { params });
    return response.data;
  },

  // Admin endpoints
  getAdminProjects: async (params = {}) => {
    const response = await api.get('/lands/admin/projects', { params });
    return response.data;
  },

  getAdminSummary: async () => {
    const response = await api.get('/lands/admin/summary');
    return response.data;
  },

  publishLand: async (landId) => {
    const response = await api.post(`/lands/${landId}/publish`);
    return response.data;
  },

  togglePublish: async (landId) => {
    const response = await api.post(`/lands/${landId}/toggle-publish`);
    return response.data;
  },

  markLandReadyToBuy: async (landId) => {
    const response = await api.post(`/lands/${landId}/mark-rtb`);
    return response.data;
  },

  getMarketplaceProjects: async (params = {}) => {
    const response = await api.get('/lands/marketplace/published', { params });
    return response.data;
  },

  getAdminInvestorInterests: async () => {
    const response = await api.get('/investors/admin/interests');
    return response.data;
  },

  getProjectDetailsWithTasks: async (projectId) => {
    const response = await api.get(`/lands/admin/projects/${projectId}/details-with-tasks`);
    return response.data;
  }
};

// Reviews API
export const reviewsAPI = {
  saveReviewStatus: async (landId, reviewerRole, reviewData) => {
    const response = await api.post(`/reviews/land/${landId}/role/${reviewerRole}`, reviewData);
    return response.data;
  },

  getReviewStatus: async (landId, reviewerRole) => {
    const response = await api.get(`/reviews/land/${landId}/role/${reviewerRole}`);
    return response.data;
  },

  getAllReviewStatuses: async (landId) => {
    const response = await api.get(`/reviews/land/${landId}/all`);
    return response.data;
  },

  deleteReviewStatus: async (landId, reviewerRole) => {
    const response = await api.delete(`/reviews/land/${landId}/role/${reviewerRole}`);
    return response.data;
  }
};

// Sections API
export const sectionsAPI = {
  getSections: async (landId) => {
    const response = await api.get(`/sections/${landId}`);
    return response.data;
  },
  
  createSection: async (landId, sectionData) => {
    const response = await api.post(`/sections/${landId}`, sectionData);
    return response.data;
  },
  
  updateSection: async (sectionId, sectionData) => {
    const response = await api.put(`/sections/section/${sectionId}`, sectionData);
    return response.data;
  },
  
  deleteSection: async (sectionId) => {
    const response = await api.delete(`/sections/section/${sectionId}`);
    return response.data;
  }
};
//Documents API
export const documentsAPI = {
  uploadDocument: async (landId, formData) => {
    const response = await api.post(`/documents/upload/${landId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for document uploads
    });
    return response.data;
  },
 
  getDocuments: async (landId, params = {}) => {
    const response = await api.get(`/documents/land/${landId}`, { params });
    return response.data;
  },
 
  getReviewerDocuments: async (landId) => {

    const response = await api.get(`/documents/land/${landId}/reviewer`);

    return response.data;

  },


  getDocumentById: async (documentId) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },
 
  updateDocumentStatus: async (documentId, status, reviewNotes = '') => {
    const response = await api.put(`/documents/${documentId}/review`, {
      status,
      review_notes: reviewNotes
    });
    return response.data;
  },

  // Document Version Management
  getDocumentVersions: async (landId, documentType) => {
    const response = await api.get(`/document-versions/land/${landId}/document-type/${documentType}`);
    return response.data;
  },

  getDocumentStatusSummary: async (landId) => {
    const response = await api.get(`/document-versions/land/${landId}/status-summary`);
    return response.data;
  },

  lockDocumentForReview: async (documentId, reason = null) => {
    const response = await api.post(`/document-versions/${documentId}/lock-for-review`, null, {
      params: { reason }
    });
    return response.data;
  },

  unlockDocument: async (documentId, reason = null) => {
    const response = await api.post(`/document-versions/${documentId}/unlock`, null, {
      params: { reason }
    });
    return response.data;
  },

  archiveDocumentVersion: async (documentId, reason = null) => {
    const response = await api.post(`/document-versions/${documentId}/archive`, null, {
      params: { reason }
    });
    return response.data;
  },

  getDocumentAuditTrail: async (landId, documentType = null, actionType = null, limit = 50, offset = 0) => {
    const params = { limit, offset };
    if (documentType) params.document_type = documentType;
    if (actionType) params.action_type = actionType;
    
    const response = await api.get(`/document-versions/land/${landId}/audit-trail`, { params });
    return response.data;
  },
 
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },

  // Task-based document operations
  uploadTaskDocument: async (taskId, formData) => {
    const response = await api.post(`/documents/task/${taskId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getTaskDocuments: async (taskId) => {
    const response = await api.get(`/documents/task/${taskId}`);
    return response.data;
  },

  // Document version operations
  getDocumentVersions: async (landId, documentType) => {
    console.log('API: Getting document versions for:', { landId, documentType });
    const response = await api.get(`/document-versions/land/${landId}/document-type/${documentType}`);
    console.log('API: Document versions response:', response);
    return response.data;
  },

  approveDocument: async (documentId, adminComments = '') => {
    const formData = new FormData();
    if (adminComments) formData.append('admin_comments', adminComments);
    const response = await api.post(`/documents/approve/${documentId}`, formData);
    return response.data;
  },

  rejectDocument: async (documentId, rejectionReason, adminComments = '') => {
    const formData = new FormData();
    formData.append('rejection_reason', rejectionReason);
    if (adminComments) formData.append('admin_comments', adminComments);
    const response = await api.post(`/documents/reject/${documentId}`, formData);
    return response.data;
  },

  // Subtask-based document operations
  uploadSubtaskDocument: async (subtaskId, formData) => {
    const response = await api.post(`/documents/subtask/${subtaskId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getSubtaskDocuments: async (subtaskId) => {
    const response = await api.get(`/documents/subtask/${subtaskId}`);
    return response.data;
  },
 
  viewDocument: async (documentId) => {
    const response = await api.get(`/documents/download/${documentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },
 
  downloadDocument: async (documentId) => {
    const response = await api.get(`/documents/download/${documentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getDocumentTypes: async () => {
    const response = await api.get('/documents/types/list');
    return response.data;
  },

  getDocumentsByType: async (landId, documentType) => {
    const response = await api.get(`/documents/land/${landId}`, {
      params: { document_type: documentType }
    });
    return response.data;
  },

  // Admin endpoints
  getAllDocuments: async (params = {}) => {
    const response = await api.get('/documents/admin/all', { params });
    return response.data;
  },

  // Document slot operations
  markSlotForReview: async (landId, documentType, docSlot, reason = null) => {
    const response = await api.post(`/document-slots/${landId}/${documentType}/${docSlot}/mark-for-review`, null, {
      params: { reason }
    });
    return response.data;
  },

  unlockSlotFromReview: async (landId, documentType, docSlot, reason = null) => {
    const response = await api.post(`/document-slots/${landId}/${documentType}/${docSlot}/unlock`, null, {
      params: { reason }
    });
    return response.data;
  },

  getSlotStatusSummary: async (landId) => {
    const response = await api.get(`/document-slots/${landId}/status-summary`);
    return response.data;
  },

  getDocumentTypeSlotStatus: async (landId, documentType) => {
    const response = await api.get(`/document-slots/${landId}/${documentType}/slot-status`);
    return response.data;
  }
};
 
// Tasks API
export const tasksAPI = {
  getTasks: async (params = {}) => {
    const response = await api.get('/tasks/', { params });
    return response.data;
  },
  
  getTaskById: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },
  
  createTask: async (taskData) => {
    const response = await api.post('/tasks/', taskData);
    return response.data;
  },
  
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },
  
  updateTaskStatus: async (taskId, status, notes = '') => {
    const response = await api.put(`/tasks/${taskId}/status`, {
      status,
      notes
    });
    return response.data;
  },
  
  assignTask: async (taskId, assigneeId) => {
    const response = await api.put(`/tasks/${taskId}/assign`, {
      assignee_id: assigneeId
    });
    return response.data;
  },
  
  getMyTasks: async (params = {}) => {
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },
  
  getTaskHistory: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/history`);
    return response.data;
  }
};

// Investors API
export const investorsAPI = {
  expressInterest: async (landId, interestData) => {
    const response = await api.post(`/investors/interest`, {
      land_id: landId,
      nda_accepted: interestData.nda_accepted || false,
      cta_accepted: interestData.cta_accepted || false,
      comments: interestData.comments || null,
      ...interestData
    });
    return response.data;
  },
  
  getMyInterests: async (params = {}) => {
    const response = await api.get('/investors/my/interests', { params });
    return response.data;
  },
  
  getLandInterests: async (landId, params = {}) => {
    const response = await api.get(`/investors/land/${landId}/interests`, { params });
    return response.data;
  },
  
  updateInterestStatus: async (interestId, status) => {
    const response = await api.put(`/investors/interest/${interestId}/status`, {
      status
    });
    return response.data;
  },
  
  getAvailableLands: async (params = {}) => {
    const response = await api.get('/investors/available-lands', { params });
    return response.data;
  },

  // Dashboard APIs
  getDashboardMetrics: async () => {
    const response = await api.get('/investors/dashboard/metrics');
    return response.data;
  },

  getDashboardInterests: async (limit = 5) => {
    const response = await api.get('/investors/dashboard/interests', { params: { limit } });
    return response.data;
  },

  // Master Sales Advisor APIs
  assignMasterSalesAdvisor: async (landId, salesAdvisorId) => {
    const response = await api.post(`/investors/master-advisor/assign`, {
      land_id: landId,
      sales_advisor_id: salesAdvisorId
    });
    return response.data;
  },

  getMasterAdvisorAssignment: async (landId) => {
    const response = await api.get(`/investors/master-advisor/assignment/${landId}`);
    return response.data;
  },

  getMasterAdvisorInterests: async (status = null) => {
    const params = status ? { status } : {};
    const response = await api.get('/investors/master-advisor/interests', { params });
    return response.data;
  },

  approveInterest: async (interestId) => {
    const response = await api.post(`/investors/interest/${interestId}/approve`);
    return response.data;
  },

  rejectInterest: async (interestId) => {
    const response = await api.post(`/investors/interest/${interestId}/reject`);
    return response.data;
  },

  // Withdrawal APIs
  requestWithdrawInterest: async (interestId, reason) => {
    const response = await api.post(`/investors/interest/${interestId}/withdraw`, {
      reason
    });
    return response.data;
  },

  approveWithdrawal: async (interestId) => {
    const response = await api.post(`/investors/interest/${interestId}/withdraw/approve`);
    return response.data;
  },

  rejectWithdrawal: async (interestId) => {
    const response = await api.post(`/investors/interest/${interestId}/withdraw/reject`);
    return response.data;
  }
};

// Task API
export const taskAPI = {
  getTasks: async (params = {}) => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },
  
  getTaskById: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },
  
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },
  
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },
  
  getTasksAssignedToMe: async (params = {}) => {
    const response = await api.get('/tasks/assigned/me', { params });
    return response.data;
  },
  
  getTasksCreatedByMe: async (params = {}) => {
    const response = await api.get('/tasks/created/me', { params });
    return response.data;
  },
  
  updateTaskStatus: async (taskId, status, notes = '') => {
    const response = await api.put(`/tasks/${taskId}/status`, {
      status,
      notes
    });
    return response.data;
  },
  
  assignTask: async (taskId, assigneeId) => {
    const response = await api.put(`/tasks/${taskId}/assign`, {
      assignee_id: assigneeId
    });
    return response.data;
  },
  
  getMyTasks: async (params = {}) => {
    const response = await api.get('/tasks/my-tasks', { params });
    return response.data;
  },
  
  getTaskHistory: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/history`);
    return response.data;
  },
  
  // Subtask methods
  getSubtasks: async (taskId) => {
    const response = await api.get(`/tasks/${taskId}/subtasks`);
    return response.data;
  },
  
  createSubtask: async (taskId, subtaskData) => {
    const response = await api.post(`/tasks/${taskId}/subtasks`, subtaskData);
    return response.data;
  },
  
  updateSubtask: async (taskId, subtaskId, subtaskData) => {
    const response = await api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, subtaskData);
    return response.data;
  },
  
  deleteSubtask: async (taskId, subtaskId) => {
    const response = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`);
    return response.data;
  },

  // Get available task types for a role
  getTaskTypes: async (role) => {
    const response = await api.get(`/tasks/task-types/${role}`);
    return response.data;
  },

  // Get subtask templates for a role and task type
  getSubtaskTemplates: async (role, taskType = null) => {
    const url = taskType 
      ? `/tasks/subtask-templates/${role}?task_type=${taskType}`
      : `/tasks/subtask-templates/${role}`;
    console.log('🔗 API: Calling getSubtaskTemplates with URL:', url);
    console.log('🔗 API: Parameters:', { role, taskType });
    const response = await api.get(url);
    console.log('🔗 API: Response:', response.data);
    return response.data;
  },
  // Submit subtasks status
  submitSubtasksStatus: async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/subtasks/submit`);
    return response.data;
  },

  // Get subtasks assigned to current user (collaboration work)
  getAssignedSubtasks: async () => {
    const response = await api.get('/tasks/subtasks/assigned-to-me');
    return response.data;
  },

  // Get task status by project/land for investor view
  getTaskStatusByProject: async (landId) => {
    console.log('🔧 API: Fetching tasks for landId:', landId);
    try {
      // Try the new project review endpoint first
      const response = await api.get(`/tasks/project/${landId}/review`);
      console.log('🔧 API: Project review response:', response);
      console.log('🔧 API: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.log('🔧 API: Project review endpoint failed, trying fallback:', error);
      // Fallback to the original method
      try {
        // First, get all tasks for this land
        const response = await api.get('/tasks', { 
          params: { 
            land_id: landId,
            include_status: true,
            status: 'all'
          } 
        });
        console.log('🔧 API: Raw tasks response:', response);
        
        // If we have tasks, fetch subtasks for each task
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const tasksWithSubtasks = await Promise.all(
            response.data.map(async (task) => {
              try {
                // Fetch subtasks for this task
                const subtasksResponse = await api.get(`/tasks/${task.task_id}/subtasks`);
                console.log(`🔧 API: Subtasks for task ${task.task_id}:`, subtasksResponse.data);
                
                // Add subtasks to the task object
                return {
                  ...task,
                  subtasks: subtasksResponse.data || [],
                  assigned_role: task.assigned_role || task.role || task.reviewer_role
                };
              } catch (err) {
                console.error(`🔧 API: Error fetching subtasks for task ${task.task_id}:`, err);
                // Return task without subtasks if fetch fails
                return {
                  ...task,
                  subtasks: [],
                  assigned_role: task.assigned_role || task.role || task.reviewer_role
                };
              }
            })
          );
          
          console.log('🔧 API: Tasks with subtasks:', tasksWithSubtasks);
          return tasksWithSubtasks;
        }
        
        console.log('🔧 API: No tasks found or empty response');
        return response.data || [];
      } catch (fallbackError) {
        console.error('🔧 API: Both endpoints failed:', fallbackError);
        throw fallbackError;
      }
    }
  },

  // Get task progress summary for investor dashboard
  getTaskProgressSummary: async (landId) => {
    const response = await api.get('/tasks', { 
      params: { 
        land_id: landId,
        summary_only: true
      } 
    });
    return response.data;
  }
};

// Document Versions API
export const documentVersionsAPI = {
  // Get document status summary for a land/project
  getStatusSummary: async (landId) => {
    const response = await api.get(`/document-versions/land/${landId}/status-summary`);
    return response.data;
  },

  // Get all versions of a specific document type for a land
  getDocumentVersions: async (landId, documentType) => {
    const response = await api.get(`/document-versions/land/${landId}/document-type/${documentType}`);
    return response.data;
  },

  // Lock a document version for review
  lockVersionForReview: async (documentId, lockData) => {
    const response = await api.post(`/document-versions/${documentId}/lock-for-review`, {
      reason: lockData.lock_reason || lockData.assignment_notes
    });
    return response.data;
  },

  // Unlock a document version
  unlockVersion: async (documentId, unlockReason) => {
    const response = await api.post(`/document-versions/${documentId}/unlock`, { 
      reason: unlockReason 
    });
    return response.data;
  },

  // Archive a document version
  archiveVersion: async (documentId, archiveReason) => {
    const response = await api.post(`/document-versions/${documentId}/archive`, { 
      reason: archiveReason 
    });
    return response.data;
  },

  // Get version history for a document
  getVersionHistory: async (documentId) => {
    // For now, we'll use the audit trail endpoint with the land ID
    // We need to get the land ID from the document first
    try {
      // Get document info to find the land ID
      const docResponse = await api.get(`/documents/${documentId}`);
      const landId = docResponse.data.land_id;
      
      // Get audit trail for the land
      const response = await api.get(`/document-versions/land/${landId}/audit-trail`);
      return response.data.audit_entries || [];
    } catch (error) {
      console.error('Error fetching version history:', error);
      return [];
    }
  },

  // Download a specific document version
  downloadVersion: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Document Assignment API
export const documentAssignmentAPI = {
  // Create a new document assignment
  createAssignment: async (assignmentData) => {
    const response = await api.post('/document-assignments/assign', assignmentData);
    return response.data;
  },

  // Get assignments for a specific land/project
  getLandAssignments: async (landId) => {
    const response = await api.get(`/document-assignments/land/${landId}`);
    return response.data;
  },

  // Get assignments for a specific reviewer
  getReviewerAssignments: async (reviewerId) => {
    const response = await api.get(`/document-assignments/reviewer/${reviewerId}`);
    return response.data;
  },

  // Update assignment status
  updateAssignmentStatus: async (assignmentId, statusData) => {
    const response = await api.put(`/document-assignments/${assignmentId}`, statusData);
    return response.data;
  },

  // Cancel an assignment
  cancelAssignment: async (assignmentId, cancelReason) => {
    const response = await api.post(`/document-assignments/${assignmentId}/cancel`, { cancel_reason: cancelReason });
    return response.data;
  },

  // Send assignment notification
  sendAssignmentNotification: async (notificationData) => {
    // This might be handled automatically by the backend when creating assignments
    // For now, we'll just return success
    return { message: "Notification sent successfully" };
  },

  // Get assignment details
  getAssignmentDetails: async (assignmentId) => {
    const response = await api.get(`/document-assignments/${assignmentId}`);
    return response.data;
  }
};

// Reviewer API
export const reviewerAPI = {
  // Claim a document for review
  claimDocument: async (documentId) => {
    console.log('API: Claiming document:', { documentId });
    console.log('API: Auth token:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
    
    const response = await api.post(`/reviewer/documents/${documentId}/claim`);
    
    console.log('API: Claim response:', response.data);
    return response.data;
  },

  // Complete document review
  completeReview: async (documentId, reviewResult = 'approve', comments = null) => {
    const response = await api.post(`/reviewer/documents/${documentId}/complete`, null, {
      params: {
        review_result: reviewResult,
        comments: comments || 'Review completed'
      }
    });
    return response.data;
  },

  // Get assigned documents
  getAssignedDocuments: async () => {
    const response = await api.get('/reviewer/documents/assigned');
    return response.data;
  },

  // Get available documents for review
  getAvailableDocuments: async () => {
    const response = await api.get('/reviewer/documents/available');
    return response.data;
  }
};

// Health Check API
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Notifications API
export const notificationsAPI = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  
  createNotification: async (notificationData) => {
    const response = await api.post('/notifications', notificationData);
    return response.data;
  },
  
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
  
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  }
};

// Export the main api instance for custom requests
export default api;