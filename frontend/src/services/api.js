import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
    // Backend expects only email and password (role is in user data)
    const loginData = {
      email: credentials.email,
      password: credentials.password
    };
    const response = await api.post('/users/login', loginData);
    return response.data;
  },
  
  register: async (userData) => {
    // Transform frontend form data to backend format
    const registrationData = {
      email: userData.email,
      password: userData.password,
      confirm_password: userData.confirm_password || userData.confirmPassword || userData.password,
      first_name: userData.first_name || userData.firstName,
      last_name: userData.last_name || userData.lastName,
      phone: userData.phone || null
    };

    // Only include roles when user selected a role; otherwise rely on backend default
    if (userData.role) {
      registrationData.roles = [userData.role];
    }
    
    const response = await api.post('/auth/register', registrationData);
    return response.data;
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
    const response = await api.post('/users/admin/create', { ...userData, roles });
    return response.data;
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

  markLandReadyToBuy: async (landId) => {
    const response = await api.post(`/lands/${landId}/mark-rtb`);
    return response.data;
  },

  getMarketplaceProjects: async (params = {}) => {
    const response = await api.get('/lands/marketplace/published', { params });
    return response.data;
  },

  getAdminInvestorInterests: async () => {
    const response = await api.get('/lands/admin/investor-interests');
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
    });
    return response.data;
  },
 
  getDocuments: async (landId, params = {}) => {
    const response = await api.get(`/documents/land/${landId}`, { params });
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
    const response = await api.get(`/documents/view/${documentId}`, {
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
      ...interestData
    });
    return response.data;
  },
  
  getMyInterests: async (params = {}) => {
    const response = await api.get('/investors/my-interests', { params });
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

  // Get default subtask templates for a role
  getSubtaskTemplates: async (role) => {
    const response = await api.get(`/tasks/subtask-templates/${role}`);
    return response.data;
  },
  // Submit subtasks status
  submitSubtasksStatus: async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/subtasks/submit`);
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

// Health Check API
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Export the main api instance for custom requests
export default api;