import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '../../../components/ui/Header';
import WorkflowBreadcrumbs from '../../../components/ui/WorkflowBreadcrumbs';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { landsAPI, taskAPI, usersAPI } from '../../../services/api';

const ProjectReviewPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [reviewerRoles, setReviewerRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define the three reviewer roles
  const reviewerRolesConfig = [
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
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get project data from location state or fetch from API
      const projectData = location.state?.project || await landsAPI.getLandById(projectId);
      setProject(projectData);

      // Fetch tasks for this project
      await fetchProjectTasks(projectId);
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (landId) => {
    try {
      console.log('🔄 Fetching tasks for project:', landId);
      
      // Fetch all tasks for this project
      const response = await taskAPI.getTaskStatusByProject(landId);
      console.log('📊 Tasks response:', response);
      
      // Handle different response structures
      let tasks = [];
      if (response && response.tasks && response.tasks.length > 0) {
        tasks = response.tasks;
      } else if (response && Array.isArray(response) && response.length > 0) {
        tasks = response;
      } else if (response && response.data && response.data.length > 0) {
        tasks = response.data;
      }

      if (tasks && tasks.length > 0) {
        console.log('📊 Processing tasks:', tasks);
        const processedData = processTasksForRoles(tasks);
        console.log('📊 Processed data:', processedData);
        setReviewerRoles(processedData);
      } else {
        console.warn('⚠️ No task data received');
        setReviewerRoles({});
      }
    } catch (err) {
      console.error('❌ Error fetching tasks:', err);
      setReviewerRoles({});
    }
  };

  // Process tasks to create role-based structure
  const processTasksForRoles = (tasks) => {
    console.log('🔧 Processing tasks for roles:', tasks);
    const roleData = {};
    
    // Initialize role data structure
    reviewerRolesConfig.forEach(role => {
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
      
      // Normalize roleId to match our expected format
      if (roleId === 'sales_advisor') roleId = 're_sales_advisor';
      if (roleId === 'analyst') roleId = 're_analyst';
      if (roleId === 'governance_lead') roleId = 're_governance_lead';
      
      console.log(`🔧 Resolved roleId:`, roleId);
      
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
        const taskName = task.title || task.task_name || task.name || 'Untitled Task';
        const taskData = {
          id: task.task_id || task.id,
          name: taskName,
          completed: isCompleted,
          description: task.description || '',
          status: task.status || (isCompleted ? 'completed' : 'pending')
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
              name: subtask.name || subtask.title || subtask.subtask_name || 'Untitled Subtask',
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
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIconColor = (color) => {
    const colorMap = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600'
    };
    return colorMap[color] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="landowner" notifications={{ dashboard: 0, projects: 0 }} />
        <WorkflowBreadcrumbs />
        <main className="pt-4 pb-20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading project review...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="landowner" notifications={{ dashboard: 0, projects: 0 }} />
        <WorkflowBreadcrumbs />
        <main className="pt-4 pb-20">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <Icon name="AlertCircle" size={48} className="text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Project</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => navigate('/landowner/project-status')}
                iconName="ArrowLeft"
                iconPosition="left"
              >
                Back to Projects
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="landowner" notifications={{ dashboard: 0, projects: 0 }} />
      <WorkflowBreadcrumbs />
      
      <main className="pt-4 pb-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/landowner/project-status')}
                  iconName="ArrowLeft"
                  iconSize={16}
                >
                  Back to Projects
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Project Review Status
              </h1>
              <p className="text-muted-foreground">
                {project?.name} - Review progress by role
              </p>
            </div>
          </div>

          {/* Project Overview */}
          {project && (
            <div className="bg-card border border-border rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Project Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Project Name</p>
                  <p className="text-base font-medium text-foreground mt-1">{project.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="text-base font-medium text-foreground mt-1">{project.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      project.status === 'approved' ? 'bg-green-100 text-green-800' :
                      project.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status?.replace('_', ' ') || 'Draft'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reviewer Roles */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Icon name="Users" size={28} />
              Review Progress by Role
            </h2>

            {Object.keys(reviewerRoles).length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {reviewerRolesConfig.map((roleConfig) => {
                  const roleData = reviewerRoles[roleConfig.id];
                  if (!roleData) return null;

                  return (
                    <div key={roleConfig.id} className="bg-card border border-border rounded-lg p-6">
                      {/* Role Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          roleConfig.color === 'blue' ? 'bg-blue-100' :
                          roleConfig.color === 'green' ? 'bg-green-100' :
                          'bg-orange-100'
                        }`}>
                          <Icon 
                            name={roleConfig.icon} 
                            size={24} 
                            className={getRoleIconColor(roleConfig.color)} 
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {roleConfig.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {roleConfig.description}
                          </p>
                        </div>
                      </div>

                      {/* Progress Stats */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>{roleData.completed}/{roleData.total} tasks</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              roleConfig.color === 'blue' ? 'bg-blue-500' :
                              roleConfig.color === 'green' ? 'bg-green-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${roleData.completion_percentage || 0}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-muted-foreground">
                            {roleData.completion_percentage || 0}% Complete
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(roleData.status)}`}>
                            {roleData.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Tasks List */}
                      {roleData.tasks && roleData.tasks.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-foreground">Tasks</h4>
                          <div className="space-y-2">
                            {roleData.tasks.map((task, index) => (
                              <div key={task.id || index} className="border border-gray-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                      task.completed ? 'bg-green-100' : 'bg-blue-100'
                                    }`}>
                                      <Icon 
                                        name={task.completed ? "Check" : "Clock"} 
                                        size={12} 
                                        className={task.completed ? "text-green-600" : "text-blue-600"} 
                                      />
                                    </div>
                                    <h5 className="text-sm font-medium text-foreground">
                                      {task.name}
                                    </h5>
                                  </div>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {task.completed ? 'Completed' : 'In Progress'}
                                  </span>
                                </div>
                                
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                                )}
                                
                                {/* Subtasks */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Subtasks</h6>
                                    <div className="space-y-1">
                                      {task.subtasks.map((subtask, subIndex) => (
                                        <div key={subtask.id || subIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                          <div className="flex items-center space-x-2">
                                            <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                                              subtask.completed ? 'bg-green-100' : 'bg-gray-200'
                                            }`}>
                                              {subtask.completed && (
                                                <Icon name="Check" size={8} className="text-green-600" />
                                              )}
                                            </div>
                                            <span className={`text-xs ${subtask.completed ? 'text-gray-700' : 'text-gray-600'}`}>
                                              {subtask.name}
                                            </span>
                                          </div>
                                          <span className={`text-xs ${
                                            subtask.completed ? 'text-green-600' : 'text-gray-500'
                                          }`}>
                                            {subtask.completed ? 'Done' : 'Pending'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Subtask Progress */}
                                    {task.completion_percentage !== undefined && (
                                      <div className="mt-2">
                                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                          <span>Subtask Progress</span>
                                          <span>{task.completion_percentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                          <div
                                            className="bg-green-500 h-1 rounded-full"
                                            style={{ width: `${task.completion_percentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Icon name="FileQuestion" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Review Data Available</h3>
                <p className="text-muted-foreground mb-4">
                  This project hasn't been assigned to reviewers yet or review tasks haven't been created.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/landowner/project-status')}
                  iconName="ArrowLeft"
                  iconPosition="left"
                >
                  Back to Projects
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectReviewPage;
