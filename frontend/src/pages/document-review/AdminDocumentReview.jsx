import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import { taskAPI, documentsAPI, landsAPI, usersAPI } from '../../services/api';

const AdminDocumentReview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const reviewerRoles = [
    { id: 'all', label: 'All Roles', icon: 'Users', color: 'text-purple-500' },
    { id: 're_sales_advisor', label: 'RE Sales Advisor', icon: 'TrendingUp', color: 'text-blue-500' },
    { id: 're_analyst', label: 'RE Analyst', icon: 'Calculator', color: 'text-green-500' },
    { id: 're_governance_lead', label: 'RE Governance Lead', icon: 'Shield', color: 'text-orange-500' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all lands/projects (using getLands or getAdminProjects for admin view)
      const allLands = await landsAPI.getLands();
      console.log('Fetched lands:', allLands);

      // For each land, fetch tasks, subtasks, and documents
      const projectsWithData = await Promise.all(
        allLands.map(async (land) => {
          try {
            // Fetch tasks for this land
            const tasks = await taskAPI.getTasks({ land_id: land.land_id });

            // Fetch subtasks for each task
            const tasksWithSubtasks = await Promise.all(
              tasks.map(async (task) => {
                try {
                  const subtasks = await taskAPI.getSubtasks(task.task_id);
                  
                  // Fetch reviewer info
                  let reviewer = null;
                  if (task.assigned_to) {
                    try {
                      reviewer = await usersAPI.getUserById(task.assigned_to);
                    } catch (err) {
                      console.error('Failed to fetch reviewer:', err);
                    }
                  }

                  return { ...task, subtasks: subtasks || [], reviewer };
                } catch (err) {
                  console.error(`Failed to fetch subtasks for task ${task.task_id}:`, err);
                  return { ...task, subtasks: [], reviewer: null };
                }
              })
            );

            // Fetch documents
            const documents = await documentsAPI.getDocuments(land.land_id);

            return {
              ...land,
              tasks: tasksWithSubtasks,
              documents: documents || [],
              stats: calculateProjectStats(tasksWithSubtasks)
            };
          } catch (err) {
            console.error(`Failed to fetch data for land ${land.land_id}:`, err);
            return {
              ...land,
              tasks: [],
              documents: [],
              stats: { total: 0, completed: 0, pending: 0, subtasksTotal: 0, subtasksCompleted: 0 }
            };
          }
        })
      );

      setProjects(projectsWithData);
      console.log('Projects with all data:', projectsWithData);

    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectStats = (tasks) => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    
    const subtasksTotal = tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
    const subtasksCompleted = tasks.reduce((sum, t) => 
      sum + (t.subtasks?.filter(s => s.status === 'completed').length || 0), 0);

    return { total, completed, pending, inProgress, subtasksTotal, subtasksCompleted };
  };

  const getFilteredProjects = () => {
    if (selectedRole === 'all') {
      return projects;
    }
    return projects.filter(p => 
      p.tasks.some(t => t.assigned_role === selectedRole || t.reviewer?.roles?.includes(selectedRole))
    );
  };

  const getFilteredTasks = (tasks) => {
    if (selectedRole === 'all') {
      return tasks;
    }
    return tasks.filter(t => 
      t.assigned_role === selectedRole || t.reviewer?.roles?.includes(selectedRole)
    );
  };

  const handleViewTask = (task, project) => {
    setSelectedTask(task);
    setSelectedProject(project);
    setShowTaskModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading document review data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const filteredProjects = getFilteredProjects();
  const totalTasks = filteredProjects.reduce((sum, p) => sum + p.stats.total, 0);
  const totalSubtasks = filteredProjects.reduce((sum, p) => sum + p.stats.subtasksTotal, 0);
  const completedSubtasks = filteredProjects.reduce((sum, p) => sum + p.stats.subtasksCompleted, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Document Review - Admin View
              </h1>
              <p className="text-muted-foreground">
                Monitor all reviewer tasks, subtasks, and document progress
              </p>
            </div>
            <button
              onClick={fetchAllData}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon name="RefreshCw" size={18} />
              Refresh
            </button>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Filter by Role:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {reviewerRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedRole === role.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  <Icon name={role.icon} size={16} className={selectedRole !== role.id ? role.color : ''} />
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="FolderOpen" size={24} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{filteredProjects.length}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="Clipboard" size={24} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="List" size={24} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{totalSubtasks}</div>
            <div className="text-sm text-muted-foreground">Total Subtasks</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="CheckCircle" size={24} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Subtask Progress</div>
          </div>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          {filteredProjects.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No projects found for selected filter</p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const filteredTasks = getFilteredTasks(project.tasks);
              
              return (
                <div key={project.land_id} className="bg-card border border-border rounded-lg p-6">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-1">
                        {project.title || 'Untitled Project'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Project ID: {project.land_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {project.stats.total > 0 ? Math.round((project.stats.completed / project.stats.total) * 100) : 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-background rounded">
                      <div className="text-lg font-bold text-foreground">{project.stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total Tasks</div>
                    </div>
                    <div className="text-center p-3 bg-background rounded">
                      <div className="text-lg font-bold text-green-500">{project.stats.completed}</div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-3 bg-background rounded">
                      <div className="text-lg font-bold text-blue-500">{project.stats.subtasksCompleted}/{project.stats.subtasksTotal}</div>
                      <div className="text-xs text-muted-foreground">Subtasks Done</div>
                    </div>
                    <div className="text-center p-3 bg-background rounded">
                      <div className="text-lg font-bold text-purple-500">{project.documents.length}</div>
                      <div className="text-xs text-muted-foreground">Documents</div>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Icon name="CheckSquare" size={20} />
                      Tasks & Subtasks ({filteredTasks.length})
                    </h3>

                    {filteredTasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No tasks for selected role</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredTasks.map((task) => (
                          <div
                            key={task.task_id}
                            className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground">
                                    {task.task_type?.replace(/_/g, ' ').toUpperCase()}
                                  </h4>
                                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                                    {task.status?.toUpperCase()}
                                  </span>
                                </div>

                                {task.reviewer && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Reviewer: {task.reviewer.first_name} {task.reviewer.last_name} ({task.reviewer.email})
                                  </p>
                                )}

                                <p className="text-sm text-muted-foreground mb-2">
                                  {task.description || 'No description'}
                                </p>

                                {/* Subtasks Preview */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="text-xs font-medium text-muted-foreground">
                                        Subtasks: {task.subtasks.filter(s => s.status === 'completed').length}/{task.subtasks.length}
                                      </div>
                                      <div className="text-xs text-primary">
                                        {Math.round((task.subtasks.filter(s => s.status === 'completed').length / task.subtasks.length) * 100)}% Complete
                                      </div>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5 mb-2">
                                      <div
                                        className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                        style={{ 
                                          width: `${(task.subtasks.filter(s => s.status === 'completed').length / task.subtasks.length) * 100}%` 
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      {task.subtasks.slice(0, 3).map((subtask) => (
                                        <div 
                                          key={subtask.subtask_id}
                                          className="flex items-center justify-between p-2 border border-border rounded-lg bg-muted/30"
                                        >
                                          <div className="flex items-center space-x-2 flex-1">
                                            <button
                                              disabled
                                              className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center cursor-not-allowed ${
                                                subtask.status === 'completed'
                                                  ? 'bg-green-500 border-green-500'
                                                  : 'border-border bg-background'
                                              }`}
                                            >
                                              {subtask.status === 'completed' && (
                                                <Icon name="Check" size={14} className="text-white" />
                                              )}
                                            </button>
                                            <span className={`text-xs flex-1 ${subtask.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                                              {subtask.title}
                                            </span>
                                          </div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                              subtask.status === 'completed'
                                                ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                                : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                            }`}
                                          >
                                            {subtask.status === 'completed' ? 'Done' : 'Pending'}
                                          </span>
                                        </div>
                                      ))}
                                      {task.subtasks.length > 3 && (
                                        <div className="text-xs text-muted-foreground text-center py-1">
                                          +{task.subtasks.length - 3} more subtasks...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => handleViewTask(task, project)}
                                className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm flex items-center gap-2"
                              >
                                <Icon name="Eye" size={16} />
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {selectedTask.task_type?.replace(/_/g, ' ').toUpperCase()}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Project: {selectedProject?.title}
                  </p>
                  {selectedTask.reviewer && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reviewer: {selectedTask.reviewer.first_name} {selectedTask.reviewer.last_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                    setSelectedProject(null);
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <Icon name="X" size={24} className="text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-base font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-foreground">
                  {selectedTask.description || 'No description provided'}
                </p>
              </div>

              {/* All Subtasks */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <h3 className="text-base font-semibold text-foreground mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Icon name="List" size={18} className="text-primary" />
                      All Subtasks
                    </span>
                    <span className="text-sm text-primary">
                      {selectedTask.subtasks.filter(s => s.status === 'completed').length}/{selectedTask.subtasks.length} Completed
                    </span>
                  </h3>

                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask) => (
                      <div 
                        key={subtask.subtask_id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <button
                            disabled
                            className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center cursor-not-allowed ${
                              subtask.status === 'completed'
                                ? 'bg-green-500 border-green-500'
                                : 'border-border bg-background'
                            }`}
                          >
                            {subtask.status === 'completed' && (
                              <Icon name="Check" size={20} className="text-white" />
                            )}
                          </button>
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${subtask.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {subtask.title}
                            </h4>
                            {subtask.description && (
                              <p className={`text-xs mt-1 ${subtask.status === 'completed' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                {subtask.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>Created: {new Date(subtask.created_at).toLocaleDateString()}</span>
                              {subtask.completed_at && (
                                <span className="text-green-500">
                                  Completed: {new Date(subtask.completed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            subtask.status === 'completed'
                              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                              : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                          }`}
                        >
                          {subtask.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  setSelectedProject(null);
                }}
                className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentReview;

