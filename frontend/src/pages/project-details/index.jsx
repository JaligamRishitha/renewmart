import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { taskAPI, landsAPI, usersAPI } from '../../services/api';
import ReviewStatusPanel from './components/ReviewStatusPanel';

const ProjectDetailsPage = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [landownerData, setLandownerData] = useState(null);
  const [taskDetails, setTaskDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (landId) {
      fetchProjectData();
      fetchProjectTasks();
    }
  }, [landId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch project/land data
      const landData = await landsAPI.getLandById(landId);
      setProjectData(landData);
      
      // Fetch landowner details if landowner_id is available
      if (landData?.landowner_id) {
        try {
          const landownerInfo = await usersAPI.getUserById(landData.landowner_id);
          setLandownerData(landownerInfo);
        } catch (landownerErr) {
          console.error('Error fetching landowner data:', landownerErr);
          // Don't set error for landowner data as it's not critical
        }
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project data');
    }
  };

  const fetchProjectTasks = async () => {
    try {
      // Fetch tasks related to this project/land
      const tasksData = await taskAPI.getTasks({ land_id: landId });
      setTasks(tasksData || []);
      
      // Fetch detailed information for each task
      if (tasksData && tasksData.length > 0) {
        const detailedTasks = await Promise.all(
          tasksData.map(async (task) => {
            try {
              // Fetch detailed task information
              const taskDetail = await taskAPI.getTaskById(task.task_id);
              
              // Fetch task history if available
              let taskHistory = [];
              try {
                taskHistory = await taskAPI.getTaskHistory(task.task_id);
              } catch (historyErr) {
                console.log('No task history available for task:', task.task_id);
              }
              
              // Fetch subtasks if available
              let subtasks = [];
              try {
                subtasks = await taskAPI.getSubtasks(task.task_id);
              } catch (subtaskErr) {
                console.log('No subtasks available for task:', task.task_id);
              }
              
              return {
                ...task,
                ...taskDetail,
                history: taskHistory,
                subtasks: subtasks
              };
            } catch (detailErr) {
              console.error('Error fetching task details for:', task.task_id, detailErr);
              return task; // Return original task if detail fetch fails
            }
          })
        );
        
        setTaskDetails(detailedTasks.reduce((acc, task) => {
          acc[task.task_id] = task;
          return acc;
        }, {}));
      }
    } catch (err) {
      console.error('Error fetching project tasks:', err);
      // Don't set error for tasks as it's not critical
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
      'on_hold': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProjectTypeColor = (type) => {
    const colors = {
      'solar': 'bg-yellow-100 text-yellow-800',
      'wind': 'bg-blue-100 text-blue-800',
      'hydro': 'bg-cyan-100 text-cyan-800',
      'geothermal': 'bg-orange-100 text-orange-800',
      'biomass': 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getTaskCompletionPercentage = () => {
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const getTaskStatusCounts = () => {
    const counts = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      on_hold: 0
    };
    
    tasks.forEach(task => {
      counts[task.status] = (counts[task.status] || 0) + 1;
    });
    
    return counts;
  };

  const taskStatusCounts = getTaskStatusCounts();
  const completionPercentage = getTaskCompletionPercentage();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="pt-16">
          <WorkflowBreadcrumbs />
          <main className={`pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
            <div className="max-w-9xl mx-auto px-4 lg:px-6">
              <div className="flex items-center justify-center h-64">
                <Icon name="Loader" size={32} className="animate-spin text-blue-600 mr-3" />
                <span className="text-lg text-muted-foreground">Loading project details...</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="pt-16">
          <WorkflowBreadcrumbs />
          <main className={`pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
            <div className="max-w-9xl mx-auto px-4 lg:px-6">
              <div className="flex flex-col items-center justify-center h-64">
                <Icon name="AlertCircle" size={48} className="text-red-600 mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Project Not Found</h2>
                <p className="text-muted-foreground mb-4">{error || 'The requested project could not be found.'}</p>
                <Button
                  variant="default"
                  onClick={() => navigate(-1)}
                  iconName="ArrowLeft"
                  iconSize={16}
                >
                  Go Back
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <div className="pt-16">
        <WorkflowBreadcrumbs />
        <main className={`pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
          <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Project Details & Task Tracking
                </h1>
                <p className="font-body text-muted-foreground">
                  Comprehensive view of project information and task progress
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  iconName="ArrowLeft"
                  iconSize={18}
                >
                  Back
                </Button>
                <Button
                  variant="default"
                  onClick={fetchProjectTasks}
                  iconName="RefreshCw"
                  iconSize={18}
                  disabled={loading}
                >
                  Refresh Tasks
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Project Overview */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon name="MapPin" size={32} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {projectData.title || projectData.name || 'Unnamed Project'}
                  </h3>
                  <p className="text-lg text-muted-foreground">
                    {projectData.location_text || projectData.location || 'Location not specified'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    {completionPercentage}%
                  </div>
                  <div className="text-sm text-muted-foreground">Complete</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="Zap" size={16} className="text-yellow-600" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Project Type
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectTypeColor(projectData.energy_key || projectData.energyType)}`}>
                    {(projectData.energy_key || projectData.energyType || 'N/A').toUpperCase()}
                  </span>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="Battery" size={16} className="text-blue-600" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Capacity
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {projectData.capacity_mw || projectData.capacity || 'N/A'} MW
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="DollarSign" size={16} className="text-green-600" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Price
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    ${projectData.price_per_mwh || projectData.price || 'N/A'}/MWh
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="Calendar" size={16} className="text-purple-600" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Created
                    </span>
                  </div>
                  <div className="text-sm text-foreground">
                    {formatDate(projectData.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Task Progress Overview */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-foreground flex items-center">
                  <Icon name="CheckSquare" size={20} className="text-blue-600 mr-2" />
                  Task Progress Overview
                </h4>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-muted-foreground">
                    {tasks.length} Total Tasks
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Task Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{taskStatusCounts.pending}</div>
                  <div className="text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{taskStatusCounts.in_progress}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{taskStatusCounts.completed}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{taskStatusCounts.on_hold}</div>
                  <div className="text-xs text-muted-foreground">On Hold</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{taskStatusCounts.cancelled}</div>
                  <div className="text-xs text-muted-foreground">Cancelled</div>
                </div>
              </div>
            </div>

            {/* Review Status Panel */}
            <ReviewStatusPanel landId={landId} projectData={projectData} />

            {/* Task Details */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-foreground flex items-center">
                  <Icon name="List" size={20} className="text-blue-600 mr-2" />
                  Task Details
                </h4>
              </div>
              
              <div className="p-6">
                {tasks.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon name="FileText" size={24} className="text-gray-400 mr-2" />
                    <span className="text-muted-foreground">No tasks found for this project</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task, index) => {
                      const detailedTask = taskDetails[task.task_id] || task;
                      return (
                        <div key={task.task_id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h5 className="font-semibold text-foreground">{task.title || 'Untitled Task'}</h5>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                  {task.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                                </span>
                                {task.priority && (
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                                <div>
                                  <span className="text-muted-foreground">Assigned to:</span>
                                  <span className="ml-2 text-foreground">
                                    {task.assigned_to_name || task.assignee_name || 'Unassigned'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Created:</span>
                                  <span className="ml-2 text-foreground">
                                    {formatDate(task.created_at)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Due Date:</span>
                                  <span className="ml-2 text-foreground">
                                    {formatDate(task.due_date) || 'No due date'}
                                  </span>
                                </div>
                              </div>

                              {/* Subtasks */}
                              {detailedTask.subtasks && detailedTask.subtasks.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Icon name="List" size={14} className="text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Subtasks ({detailedTask.subtasks.length})
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {detailedTask.subtasks.slice(0, 3).map((subtask, subIndex) => (
                                      <div key={subIndex} className="flex items-center space-x-2 text-xs">
                                        <Icon 
                                          name={subtask.status === 'completed' ? 'CheckCircle' : 'Circle'} 
                                          size={12} 
                                          className={subtask.status === 'completed' ? 'text-green-600' : 'text-gray-400'} 
                                        />
                                        <span className="text-muted-foreground">{subtask.title}</span>
                                      </div>
                                    ))}
                                    {detailedTask.subtasks.length > 3 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{detailedTask.subtasks.length - 3} more subtasks
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Task History */}
                              {detailedTask.history && detailedTask.history.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Icon name="History" size={14} className="text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                      Recent Activity ({detailedTask.history.length})
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    {detailedTask.history.slice(0, 2).map((historyItem, histIndex) => (
                                      <div key={histIndex} className="text-xs text-muted-foreground">
                                        <span className="font-medium">{historyItem.action || 'Updated'}</span>
                                        {historyItem.timestamp && (
                                          <span className="ml-2">- {formatDate(historyItem.timestamp)}</span>
                                        )}
                                      </div>
                                    ))}
                                    {detailedTask.history.length > 2 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{detailedTask.history.length - 2} more activities
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-4 flex items-center space-x-2">
                              {task.status === 'completed' && (
                                <Icon name="CheckCircle" size={20} className="text-green-600" />
                              )}
                              {task.status === 'in_progress' && (
                                <Icon name="Clock" size={20} className="text-blue-600" />
                              )}
                              {task.status === 'pending' && (
                                <Icon name="Circle" size={20} className="text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Project Information */}
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="Info" size={24} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground">
                    Project Information
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Additional project details and metadata
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Project Status
                  </label>
                  <p className="text-sm text-foreground mt-1">
                    {projectData.status || 'Active'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Project ID
                  </label>
                  <p className="text-sm text-foreground mt-1">
                    {projectData.land_id || projectData.id || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Last Updated
                  </label>
                  <p className="text-sm text-foreground mt-1">
                    {formatDate(projectData.updated_at)}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Created Date
                  </label>
                  <p className="text-sm text-foreground mt-1">
                    {formatDate(projectData.created_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Landowner Information */}
            {landownerData && (
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Icon name="User" size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">
                      Landowner Information
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Contact details and profile information
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Full Name
                    </label>
                    <p className="text-sm text-foreground mt-1">
                      {landownerData.first_name} {landownerData.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Email Address
                    </label>
                    <p className="text-sm text-foreground mt-1 flex items-center">
                      <Icon name="Mail" size={14} className="text-muted-foreground mr-2" />
                      {landownerData.email}
                    </p>
                  </div>
                  
                  {landownerData.phone && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Phone Number
                      </label>
                      <p className="text-sm text-foreground mt-1 flex items-center">
                        <Icon name="Phone" size={14} className="text-muted-foreground mr-2" />
                        {landownerData.phone}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      User ID
                    </label>
                    <p className="text-sm text-foreground mt-1">
                      {landownerData.user_id}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Account Status
                    </label>
                    <p className="text-sm text-foreground mt-1">
                      {landownerData.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Member Since
                    </label>
                    <p className="text-sm text-foreground mt-1">
                      {formatDate(landownerData.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
