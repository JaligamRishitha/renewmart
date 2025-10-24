import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Header from '../../components/ui/Header';
import { taskAPI, documentsAPI, landsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SubtaskManager from './SubtaskManager';
import ReviewPanelCompact from './ReviewPanelCompact';
import TaskPanel from './TaskPanel';
import TeamsStyleMessaging from './components/TeamsStyleMessaging';

const ProjectDetails = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [project, setProject] = useState(location.state?.project || null);
  const [allTasks, setAllTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewers, setReviewers] = useState({});

  // Get user's reviewer role
  const reviewerRole = user?.roles?.find(role => 
    ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'all-tasks', label: 'All Tasks & Reviewers', icon: 'Users' },
    { id: 'documents', label: 'Documents', icon: 'FileText' },
    { id: 'messaging', label: 'Messaging', icon: 'MessageSquare' }
  ];

  useEffect(() => {
    fetchProjectDetails();
  }, [landId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tasks for this land (not just mine)
      const tasksResponse = await taskAPI.getTasks({ land_id: landId });
      console.log('All tasks for project:', tasksResponse);

      // Fetch subtasks for each task
      const tasksWithSubtasks = await Promise.all(
        tasksResponse.map(async (task) => {
          try {
            console.log(`Fetching subtasks for task ${task.task_id}...`);
            const subtasks = await taskAPI.getSubtasks(task.task_id);
            console.log(`Fetched ${subtasks?.length || 0} subtasks for task ${task.task_id}:`, subtasks);
            
            // If no subtasks exist and task has assigned_role, create default ones
            if ((!subtasks || subtasks.length === 0) && task.assigned_role) {
              console.log(`No subtasks found. Creating default subtasks for role: ${task.assigned_role}`);
              try {
                const templates = await taskAPI.getSubtaskTemplates(task.assigned_role);
                console.log(`Got ${templates.templates?.length || 0} templates`);
                
                // Create default subtasks
                for (const template of templates.templates || []) {
                  await taskAPI.createSubtask(task.task_id, {
                    title: template.title,
                    description: `${template.section} - ${template.title}`,
                    status: 'pending',
                    order_index: template.order
                  });
                }
                
                // Fetch again after creating
                const newSubtasks = await taskAPI.getSubtasks(task.task_id);
                console.log(`Created and fetched ${newSubtasks?.length || 0} subtasks`);
                return { ...task, subtasks: newSubtasks || [] };
              } catch (createErr) {
                console.error(`Failed to create default subtasks:`, createErr);
                return { ...task, subtasks: [] };
              }
            }
            
            return { ...task, subtasks: subtasks || [] };
          } catch (err) {
            console.error(`Failed to fetch subtasks for task ${task.task_id}:`, err);
            console.error('Error details:', err.response?.data);
            return { ...task, subtasks: [] };
          }
        })
      );

      setAllTasks(tasksWithSubtasks);

      // Fetch unique reviewers
      const uniqueUserIds = [...new Set(tasksResponse.map(t => t.assigned_to).filter(Boolean))];
      const reviewerData = {};
      for (const userId of uniqueUserIds) {
        try {
          const userData = await usersAPI.getUserById(userId);
          reviewerData[userId] = userData;
        } catch (err) {
          console.error(`Failed to fetch user ${userId}:`, err);
        }
      }
      setReviewers(reviewerData);

      // Fetch all documents
      const docsResponse = await documentsAPI.getDocuments(landId);
      setDocuments(docsResponse || []);

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

  const handleViewTask = async (task) => {
    try {
      const updatedSubtasks = await taskAPI.getSubtasks(task.task_id);
      setSelectedTask({ ...task, subtasks: updatedSubtasks });
      setShowTaskModal(true);
    } catch (err) {
      console.error("Failed to fetch subtasks for modal:", err);
      setSelectedTask(task); // fallback
      setShowTaskModal(true);
    }
  };

 const handleSubtaskUpdate = async (taskId) => {
  try {
    const updatedSubtasks = await taskAPI.getSubtasks(taskId);
    setSelectedTask(prev => ({ ...prev, subtasks: updatedSubtasks }));
    await fetchProjectDetails(); // Optional: refresh entire task list
  } catch (err) {
    console.error("Failed to refresh subtasks after update:", err);
  }
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
      // Don't revoke immediately - let the browser load it first
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
    const roleLabels = {
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead'
    };
    return roleLabels[role] || role;
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

  const myTasks = allTasks.filter(t => t.assigned_to === user.user_id);
  const otherTasks = allTasks.filter(t => t.assigned_to !== user.user_id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Project Header */}
      <div className="pt-16">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <Icon name="ArrowLeft" size={20} />
              Back to Dashboard
            </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {project?.title || 'Project Details'}
              </h1>
              <p className="text-muted-foreground">
                Project ID: {landId}
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
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* My Tasks */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="User" size={24} />
                My Tasks ({myTasks.length})
              </h2>
              
              {myTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned to you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myTasks.map((task) => (
                    <TaskCard
                      key={task.task_id}
                      task={task}
                      reviewer={reviewers[task.assigned_to]}
                      isMyTask={true}
                      onView={handleViewTask}
                      getStatusColor={getStatusColor}
                      getRoleLabel={getRoleLabel}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Tasks Tab */}
        {activeTab === 'all-tasks' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Users" size={24} />
                All Reviewers & Their Tasks ({allTasks.length})
              </h2>
              
              {allTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No tasks assigned to this project</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allTasks.map((task) => (
                    <TaskCard
                      key={task.task_id}
                      task={task}
                      reviewer={reviewers[task.assigned_to]}
                      isMyTask={task.assigned_to === user.user_id}
                      onView={handleViewTask}
                      getStatusColor={getStatusColor}
                      getRoleLabel={getRoleLabel}
                      showReviewer={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Icon name="FileText" size={24} />
                  Landowner Documents
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  View and download documents uploaded by the landowner (Read-only)
                </p>
              </div>
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold">{documents.length}</span>
                <span className="text-sm ml-2">Documents</span>
              </div>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Icon name="FileX" size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No documents uploaded yet</p>
                <p className="text-sm mt-2">The landowner hasn't uploaded any documents for this project</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <div className="bg-card border border-border rounded-lg overflow-hidden h-[600px]">
            <TeamsStyleMessaging 
              currentUser={user}
              onMessageSent={(message) => console.log('Message sent:', message)}
              onMessageReceived={(message) => console.log('Message received:', message)}
            />
          </div>
        )}
      </div>

      {/* Task Details Modal - Using TaskPanel Component with Documents Tab */}
      {showTaskModal && selectedTask && (
        <TaskPanel
          task={selectedTask}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onRefresh={() => handleSubtaskUpdate(selectedTask.task_id)}
          reviewerRole={reviewerRole}
        />
      )}
    </div>
  );
};

// TaskCard Component
const TaskCard = ({ task, reviewer, isMyTask, onView, getStatusColor, getRoleLabel, showReviewer = false }) => {
  const completedSubtasks = task.subtasks?.filter(s => s.status === 'completed').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  
  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isMyTask ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-foreground">
              {task.task_type?.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
              {task.status?.toUpperCase()}
            </span>
            {isMyTask && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-500">
                MY TASK
              </span>
            )}
          </div>
          
          {showReviewer && reviewer && (
            <p className="text-sm text-muted-foreground mb-2">
              Reviewer: {reviewer.first_name} {reviewer.last_name} ({getRoleLabel(reviewer.roles?.[0])})
            </p>
          )}
          
          <p className="text-sm text-muted-foreground mb-2">
            {task.description || 'No description'}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={14} />
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
            {totalSubtasks > 0 && (
              <span className="flex items-center gap-1">
                <Icon name="List" size={14} />
                {completedSubtasks}/{totalSubtasks} Subtasks
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={() => onView(task)}
          className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm flex items-center gap-2"
        >
          <Icon name="Eye" size={16} />
          View
        </button>
      </div>
      
      {/* Subtask Progress Bar */}
      {totalSubtasks > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Subtask Progress</span>
            <span>{Math.round((completedSubtasks / totalSubtasks) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;

