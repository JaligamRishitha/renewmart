import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { taskAPI, documentsAPI, landsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const LandownerProjectReview = () => {
  const { projectId } = useParams();
  const landId = projectId; // Use projectId as landId for consistency
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [project, setProject] = useState(location.state?.project || null);
  const [allTasks, setAllTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewers, setReviewers] = useState({});
  const [expandedRoles, setExpandedRoles] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});

  const tabs = [
    { id: 'overview', label: 'Review Progress', icon: 'LayoutGrid' },
    { id: 'reviewers', label: 'Reviewers & Tasks', icon: 'Users' },
    { id: 'documents', label: 'Project Documents', icon: 'FileText' }
  ];

  useEffect(() => {
    fetchProjectDetails();
  }, [landId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tasks for this land
      const tasksResponse = await taskAPI.getTasks({ land_id: landId });
      console.log('All tasks for project:', tasksResponse);

      // Fetch subtasks for each task
      const tasksWithSubtasks = await Promise.all(
        tasksResponse.map(async (task) => {
          try {
            const subtasks = await taskAPI.getSubtasks(task.task_id);
            return { ...task, subtasks: subtasks || [] };
          } catch (err) {
            console.error(`Failed to fetch subtasks for task ${task.task_id}:`, err);
            return { ...task, subtasks: [] };
          }
        })
      );

      setAllTasks(tasksWithSubtasks);

      // Fetch unique reviewers - normalize UUIDs to strings for consistent lookup
      // Note: User fetching may fail due to permissions (403), but we can still use task.assigned_role
      const uniqueUserIds = [...new Set(
        tasksWithSubtasks
          .map(t => t.assigned_to ? String(t.assigned_to) : null)
          .filter(Boolean)
      )];
      
      console.log('Unique reviewer user IDs:', uniqueUserIds);
      const reviewerData = {};
      
      // Try to fetch user details, but don't block if it fails (403 errors are expected)
      const userFetchPromises = uniqueUserIds.map(async (userId) => {
        try {
          const userData = await usersAPI.getUserById(userId);
          reviewerData[String(userId)] = userData;
          console.log(`Fetched reviewer ${userId}:`, userData);
        } catch (err) {
          // 403 errors are expected for landowners viewing reviewers
          if (err.response?.status === 403) {
            console.log(`Skipping user ${userId} due to permissions (expected for landowners)`);
          } else {
            console.error(`Failed to fetch user ${userId}:`, err);
          }
          // Store minimal info with just the user_id
          reviewerData[String(userId)] = { user_id: userId };
        }
      });
      
      // Wait for all user fetches but don't block the UI
      await Promise.allSettled(userFetchPromises);
      
      console.log('Reviewer data object:', reviewerData);
      setReviewers(reviewerData);

      // Fetch only reviewer-uploaded documents (task documents)
      const reviewerDocuments = [];
      for (const task of tasksWithSubtasks) {
        try {
          const taskDocs = await documentsAPI.getTaskDocuments(task.task_id);
          if (taskDocs && taskDocs.length > 0) {
            reviewerDocuments.push(...taskDocs);
          }
        } catch (err) {
          console.error(`Failed to fetch documents for task ${task.task_id}:`, err);
        }
      }
      setDocuments(reviewerDocuments);

      // If project data not in location state, fetch land details
      if (!project) {
        const landResponse = await landsAPI.getLand(landId);
        setProject({
          land_id: landId,
          title: landResponse.title || 'Untitled Project',
          ...landResponse
        });
      }

    } catch (err) {
      console.error('Failed to fetch project details:', err);
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
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

  const getRoleLabel = (role) => {
    if (!role) return null;
    
    const roleLabels = {
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead',
      'sales_advisor': 'RE Sales Advisor',
      'analyst': 'RE Analyst',
      'governance_lead': 'RE Governance Lead'
    };
    
    // Check if it's already a mapped label
    if (Object.values(roleLabels).includes(role)) {
      return role;
    }
    
    // Check if it matches a key
    const normalizedRole = String(role).toLowerCase();
    return roleLabels[normalizedRole] || roleLabels[role] || role;
  };

  const inferRoleFromTask = (task) => {
    // Try to infer role from task title, description, or type
    const searchText = `${task.title || ''} ${task.task_type || ''} ${task.description || ''}`.toLowerCase();
    
    if (searchText.includes('sales') || searchText.includes('market') || searchText.includes('advisor')) {
      return 'RE Sales Advisor';
    }
    if (searchText.includes('analyst') || searchText.includes('analyze') || searchText.includes('technical') || searchText.includes('financial')) {
      return 'RE Analyst';
    }
    if (searchText.includes('governance') || searchText.includes('compliance') || searchText.includes('regulatory') || searchText.includes('legal')) {
      return 'RE Governance Lead';
    }
    
    return null;
  };

  const getProgressPercentage = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(st => st.status === 'completed').length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Failed to download document');
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to view document:', err);
      alert('Failed to view document');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            Back to Project Status
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {project?.title || 'Project Review Status'}
              </h1>
              <p className="text-muted-foreground">
                Project ID: {landId} • Read-only view for landowners
              </p>
            </div>
            <button
              onClick={fetchProjectDetails}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon name="RefreshCw" size={18} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-border mt-6 -mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab - Review Progress */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Project Summary */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Info" size={24} />
                Project Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Users" size={20} className="text-primary" />
                    <span className="font-medium text-foreground">Reviewers</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{allTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Assigned reviewers</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="FileText" size={20} className="text-primary" />
                    <span className="font-medium text-foreground">Documents</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">Uploaded documents</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="CheckCircle" size={20} className="text-primary" />
                    <span className="font-medium text-foreground">Progress</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {allTasks.length > 0 ? Math.round(allTasks.reduce((acc, task) => acc + getProgressPercentage(task), 0) / allTasks.length) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Overall completion</p>
                </div>
              </div>
            </div>

            {/* Review Progress by Role */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="TrendingUp" size={24} />
                Review Progress by Role
              </h2>
              
              {allTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No reviewers assigned to this project yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allTasks.map((task) => {
                    // Normalize assigned_to to string for lookup
                    const reviewerKey = task.assigned_to ? String(task.assigned_to) : null;
                    const reviewer = reviewerKey ? reviewers[reviewerKey] : null;
                    const progress = getProgressPercentage(task);
                    
                    // Try multiple possible fields for role
                    let taskRole = task.assigned_role || task.role || task.role_key || task.reviewer_role;
                    
                    // If no role in task, try to infer from task content
                    if (!taskRole) {
                      taskRole = inferRoleFromTask(task);
                    }
                    
                    const roleLabel = getRoleLabel(taskRole);
                    console.log('Task role info:', { 
                      task_id: task.task_id, 
                      assigned_role: task.assigned_role, 
                      task_type: task.task_type,
                      title: task.title,
                      inferred_role: taskRole,
                      roleLabel 
                    });
                    
                    // Determine display name - prioritize role label, then reviewer name
                    let displayName = roleLabel;
                    if (!displayName) {
                      // If no role, try to get from reviewer's roles
                      if (reviewer && reviewer.roles && reviewer.roles.length > 0) {
                        displayName = getRoleLabel(reviewer.roles[0]) || null;
                      }
                      // Fallback to reviewer name
                      if (!displayName && reviewer && reviewer.first_name && reviewer.last_name) {
                        displayName = `${reviewer.first_name} ${reviewer.last_name}`;
                      }
                      // Last fallback - try to infer from task one more time
                      if (!displayName) {
                        const inferred = inferRoleFromTask(task);
                        displayName = inferred || 'Reviewer';
                      }
                    }
                    
                    return (
                      <div key={task.task_id} className="bg-background rounded-lg p-4 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Icon name="User" size={20} className="text-primary" />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">
                                {displayName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {roleLabel || 'Role not specified'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                              {task.status?.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-foreground">{progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{task.subtasks?.filter(st => st.status === 'completed').length || 0} completed</span>
                            <span>{task.subtasks?.length || 0} total subtasks</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviewers Tab */}
        {activeTab === 'reviewers' && (() => {
          // Group tasks by role
          const tasksByRole = {};
          allTasks.forEach((task) => {
            // Normalize assigned_to to string for lookup
            const reviewerKey = task.assigned_to ? String(task.assigned_to) : null;
            const reviewer = reviewerKey ? reviewers[reviewerKey] : null;
            
            // Try multiple possible fields for role
            let taskRole = task.assigned_role || task.role || task.role_key || task.reviewer_role;
            
            // If no role in task, try to infer from task content
            if (!taskRole) {
              taskRole = inferRoleFromTask(task);
            }
            
            const roleLabel = getRoleLabel(taskRole) || 'Unknown Role';
            
            if (!tasksByRole[roleLabel]) {
              tasksByRole[roleLabel] = [];
            }
            
            tasksByRole[roleLabel].push({ ...task, roleLabel, reviewerKey, reviewer });
          });

          // Calculate stats for each role
          const roleStats = Object.keys(tasksByRole).map(role => {
            const tasks = tasksByRole[role];
            const totalProgress = tasks.reduce((sum, t) => sum + getProgressPercentage(t), 0);
            const avgProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;
            const completedCount = tasks.filter(t => t.status === 'completed').length;
            
            return {
              role,
              tasks,
              taskCount: tasks.length,
              avgProgress,
              completedCount
            };
          });

          const toggleRoleAccordion = (role) => {
            setExpandedRoles(prev => ({
              ...prev,
              [role]: !prev[role]
            }));
          };

          const toggleTaskAccordion = (taskId) => {
            setExpandedTasks(prev => ({
              ...prev,
              [taskId]: !prev[taskId]
            }));
          };

          return (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Icon name="Users" size={24} />
                  Reviewers & Their Tasks ({allTasks.length})
                </h2>
                
                {allTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No reviewers assigned to this project</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roleStats.map(({ role, tasks, taskCount, avgProgress, completedCount }) => (
                      <div key={role} className="bg-background border border-border rounded-lg overflow-hidden">
                        {/* Role Accordion Header */}
                        <button
                          onClick={() => toggleRoleAccordion(role)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Icon name="Users" size={20} className="text-primary" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-foreground">{role}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  {taskCount} task{taskCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {avgProgress}% avg progress
                                </span>
                                {completedCount > 0 && (
                                  <>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-sm text-green-600 font-medium">
                                      {completedCount} completed
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Icon 
                              name={expandedRoles[role] ? "ChevronUp" : "ChevronDown"} 
                              size={20} 
                              className="text-muted-foreground" 
                            />
                          </div>
                        </button>

                        {/* Role Accordion Content */}
                        {expandedRoles[role] && (
                          <div className="border-t border-border p-4 space-y-3">
                            {tasks.map((task) => {
                              const progress = getProgressPercentage(task);
                              const reviewer = task.reviewer;
                              
                              // Determine reviewer display name
                              let reviewerName = 'Unknown Reviewer';
                              if (reviewer && reviewer.first_name && reviewer.last_name) {
                                reviewerName = `${reviewer.first_name} ${reviewer.last_name}`;
                              } else if (reviewer && reviewer.email) {
                                reviewerName = reviewer.email;
                              }

                              return (
                                <div key={task.task_id} className="bg-card border border-border rounded-lg overflow-hidden">
                                  {/* Task Accordion Header */}
                                  <button
                                    onClick={() => toggleTaskAccordion(task.task_id)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Icon name="ClipboardList" size={16} className="text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-medium text-foreground truncate">
                                            {task.task_type || task.title || 'Task'}
                                          </h4>
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                            {task.status?.replace('_', ' ')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                          <span>Assigned to: {reviewerName}</span>
                                          <span>•</span>
                                          <span>{progress}% complete</span>
                                          {task.subtasks && task.subtasks.length > 0 && (
                                            <>
                                              <span>•</span>
                                              <span>{task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length} subtasks</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Icon 
                                      name={expandedTasks[task.task_id] ? "ChevronUp" : "ChevronDown"} 
                                      size={18} 
                                      className="text-muted-foreground ml-3 flex-shrink-0" 
                                    />
                                  </button>

                                  {/* Task Accordion Content */}
                                  {expandedTasks[task.task_id] && (
                                    <div className="border-t border-border p-4 space-y-4">
                                      {task.description && (
                                        <div>
                                          <h5 className="font-medium text-foreground mb-2">Task Description</h5>
                                          <p className="text-sm text-muted-foreground">{task.description}</p>
                                        </div>
                                      )}
                                      
                                      {/* Progress Bar */}
                                      <div>
                                        <div className="flex justify-between text-sm mb-2">
                                          <span className="text-muted-foreground">Progress</span>
                                          <span className="font-medium text-foreground">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                          <div 
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Subtasks */}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <div>
                                          <h5 className="font-medium text-foreground mb-3">
                                            Subtasks ({task.subtasks.length})
                                          </h5>
                                          <div className="space-y-2">
                                            {task.subtasks.map((subtask, index) => (
                                              <div key={subtask.subtask_id || index} className="flex items-center gap-3 p-2 bg-background rounded border border-border">
                                                <Icon 
                                                  name={subtask.status === 'completed' ? 'CheckCircle' : 'Circle'} 
                                                  size={16} 
                                                  className={subtask.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'} 
                                                />
                                                <div className="flex-1">
                                                  <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {subtask.title}
                                                  </span>
                                                  {subtask.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{subtask.description}</p>
                                                  )}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(subtask.status)}`}>
                                                  {subtask.status}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Task Metadata */}
                                      <div className="flex justify-between items-center pt-3 border-t border-border text-sm text-muted-foreground">
                                        <span>Assigned: {new Date(task.created_at).toLocaleDateString()}</span>
                                        {task.due_date && (
                                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Icon name="FileText" size={24} />
                  Reviewer Documents
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Documents uploaded by reviewers during their review process - View and download available
                </p>
              </div>
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold">{documents.length}</span>
                <span className="text-sm ml-2">Reviewer Documents</span>
              </div>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Icon name="FileX" size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No task documents uploaded by reviewers</p>
                <p className="text-sm mt-2">Reviewers haven't uploaded any documents yet during their review process</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => {
                  // Find the reviewer who uploaded this document
                  const reviewer = Object.values(reviewers).find(r => r.user_id === doc.uploaded_by);
                  const reviewerName = reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Unknown Reviewer';
                  
                  return (
                    <div
                      key={doc.document_id}
                      className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Icon 
                              name={doc.mime_type?.includes('pdf') ? 'FileText' : doc.mime_type?.includes('image') ? 'Image' : 'File'} 
                              size={24} 
                              className="text-primary" 
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-foreground text-sm mb-1 truncate" title={doc.file_name}>
                            {doc.file_name || 'Unnamed Document'}
                          </h5>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded">
                                {doc.document_type?.replace(/-|_/g, ' ').toUpperCase() || 'DOCUMENT'}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Icon name="User" size={12} />
                              Uploaded by: {reviewerName}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Icon name="HardDrive" size={12} />
                              {formatFileSize(doc.file_size)}
                            </p>
                            {doc.created_at && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Icon name="Calendar" size={12} />
                                {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-md text-xs font-medium transition-colors"
                        >
                          <Icon name="Eye" size={14} />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted-foreground/20 text-foreground rounded-md text-xs font-medium transition-colors"
                        >
                          <Icon name="Download" size={14} />
                          Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandownerProjectReview;
