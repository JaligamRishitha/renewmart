import React, { useState, useEffect } from 'react';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { taskAPI, landsAPI } from '../../../services/api';

const ProjectDetailsModal = ({ isOpen, onClose, projectData }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && projectData?.landId) {
      fetchProjectTasks();
    }
  }, [isOpen, projectData]);

  const fetchProjectTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tasks related to this project/land
      const tasksData = await taskAPI.getTasks({ land_id: projectData.landId });
      setTasks(tasksData || []);
    } catch (err) {
      console.error('Error fetching project tasks:', err);
      setError('Failed to load project tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  if (!projectData) return null;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Details & Task Tracking"
      size="xl"
    >
      <div className="space-y-6">
        {/* Project Overview */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Icon name="MapPin" size={32} className="text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                {projectData.projectTitle}
              </h3>
              <p className="text-lg text-muted-foreground">
                {projectData.projectLocation}
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectTypeColor(projectData.projectType)}`}>
                {projectData.projectType?.toUpperCase() || 'N/A'}
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
                {projectData.projectCapacity || 'N/A'} MW
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
                ${projectData.projectPrice || 'N/A'}/MWh
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
                {formatDate(projectData.createdAt)}
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
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProjectTasks}
                iconName="RefreshCw"
                iconSize={14}
                disabled={loading}
              >
                Refresh
              </Button>
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

        {/* Task Details */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-foreground flex items-center">
              <Icon name="List" size={20} className="text-blue-600 mr-2" />
              Task Details
            </h4>
          </div>
          
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader" size={24} className="animate-spin text-blue-600 mr-2" />
                <span className="text-muted-foreground">Loading tasks...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="AlertCircle" size={24} className="text-red-600 mr-2" />
                <span className="text-red-600">{error}</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="FileText" size={24} className="text-gray-400 mr-2" />
                <span className="text-muted-foreground">No tasks found for this project</span>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task, index) => (
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                ))}
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
                {projectData.projectStatus || 'Active'}
              </p>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Landowner
              </label>
              <p className="text-sm text-foreground mt-1">
                {projectData.landownerName || 'N/A'}
              </p>
            </div>
            
            {projectData.investmentAmount && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Investment Amount
                </label>
                <p className="text-sm text-foreground mt-1">
                  {formatCurrency(projectData.investmentAmount)}
                </p>
              </div>
            )}
            
            {projectData.interestLevel && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Interest Level
                </label>
                <p className="text-sm text-foreground mt-1">
                  {projectData.interestLevel.charAt(0).toUpperCase() + projectData.interestLevel.slice(1)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            iconName="X"
            iconSize={16}
          >
            Close
          </Button>
          <Button
            variant="default"
            onClick={() => {
              window.open(`/document-review/${projectData.landId}`, '_blank');
            }}
            iconName="ExternalLink"
            iconSize={16}
          >
            View Full Project
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ProjectDetailsModal;
