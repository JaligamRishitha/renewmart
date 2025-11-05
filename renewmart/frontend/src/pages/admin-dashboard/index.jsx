import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/ui/Header";
import Footer from "../../components/ui/Footer";
import Sidebar from "../../components/ui/Sidebar";
import NotificationIndicator from "../../components/ui/NotificationIndicator";
import QuickActions from "../../components/ui/QuickActions";

import Button from "../../components/ui/Button";
import MetricsCard from "./components/MetricsCard";

import ProjectTable from "./components/ProjectTable";
import FilterControls from "./components/FilterControls";
import ActivityFeed from "./components/ActivityFeed";
import DeadlineAlerts from "./components/DeadlineAlerts";
import BulkActions from "./components/BulkActions";
import AssignReviewerModal from "./components/AssignReviewerModal";
import CreateUserModal from "./components/CreateUserModal";
import { landsAPI, taskAPI, usersAPI } from "../../services/api";
import Icon from "../../components/AppIcon";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [filters, setFilters] = useState({
    projectType: "",
    status: "",
    startDateFrom: "",
    endDateTo: "",
    search: "",
  });
  const [notifications, setNotifications] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, [filters.status]);

  const getRoleLabel = (role) => {
    const roleLabels = {
      re_sales_advisor: "RE Sales Advisor",
      re_analyst: "RE Analyst",
      re_governance_lead: "RE Governance Lead",
      administrator: "Administrator",
    };
    return roleLabels[role] || role;
  };

  const fetchAdminData = async () => {
    try {
      console.log("[Admin Dashboard] Fetching admin data...");
      setLoading(true);
      setError(null);

      const statusFilter = filters.status
        ? { status_filter: filters.status }
        : {};
      console.log("[Admin Dashboard] Status filter:", statusFilter);

      const [projectsResponse, summaryResponse] = await Promise.all([
        landsAPI.getAdminProjects(statusFilter),
        landsAPI.getAdminSummary(),
      ]);

      console.log("[Admin Dashboard] Projects response:", projectsResponse);
      console.log("[Admin Dashboard] Summary response:", summaryResponse);
      console.log(
        "[Admin Dashboard] Number of projects:",
        projectsResponse?.length || 0
      );

      // Process projects to add landowner name
      const processedProjects = (projectsResponse || []).map((project) => {
        const landownerName =
          project.landownerName ||
          `${project.first_name || ""} ${project.last_name || ""}`.trim() ||
          project.landowner_email ||
          "Unknown";

        return {
          ...project,
          landownerName,
        };
      });

      setProjects(processedProjects);
      setSummaryData(summaryResponse);
    } catch (err) {
      console.error("[Admin Dashboard] Error fetching admin data:", err);
      console.error("[Admin Dashboard] Error response:", err.response?.data);
      console.error("[Admin Dashboard] Error status:", err.response?.status);

      let errorMessage = "Failed to load admin data. ";

      if (err.response?.status === 401) {
        errorMessage += "Please login as administrator.";
      } else if (err.response?.status === 403) {
        errorMessage += "You do not have administrator permissions.";
      } else if (err.response?.data?.detail) {
        errorMessage += err.response.data.detail;
      } else {
        errorMessage += "Please try again.";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions (must be defined before use)
  const getProjectIcon = (projectType) => {
    const iconMap = {
      Solar: "Sun",
      Wind: "Wind",
      Hydroelectric: "Waves",
      Biomass: "Leaf",
      Geothermal: "Flame",
    };
    return iconMap[projectType] || "MapPin";
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      submitted: "Pending",
      under_review: "In Progress",
      approved: "Approved",
      published: "Published",
      rtb: "Ready to Buy",
      rejected: "Rejected",
    };
    return statusMap[status] || status;
  };

  const getPriority = (status) => {
    if (status === "submitted") return "High";
    if (status === "under_review") return "Medium";
    return "Low";
  };

  // Filter projects based on current filters
  const filteredProjects = projects?.filter((project) => {
    if (filters?.projectType) {
      const projectType = project?.energy_key || project?.energyType || "";
      if (projectType.toLowerCase() !== filters.projectType.toLowerCase()) {
        return false;
      }
    }
    if (filters?.status && project?.status !== filters?.status) return false;
    if (
      filters?.startDateFrom &&
      new Date(project?.submittedDate || project?.created_at) < new Date(filters.startDateFrom)
    )
      return false;
    if (
      filters?.endDateTo &&
      new Date(project.project_due_date) > new Date(filters.endDateTo)
    )
      return false;
    if (filters?.search) {
      const searchTerm = filters?.search?.toLowerCase();
      return (
        project?.title?.toLowerCase()?.includes(searchTerm) ||
        project?.landownerName?.toLowerCase()?.includes(searchTerm) ||
        project?.location_text?.toLowerCase()?.includes(searchTerm)
      );
    }
    return true;
  });

  // Calculate metrics from summary data
  const metricsData = summaryData
    ? [
        {
          title: "Pending Reviews",
          value: summaryData.pendingReviews.toString(),
          change: `${summaryData.totalProjects} total projects`,
          changeType: "neutral",
          icon: "FileCheck",
          color: "warning",
        },
        {
          title: "Under Review",
          value: summaryData.underReview.toString(),
          changeType: "increase",
          icon: "Eye",
          color: "error",
        },
        {
          title: "Published",
          value: summaryData.published.toString(),
          changeType: "increase",
          icon: "CheckCircle",
          color: "success",
        },
        {
          title: "Total Capacity",
          value: `${summaryData.totalCapacity.toFixed(1)} MW`,
          change: `${summaryData.totalLandArea.toFixed(0)} acres`,
          changeType: "neutral",
          icon: "Zap",
          color: "warning",
        },
        {
          title: "Investor Interest",
          value: summaryData.totalInvestorInterests?.toString() || "0",
          change: `${summaryData.totalInvestors || 0} investors`,
          changeType:
            summaryData.totalInvestorInterests > 0 ? "increase" : "neutral",
          icon: "Users",
          color: "accent",
        },
      ]
    : [];

  // Generate deadline alerts from projects data
  const alertsData = React.useMemo(() => {
    const now = new Date();
    const alerts = [];

    filteredProjects.forEach((project) => {
      if (!project.project_due_date) return;

      const dueDate = new Date(project.project_due_date);
      const diffInHours = (dueDate - now) / (1000 * 60 * 60);
      const diffInDays = diffInHours / 24;

      // Only show alerts for projects that are not completed/published
      const activeStatuses = ["submitted", "under_review", "approved"];
      if (!activeStatuses.includes(project.status)) return;

      const energyType = project?.energy_key || project?.energyType || "Project";
      
      // Overdue projects (critical)
      if (diffInHours < 0) {
        alerts.push({
          id: `overdue-${project.id}`,
          projectId: project.id,
          landId: project.id,
          taskId: null,
          taskTitle: project.title,
          projectTitle: project.title,
          deadline: project.project_due_date,
          description: `${project.title} - ${energyType} project is overdue`,
          urgency: "critical",
          projectName: project.title,
          assignedTo: project.landownerName || "Unassigned",
        });
      }
      // Due within 24 hours (critical)
      else if (diffInHours > 0 && diffInHours <= 24) {
        alerts.push({
          id: `urgent-${project.id}`,
          projectId: project.id,
          landId: project.id,
          taskId: null,
          taskTitle: project.title,
          projectTitle: project.title,
          deadline: project.project_due_date,
          description: `${project.title} - Due in less than 24 hours`,
          urgency: "critical",
          projectName: project.title,
          assignedTo: project.landownerName || "Unassigned",
        });
      }
      // Due within 3 days (warning)
      else if (diffInDays > 1 && diffInDays <= 3) {
        alerts.push({
          id: `warning-${project.id}`,
          projectId: project.id,
          landId: project.id,
          taskId: null,
          taskTitle: project.title,
          projectTitle: project.title,
          deadline: project.project_due_date,
          description: `${project.title} - Due in ${Math.ceil(
            diffInDays
          )} days`,
          urgency: "warning",
          projectName: project.title,
          assignedTo: project.landownerName || "Unassigned",
        });
      }
      // Due within 7 days (info)
      else if (diffInDays > 3 && diffInDays <= 7) {
        alerts.push({
          id: `info-${project.id}`,
          projectId: project.id,
          landId: project.id,
          taskId: null,
          taskTitle: project.title,
          projectTitle: project.title,
          deadline: project.project_due_date,
          description: `${project.title} - Due in ${Math.ceil(
            diffInDays
          )} days`,
          urgency: "info",
          projectName: project.title,
          assignedTo: project.landownerName || "Unassigned",
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
  }, [filteredProjects]);

  // Generate recent activity from projects data
  const activitiesData = React.useMemo(() => {
    const activities = [];

    // Sort projects by most recent update/creation
    const sortedProjects = [...projects].sort((a, b) => {
      const dateA = new Date(a.lastUpdated || a.submittedDate || a.updated_at || a.created_at || 0);
      const dateB = new Date(b.lastUpdated || b.submittedDate || b.updated_at || b.created_at || 0);
      return dateB - dateA;
    });

    // Generate activities from projects (limit to 20 most recent)
    sortedProjects.slice(0, 20).forEach((project) => {
      // Use lastUpdated if available, otherwise submittedDate, otherwise fallback to created_at
      const timestamp = project.lastUpdated || project.submittedDate || project.updated_at || project.created_at;
      if (!timestamp) return;

      const energyType = project?.energy_key || project?.energyType || "Project";

      // Create activity based on status - avoid duplicates by creating one activity per project based on current status
      const statusActivityMap = {
        submitted: {
          type: "project_submitted",
          user: project.landownerName || "Landowner",
          action: "submitted",
          target: project.title,
          details: `${energyType} project for review`,
        },
        under_review: {
          type: "status_changed",
          user: "Admin",
          action: "marked as under review",
          target: project.title,
          details: `${energyType} project`,
        },
        approved: {
          type: "project_approved",
          user: "Admin",
          action: "approved",
          target: project.title,
          details: `${energyType} project`,
        },
        published: {
          type: "status_changed",
          user: "Admin",
          action: "published",
          target: project.title,
          details: `${energyType} project to marketplace`,
        },
        rejected: {
          type: "status_changed",
          user: "Admin",
          action: "rejected",
          target: project.title,
          details: `${energyType} project`,
        },
      };

      const activityConfig = statusActivityMap[project.status];
      if (activityConfig) {
        activities.push({
          id: `activity-${project.id}-${project.status}`,
          type: activityConfig.type,
          user: activityConfig.user,
          action: activityConfig.action,
          target: activityConfig.target,
          details: activityConfig.details,
          timestamp: timestamp,
        });
      }
    });

    // Sort by timestamp and limit to 15 most recent
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 15);
  }, [projects]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      projectType: "",
      status: "",
      startDateFrom: "",
      endDateTo: "",
      search: "",
    });
  };

  const handleBulkAction = async (action, projectIds) => {
    // TODO: Implement bulk action API calls
    console.log(`Executing ${action} on projects:`, projectIds);
    setSelectedProjects([]);
  };

  const handleQuickAction = (actionId) => {
    // TODO: Implement quick action API calls
    console.log("Quick action:", actionId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="pt-20">
       
        <main
          className={`pb-20 transition-all duration-300 ${
            sidebarCollapsed ? "ml-16" : "ml-60"
          }`}
        >
        <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Admin Dashboard
                </h1>
                <p className="font-body text-muted-foreground">
                  Manage document reviews and task assignments for renewable
                  energy projects
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
                  onClick={() => handleQuickAction("generate-report")}
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
              <Icon
                name="Loader2"
                size={32}
                className="animate-spin text-primary"
              />
              <span className="ml-3 text-lg text-muted-foreground">
                Loading admin data...
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Icon
                  name="AlertTriangle"
                  size={20}
                  className="text-error mr-2"
                />
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
                  onClick={
                    metric?.title === "Investor Interest"
                      ? () => navigate("/admin-investor-interests")
                      : undefined
                  }
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
          {selectedProjects?.length > 0 && (
            <div className="mb-6">
              <BulkActions
                selectedTasks={selectedProjects}
                onBulkAction={handleBulkAction}
                onClearSelection={() => setSelectedProjects([])}
              />
            </div>
          )}

          {/* Main Content Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Project Table - Takes up 3 columns on xl screens */}
              <div className="xl:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading font-semibold text-xl text-foreground">
                    Active Projects ({filteredProjects?.length})
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="font-body text-sm text-muted-foreground">
                      {selectedProjects?.length} selected
                    </span>
                  </div>
                </div>

                {filteredProjects.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-12 text-center">
                    <Icon
                      name="Inbox"
                      size={48}
                      className="mx-auto text-muted-foreground mb-4"
                    />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Projects Found
                    </h3>
                    <p className="text-muted-foreground">
                      {filters.status
                        ? "No projects match the selected filters."
                        : "No projects have been submitted yet."}
                    </p>
                  </div>
                ) : (
                  <ProjectTable
                    projects={filteredProjects}
                    onProjectSelect={(project) => {
                      // Navigate to reviewer assignment page
                      navigate(`/admin/projects/${project.id}/reviewers`);
                    }}
                    onPublishProject={(project) => {
                      // Refresh the projects list after publishing
                      fetchProjects();
                    }}
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
      </div>
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

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => {
            const successNotification = {
              id: Date.now(),
              type: "success",
              title: "User Created",
              message: "Reviewer account created successfully",
              timestamp: new Date(),
            };
            setNotifications((prev) => [
              successNotification,
              ...prev.slice(0, 4),
            ]);
          }}
        />
      )}
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default AdminDashboard;