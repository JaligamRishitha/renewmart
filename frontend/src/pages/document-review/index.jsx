import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Header from "../../components/ui/Header";
import WorkflowBreadcrumbs from "../../components/ui/WorkflowBreadcrumbs";
import NotificationIndicator from "../../components/ui/NotificationIndicator";
import QuickActions from "../../components/ui/QuickActions";
import ReviewPanel from "./components/ReviewPanel";
import TaskDetails from "./components/TaskDetails";
import CollaborationTools from "./components/CollaborationTools";
import RoleStatusTracking from "./components/RoleStatusTracking";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { taskAPI, documentsAPI, landsAPI, reviewsAPI } from "../../services/api";

const DocumentReview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const { user } = useAuth();

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reviewerRole, setReviewerRole] = useState("re_sales_advisor");
  const [annotations, setAnnotations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTask, setCurrentTask] = useState(null);
  const [currentLand, setCurrentLand] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [error, setError] = useState(null);
  const [allTasksForLand, setAllTasksForLand] = useState([]);
  const [isRoleChanging, setIsRoleChanging] = useState(false);
  const [roleStatuses, setRoleStatuses] = useState({});
  const [isPublishing, setIsPublishing] = useState(false);

  const reviewerRoles = [
    { id: "re_sales_advisor", label: "RE Sales Advisor", icon: "TrendingUp" },
    { id: "re_analyst", label: "RE Analyst", icon: "Calculator" },
    { id: "re_governance_lead", label: "RE Governance Lead", icon: "Shield" },
  ];


  /** 🧩 Create Default Subtasks */
  const createDefaultSubtasks = async (taskId, assignedRole, taskType = null) => {
    try {
      // If no task type provided, get the first available one for the role
      if (!taskType) {
        const taskTypesResponse = await taskAPI.getTaskTypes(assignedRole);
        if (taskTypesResponse?.task_types && taskTypesResponse.task_types.length > 0) {
          taskType = taskTypesResponse.task_types[0];
          console.log(`🎯 Using first available task type for ${assignedRole}:`, taskType);
        } else {
          console.error(`❌ No task types available for role: ${assignedRole}`);
          return;
        }
      }
      
      const templates = await taskAPI.getSubtaskTemplates(assignedRole, taskType);
      const defaultSubtasks = templates?.templates || [];

      for (const subtask of defaultSubtasks) {
        await taskAPI.createSubtask(taskId, {
          title: subtask.title,
          description: `${subtask.section} - ${subtask.title}`,
          status: "pending",
          order_index: subtask.order,
        });
      }
      console.log(`✅ Created ${defaultSubtasks.length} default subtasks for ${taskId} (task type: ${taskType})`);
    } catch (err) {
      console.error("Error creating default subtasks:", err);
    }
  };

  /** 🧩 Update Role Status */
  const updateRoleStatus = useCallback(async (roleId, statusData) => {
    const landId = currentLand?.land_id;
    
    if (!landId) {
      console.warn('[DocumentReview] Cannot update role status: No land ID available');
      return;
    }

    // Update local state first for immediate UI feedback
    setRoleStatuses(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        ...statusData,
        updatedAt: new Date().toISOString()
      }
    }));

    // Persist to database
    try {
      await reviewsAPI.saveReviewStatus(landId, roleId, {
        ...statusData,
        updatedAt: new Date().toISOString()
      });
      console.log('[DocumentReview] Review status saved to database:', roleId);
    } catch (error) {
      console.error('[DocumentReview] Failed to save review status:', error);
      // Still keep the local state update even if API fails
    }
  }, [currentLand]);

  /** 🧩 Handle Approve from ReviewPanel */
  const handleApproveReview = async (reviewData) => {
    console.log('[DocumentReview] Approve clicked with data:', reviewData);
    
    // Update role status to approved
    await updateRoleStatus(reviewerRole, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      reviewData: reviewData,
      subtasksCompleted: subtasks.filter(s => s.status === 'completed').length,
      totalSubtasks: subtasks.length,
      documentsApproved: reviewData.documentsApproved || 0,
      totalDocuments: reviewData.totalDocuments || 0,
      reviewerName: user?.first_name + ' ' + user?.last_name,
      rating: reviewData.overallRating,
      comments: reviewData.comments,
      justification: reviewData.justification
    });

    // Show success notification
    setNotifications([{
      id: Date.now(),
      type: 'success',
      title: 'Review Approved',
      message: `${reviewerRoles.find(r => r.id === reviewerRole)?.label} review has been approved successfully!`,
      timestamp: new Date()
    }]);
  };

  /** 🧩 Handle Publish */
  const handlePublish = async (roleId) => {
    setIsPublishing(true);
    try {
      console.log('[DocumentReview] Publishing review for role:', roleId);
      
      // Update role status to published
      await updateRoleStatus(roleId, {
        published: true,
        publishedAt: new Date().toISOString()
      });

      // Check if this is the first published review
      const allRoles = ['re_sales_advisor', 're_analyst', 're_governance_lead'];
      const updatedStatuses = { ...roleStatuses };
      updatedStatuses[roleId] = { ...updatedStatuses[roleId], published: true };
      
      const publishedCount = allRoles.filter(role => 
        updatedStatuses[role]?.published === true
      ).length;

      const allPublished = publishedCount === allRoles.length;

      // Show appropriate notification based on publish status
      // Backend automatically publishes to marketplace after first reviewer publishes
      if (publishedCount === 1) {
        // First reviewer - land is now published to marketplace
        setNotifications([{
          id: Date.now(),
          type: 'success',
          title: 'Project Published to Marketplace!',
          message: `${reviewerRoles.find(r => r.id === roleId)?.label} review published! The project "${currentLand.title || 'Project'}" is now visible to investors in the marketplace.`,
          timestamp: new Date()
        }]);
      } else if (allPublished) {
        // All reviewers have published
        setNotifications([{
          id: Date.now(),
          type: 'success',
          title: 'All Reviews Complete!',
          message: `${reviewerRoles.find(r => r.id === roleId)?.label} review published! All three reviewer roles have now completed their reviews.`,
          timestamp: new Date()
        }]);
      } else {
        // Additional reviewer (not first, not last)
        setNotifications([{
          id: Date.now(),
          type: 'success',
          title: 'Review Published',
          message: `${reviewerRoles.find(r => r.id === roleId)?.label} review has been published successfully! (${publishedCount} of ${allRoles.length} reviewers completed)`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('[DocumentReview] Error publishing:', error);
      setNotifications([{
        id: Date.now(),
        type: 'error',
        title: 'Publish Failed',
        message: 'Failed to publish review. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsPublishing(false);
    }
  };

  /** 🧩 Main Fetch */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const taskId = location.state?.taskId || new URLSearchParams(location.search).get("taskId");
      const landId = projectId || location.state?.landId || new URLSearchParams(location.search).get("landId");

      console.log("[DocumentReview] Fetching Data:", { taskId, landId, projectId });

      let task = null;
      let land = null;
      let docs = [];

      // CASE 1: TaskId given
      if (taskId) {
        task = await taskAPI.getTaskById(taskId);
      }
      // CASE 2: LandId given
      else if (landId) {
        const tasks = await taskAPI.getTasks({ land_id: landId });
        setAllTasksForLand(tasks);
        task = tasks.find((t) => t.assigned_to === user?.user_id) || tasks[0];
      }
      // CASE 3: No params → user’s first assigned task
      else {
        const myTasks = await taskAPI.getTasksAssignedToMe();
        if (myTasks.length === 0) {
          setError("No tasks assigned to you");
          setIsLoading(false);
          return;
        }
        task = myTasks[0];
      }

      if (!task) {
        setError("No valid task found");
        setIsLoading(false);
        return;
      }

      setCurrentTask(task);
      setReviewerRole(task.assigned_role || "re_sales_advisor");

      // Land + Documents
      if (task.land_id) {
        land = await landsAPI.getLandById(task.land_id);
        setCurrentLand(land);
        docs = await documentsAPI.getDocuments(task.land_id);
        setDocuments(docs);
        if (docs.length > 0) setSelectedDocument(docs[0]);
      }

      // Store auto-switch info for later processing
      const autoSwitchRole = location.state?.autoSwitchRole;
      const targetRole = location.state?.reviewerRole;
      
      console.log('📋 Document Review - Navigation state:', {
        autoSwitchRole,
        targetRole,
        taskType: location.state?.taskType,
        taskAssignedRole: task.assigned_role,
        currentReviewerRole: reviewerRole,
        locationState: location.state,
        projectId,
        landId: task.land_id
      });
      
      if (autoSwitchRole && targetRole) {
        console.log('🔄 Auto-switch requested for role:', targetRole, 'from task role:', task.assigned_role);
        // Store the target role for processing after component is fully loaded
        window.autoSwitchTargetRole = targetRole;
        window.autoSwitchProjectId = projectId;
      }

      // Subtasks
      let taskSubtasks = await taskAPI.getSubtasks(task.task_id);
      if (!taskSubtasks || taskSubtasks.length === 0) {
        await createDefaultSubtasks(task.task_id, task.assigned_role, task.task_type);
        taskSubtasks = await taskAPI.getSubtasks(task.task_id);
      }
      setSubtasks(taskSubtasks);

      setNotifications([
        {
          id: "notif-1",
          type: "success",
          title: "Data Loaded",
          message: "Document review data loaded successfully",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [location.state, location.search, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** 🧩 Fetch Review Statuses from Database */
  useEffect(() => {
    const fetchReviewStatuses = async () => {
      if (!currentLand?.land_id) return;

      try {
        console.log('[DocumentReview] Fetching review statuses for land:', currentLand.land_id);
        const statuses = await reviewsAPI.getAllReviewStatuses(currentLand.land_id);
        
        if (statuses && Object.keys(statuses).length > 0) {
          setRoleStatuses(statuses);
          console.log('[DocumentReview] Review statuses loaded from database:', statuses);
        }
      } catch (error) {
        console.error('[DocumentReview] Failed to fetch review statuses:', error);
        // Don't show error to user - just use default empty state
      }
    };

    fetchReviewStatuses();
  }, [currentLand?.land_id]);

  /** 🧩 Auto-switch to target role after component is fully loaded */
  useEffect(() => {
    const autoSwitchTargetRole = window.autoSwitchTargetRole;
    const autoSwitchProjectId = window.autoSwitchProjectId;
    
    console.log('🔄 Auto-switch check:', {
      autoSwitchTargetRole,
      autoSwitchProjectId,
      currentReviewerRole: reviewerRole,
      currentProjectId: projectId,
      shouldSwitch: autoSwitchTargetRole && reviewerRole && autoSwitchTargetRole !== reviewerRole
    });
    
    if (autoSwitchTargetRole && reviewerRole && autoSwitchTargetRole !== reviewerRole) {
      console.log('🔄 Auto-switching to role:', autoSwitchTargetRole);
      // Clear the stored target role
      delete window.autoSwitchTargetRole;
      delete window.autoSwitchProjectId;
      // Store the target role for the handleRoleChange function to pick up
      window.pendingRoleSwitch = autoSwitchTargetRole;
    }
  }, [reviewerRole, projectId]);

  /** 🧩 Role Switching */
  const handleRoleChange = async (newRole) => {
    if (isRoleChanging || reviewerRole === newRole) return;
  
    setIsRoleChanging(true);
    setIsLoading(true);
    
    // Clear subtasks immediately to prevent stale data display
    setSubtasks([]);
    
    console.log('🔄 Role change initiated:', newRole);
    console.log('🔄 Current state:', {
      currentTask: currentTask?.task_id,
      currentLand: currentLand?.land_id,
      projectId,
      locationState: location.state
    });
  
    try {
      // Get land ID from multiple sources
      const landId = currentTask?.land_id || currentLand?.land_id || projectId || location.state?.landId;
      if (!landId) {
        console.error('❌ No land ID available for role change:', {
          currentTask: currentTask?.land_id,
          currentLand: currentLand?.land_id,
          projectId,
          locationStateLandId: location.state?.landId
        });
        throw new Error("No land selected");
      }
  
      console.log('📋 Fetching tasks for land:', landId);
      const tasksForLand = await taskAPI.getTasks({ land_id: landId });
      console.log('📋 Available tasks for land:', tasksForLand);
  
      // Filter for tasks with this role AND assigned to current user
      const roleTask = tasksForLand.find(
        t => t.assigned_role === newRole && t.assigned_to === user?.user_id
      );
      
      console.log('✅ Task found for role:', roleTask);
  
      if (!roleTask) {
        setNotifications(prev => [
          ...prev,
          {
            id: `role-missing-${Date.now()}`,
            type: 'error',
            title: 'No Task',
            message: `No task assigned for ${newRole} to you`,
          },
        ]);
        
        // Update role first, then clear task and subtasks
        setReviewerRole(newRole);
        setCurrentTask(null);
        return;
      }
  
      // Update role immediately
      setReviewerRole(newRole);
      
      // Fetch subtasks
      console.log('📥 Fetching subtasks for task:', roleTask.task_id);
      let subtasksForRole = await taskAPI.getSubtasks(roleTask.task_id);
      console.log('📦 Fetched subtasks:', subtasksForRole);
      
      if (!subtasksForRole || subtasksForRole.length === 0) {
        await createDefaultSubtasks(roleTask.task_id, roleTask.assigned_role, roleTask.task_type);
        subtasksForRole = await taskAPI.getSubtasks(roleTask.task_id);
      }
      
      // Ensure subtasks is always an array
      const finalSubtasks = Array.isArray(subtasksForRole) ? subtasksForRole : [];
      
      // Update task first, then subtasks with a small delay to ensure proper rendering
      setCurrentTask({...roleTask});
      
      // Small delay to ensure state updates properly
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Update subtasks
      setSubtasks(finalSubtasks);
      
      console.log('💾 State updated - Role:', newRole, 'Task:', roleTask.task_id, 'Subtasks:', finalSubtasks?.length);
      console.log('📊 Final subtasks array:', finalSubtasks);
  
      setNotifications(prev => [
        ...prev,
        {
          id: `role-switched-${Date.now()}`,
          type: 'success',
          title: 'Role switched',
          message: `Now viewing ${newRole}`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setNotifications(prev => [
        ...prev,
        {
          id: `role-error-${Date.now()}`,
          type: 'error',
          title: 'Error',
          message: err.message,
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsRoleChanging(false);
      console.log('✅ Role change complete for:', newRole);
    }
  };

  /** 🧩 Check for pending role switch after handleRoleChange is defined */
  useEffect(() => {
    const pendingRoleSwitch = window.pendingRoleSwitch;
    if (pendingRoleSwitch && currentTask && currentLand) {
      console.log('🔄 Executing pending role switch to:', pendingRoleSwitch);
      console.log('🔄 Current reviewer role:', reviewerRole);
      console.log('🔄 Current project ID:', projectId);
      console.log('🔄 Current task:', currentTask?.task_id);
      console.log('🔄 Current land:', currentLand?.land_id);
      delete window.pendingRoleSwitch;
      
      // Add a small delay to ensure everything is ready
      setTimeout(() => {
        handleRoleChange(pendingRoleSwitch);
      }, 200);
    }
  }, [reviewerRole, projectId, currentTask, currentLand]); // Added currentTask and currentLand dependencies

  /** 🧩 Annotation & Subtask handlers */
  const handleAddAnnotation = (a) => setAnnotations((prev) => [...prev, a]);
  const handleDeleteAnnotation = (id) => setAnnotations((p) => p.filter((a) => a.id !== id));

  const handleSubtaskUpdate = async (subtaskId, updates) => {
    if (!currentTask) return;
    await taskAPI.updateSubtask(currentTask.task_id, subtaskId, updates);
    const updated = await taskAPI.getSubtasks(currentTask.task_id);
    setSubtasks(updated);
  };

  const handleAddSubtask = async (data) => {
    if (!currentTask) return;
    await taskAPI.createSubtask(currentTask.task_id, data);
    const updated = await taskAPI.getSubtasks(currentTask.task_id);
    setSubtasks(updated);
  };

  /** 🧩 Review Actions */
  const handleReviewAction = async (action) => {
    if (!currentTask) return;
    const newStatus = action === "approve" ? "completed" : action === "reject" ? "rejected" : null;

    try {
      if (newStatus) await taskAPI.updateTask(currentTask.task_id, { status: newStatus });
      setNotifications((p) => [
        ...p,
        {
          id: `action-${Date.now()}`,
          type: newStatus ? "success" : "info",
          title: "Review Updated",
          message: `Task ${action} successfully`,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (newStatus) setTimeout(() => navigate("/admin/dashboard"), 2000);
    } catch (err) {
      console.error("Review action failed:", err);
    }
  };

  const handleQuickAction = (id) => {
    if (id === "approve") handleReviewAction("approve");
    else if (id === "reject") handleReviewAction("reject");
    else if (id === "request-changes") handleReviewAction("clarification");
  };

  const handleViewDocument = (doc) => setSelectedDocument(doc);
  const handleEditDocument = (docId) =>
    console.log("Edit document:", docId);

  /** 🧩 UI Render */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto" />
          <p className="text-lg font-medium mt-3 text-foreground">Loading document review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" />
      <WorkflowBreadcrumbs />
      <div className="pt-16 mt-10 max-w-10xl mx-auto p-4 lg:p-6">
        {/* HEADER */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-2xl font-bold text-foreground mb-2 mt-5">Document Review</h1>
            <p className="text-muted-foreground">Review and evaluate project documentation</p>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2">
            {/* Document Version Control Button */}
            <div className="bg-card border border-border rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Document Version Control</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage document versions, assignments, and audit trail
                  </p>
                </div>
                <Button
                  onClick={() => {
                    const baseRoute = user?.role === 'admin' ? '/admin' : 
                                    user?.role === 'reviewer' ? '/reviewer' : 
                                    user?.role === 'landowner' ? '/landowner' : '/admin';
                    navigate(`${baseRoute}/document-versions/${currentLand?.land_id || projectId}`);
                  }}
                  className="flex items-center space-x-2"
                >
                  <Icon name="FileText" size={16} />
                  <span>Open Version Control</span>
                </Button>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-semibold text-foreground">{documents.length}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-semibold text-foreground">
                    {documents.filter(doc => doc.status === 'under_review').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Under Review</p>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-semibold text-foreground">
                    {documents.filter(doc => doc.status === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </div>
            
            {/* Project Review Status by Role card removed as requested */}
          </div>

          <div className="xl:col-span-3">
            <ReviewPanel
              reviewerRole={reviewerRole}
              currentTask={currentTask}
              subtasks={subtasks}
              currentUser={user}
              reviewerRoles={reviewerRoles}
              onRoleChange={handleRoleChange}
              isRoleChanging={isRoleChanging}
              onSubtaskUpdate={handleSubtaskUpdate}
              onAddSubtask={handleAddSubtask}
              onViewDocument={handleViewDocument}
              onEditDocument={handleEditDocument}
              onApprove={handleApproveReview}
              initialRole={location.state?.reviewerRole}
              autoSwitchRole={location.state?.autoSwitchRole}
              initialTaskType={location.state?.taskType}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 bg-card border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Icon name="Clock" size={16} className="text-muted-foreground" />
            <span className="text-sm">Last updated: {new Date().toLocaleTimeString()}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <Icon name="ArrowLeft" size={16} /> Back
            </Button>
            <Button size="sm" onClick={() => handleReviewAction("save")}>
              <Icon name="Save" size={16} /> Save Progress
            </Button>
          </div>
        </div>
      </div>

      {/* Floating UI */}
      <NotificationIndicator notifications={notifications} position="top-right" autoHide hideDelay={5000} />
      <QuickActions userRole="admin" currentContext="document-review" onActionComplete={handleQuickAction} />
    </div>
  );
};

export default DocumentReview;
