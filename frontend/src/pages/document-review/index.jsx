import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Header from "../../components/ui/Header";
import WorkflowBreadcrumbs from "../../components/ui/WorkflowBreadcrumbs";
import NotificationIndicator from "../../components/ui/NotificationIndicator";
import QuickActions from "../../components/ui/QuickActions";
import DocumentViewer from "./components/DocumentViewer";
import ReviewPanel from "./components/ReviewPanel";
import TaskDetails from "./components/TaskDetails";
import CollaborationTools from "./components/CollaborationTools";
import RoleStatusTracking from "./components/RoleStatusTracking";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import {
  taskAPI,
  documentsAPI,
  landsAPI,
  reviewsAPI,
} from "../../services/api";

const DocumentReview = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const createDefaultSubtasks = async (taskId, assignedRole, taskType) => {
    try {
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
      console.log(
        `✅ Created ${defaultSubtasks.length} default subtasks for ${taskId} (${taskType})`
      );
    } catch (err) {
      console.error("Error creating default subtasks:", err);
    }
  };

  /** 🧩 Update Role Status */
  const updateRoleStatus = useCallback(
    async (roleId, statusData) => {
      const landId = currentLand?.land_id;

      if (!landId) {
        console.warn(
          "[DocumentReview] Cannot update role status: No land ID available"
        );
        return;
      }

      // Update local state first for immediate UI feedback
      setRoleStatuses((prev) => ({
        ...prev,
        [roleId]: {
          ...prev[roleId],
          ...statusData,
          updatedAt: new Date().toISOString(),
        },
      }));

      // Persist to database
      try {
        await reviewsAPI.saveReviewStatus(landId, roleId, {
          ...statusData,
          updatedAt: new Date().toISOString(),
        });
        console.log(
          "[DocumentReview] Review status saved to database:",
          roleId
        );
      } catch (error) {
        console.error("[DocumentReview] Failed to save review status:", error);
        // Still keep the local state update even if API fails
      }
    },
    [currentLand]
  );

  /** 🧩 Handle Approve from ReviewPanel */
  const handleApproveReview = async (reviewData) => {
    console.log("[DocumentReview] Approve clicked with data:", reviewData);

    // Update role status to approved
    await updateRoleStatus(reviewerRole, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      reviewData: reviewData,
      subtasksCompleted: subtasks.filter((s) => s.status === "completed")
        .length,
      totalSubtasks: subtasks.length,
      documentsApproved: reviewData.documentsApproved || 0,
      totalDocuments: reviewData.totalDocuments || 0,
      reviewerName: user?.first_name + " " + user?.last_name,
      rating: reviewData.overallRating,
      comments: reviewData.comments,
      justification: reviewData.justification,
    });

    // Show success notification
    setNotifications([
      {
        id: Date.now(),
        type: "success",
        title: "Review Approved",
        message: `${
          reviewerRoles.find((r) => r.id === reviewerRole)?.label
        } review has been approved successfully!`,
        timestamp: new Date(),
      },
    ]);
  };

  /** 🧩 Handle Publish */
  const handlePublish = async (roleId) => {
    setIsPublishing(true);
    try {
      console.log("[DocumentReview] Publishing review for role:", roleId);

      // Update role status to published
      await updateRoleStatus(roleId, {
        published: true,
        publishedAt: new Date().toISOString(),
      });

      // Check if this is the first published review
      const allRoles = ["re_sales_advisor", "re_analyst", "re_governance_lead"];
      const updatedStatuses = { ...roleStatuses };
      updatedStatuses[roleId] = { ...updatedStatuses[roleId], published: true };

      const publishedCount = allRoles.filter(
        (role) => updatedStatuses[role]?.published === true
      ).length;

      const allPublished = publishedCount === allRoles.length;

      // Show appropriate notification based on publish status
      // Backend automatically publishes to marketplace after first reviewer publishes
      if (publishedCount === 1) {
        // First reviewer - land is now published to marketplace
        setNotifications([
          {
            id: Date.now(),
            type: "success",
            title: "Project Published to Marketplace!",
            message: `${
              reviewerRoles.find((r) => r.id === roleId)?.label
            } review published! The project "${
              currentLand.title || "Project"
            }" is now visible to investors in the marketplace.`,
            timestamp: new Date(),
          },
        ]);
      } else if (allPublished) {
        // All reviewers have published
        setNotifications([
          {
            id: Date.now(),
            type: "success",
            title: "All Reviews Complete!",
            message: `${
              reviewerRoles.find((r) => r.id === roleId)?.label
            } review published! All three reviewer roles have now completed their reviews.`,
            timestamp: new Date(),
          },
        ]);
      } else {
        // Additional reviewer (not first, not last)
        setNotifications([
          {
            id: Date.now(),
            type: "success",
            title: "Review Published",
            message: `${
              reviewerRoles.find((r) => r.id === roleId)?.label
            } review has been published successfully! (${publishedCount} of ${
              allRoles.length
            } reviewers completed)`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("[DocumentReview] Error publishing:", error);
      setNotifications([
        {
          id: Date.now(),
          type: "error",
          title: "Publish Failed",
          message: "Failed to publish review. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsPublishing(false);
    }
  };

  /** 🧩 Main Fetch */
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const taskId =
        location.state?.taskId ||
        new URLSearchParams(location.search).get("taskId");
      const landId =
        location.state?.landId ||
        new URLSearchParams(location.search).get("landId");
      const reviewerRole =
        location.state?.reviewerRole ||
        new URLSearchParams(location.search).get("reviewerRole");

      console.log("[DocumentReview] Fetching Data:", {
        taskId,
        landId,
        reviewerRole,
      });

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

        // Check if user is admin and specific role is requested
        const isAdmin = user?.roles?.includes("administrator");
        if (isAdmin && reviewerRole) {
          // For admin users, find task with specific role
          task = tasks.find(
            (t) =>
              (t.assigned_role || t.role || t.reviewer_role) === reviewerRole
          );
        } else {
          // For non-admin users, find task assigned to them
          task = tasks.find((t) => t.assigned_to === user?.user_id) || tasks[0];
        }
      }
      // CASE 3: No params → user's first assigned task
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
      // Set the reviewer role - use the passed role if admin, otherwise use task's assigned role
      const isAdmin = user?.roles?.includes("administrator");
      if (isAdmin && reviewerRole) {
        setReviewerRole(reviewerRole);
      } else {
        setReviewerRole(task.assigned_role || "re_sales_advisor");
      }

      // Land + Documents
      if (task.land_id) {
        land = await landsAPI.getLandById(task.land_id);
        setCurrentLand(land);
        docs = await documentsAPI.getDocuments(task.land_id);
        setDocuments(docs);
        if (docs.length > 0) setSelectedDocument(docs[0]);
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
        console.log(
          "[DocumentReview] Fetching review statuses for land:",
          currentLand.land_id
        );
        const statuses = await reviewsAPI.getAllReviewStatuses(
          currentLand.land_id
        );

        if (statuses && Object.keys(statuses).length > 0) {
          setRoleStatuses(statuses);
          console.log(
            "[DocumentReview] Review statuses loaded from database:",
            statuses
          );
        }
      } catch (error) {
        console.error(
          "[DocumentReview] Failed to fetch review statuses:",
          error
        );
        // Don't show error to user - just use default empty state
      }
    };

    fetchReviewStatuses();
  }, [currentLand?.land_id]);

  /** 🧩 Role Switching */
  const handleRoleChange = async (newRole) => {
    if (isRoleChanging || reviewerRole === newRole) return;

    setIsRoleChanging(true);
    setIsLoading(true);

    // Clear subtasks immediately to prevent stale data display
    setSubtasks([]);

    console.log("🔄 Role change initiated:", newRole);

    try {
      // Fetch all tasks for the current land
      const landId = currentTask?.land_id || currentLand?.land_id;
      if (!landId) throw new Error("No land selected");

      console.log("📋 Fetching tasks for land:", landId);
      const tasksForLand = await taskAPI.getTasks({ land_id: landId });
      console.log("📋 Available tasks for land:", tasksForLand);

      // Check if user is admin
      const isAdmin = user?.roles?.includes("administrator");

      let roleTask = null;

      if (isAdmin) {
        // For admin users, find any task with the specified role (not necessarily assigned to them)
        roleTask = tasksForLand.find((t) => {
          const task_role = t.assigned_role || t.role || t.reviewer_role;
          console.log("🔍 Admin checking task:", {
            task_id: t.task_id,
            task_role,
            newRole,
            role_match: task_role === newRole,
          });
          return task_role === newRole;
        });
        console.log("✅ Admin found task for role:", roleTask);
      } else {
        // For non-admin users, filter for tasks with this role AND assigned to current user
        const user_id_str = String(user?.user_id);
        roleTask = tasksForLand.find((t) => {
          const task_role = t.assigned_role || t.role || t.reviewer_role;
          const task_assigned_to = String(t.assigned_to || t.assigned_user);
          console.log("🔍 Checking task:", {
            task_id: t.task_id,
            task_role,
            newRole,
            task_assigned_to,
            user_id_str,
            role_match: task_role === newRole,
            user_match: task_assigned_to === user_id_str,
          });
          return task_role === newRole && task_assigned_to === user_id_str;
        });
        console.log("✅ Task found for role:", roleTask);
      }

      if (!roleTask) {
        if (isAdmin) {
          // For admin, show a different message
          setNotifications((prev) => [
            ...prev,
            {
              id: `role-missing-${Date.now()}`,
              type: "warning",
              title: "No Task Found",
              message: `No task found for ${newRole} role in this project`,
            },
          ]);
        } else {
          setNotifications((prev) => [
            ...prev,
            {
              id: `role-missing-${Date.now()}`,
              type: "error",
              title: "No Task",
              message: `No task assigned for ${newRole} to you`,
            },
          ]);
        }

        // Update role first, then clear task and subtasks
        setReviewerRole(newRole);
        setCurrentTask(null);
        return;
      }

      // Update role immediately
      setReviewerRole(newRole);

      // Fetch subtasks
      console.log("📥 Fetching subtasks for task:", roleTask.task_id);
      let subtasksForRole = await taskAPI.getSubtasks(roleTask.task_id);
      console.log("📦 Fetched subtasks:", subtasksForRole);

      if (!subtasksForRole || subtasksForRole.length === 0) {
        await createDefaultSubtasks(roleTask.task_id, roleTask.assigned_role);
        subtasksForRole = await taskAPI.getSubtasks(roleTask.task_id);
      }

      // Ensure subtasks is always an array
      const finalSubtasks = Array.isArray(subtasksForRole)
        ? subtasksForRole
        : [];

      // Update task first, then subtasks with a small delay to ensure proper rendering
      setCurrentTask({ ...roleTask });

      // Small delay to ensure state updates properly
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Update subtasks
      setSubtasks(finalSubtasks);

      console.log(
        "💾 State updated - Role:",
        newRole,
        "Task:",
        roleTask.task_id,
        "Subtasks:",
        finalSubtasks?.length
      );
      console.log("📊 Final subtasks array:", finalSubtasks);

      setNotifications((prev) => [
        ...prev,
        {
          id: `role-switched-${Date.now()}`,
          type: "success",
          title: "Role switched",
          message: `Now viewing ${newRole}`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setNotifications((prev) => [
        ...prev,
        {
          id: `role-error-${Date.now()}`,
          type: "error",
          title: "Error",
          message: err.message,
        },
      ]);
    } finally {
      setIsLoading(false);
      setIsRoleChanging(false);
      console.log("✅ Role change complete for:", newRole);
    }
  };

  /** 🧩 Annotation & Subtask handlers */
  const handleAddAnnotation = (a) => setAnnotations((prev) => [...prev, a]);
  const handleDeleteAnnotation = (id) =>
    setAnnotations((p) => p.filter((a) => a.id !== id));

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
    const newStatus =
      action === "approve"
        ? "completed"
        : action === "reject"
        ? "rejected"
        : null;

    try {
      if (newStatus)
        await taskAPI.updateTask(currentTask.task_id, { status: newStatus });
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
  const handleEditDocument = (docId) => console.log("Edit document:", docId);

  /** 🧩 UI Render */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon
            name="Loader2"
            size={48}
            className="animate-spin text-primary mx-auto"
          />
          <p className="text-lg font-medium mt-3 text-foreground">
            Loading document review...
          </p>
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
            <h1 className="text-2xl lg:text-2xl font-bold text-foreground mb-2 mt-5">
              Document Review
            </h1>
            <p className="text-muted-foreground">
              Review and evaluate project documentation
            </p>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-2">
            <DocumentViewer
              documents={documents}
              selectedDocument={selectedDocument}
              onDocumentSelect={setSelectedDocument}
              annotations={annotations}
              onAddAnnotation={handleAddAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              landId={currentLand?.land_id}
            />

            {/* Role Status Tracking - Moved under Document Viewer */}
            <div className="mt-6">
              <RoleStatusTracking
                roleStatuses={roleStatuses}
                onPublish={handlePublish}
                isPublishing={isPublishing}
              />
            </div>
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
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 bg-card border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Icon name="Clock" size={16} className="text-muted-foreground" />
            <span className="text-sm">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/dashboard")}
            >
              <Icon name="ArrowLeft" size={16} /> Back
            </Button>
            <Button size="sm" onClick={() => handleReviewAction("save")}>
              <Icon name="Save" size={16} /> Save Progress
            </Button>
          </div>
        </div>
      </div>

      {/* Floating UI */}
      <NotificationIndicator
        notifications={notifications}
        position="top-right"
        autoHide
        hideDelay={5000}
      />
      <QuickActions
        userRole="admin"
        currentContext="document-review"
        onActionComplete={handleQuickAction}
      />
    </div>
  );
};

export default DocumentReview;
