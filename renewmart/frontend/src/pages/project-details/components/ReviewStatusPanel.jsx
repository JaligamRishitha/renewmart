import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { reviewsAPI, taskAPI, usersAPI } from '../../../services/api';

/**
 * ReviewStatusPanel Component
 * 
 * Displays the review status and progress for all reviewer roles
 * in the investor portal project details page.
 */
const ReviewStatusPanel = ({ landId, projectData }) => {
  const [reviewStatuses, setReviewStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [taskStatusData, setTaskStatusData] = useState({});
  const [loadingTaskData, setLoadingTaskData] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});

  // Define the three reviewer roles
  const reviewerRoles = [
    {
      id: 're_sales_advisor',
      label: 'RE Sales Advisor',
      icon: 'TrendingUp',
      description: 'Market evaluation and investor alignment',
      color: 'blue'
    },
    {
      id: 're_analyst',
      label: 'RE Analyst', 
      icon: 'Calculator',
      description: 'Technical and financial feasibility analysis',
      color: 'green'
    },
    {
      id: 're_governance_lead',
      label: 'RE Governance Lead',
      icon: 'Shield',
      description: 'Compliance, regulatory, and local authority validation',
      color: 'orange'
    }
  ];

  useEffect(() => {
    if (landId) {
      fetchReviewStatuses();
    }
  }, [landId]);

  const fetchReviewStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statuses = await reviewsAPI.getAllReviewStatuses(landId);
      setReviewStatuses(statuses || {});
    } catch (err) {
      console.error('Error fetching review statuses:', err);
      setError('Failed to load review status');
    } finally {
      setLoading(false);
    }
  };

  // Fetch task status data for detailed view from admin review panel
  const fetchTaskStatus = async (roleId) => {
    setLoadingTaskData(true);
    try {
      console.log('🔄 Fetching task status for role:', roleId, 'land:', landId);
      
      // Fetch tasks for this specific role with subtasks included
      let response;
      try {
        // Try to fetch tasks with subtasks included
        response = await taskAPI.getTasks({ 
          land_id: landId,
          assigned_role: roleId,
          include_subtasks: true
        });
      } catch (err) {
        // Fallback to fetching without include_subtasks
        console.warn('Failed to fetch tasks with subtasks, falling back:', err);
        response = await taskAPI.getTasks({ 
          land_id: landId,
          assigned_role: roleId
        });
      }
      
      console.log('📊 Task response for role:', roleId, response);
      
      let tasks = [];
      if (response && Array.isArray(response) && response.length > 0) {
        tasks = response;
      } else if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        tasks = response.data;
      } else if (response && response.tasks && Array.isArray(response.tasks) && response.tasks.length > 0) {
        tasks = response.tasks;
      }
      
      console.log('📊 Extracted tasks for role:', roleId, tasks);
      
      // Fetch subtasks and reviewer info for each task
      if (tasks && tasks.length > 0) {
        // Remove duplicates by task_id
        const uniqueTasks = [];
        const seenTaskIds = new Set();
        
        tasks.forEach(task => {
          const taskId = task.task_id || task.id;
          if (taskId && !seenTaskIds.has(taskId)) {
            seenTaskIds.add(taskId);
            uniqueTasks.push(task);
          } else if (!taskId) {
            // If no task_id, add it anyway (might be a new task)
            uniqueTasks.push(task);
          }
        });
        
        console.log('📊 Unique tasks after deduplication:', uniqueTasks.length, 'out of', tasks.length);
        
        const tasksWithSubtasks = await Promise.all(
          uniqueTasks.map(async (task) => {
            let subtasks = [];
            
            // Check if subtasks are already included in the task response
            if (task.subtasks !== undefined && Array.isArray(task.subtasks)) {
              subtasks = [...task.subtasks]; // Use subtasks from response
              console.log('📊 Using subtasks from task response:', task.task_id || task.id, subtasks.length);
            } else {
              // Try to fetch subtasks separately (may fail with 403 for investors)
              try {
                subtasks = await taskAPI.getSubtasks(task.task_id || task.id);
                console.log('📊 Subtasks fetched separately for task:', task.task_id || task.id, subtasks);
              } catch (subtaskErr) {
                // Handle 403 and other errors gracefully
                if (subtaskErr.response?.status === 403) {
                  console.warn('⚠️ Not authorized to view subtasks for task:', task.task_id || task.id, '- continuing without subtasks');
                } else {
                  console.error('Error fetching subtasks for task:', task.task_id || task.id, subtaskErr);
                }
                subtasks = []; // Use empty array if fetch fails
              }
            }
            
            // Fetch reviewer info if assigned_to is available
            let reviewer = null;
            if (task.assigned_to) {
              try {
                reviewer = await usersAPI.getUserById(task.assigned_to);
              } catch (reviewerErr) {
                console.error('Error fetching reviewer for task:', task.task_id || task.id, reviewerErr);
                // Use assigned_to_name if available as fallback
                if (task.assigned_to_name) {
                  reviewer = {
                    first_name: task.assigned_to_name.split(' ')[0] || '',
                    last_name: task.assigned_to_name.split(' ').slice(1).join(' ') || '',
                    email: task.assigned_to_email || ''
                  };
                }
              }
            } else if (task.assigned_to_name) {
              // Use assigned_to_name as fallback
              reviewer = {
                first_name: task.assigned_to_name.split(' ')[0] || '',
                last_name: task.assigned_to_name.split(' ').slice(1).join(' ') || '',
                email: task.assigned_to_email || ''
              };
            }
            
            return {
              ...task,
              subtasks: subtasks || [],
              reviewer: reviewer
            };
          })
        );
        
        // Process tasks to create role-based structure
        const processedData = processTasksForRoles(tasksWithSubtasks);
        console.log('📊 Processed data for role:', roleId, processedData);
        setTaskStatusData(processedData);
      } else {
        console.warn('⚠️ No task data found for role:', roleId);
        setTaskStatusData({});
      }
    } catch (error) {
      console.error('❌ Error fetching task status for role:', roleId, error);
      setTaskStatusData({});
    } finally {
      setLoadingTaskData(false);
    }
  };

  // Process tasks to create role-based structure
  const processTasksForRoles = (tasks) => {
    console.log('🔧 Processing tasks for roles:', tasks);
    const roleData = {};
    
    // Initialize role data structure
    reviewerRoles.forEach(role => {
      roleData[role.id] = {
        completed: 0,
        total: 0,
        status: 'pending',
        tasks: []
      };
    });

    // Process each task
    tasks.forEach((task, index) => {
      console.log(`🔧 Processing task ${index}:`, task);
      
      // Determine the role ID from various possible properties
      let roleId = task.assigned_role || task.role || task.role_id || task.reviewer_role;
      
      // Handle case where role might be in a different format
      if (!roleId && task.reviewer) {
        if (typeof task.reviewer === 'string') {
          // Try to extract role from reviewer string
          if (task.reviewer.includes('sales')) roleId = 're_sales_advisor';
          else if (task.reviewer.includes('analyst')) roleId = 're_analyst';
          else if (task.reviewer.includes('governance')) roleId = 're_governance_lead';
        } else if (typeof task.reviewer === 'object' && task.reviewer !== null) {
          roleId = task.reviewer.role || task.reviewer.role_id;
        }
      }
      
      // If still no roleId, try to infer from task name or description
      if (!roleId && (task.title || task.task_name || task.name || task.description)) {
        const taskText = (task.title || task.task_name || task.name || task.description).toLowerCase();
        if (taskText.includes('sales') || taskText.includes('market')) roleId = 're_sales_advisor';
        else if (taskText.includes('analy') || taskText.includes('technical') || 
                taskText.includes('financial')) roleId = 're_analyst';
        else if (taskText.includes('govern') || taskText.includes('compliance') || 
                taskText.includes('regulatory')) roleId = 're_governance_lead';
      }
      
      // Default to analyst if we still can't determine role
      if (!roleId) {
        console.warn(`🔧 Could not determine role for task, defaulting to analyst:`, task);
        roleId = 're_analyst';
      }
      
      console.log(`🔧 Resolved roleId:`, roleId);
      
      // Normalize roleId to match our expected format
      if (roleId === 'sales_advisor') roleId = 're_sales_advisor';
      if (roleId === 'analyst') roleId = 're_analyst';
      if (roleId === 'governance_lead') roleId = 're_governance_lead';
      
      if (roleData[roleId]) {
        console.log(`🔧 Adding task to role:`, roleId);
        roleData[roleId].total += 1;
        
        // Determine task completion status
        const isCompleted = task.status === 'completed' || 
                           task.status === 'approved' || 
                           task.completed === true;
        
        if (isCompleted) {
          roleData[roleId].completed += 1;
        }
        
        // Add task to role's task list with subtasks
        // Use task_type first (like admin review panel), then fallback to title/name
        const getTaskDisplayName = (task) => {
          if (task.task_type) {
            return task.task_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          return task.title || task.task_name || task.name || 'Untitled Task';
        };
        
        const taskName = getTaskDisplayName(task);
        const taskData = {
          id: task.task_id || task.id,
          name: taskName,
          completed: isCompleted,
          description: task.description || '',
          status: task.status || (isCompleted ? 'completed' : 'pending'),
          task_type: task.task_type, // Keep original task_type for reference
          reviewer: task.reviewer // Include reviewer info
        };
        
        // Add subtasks if they exist
        if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
          console.log(`🔧 Processing subtasks for task:`, taskName, task.subtasks);
          
          let completedSubtasks = 0;
          taskData.subtasks = task.subtasks.map(subtask => {
            const isSubtaskCompleted = subtask.status === 'completed' || 
                                      subtask.status === 'approved' || 
                                      subtask.completed === true;
            
            if (isSubtaskCompleted) {
              completedSubtasks++;
            }
            
            return {
              id: subtask.subtask_id || subtask.id,
              name: subtask.title || subtask.name || subtask.subtask_name || 'Untitled Subtask',
              completed: isSubtaskCompleted,
              description: subtask.description || '',
              status: subtask.status || (isSubtaskCompleted ? 'completed' : 'pending')
            };
          });
          
          // Update task completion based on subtasks
          if (taskData.subtasks.length > 0) {
            taskData.completion_percentage = Math.round((completedSubtasks / taskData.subtasks.length) * 100);
          }
          
          console.log(`🔧 Processed subtasks:`, taskData.subtasks);
        }
        
        roleData[roleId].tasks.push(taskData);

        // Update role status based on task statuses
        if (isCompleted) {
          if (roleData[roleId].status !== 'in_progress') {
            roleData[roleId].status = 'completed';
          }
        } else if (task.status === 'in_progress') {
          roleData[roleId].status = 'in_progress';
        }
        
        // Calculate completion percentage for the role
        if (roleData[roleId].total > 0) {
          roleData[roleId].completion_percentage = Math.round(
            (roleData[roleId].completed / roleData[roleId].total) * 100
          );
        } else {
          roleData[roleId].completion_percentage = 0;
        }
        
        console.log(`🔧 Updated role data for ${roleId}:`, roleData[roleId]);
      } else {
        console.warn(`🔧 No matching role found for task:`, task);
        console.warn(`🔧 Available roles:`, Object.keys(roleData));
      }
    });

    console.log('🔧 Final processed role data:', roleData);
    return roleData;
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'clarification_requested':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'CheckCircle';
      case 'rejected':
        return 'XCircle';
      case 'pending':
        return 'Clock';
      case 'in_progress':
        return 'PlayCircle';
      case 'clarification_requested':
        return 'MessageCircle';
      default:
        return 'Circle';
    }
  };

  const getRoleColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200', 
      orange: 'bg-orange-50 border-orange-200'
    };
    return colorMap[color] || 'bg-gray-50 border-gray-200';
  };

  const getRoleIconColor = (color) => {
    const colorMap = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600'
    };
    return colorMap[color] || 'text-gray-600';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateOverallProgress = () => {
    if (!reviewStatuses || Object.keys(reviewStatuses).length === 0) {
      return 0;
    }

    const totalRoles = reviewerRoles.length;
    let completedRoles = 0;

    reviewerRoles.forEach(role => {
      const status = reviewStatuses[role.id];
      if (status && (status.status === 'approved' || status.status === 'completed')) {
        completedRoles++;
      }
    });

    return Math.round((completedRoles / totalRoles) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
            <Icon name="FileCheck" size={24} className="text-gray-400" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Review Status</h4>
            <p className="text-sm text-gray-500">Loading review information...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Icon name="AlertCircle" size={24} className="text-red-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Review Status</h4>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Icon name="FileCheck" size={24} className="text-purple-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Review Status</h4>
          <p className="text-sm text-gray-500">
            Project review progress and reviewer assignments
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Review Progress</span>
          <span className="text-sm font-semibold text-gray-900">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {overallProgress === 100 ? 'All reviews completed' : 
           overallProgress === 0 ? 'No reviews started' : 
           `${overallProgress}% of reviews completed`}
        </p>
      </div>

      {/* Reviewer Roles Status */}
      <div className="space-y-4">
        {reviewerRoles.map((role) => {
          const status = reviewStatuses[role.id];
          const isAssigned = status && status.assigned_to;
          const isCompleted = status && (status.status === 'approved' || status.status === 'completed');
          const isInProgress = status && status.status === 'in_progress';
          const isPending = status && status.status === 'pending';
          const isRejected = status && status.status === 'rejected';
          const needsClarification = status && status.status === 'clarification_requested';

          return (
            <div 
              key={role.id}
              className={`border rounded-lg p-4 ${getRoleColorClasses(role.color)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColorClasses(role.color)}`}>
                    <Icon 
                      name={role.icon} 
                      size={20} 
                      className={getRoleIconColor(role.color)} 
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-semibold text-gray-900">{role.label}</h5>
                      {status && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status.status)}`}>
                          <Icon 
                            name={getStatusIcon(status.status)} 
                            size={12} 
                            className="mr-1" 
                          />
                          {status.status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                    
                    {status && (
                      <div className="space-y-1 text-xs text-gray-500">
                        {status.assigned_to_name && (
                          <div className="flex items-center space-x-1">
                            <Icon name="User" size={12} />
                            <span>Assigned to: {status.assigned_to_name}</span>
                          </div>
                        )}
                        {status.updated_at && (
                          <div className="flex items-center space-x-1">
                            <Icon name="Clock" size={12} />
                            <span>Last updated: {formatDate(status.updated_at)}</span>
                          </div>
                        )}
                        {status.completion_percentage && (
                          <div className="flex items-center space-x-1">
                            <Icon name="BarChart3" size={12} />
                            <span>Progress: {status.completion_percentage}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!status && (
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Icon name="AlertCircle" size={12} />
                        <span>No review assigned yet</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isCompleted && (
                    <Icon name="CheckCircle" size={20} className="text-green-600" />
                  )}
                  {isInProgress && (
                    <Icon name="PlayCircle" size={20} className="text-blue-600" />
                  )}
                  {isPending && (
                    <Icon name="Clock" size={20} className="text-yellow-600" />
                  )}
                  {isRejected && (
                    <Icon name="XCircle" size={20} className="text-red-600" />
                  )}
                  {needsClarification && (
                    <Icon name="MessageCircle" size={20} className="text-purple-600" />
                  )}
                  {!status && (
                    <Icon name="Circle" size={20} className="text-gray-400" />
                  )}
                  
                  {/* Individual View Icon for each role */}
                  <button
                    onClick={async () => {
                      console.log('👁️ Eye icon clicked for role:', role.id);
                      setSelectedRole(role.id);
                      setShowTaskModal(true);
                      await fetchTaskStatus(role.id);
                    }}
                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title={`View detailed tasks for ${role.label}`}
                  >
                    <Icon name="Eye" size={16} />
                  </button>
                </div>
              </div>

              {/* Progress Bar for Individual Role */}
              {status && status.completion_percentage && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Review Progress</span>
                    <span className="text-xs font-semibold text-gray-800">{status.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' :
                        isInProgress ? 'bg-blue-500' :
                        isPending ? 'bg-yellow-500' :
                        isRejected ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${status.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return status && (status.status === 'approved' || status.status === 'completed');
              }).length}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return status && status.status === 'in_progress';
              }).length}
            </div>
            <div className="text-xs text-gray-500">In Progress</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-yellow-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return status && status.status === 'pending';
              }).length}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return !status;
              }).length}
            </div>
            <div className="text-xs text-gray-500">Not Assigned</div>
          </div>
        </div>
      </div>

      {/* Task Status Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedRole && reviewerRoles.find(r => r.id === selectedRole)?.label} Tasks
                  </h2>
                  <p className="text-sm text-gray-500">
                    Detailed task progress for {selectedRole && reviewerRoles.find(r => r.id === selectedRole)?.label}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedRole(null);
                    setExpandedTasks({}); // Reset expanded tasks when closing modal
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Icon name="X" size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingTaskData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-500">Loading task data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedRole && taskStatusData[selectedRole] && Object.keys(taskStatusData[selectedRole]).length > 0 ? (() => {
                    const status = taskStatusData[selectedRole];
                    const roleInfo = reviewerRoles.find(r => r.id === selectedRole);
                    
                    return (
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Icon name={roleInfo?.icon || "User"} size={18} className="text-purple-600" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {roleInfo?.label || selectedRole.replace('_', ' ').replace('re ', '')}
                            </h3>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            status.status === 'completed' ? 'bg-green-100 text-green-800' :
                            status.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {status.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{status.completed}/{status.total} tasks</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(status.completed / status.total) * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Task Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="flex items-center space-x-2">
                            <Icon name="CheckCircle" size={16} className="text-green-600" />
                            <span className="text-green-600 font-medium">{status.completed} Completed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Icon name="Clock" size={16} className="text-orange-600" />
                            <span className="text-orange-600 font-medium">{status.total - status.completed} Remaining</span>
                          </div>
                        </div>

                        {/* Individual Task List */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">Task Breakdown</h4>
                          
                          {status.tasks && status.tasks.length > 0 ? (
                            <div className="space-y-2">
                              {status.tasks.map((task, taskIndex) => {
                                const taskId = task.id || `task-${taskIndex}`;
                                const isExpanded = expandedTasks[taskId] || false;
                                
                                return (
                                  <div key={taskId} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Task Header - Accordion */}
                                    <button
                                      onClick={() => setExpandedTasks(prev => ({
                                        ...prev,
                                        [taskId]: !prev[taskId]
                                      }))}
                                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                                    >
                                      <div className="flex items-center space-x-3 flex-1">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                          task.completed ? 'bg-green-100' : task.status === 'in_progress' ? 'bg-blue-100' : 'bg-yellow-100'
                                        }`}>
                                          <Icon 
                                            name={task.completed ? "Check" : task.status === 'in_progress' ? "Clock" : "Circle"} 
                                            size={12} 
                                            className={task.completed ? "text-green-600" : task.status === 'in_progress' ? "text-blue-600" : "text-yellow-600"} 
                                          />
                                        </div>
                                        <div className="text-left flex-1">
                                          <h5 className="font-medium text-gray-900">{task.name}</h5>
                                          {task.reviewer && (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              Reviewer: {task.reviewer.first_name || ''} {task.reviewer.last_name || ''} {task.reviewer.email ? `(${task.reviewer.email})` : ''}
                                            </p>
                                          )}
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                                          task.completed ? 'bg-green-100 text-green-800' : 
                                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {task.status?.replace('_', ' ') || (task.completed ? 'Completed' : 'Pending')}
                                        </span>
                                        <Icon 
                                          name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                                          size={16} 
                                          className="text-gray-400 ml-2"
                                        />
                                      </div>
                                    </button>
                                    
                                    {/* Task Content - Accordion Body */}
                                    {isExpanded && (
                                      <div className="px-3 pb-3 border-t border-gray-100">
                                        {task.description && (
                                          <p className="text-sm text-gray-600 mt-3 mb-3">{task.description}</p>
                                        )}
                                        
                                        {/* Subtasks */}
                                        {task.subtasks && task.subtasks.length > 0 ? (
                                          <div className="mt-3">
                                            <h6 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                              <Icon name="List" size={14} className="mr-1" />
                                              Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})
                                            </h6>
                                            <div className="space-y-2">
                                              {task.subtasks.map((subtask, subtaskIndex) => (
                                                <div key={subtask.id || subtaskIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                                  <div className="flex items-center space-x-2 flex-1">
                                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                                      subtask.completed ? 'bg-green-100' : 'bg-gray-200'
                                                    }`}>
                                                      {subtask.completed && (
                                                        <Icon name="Check" size={10} className="text-green-600" />
                                                      )}
                                                    </div>
                                                    <span className={`text-xs flex-1 ${subtask.completed ? 'text-gray-700' : 'text-gray-600'}`}>
                                                      {subtask.name}
                                                    </span>
                                                  </div>
                                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                                    subtask.completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    {subtask.completed ? 'Done' : 'Pending'}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                            
                                            {/* Subtask Progress */}
                                            {task.completion_percentage !== undefined && (
                                              <div className="mt-3">
                                                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                                  <span>Subtask Progress</span>
                                                  <span>{task.completion_percentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                  <div
                                                    className="bg-green-500 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${task.completion_percentage}%` }}
                                                  />
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-500 mt-2">No subtasks available</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-lg">
                              <Icon name="FileQuestion" size={32} className="text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No tasks found for this role</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="text-center py-8">
                      <Icon name="AlertCircle" size={48} className="text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Task Data Available</h3>
                      <p className="text-gray-500 mb-4">
                        No task data found for {selectedRole && reviewerRoles.find(r => r.id === selectedRole)?.label} in the admin review panel.
                      </p>
                      <p className="text-sm text-gray-400">
                        This could mean the role hasn't been assigned any tasks yet, or the admin review panel hasn't been set up for this project.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedRole(null);
                    setExpandedTasks({}); // Reset expanded tasks when closing modal
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewStatusPanel;
