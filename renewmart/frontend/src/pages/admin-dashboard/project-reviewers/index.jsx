import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../../components/ui/Header';
import Sidebar from '../../../components/ui/Sidebar';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import AssignReviewerModal from '../components/AssignReviewerModal';
import ProjectEditModal from '../components/ProjectEditModal';
import { landsAPI, taskAPI, usersAPI } from '../../../services/api';

const ProjectReviewersPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Single state to track open/closed status for all role accordions
  const [openAccordions, setOpenAccordions] = useState({});

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details with tasks using the new endpoint
      const projectResponse = await landsAPI.getProjectDetailsWithTasks(projectId);
      console.log('📊 Project data with tasks:', projectResponse);
      console.log('📊 Tasks array:', projectResponse.tasks);
      setProject(projectResponse);
      setTasks(projectResponse.tasks || []);

    } catch (err) {
      console.error('[Project Reviewers] Error fetching data:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead',
      'administrator': 'Administrator'
    };
    return roleLabels[role] || role;
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'submitted': 'Pending',
      'under_review': 'In Progress',
      'approved': 'Approved',
      'published': 'Published',
      'rtb': 'Ready to Buy',
      'rejected': 'Rejected'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleAssignReviewer = () => {
    setShowAssignModal(true);
  };

  const handleEditProject = () => {
    setShowProjectEditModal(true);
  };

  const handleProjectUpdate = async (landId, updatedData) => {
    try {
      // Refresh project data after update
      await fetchProjectData();
    } catch (err) {
      console.error('[Project Reviewers] Error updating project:', err);
    }
  };

  const handleTogglePublish = async () => {
    try {
      await landsAPI.togglePublish(projectId);
      await fetchProjectData();
    } catch (err) {
      console.error('[Project Reviewers] Error toggling publish:', err);
      setError(err.response?.data?.detail || 'Failed to toggle publish status');
    }
  };

  const handleAssignSubmit = async (assignmentData) => {
    try {
      console.log('[Project Reviewers] Assigning reviewer:', assignmentData);
      
      // Create task via API
      await taskAPI.createTask({
        land_id: projectId,
        task_type: assignmentData.taskType,
        description: assignmentData.description,
        assigned_to: assignmentData.assignedTo,
        assigned_role: assignmentData.reviewerRole,
        due_date: assignmentData.dueDate || null,
        priority: assignmentData.priority
      });

      console.log('[Project Reviewers] Task assigned successfully');
      
      // Refresh data
      await fetchProjectData();
      
      // Close modal
      setShowAssignModal(false);
    } catch (err) {
      console.error('[Project Reviewers] Error assigning reviewer:', err);
      throw new Error(err.response?.data?.detail || 'Failed to assign reviewer');
    }
  };

  // Group tasks by reviewer role
  const groupedTasks = tasks.reduce((acc, task) => {
    const role = task.assigned_role || 'unassigned';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(task);
    return acc;
  }, {});

  const reviewerRoles = [
    { 
      id: 're_sales_advisor', 
      label: 'RE Sales Advisor',
      description: 'Market evaluation and investor alignment',
      color: 'blue'
    },
    { 
      id: 're_analyst', 
      label: 'RE Analyst',
      description: 'Technical and financial feasibility analysis',
      color: 'green'
    },
    { 
      id: 're_governance_lead', 
      label: 'RE Governance Lead',
      description: 'Compliance, regulatory, and local authority validation',
      color: 'purple'
    }
  ];

  // Toggle accordion state for a specific role
  const toggleAccordion = (roleId) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="admin" />
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="pt-16">
          <main className={`pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="flex items-center justify-center py-12">
                <Icon name="Loader2" size={32} className="animate-spin text-primary" />
                <span className="ml-3 text-lg text-muted-foreground">Loading project data...</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="admin" />
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="pt-19">
          <main className={`pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                <div className="flex items-center">
                  <Icon name="AlertTriangle" size={20} className="text-error mr-2" />
                  <p className="text-error font-medium">{error}</p>
                </div>
                <button
                  onClick={fetchProjectData}
                  className="mt-2 text-sm text-error hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" />
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <div className="pt-20">
       
        <main className={`pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Reviewer Assignment
                </h1>
                <p className="font-body text-muted-foreground">
                  Assign reviewers and manage task types for this project
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin-dashboard')}
                  iconName="ArrowLeft"
                  iconSize={18}
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={handleEditProject}
                  iconName="Edit"
                  iconSize={18}
                >
                  Edit Project
                </Button>
                <Button
                  variant="default"
                  onClick={handleAssignReviewer}
                  iconName="UserPlus"
                  iconSize={18}
                >
                  Assign Reviewer
                </Button>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="Folder" size={24} className="text-primary" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-xl text-foreground mb-1">
                    {project?.title}
                  </h2>
                  <p className="font-body text-muted-foreground">{project?.location_text}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground flex items-center justify-end gap-2">
                  <span>Status</span>
                  <Button
                    variant={project?.status === 'published' ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleTogglePublish}
                    iconName="Globe"
                    iconSize={16}
                    title={project?.status === 'published' ? 'Unpublish (move to In Progress)' : 'Publish'}
                  >
                    {project?.status === 'published' ? 'Published' : 'In Progress'}
                  </Button>
                </div>
                <div className="font-body font-medium text-foreground">
                  {getStatusLabel(project?.status)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Landowner:</span>
                <div className="font-body text-foreground">{project?.landownerName}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Project Type:</span>
                <div className="font-body text-foreground capitalize">{project?.energy_key}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Capacity:</span>
                <div className="font-body text-foreground">{project?.capacity_mw} MW</div>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <div className="font-body text-foreground">{formatDate(project?.project_due_date)}</div>
              </div>
            </div>
          </div>

          {/* Reviewer Assignments */}
          <div className="space-y-6">
            <h3 className="font-heading font-semibold text-lg text-foreground">
              Current Assignments ({tasks.length})
            </h3>

            {Object.keys(groupedTasks).length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Icon name="Users" size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Reviewers Assigned</h3>
                <p className="text-muted-foreground mb-4">
                  This project doesn't have any reviewers assigned yet.
                </p>
                <Button
                  variant="default"
                  onClick={handleAssignReviewer}
                  iconName="UserPlus"
                  iconSize={18}
                >
                  Assign First Reviewer
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {reviewerRoles.map((role) => {
                  const roleTasks = groupedTasks[role.id] || [];

                  return (
                    <div key={role.id} className="bg-card border border-border rounded-lg">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleAccordion(role.id)}
                        className="w-full flex items-center justify-between p-6 focus:outline-none"
                        aria-expanded={!!openAccordions[role.id]}
                        aria-controls={`accordion-content-${role.id}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-${role.color}-100 rounded-lg flex items-center justify-center`}>
                            <Icon name="User" size={20} className={`text-${role.color}-600`} />
                          </div>
                          <div className="text-left">
                            <h4 className="font-heading font-semibold text-lg text-foreground">
                              {role.label}
                            </h4>
                            <p className="font-body text-sm text-muted-foreground">
                              {role.description} {roleTasks.length > 0 && `(${roleTasks.length} tasks)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {roleTasks.length > 0 && (
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Tasks</div>
                              <div className="font-body font-medium text-foreground">
                                {roleTasks.length}
                              </div>
                            </div>
                          )}
                          <Icon
                            name={openAccordions[role.id] ? 'ChevronUp' : 'ChevronDown'}
                            size={20}
                            className="text-muted-foreground"
                          />
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {openAccordions[role.id] && roleTasks.length > 0 && (
                        <div id={`accordion-content-${role.id}`} className="px-6 pb-6 space-y-3">
                          {roleTasks.map((task) => (
                            <div key={task.task_id} className="bg-muted/30 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Icon name="FileText" size={16} className="text-primary" />
                                  </div>
                                  <div>
                                    <div className="font-body font-medium text-sm text-foreground">
                                      {task.title || task.task_type?.replace(/_/g, ' ')}
                                    </div>
                                    <div className="font-body text-xs text-muted-foreground">
                                      Assigned to: {task.assigned_to_name || 'Unknown'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Status</div>
                                    <div className="font-body text-sm text-foreground">
                                      {getStatusLabel(task.status)}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // Navigate to role-specific document review page
                                      const roleRouteMap = {
                                        're_sales_advisor': '/sales-advisor/document-review',
                                        're_analyst': '/analyst/document-review',
                                        're_governance_lead': '/governance/document-review',
                                        'project_manager': '/project-manager/document-review'
                                      };
                                      
                                      const baseRoute = roleRouteMap[role.id] || '/document-review';
                                      const fullRoute = baseRoute.includes('/document-review') 
                                        ? `${baseRoute}/${projectId}` 
                                        : baseRoute;
                                      
                                      const navigationState = {
                                        landId: projectId,
                                        reviewerRole: role.id,
                                        taskId: task.task_id,
                                        taskType: task.task_type,
                                        autoSwitchRole: true
                                      };
                                      
                                      console.log('👁️ Eye icon clicked:', {
                                        role: role.id,
                                        roleLabel: role.label,
                                        projectId,
                                        taskId: task.task_id,
                                        taskType: task.task_type,
                                        taskTitle: task.title,
                                        baseRoute,
                                        fullRoute,
                                        navigationState
                                      });
                                      
                                      console.log('🔍 Task object details:', {
                                        task_id: task.task_id,
                                        task_type: task.task_type,
                                        title: task.title,
                                        assigned_role: task.assigned_role,
                                        status: task.status
                                      });
                                      
                                      console.log('🚀 Navigating to:', fullRoute, 'with state:', navigationState);
                                      
                                      navigate(fullRoute, {
                                        state: navigationState
                                      });
                                    }}
                                    iconName="Eye"
                                    iconSize={16}
                                    title={`View ${role.label} Documents`}
                                    className="text-muted-foreground hover:text-primary"
                                  />
                                </div>
                              </div>

                              {task.description && (
                                <div className="text-sm text-muted-foreground mb-2">
                                  {task.description}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div>Due: {formatDate(task.due_date)}</div>
                                <div>Priority: {task.priority || 'Not set'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
      
      {/* Assign Reviewer Modal */}
      {showAssignModal && (
        <AssignReviewerModal
          project={project}
          existingTasks={tasks}
          onClose={() => setShowAssignModal(false)}
          onAssign={handleAssignSubmit}
        />
      )}

      {/* Project Edit Modal */}
      {showProjectEditModal && (
        <ProjectEditModal
          isOpen={showProjectEditModal}
          project={project}
          onClose={() => setShowProjectEditModal(false)}
          onUpdate={handleProjectUpdate}
        />
      )}
    </div>
  );
};

export default ProjectReviewersPage;