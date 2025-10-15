import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
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
import { landsAPI, taskAPI } from '../../services/api';
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

  useEffect(() => {
    fetchAdminData();
  }, [filters.status]);

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
      
      setProjects(projectsResponse || []);
      setSummaryData(summaryResponse);
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

  // Transform projects to task format for the table
  const tasksData = projects.map(project => ({
    id: project.id,
    landownerName: project.landownerName,
    landownerEmail: project.landownerEmail,
    landownerPhone: project.landownerPhone,
    location: project.location,
    projectType: project.projectType,
    projectIcon: getProjectIcon(project.projectType),
    assignedReviewer: "Unassigned", // TODO: Add reviewer assignment
    reviewerRole: "Pending Assignment",
    startDate: project.submittedDate,
    endDate: project.lastUpdated,
    status: getStatusLabel(project.status),
    priority: getPriority(project.status),
    title: project.title,
    capacity: project.capacity,
    energyType: project.energyType,
    rawStatus: project.status
  }));

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
    }
  ] : [];

  // Activities will be fetched from API (TODO: Implement activity feed API)
  const activitiesData = [];

  // Deadline alerts will be fetched from API (TODO: Implement deadline alerts API)
  const alertsData = [];

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


  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
      <WorkflowBreadcrumbs />
      <main className="pt-4 pb-20">
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
                  onClick={() => navigate('/document-review')}
                  iconName="FileCheck"
                  iconSize={18}
                >
                  Review Queue
                </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {metricsData?.map((metric, index) => (
                <MetricsCard
                  key={index}
                  title={metric?.title}
                  value={metric?.value}
                  change={metric?.change}
                  changeType={metric?.changeType}
                  icon={metric?.icon}
                  color={metric?.color}
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
    </div>
  );
};

export default AdminDashboard;