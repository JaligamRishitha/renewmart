import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../../components/ui/Header';
import Sidebar from '../../../components/ui/Sidebar';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import AssignReviewerModal from '../components/AssignReviewerModal';
import ProjectEditModal from '../components/ProjectEditModal';
import AssignMasterSalesAdvisorModal from '../../../pages/project-details/components/AssignMasterSalesAdvisorModal';
import { landsAPI, taskAPI, usersAPI, investorsAPI, reviewsAPI } from '../../../services/api';

const ProjectReviewersPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningTaskType, setAssigningTaskType] = useState(null); // Track which task type is being assigned
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [showAssignAdvisorModal, setShowAssignAdvisorModal] = useState(false);
  const [masterAdvisor, setMasterAdvisor] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openAccordions, setOpenAccordions] = useState({});
  const [openTaskTypeAccordions, setOpenTaskTypeAccordions] = useState({}); // Track expanded task type accordions
  const [customTaskTypes, setCustomTaskTypes] = useState({}); // Track custom task types per role
  const [reviewStatuses, setReviewStatuses] = useState({}); // Store review statuses for each task

  // Default task types for each role
  const defaultTaskTypes = {
    re_sales_advisor: [
      { value: 'market_evaluation', label: 'Market Evaluation' },
      { value: 'site_assessment', label: 'Site Assessment' },
      { value: 'investor_alignment', label: 'Investor Alignment' }
    ],
    re_analyst: [
      { value: 'technical_analysis', label: 'Technical Analysis' },
      { value: 'financial_analysis', label: 'Financial Analysis' },
      { value: 'compliance_review', label: 'Compliance Review' }
    ],
    re_governance_lead: [
      { value: 'document_verification', label: 'Document Verification' },
      { value: 'regulatory_approval', label: 'Regulatory Approval' },
      { value: 'environmental_review', label: 'Environmental Review' }
    ]
  };

  useEffect(() => {
    fetchProjectData();
    fetchMasterAdvisor();
  }, [projectId]);

  // Fetch review statuses for all tasks to determine completion
  useEffect(() => {
    const fetchReviewStatuses = async () => {
      if (!projectId || tasks.length === 0) return;
      
      try {
        const allStatuses = await reviewsAPI.getAllReviewStatuses(projectId);
        const statusMap = {};
        
        // Map review statuses by role - handle different role key formats
        if (allStatuses && Array.isArray(allStatuses)) {
          allStatuses.forEach(status => {
            // Try multiple possible role key fields
            const roleKey = status.role_key || status.role || status.reviewer_role;
            if (roleKey) {
              // Normalize role key to match our role IDs
              const normalizedKey = normalizeRole(roleKey);
              statusMap[normalizedKey] = status;
              // Also map by original key for compatibility
              statusMap[roleKey] = status;
            }
          });
        }
        
        setReviewStatuses(statusMap);
      } catch (err) {
        console.error('[Project Reviewers] Error fetching review statuses:', err);
      }
    };
    
    fetchReviewStatuses();
  }, [projectId, tasks]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      const projectResponse = await landsAPI.getProjectDetailsWithTasks(projectId);
      console.log('📊 Project data with tasks:', projectResponse);
      console.log('📊 Tasks array:', projectResponse.tasks);
      console.log('📊 Tasks count:', projectResponse.tasks?.length || 0);
      
      // Log each task's structure
      if (projectResponse.tasks && projectResponse.tasks.length > 0) {
        console.log('📊 Sample task structure:', projectResponse.tasks[0]);
        projectResponse.tasks.forEach((task, index) => {
          console.log(`📊 Task ${index}:`, {
            task_id: task.task_id,
            task_type: task.task_type,
            assigned_role: task.assigned_role,
            assigned_to: task.assigned_to,
            assigned_to_name: task.assigned_to_name,
            status: task.status
          });
        });
      }
      
      setProject(projectResponse);
      setTasks(projectResponse.tasks || []);

    } catch (err) {
      console.error('[Project Reviewers] Error fetching data:', err);
      setError('Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterAdvisor = async () => {
    try {
      const response = await investorsAPI.getMasterAdvisorAssignment(projectId);
      if (response.assigned && response.assignment) {
        setMasterAdvisor({
          advisor_name: response.assignment.advisor_name || 'Assigned Advisor',
          sales_advisor_id: response.assignment.sales_advisor_id,
          advisor_email: response.assignment.advisor_email
        });
      } else {
        setMasterAdvisor(null);
      }
    } catch (err) {
      console.error('[Project Reviewers] Error fetching master advisor:', err);
      setMasterAdvisor(null);
    }
  };

  const handleMasterAdvisorAssigned = async (assignmentData) => {
    await fetchMasterAdvisor();
    setShowAssignAdvisorModal(false);
    await fetchProjectData();
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

  const getStatusLabel = (status, task = null, roleId = null) => {
    // Check if task is 100% complete via review status
    if (task && roleId) {
      const reviewStatus = reviewStatuses[roleId] || reviewStatuses[normalizeRole(roleId)];
      if (reviewStatus) {
        // Check if review is published (100% complete)
        if (reviewStatus.published === true) {
          return 'Completed';
        }
        // Check completion percentage if available
        if (reviewStatus.completion_percentage >= 100) {
          return 'Completed';
        }
        // Check if status is explicitly completed
        if (reviewStatus.status === 'completed' || reviewStatus.status === 'published') {
          return 'Completed';
        }
      }
      // If task status is completed, show Completed
      if (task.status === 'completed') {
        return 'Completed';
      }
    }
    
    const statusMap = {
      'submitted': 'Pending',
      'under_review': 'In Progress',
      'in_progress': 'In Progress',
      'approved': 'Approved',
      'published': 'Published',
      'completed': 'Completed',
      'rtb': 'Ready to Buy',
      'rejected': 'Rejected'
    };
    // Remove underscores and capitalize
    const cleanStatus = status ? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown';
    return statusMap[status] || cleanStatus;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleEditProject = () => {
    setShowProjectEditModal(true);
  };

  const handleProjectUpdate = async (landId, updatedData) => {
    try {
      await fetchProjectData();
    } catch (err) {
      console.error('[Project Reviewers] Error updating project:', err);
    }
  };

  const handleTogglePublish = async () => {
    try {
      setPublishing(true);
      setError(null);
      await landsAPI.togglePublish(projectId);
      await fetchProjectData();
      // Show success message
      console.log('Publish status toggled successfully');
    } catch (err) {
      console.error('[Project Reviewers] Error toggling publish:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to toggle publish status';
      setError(errorMessage);
      alert(errorMessage); // Show error to user
    } finally {
      setPublishing(false);
    }
  };

  const handleAssignTaskType = (roleId, taskType) => {
    setAssigningTaskType({ roleId, taskType });
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (assignmentData) => {
    try {
      console.log('[Project Reviewers] Assigning reviewer:', assignmentData);
      
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
      
      await fetchProjectData();
      setShowAssignModal(false);
      setAssigningTaskType(null);
    } catch (err) {
      console.error('[Project Reviewers] Error assigning reviewer:', err);
      throw new Error(err.response?.data?.detail || 'Failed to assign reviewer');
    }
  };

  const handleAddCustomTaskType = (roleId) => {
    const taskTypeName = prompt(`Enter a new task type name for ${getRoleLabel(roleId)}:`);
    if (!taskTypeName || !taskTypeName.trim()) return;

    const value = taskTypeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newTaskType = { value, label: taskTypeName };

    setCustomTaskTypes(prev => ({
      ...prev,
      [roleId]: [...(prev[roleId] || []), newTaskType]
    }));
  };

  // Normalize task types and roles for matching (helper functions)
  const normalizeTaskType = (taskType) => {
    if (!taskType) return 'unknown';
    return taskType.toLowerCase().trim().replace(/[-\s]/g, '_');
  };

  const normalizeRole = (role) => {
    if (!role) return 'unassigned';
    return role.toLowerCase().trim();
  };

  // Group tasks by reviewer role and task type
  const groupedTasks = tasks.reduce((acc, task) => {
    const role = normalizeRole(task.assigned_role);
    const taskType = normalizeTaskType(task.task_type);
    
    console.log(`📋 Grouping task: role="${role}", taskType="${taskType}" (original: "${task.assigned_role}", "${task.task_type}")`);
    
    if (!acc[role]) {
      acc[role] = {};
    }
    if (!acc[role][taskType]) {
      acc[role][taskType] = [];
    }
    acc[role][taskType].push(task);
    return acc;
  }, {});

  // Debug logging
  useEffect(() => {
    console.log('📋 All tasks:', tasks);
    console.log('📋 Grouped tasks:', groupedTasks);
    console.log('📋 Task types per role:', Object.keys(groupedTasks).map(role => ({
      role,
      taskTypes: Object.keys(groupedTasks[role] || {})
    })));
  }, [tasks]);

  // Auto-expand task type accordions that have assignments
  useEffect(() => {
    const reviewerRolesList = [
      { id: 're_sales_advisor' },
      { id: 're_analyst' },
      { id: 're_governance_lead' }
    ];

    const newOpenAccordions = { ...openTaskTypeAccordions };
    let hasChanges = false;

    reviewerRolesList.forEach(role => {
      const taskTypes = getTaskTypesForRole(role.id);
      taskTypes.forEach(taskType => {
        const tasksForType = getTasksForType(role.id, taskType.value);
        const key = `${role.id}_${taskType.value}`;
        // Auto-expand if there are assignments and it's not already manually closed
        if (tasksForType.length > 0 && newOpenAccordions[key] === undefined) {
          newOpenAccordions[key] = true;
          hasChanges = true;
        }
      });
    });
    
    if (hasChanges) {
      setOpenTaskTypeAccordions(newOpenAccordions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

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

  const toggleAccordion = (roleId) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  const toggleTaskTypeAccordion = (roleId, taskType) => {
    const key = `${roleId}_${taskType}`;
    setOpenTaskTypeAccordions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Get all task types for a role (default + custom)
  const getTaskTypesForRole = (roleId) => {
    const defaultTypes = defaultTaskTypes[roleId] || [];
    const customTypes = customTaskTypes[roleId] || [];
    return [...defaultTypes, ...customTypes];
  };

  // Get tasks for a specific task type
  const getTasksForType = (roleId, taskType) => {
    // Normalize inputs
    const normalizedRole = normalizeRole(roleId);
    const normalizedTaskType = normalizeTaskType(taskType);
    
    // Try exact match first
    let tasks = groupedTasks[normalizedRole]?.[normalizedTaskType] || [];
    
    // If no tasks found, try alternative formats
    if (tasks.length === 0) {
      // Try with dashes instead of underscores
      const altTaskType1 = normalizedTaskType.replace(/_/g, '-');
      tasks = groupedTasks[normalizedRole]?.[altTaskType1] || [];
      
      if (tasks.length === 0) {
        // Try with spaces instead of underscores
        const altTaskType2 = normalizedTaskType.replace(/_/g, ' ');
        tasks = groupedTasks[normalizedRole]?.[altTaskType2] || [];
      }
      
      // Try searching in all task types for this role (fuzzy match)
      if (tasks.length === 0 && groupedTasks[normalizedRole]) {
        const allTaskTypes = Object.keys(groupedTasks[normalizedRole]);
        const matchingTaskType = allTaskTypes.find(tt => 
          normalizeTaskType(tt) === normalizedTaskType ||
          tt.toLowerCase().includes(normalizedTaskType) ||
          normalizedTaskType.includes(tt.toLowerCase())
        );
        if (matchingTaskType) {
          tasks = groupedTasks[normalizedRole][matchingTaskType];
          console.log(`Found tasks with fuzzy match: "${matchingTaskType}" for "${taskType}"`);
        }
      }
    }
    
    console.log(`📋 Tasks for ${roleId} (${normalizedRole}) - ${taskType} (${normalizedTaskType}):`, tasks.length, tasks);
    
    // Also log what task types are actually available for this role
    if (tasks.length === 0 && groupedTasks[normalizedRole]) {
      console.log(`📋 Available task types for ${normalizedRole}:`, Object.keys(groupedTasks[normalizedRole]));
    }
    
    return tasks;
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

  if (error && !publishing) {
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
                  <div className="text-sm text-muted-foreground flex items-center justify-end gap-2 mb-2">
                    <span>Status</span>
                    <Button
                      variant={project?.status === 'published' ? 'default' : 'outline'}
                      size="sm"
                      onClick={handleTogglePublish}
                      iconName="Globe"
                      iconSize={16}
                      loading={publishing}
                      disabled={publishing}
                      title={project?.status === 'published' ? 'Unpublish (move to In Progress)' : 'Publish'}
                    >
                      {publishing ? 'Publishing...' : (project?.status === 'published' ? 'Published' : 'In Progress')}
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

            {/* Reviewer Roles with Task Types */}
            <div className="space-y-6">
              <h3 className="font-heading font-semibold text-lg text-foreground">
                Reviewer Roles & Task Types
              </h3>

              <div className="space-y-4">
                {reviewerRoles.map((role) => {
                  const roleTasks = groupedTasks[role.id] || {};
                  const taskTypes = getTaskTypesForRole(role.id);
                  const isExpanded = openAccordions[role.id];

                  return (
                    <div key={role.id} className="bg-card border border-border rounded-lg">
                      {/* Accordion Header */}
                      <div className="flex items-center justify-between p-6">
                        <button
                          onClick={() => toggleAccordion(role.id)}
                          className="flex-1 flex items-center justify-between focus:outline-none"
                          aria-expanded={isExpanded}
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
                                {role.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Icon
                              name={isExpanded ? 'ChevronUp' : 'ChevronDown'}
                              size={20}
                              className="text-muted-foreground"
                            />
                          </div>
                        </button>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-border space-y-4">
                          {/* Task Types */}
                          {taskTypes.map((taskType) => {
                            const tasksForType = getTasksForType(role.id, taskType.value);
                            
                            return (
                              <div key={taskType.value} className="bg-muted/30 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                      <Icon name="FileText" size={16} className="text-primary" />
                                    </div>
                                    <div>
                                      <h5 className="font-body font-medium text-sm text-foreground">
                                        {taskType.label}
                                      </h5>
                                      {tasksForType.length > 0 && (
                                        <p className="font-body text-xs text-muted-foreground">
                                          {tasksForType.length} assignment{tasksForType.length !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {role.id === 're_sales_advisor' && taskType.value === 'investor_alignment' ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowAssignAdvisorModal(true);
                                      }}
                                      iconName="UserPlus"
                                      iconSize={14}
                                    >
                                      {masterAdvisor ? 'Change Advisor' : 'Assign Master Advisor'}
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAssignTaskType(role.id, taskType.value)}
                                      iconName="UserPlus"
                                      iconSize={14}
                                    >
                                      Assign
                                    </Button>
                                  )}
                                </div>

                                {/* Display assigned reviewers in accordion - Always show */}
                                <div className="mt-3">
                                  <button
                                    onClick={() => toggleTaskTypeAccordion(role.id, taskType.value)}
                                    className="w-full flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <Icon name="Users" size={16} className="text-primary" />
                                      <span className="text-sm font-medium text-foreground">
                                        Assigned Reviewers ({tasksForType.length})
                                      </span>
                                    </div>
                                    <Icon
                                      name={openTaskTypeAccordions[`${role.id}_${taskType.value}`] ? 'ChevronUp' : 'ChevronDown'}
                                      size={16}
                                      className="text-muted-foreground"
                                    />
                                  </button>
                                  {openTaskTypeAccordions[`${role.id}_${taskType.value}`] && (
                                    <div className="mt-2 space-y-2">
                                      {/* Show master advisor for investor alignment if assigned */}
                                      {role.id === 're_sales_advisor' && taskType.value === 'investor_alignment' && masterAdvisor && (
                                        <div className="bg-background rounded-lg p-4 border border-border">
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <Icon name="UserCheck" size={14} className="text-primary" />
                                              </div>
                                              <div>
                                                <div className="text-sm font-medium text-foreground">
                                                  Master Sales Advisor
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {masterAdvisor.advisor_name || 'Assigned Advisor'}
                                                </div>
                                                {masterAdvisor.advisor_email && (
                                                  <div className="text-xs text-muted-foreground">
                                                    {masterAdvisor.advisor_email}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                              Master Advisor
                                            </span>
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                                            This is the master sales advisor assigned for investor alignment.
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Show assigned tasks */}
                                      {tasksForType.length === 0 && (!(role.id === 're_sales_advisor' && taskType.value === 'investor_alignment' && masterAdvisor)) ? (
                                        <div className="bg-background rounded-lg p-4 border border-border text-center">
                                          <Icon name="UserX" size={24} className="text-muted-foreground mx-auto mb-2" />
                                          <p className="text-sm text-muted-foreground">
                                            No reviewers assigned yet. Click "Assign" to add a reviewer.
                                          </p>
                                        </div>
                                      ) : tasksForType.length > 0 ? (
                                        <div className="space-y-2">
                                          {tasksForType.map((task) => (
                                            <div key={task.task_id} className="bg-background rounded-lg p-4 border border-border">
                                              <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                    <Icon name="UserCheck" size={14} className="text-primary" />
                                                  </div>
                                                  <div>
                                                    <div className="text-sm font-medium text-foreground">
                                                      {task.assigned_to_name || task.assigned_to || 'Unknown'}
                                                    </div>
                                                    {task.assigned_to_email && (
                                                      <div className="text-xs text-muted-foreground">
                                                        {task.assigned_to_email}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                  {(() => {
                                                    // Determine if task is 100% complete
                                                    const reviewStatus = reviewStatuses[role.id] || reviewStatuses[normalizeRole(role.id)];
                                                    const isComplete = reviewStatus?.published === true || 
                                                                      reviewStatus?.completion_percentage >= 100 ||
                                                                      reviewStatus?.status === 'completed' ||
                                                                      reviewStatus?.status === 'published' ||
                                                                      task.status === 'completed';
                                                    
                                                    // If review is 100% complete but task status is in_progress, show as completed
                                                    const displayStatus = isComplete ? 'completed' : task.status;
                                                    
                                                    return (
                                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        displayStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                                        displayStatus === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        displayStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                                      }`}>
                                                        {getStatusLabel(displayStatus, task, role.id)}
                                                      </span>
                                                    );
                                                  })()}
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const roleRouteMap = {
                                                        're_sales_advisor': '/sales-advisor/document-review',
                                                        're_analyst': '/analyst/document-review',
                                                        're_governance_lead': '/governance/document-review'
                                                      };
                                                      const baseRoute = roleRouteMap[role.id] || '/document-review';
                                                      navigate(`${baseRoute}/${projectId}`, {
                                                        state: {
                                                          landId: projectId,
                                                          reviewerRole: role.id,
                                                          taskId: task.task_id,
                                                          taskType: task.task_type,
                                                          autoSwitchRole: true
                                                        }
                                                      });
                                                    }}
                                                    iconName="Eye"
                                                    iconSize={14}
                                                    title="View Documents"
                                                    className="text-primary hover:text-primary"
                                                  >
                                                    View
                                                  </Button>
                                                </div>
                                              </div>
                                              {task.description && (
                                                <div className="mb-3">
                                                  <p className="text-xs text-muted-foreground">{task.description}</p>
                                                </div>
                                              )}
                                              <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
                                                <div className="flex items-center space-x-4">
                                                  <div>
                                                    <span className="text-muted-foreground">Due:</span>
                                                    <span className="ml-1 text-foreground">{formatDate(task.due_date)}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-muted-foreground">Priority:</span>
                                                    <span className={`ml-1 font-medium ${
                                                      task.priority === 'urgent' ? 'text-red-600' :
                                                      task.priority === 'high' ? 'text-orange-600' :
                                                      task.priority === 'medium' ? 'text-yellow-600' :
                                                      'text-gray-600'
                                                    }`}>
                                                      {(task.priority || 'Not set').charAt(0).toUpperCase() + (task.priority || 'Not set').slice(1)}
                                                    </span>
                                                  </div>
                                                </div>
                                                {task.created_at && (
                                                  <div className="text-muted-foreground">
                                                    Assigned: {formatDate(task.created_at)}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Add New Task Type Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddCustomTaskType(role.id)}
                            iconName="Plus"
                            iconSize={14}
                            className="w-full"
                          >
                            Add New Task Type
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Assign Reviewer Modal */}
      {showAssignModal && (
        <AssignReviewerModal
          project={project}
          existingTasks={tasks}
          onClose={() => {
            setShowAssignModal(false);
            setAssigningTaskType(null);
          }}
          onAssign={handleAssignSubmit}
          preselectedRole={assigningTaskType?.roleId}
          preselectedTaskType={assigningTaskType?.taskType}
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

      {/* Assign Master Sales Advisor Modal */}
      {showAssignAdvisorModal && project && (
        <AssignMasterSalesAdvisorModal
          project={project}
          onClose={() => setShowAssignAdvisorModal(false)}
          onAssign={handleMasterAdvisorAssigned}
        />
      )}
    </div>
  );
};

export default ProjectReviewersPage;
