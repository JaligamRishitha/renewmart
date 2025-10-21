import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';

import Button from '../../components/ui/Button';
import MetricsCard from './components/MetricsCard';

import TaskTable from './components/TaskTable';
import FilterControls from './components/FilterControls';
import ActivityFeed from './components/ActivityFeed';
import DeadlineAlerts from './components/DeadlineAlerts';
import BulkActions from './components/BulkActions';
import AssignReviewerModal from './components/AssignReviewerModal';
import CreateUserModal from './components/CreateUserModal';
import { landsAPI, taskAPI, usersAPI } from '../../services/api';
import Icon from '../../components/AppIcon';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [filters, setFilters] = useState({
    reviewerRole: '',
    projectType: '',
    status: '',
    priority: '',
    startDateFrom: '',
    endDateTo: '',
    search: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [tasksWithDetails, setTasksWithDetails] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [filters.status]);

  const getRoleLabel = (role) => {
    const roleLabels = {
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead',
      'administrator': 'Administrator'
    };
    return roleLabels[role] || role;
  };

  const fetchAdminData = async () => {
    try {
      console.log('[Admin Dashboard] Fetching admin data...');
      setLoading(true);
      setError(null);
      
      const statusFilter = filters.status ? { status_filter: filters.status } : {};
      console.log('[Admin Dashboard] Status filter:', statusFilter);
      
      const [projectsResponse, summaryResponse] = await Promise.all([
        landsAPI.getAdminProjects(statusFilter),
        landsAPI.getAdminSummary()
      ]);
      
      console.log('[Admin Dashboard] Projects response:', projectsResponse);
      console.log('[Admin Dashboard] Summary response:', summaryResponse);
      console.log('[Admin Dashboard] Number of projects:', projectsResponse?.length || 0);
      
      // Log first project structure for debugging
      if (projectsResponse && projectsResponse.length > 0) {
        console.log('[Admin Dashboard] First project structure:', {
          id: projectsResponse[0].id,
          title: projectsResponse[0].title,
          location_text: projectsResponse[0].location_text,
          energy_key: projectsResponse[0].energy_key,
          status: projectsResponse[0].status,
          landowner_name: projectsResponse[0].landowner_name,
          owner: projectsResponse[0].owner
        });
      }
      
      setProjects(projectsResponse || []);
      setSummaryData(summaryResponse);

      // Fetch tasks for each project with reviewer details
      const tasksWithReviewers = await Promise.all(
        (projectsResponse || []).map(async (project) => {
          try {
            // Fetch tasks for this land
            const tasks = await taskAPI.getTasks({ land_id: project.id });
            console.log(`[Admin Dashboard] Tasks for project ${project.id}:`, tasks);
            
            // If no tasks exist, create a placeholder entry so project still shows
            if (!tasks || tasks.length === 0) {
              console.log(`[Admin Dashboard] No tasks for project ${project.id}, creating placeholder`);
              return [{
                task_id: `placeholder-${project.id}`,
                land_id: project.id,
                status: 'pending',
                created_at: project.created_at || project.submittedDate,
                due_date: project.project_due_date || null,
                priority: project.project_priority || null,
                project,
                reviewerName: 'Unassigned',
                reviewerRole: 'Pending Assignment',
                isPlaceholder: true
              }];
            }
            
            // Fetch reviewer details for each task
            const tasksWithReviewerInfo = await Promise.all(
              (tasks || []).map(async (task) => {
                let reviewerInfo = null;
                let reviewerRole = 'Unassigned';
                let reviewerName = 'Unassigned';
                
                if (task.assigned_to) {
                  try {
                    reviewerInfo = await usersAPI.getUserById(task.assigned_to);
                    reviewerName = `${reviewerInfo.first_name || ''} ${reviewerInfo.last_name || ''}`.trim() || reviewerInfo.email;
                    reviewerRole = getRoleLabel(task.assigned_role || reviewerInfo.roles?.[0]);
                  } catch (err) {
                    console.error(`[Admin Dashboard] Failed to fetch reviewer ${task.assigned_to}:`, err);
                  }
                }
                
                return {
                  ...task,
                  project,
                  reviewerInfo,
                  reviewerName,
                  reviewerRole,
                  isPlaceholder: false
                };
              })
            );
            
            return tasksWithReviewerInfo;
          } catch (err) {
            console.error(`[Admin Dashboard] Failed to fetch tasks for project ${project.id}:`, err);
            // Even on error, create a placeholder so project shows
            return [{
              task_id: `placeholder-${project.id}`,
              land_id: project.id,
              status: 'pending',
              created_at: project.created_at || project.submittedDate,
              due_date: project.project_due_date || null,
              priority: project.project_priority || null,
              project,
              reviewerName: 'Unassigned',
              reviewerRole: 'Pending Assignment',
              isPlaceholder: true
            }];
          }
        })
      );
      
      // Flatten the array of task arrays
      const allTasks = tasksWithReviewers.flat();
      console.log('[Admin Dashboard] All tasks with details (including placeholders):', allTasks);
      console.log('[Admin Dashboard] Total entries to display:', allTasks.length);
      setTasksWithDetails(allTasks);
      
    } catch (err) {
      console.error('[Admin Dashboard] Error fetching admin data:', err);
      console.error('[Admin Dashboard] Error response:', err.response?.data);
      console.error('[Admin Dashboard] Error status:', err.response?.status);
      
      let errorMessage = 'Failed to load admin data. ';
      
      if (err.response?.status === 401) {
        errorMessage += 'Please login as administrator.';
      } else if (err.response?.status === 403) {
        errorMessage += 'You do not have administrator permissions.';
      } else if (err.response?.data?.detail) {
        errorMessage += err.response.data.detail;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (must be defined before use)
  const getProjectIcon = (projectType) => {
    const iconMap = {
      'Solar': 'Sun',
      'Wind': 'Wind',
      'Hydroelectric': 'Waves',
      'Biomass': 'Leaf',
      'Geothermal': 'Flame'
    };
    return iconMap[projectType] || 'MapPin';
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

  const getPriority = (status) => {
    if (status === 'submitted') return 'High';
    if (status === 'under_review') return 'Medium';
    return 'Low';
  };

  // Transform tasks to table format with better field mapping
  const tasksData = tasksWithDetails.map(task => {
    const project = task.project || {};
    
    return {
      id: task.task_id,
      taskId: task.task_id,
      landId: task.land_id || project.land_id || project.id,
      projectName: project.title || project.name || 'Unnamed Project',
      landownerName: project.landowner_name || project.landownerName || 
                     project.owner?.first_name || project.owner?.email || 'Unknown',
      landownerEmail: project.landowner_email || project.landownerEmail || 
                     project.owner?.email || '',
      landownerPhone: project.landowner_phone || project.landownerPhone || 
                     project.owner?.phone || '',
      location: project.location_text || project.location || 'N/A',
      projectType: project.energy_key || project.energyType || project.projectType || 
                   project.energy_type || 'N/A',
      projectIcon: getProjectIcon(project.energy_key || project.energyType || project.projectType),
      assignedReviewer: task.reviewerName || "Unassigned",
      reviewerRole: task.reviewerRole || "Pending Assignment",
      startDate: task.created_at || project.created_at || project.submittedDate,
      endDate: task.due_date || null,
      status: task.isPlaceholder ? 'Pending' : getStatusLabel(task.status),
      priority: task.priority || null,
      title: task.title || (task.task_type ? task.task_type.replace(/_/g, ' ').toUpperCase() : 'Review'),
      capacity: project.capacity_mw || project.capacity,
      energyType: project.energy_key || project.energyType,
      rawStatus: task.status,
      taskStatus: task.status,
      isPlaceholder: task.isPlaceholder || false,
      investorInterestCount: project.investorInterestCount || 0
    };
  });

  // Calculate metrics from summary data
  const metricsData = summaryData ? [
    {
      title: "Pending Reviews",
      value: summaryData.pendingReviews.toString(),
      change: `${summaryData.totalProjects} total projects`,
      changeType: "neutral",
      icon: "FileCheck",
      color: "warning"
    },
    {
      title: "Under Review",
      value: summaryData.underReview.toString(),
      change: `${summaryData.approved} approved`,
      changeType: "increase",
      icon: "Eye",
      color: "primary"
    },
    {
      title: "Published",
      value: summaryData.published.toString(),
      change: `${summaryData.readyToBuy} ready to buy`,
      changeType: "increase",
      icon: "CheckCircle",
      color: "success"
    },
    {
      title: "Total Capacity",
      value: `${summaryData.totalCapacity.toFixed(1)} MW`,
      change: `${summaryData.totalLandArea.toFixed(0)} acres`,
      changeType: "neutral",
      icon: "Zap",
      color: "secondary"
    },
    {
      title: "Investor Interest",
      value: summaryData.totalInvestorInterests?.toString() || "0",
      change: `${summaryData.totalInvestors || 0} investors`,
      changeType: summaryData.totalInvestorInterests > 0 ? "increase" : "neutral",
      icon: "Users",
      color: "accent"
    }
  ] : [];

  // Generate deadline alerts from tasks data
  const alertsData = React.useMemo(() => {
    const now = new Date();
    const alerts = [];

    tasksData.forEach(task => {
      if (!task.endDate) return;

      const dueDate = new Date(task.endDate);
      const diffInHours = (dueDate - now) / (1000 * 60 * 60);
      const diffInDays = diffInHours / 24;

      // Overdue tasks (critical)
      if (diffInHours < 0 && task.rawStatus !== 'completed') {
        alerts.push({
          id: `overdue-${task.id}`,
          taskId: task.taskId,
          landId: task.landId,
          taskTitle: task.title || task.projectName,
          deadline: task.endDate,
          assignedTo: task.assignedReviewer,
          description: `${task.projectName} - ${task.projectType} project is overdue`,
          urgency: 'critical',
          projectName: task.projectName
        });
      }
      // Due within 24 hours (critical)
      else if (diffInHours > 0 && diffInHours <= 24 && task.rawStatus !== 'completed') {
        alerts.push({
          id: `urgent-${task.id}`,
          taskId: task.taskId,
          landId: task.landId,
          taskTitle: task.title || task.projectName,
          deadline: task.endDate,
          assignedTo: task.assignedReviewer,
          description: `${task.projectName} - Due in less than 24 hours`,
          urgency: 'critical',
          projectName: task.projectName
        });
      }
      // Due within 3 days (warning)
      else if (diffInDays > 1 && diffInDays <= 3 && task.rawStatus !== 'completed') {
        alerts.push({
          id: `warning-${task.id}`,
          taskId: task.taskId,
          landId: task.landId,
          taskTitle: task.title || task.projectName,
          deadline: task.endDate,
          assignedTo: task.assignedReviewer,
          description: `${task.projectName} - Due in ${Math.ceil(diffInDays)} days`,
          urgency: 'warning',
          projectName: task.projectName
        });
      }
      // Due within 7 days (info)
      else if (diffInDays > 3 && diffInDays <= 7 && task.rawStatus !== 'completed') {
        alerts.push({
          id: `info-${task.id}`,
          taskId: task.taskId,
          landId: task.landId,
          taskTitle: task.title || task.projectName,
          deadline: task.endDate,
          assignedTo: task.assignedReviewer,
          description: `${task.projectName} - Due in ${Math.ceil(diffInDays)} days`,
          urgency: 'info',
          projectName: task.projectName
        });
      }
    });

    // Sort by urgency and deadline
    return alerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, info: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }, [tasksData]);

  // Generate recent activity from tasks data
  const activitiesData = React.useMemo(() => {
    const activities = [];

    // Sort tasks by most recent update/creation
    const sortedTasks = [...tasksWithDetails].sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      return dateB - dateA;
    });

    // Generate activities from tasks (limit to 20 most recent)
    sortedTasks.slice(0, 20).forEach(task => {
      const timestamp = task.updated_at || task.created_at;
      if (!timestamp) return;

      // Task assignment activity
      if (task.assigned_to && task.reviewerName !== 'Unassigned') {
        activities.push({
          id: `assign-${task.task_id}`,
          type: 'review_assigned',
          user: 'Admin',
          action: 'assigned',
          target: `${task.reviewerName} to ${task.project?.title || 'project'}`,
          details: `${task.title || task.task_type?.replace(/_/g, ' ')} - ${task.reviewerRole}`,
          timestamp: timestamp
        });
      }

      // Status change activity
      if (task.status) {
        const statusLabels = {
          'pending': 'set status to Pending',
          'in_progress': 'started working on',
          'completed': 'completed',
          'under_review': 'marked for review',
          'approved': 'approved',
          'rejected': 'rejected'
        };
        
        activities.push({
          id: `status-${task.task_id}`,
          type: task.status === 'completed' ? 'task_completed' : 'status_changed',
          user: task.reviewerName !== 'Unassigned' ? task.reviewerName : 'Admin',
          action: statusLabels[task.status] || 'updated status for',
          target: task.project?.title || 'project',
          details: `${task.title || task.task_type?.replace(/_/g, ' ')}`,
          timestamp: timestamp
        });
      }
    });

    // Remove duplicates and sort by timestamp
    const uniqueActivities = activities
      .filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15); // Limit to 15 most recent

    return uniqueActivities;
  }, [tasksWithDetails]);

  // Filter tasks based on current filters
  const filteredTasks = tasksData?.filter(task => {
    if (filters?.reviewerRole && task?.reviewerRole !== filters?.reviewerRole) return false;
    if (filters?.projectType && task?.projectType !== filters?.projectType) return false;
    if (filters?.status && task?.status !== filters?.status) return false;
    if (filters?.priority && task?.priority !== filters?.priority) return false;
    if (filters?.startDateFrom && new Date(task.startDate) < new Date(filters.startDateFrom)) return false;
    if (filters?.endDateTo && new Date(task.endDate) > new Date(filters.endDateTo)) return false;
    if (filters?.search) {
      const searchTerm = filters?.search?.toLowerCase();
      return task?.landownerName?.toLowerCase()?.includes(searchTerm) || 
             task?.location?.toLowerCase()?.includes(searchTerm);
    }
    return true;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      reviewerRole: '',
      projectType: '',
      status: '',
      priority: '',
      startDateFrom: '',
      endDateTo: '',
      search: ''
    });
  };

  const handleBulkAction = async (action, taskIds) => {
    // TODO: Implement bulk action API calls
    console.log(`Executing ${action} on tasks:`, taskIds);
    setSelectedTasks([]);
  };

  const handleQuickAction = (actionId) => {
    // TODO: Implement quick action API calls
    console.log('Quick action:', actionId);
  };

  const handleAssignReviewer = (project) => {
    setSelectedProject(project);
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (assignmentData) => {
    try {
      console.log('[Admin Dashboard] Assigning reviewer:', assignmentData);
      
      // Create task via API
      await taskAPI.createTask({
        land_id: assignmentData.landId,
        task_type: assignmentData.taskType,
        description: assignmentData.description,
        assigned_to: assignmentData.assignedTo,
        assigned_role: assignmentData.reviewerRole,  // Add assigned_role for auto-creating subtasks
        due_date: assignmentData.dueDate || null,
        priority: assignmentData.priority
      });

      console.log('[Admin Dashboard] Task assigned successfully');
      
      // Show success notification
      const successNotification = {
        id: Date.now(),
        type: 'success',
        title: 'Reviewer Assigned',
        message: `Successfully assigned ${assignmentData.reviewerRole} to review this project`,
        timestamp: new Date()
      };
      setNotifications(prev => [successNotification, ...prev.slice(0, 4)]);

      // Refresh data
      await fetchAdminData();
      
      // Close modal
      setShowAssignModal(false);
      setSelectedProject(null);
    } catch (err) {
      console.error('[Admin Dashboard] Error assigning reviewer:', err);
      throw new Error(err.response?.data?.detail || 'Failed to assign reviewer');
    }
  };

  const handleTaskUpdate = async (taskId, updateData, isPlaceholder, landId) => {
    try {
      console.log('[Admin Dashboard] Updating task/project:', { taskId, updateData, isPlaceholder, landId });
      
      if (isPlaceholder) {
        // For placeholder tasks, update the land/project record with metadata
        console.log('[Admin Dashboard] Updating project metadata for land:', landId);
        
        // Store priority and due_date in land metadata or custom fields
        const landUpdateData = {
          project_priority: updateData.priority,
          project_due_date: updateData.due_date
        };
        
        await landsAPI.updateLand(landId, landUpdateData);
        console.log('[Admin Dashboard] Project metadata updated successfully');
      } else {
        // For real tasks, update the task record
        console.log('[Admin Dashboard] Updating task:', taskId);
        await taskAPI.updateTask(taskId, updateData);
        console.log('[Admin Dashboard] Task updated successfully');
      }
      
      // Show success notification
      const successNotification = {
        id: Date.now(),
        type: 'success',
        title: isPlaceholder ? 'Project Updated' : 'Task Updated',
        message: isPlaceholder 
          ? 'Project priority and due date have been updated successfully' 
          : 'Task details have been updated successfully',
        timestamp: new Date()
      };
      setNotifications(prev => [successNotification, ...prev.slice(0, 4)]);

      // Refresh data to reflect changes
      await fetchAdminData();
    } catch (err) {
      console.error('[Admin Dashboard] Error updating:', err);
      throw new Error(err.response?.data?.detail || 'Failed to update');
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <WorkflowBreadcrumbs />
      <main className={`pt-4 pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Admin Dashboard
                </h1>
                <p className="font-body text-muted-foreground">
                  Manage document reviews and task assignments for renewable energy projects
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateUserModal(true)}
                  iconName="UserPlus"
                  iconSize={18}
                >
                  Create Reviewer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/document-review')}
                  iconName="FileCheck"
                  iconSize={18}
                >
                  Review Queue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin-marketplace')}
                  iconName="Store"
                  iconSize={18}
                >
                  Marketplace
                </Button>
               {/* <Button
                  variant="outline"
                  onClick={() => navigate('/admin-document-review')}
                  iconName="FolderCheck"
                  iconSize={18}
                >
                  Document Review
                </Button> */}
                <Button
                  variant="default"
                  onClick={() => handleQuickAction('generate-report')}
                  iconName="BarChart3"
                  iconSize={18}
                >
                  Generate Report
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
              <span className="ml-3 text-lg text-muted-foreground">Loading admin data...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Icon name="AlertTriangle" size={20} className="text-error mr-2" />
                <p className="text-error font-medium">{error}</p>
              </div>
              <button
                onClick={fetchAdminData}
                className="mt-2 text-sm text-error hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Metrics Cards */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
              {metricsData?.map((metric, index) => (
                <MetricsCard
                  key={index}
                  title={metric?.title}
                  value={metric?.value}
                  change={metric?.change}
                  changeType={metric?.changeType}
                  icon={metric?.icon}
                  color={metric?.color}
                  onClick={metric?.title === "Investor Interest" ? () => navigate('/admin-investor-interests') : undefined}
                />
              ))}
            </div>
          )}

          {/* Filter Controls */}
          {!loading && !error && (
            <div className="mb-6">
              <FilterControls
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          )}

          {/* Bulk Actions */}
          {selectedTasks?.length > 0 && (
            <div className="mb-6">
              <BulkActions
                selectedTasks={selectedTasks}
                onBulkAction={handleBulkAction}
                onClearSelection={() => setSelectedTasks([])}
              />
            </div>
          )}

          {/* Main Content Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Task Table - Takes up 3 columns on xl screens */}
              <div className="xl:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-xl text-foreground">
                    Active Reviews ({filteredTasks?.length})
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="font-body text-sm text-muted-foreground">
                      {selectedTasks?.length} selected
                    </span>
                  </div>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-12 text-center">
                    <Icon name="Inbox" size={48} className="mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Found</h3>
                    <p className="text-muted-foreground">
                      {filters.status ? 'No projects match the selected filters.' : 'No projects have been submitted yet.'}
                    </p>
                  </div>
                ) : (
                  <TaskTable
                    tasks={filteredTasks}
                    selectedTasks={selectedTasks}
                    onTaskSelect={setSelectedTasks}
                    onBulkAction={handleBulkAction}
                    onAssignReviewer={handleAssignReviewer}
                    onTaskUpdate={handleTaskUpdate}
                  />
                )}
              </div>

              {/* Side Panel - Takes up 1 column on xl screens */}
              <div className="xl:col-span-1 space-y-6">
                {/* Deadline Alerts */}
                <DeadlineAlerts alerts={alertsData} />
                
                {/* Activity Feed */}
                <ActivityFeed activities={activitiesData} />
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Notifications */}
      <NotificationIndicator
        notifications={notifications}
        position="top-right"
        maxVisible={3}
        autoHide={true}
        hideDelay={5000}
      />
      {/* Quick Actions */}
      <QuickActions
        userRole="admin"
        onActionComplete={handleQuickAction}
        position="bottom-right"
      />
      
      {/* Assign Reviewer Modal */}
      {showAssignModal && selectedProject && (
        <AssignReviewerModal
          project={selectedProject}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedProject(null);
          }}
          onAssign={handleAssignSubmit}
        />
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => {
            const successNotification = {
              id: Date.now(),
              type: 'success',
              title: 'User Created',
              message: 'Reviewer account created successfully',
              timestamp: new Date()
            };
            setNotifications(prev => [successNotification, ...prev.slice(0, 4)]);
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;