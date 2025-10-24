import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { taskAPI, documentsAPI } from '../../../services/api';
import { Checkbox } from '../../../components/ui/Checkbox';
import ProjectMessaging from './ProjectMessaging';

/**
 * ReviewPanel Component
 * 
 * This component is FULLY CONTROLLED by the parent Document Review page.
 * All data rendering is based on the `reviewerRole` prop passed from parent.
 * 
 * Parent Props (from Document Review page):
 * - reviewerRole: Current active reviewer role (drives ALL rendering)
 * - currentTask: Task object for the current role
 * - subtasks: Subtasks array for the current role's task
 * 
 * The component will re-render whenever the parent changes these props.
 */
const ReviewPanel = ({ 
  reviewerRole = 're_sales_advisor',  // Driven by parent
  documentCategory = 'ownership',
  currentTask = null,                  // Driven by parent
  subtasks = [],                       // Driven by parent
  currentUser = null,                  // User info for permission checks
  reviewerRoles = [],                  // Role options for switching
  onRoleChange = () => {},            // Role change handler
  isRoleChanging = false,             // Role changing state
  onSubtaskUpdate = () => {},
  onAddSubtask = () => {},
  onApprove = () => {},
  onReject = () => {},
  onRequestClarification = () => {},
  onSaveProgress = () => {}
}) => {

  // 🔹 Role-specific state management - maintains state per role with localStorage persistence
  const [roleStates, setRoleStates] = useState(() => {
    // Load from localStorage on component mount with user-specific key
    try {
      const userKey = currentUser?.user_id || 'anonymous';
      const storageKey = `reviewPanel_roleStates_${userKey}`;
      const savedStates = localStorage.getItem(storageKey);
      console.log('🔄 Loading role states from localStorage:', {
        userKey,
        storageKey,
        savedStates: savedStates ? 'found' : 'not found',
        parsedStates: savedStates ? JSON.parse(savedStates) : null
      });
      return savedStates ? JSON.parse(savedStates) : {};
    } catch (error) {
      console.error('Error loading role states from localStorage:', error);
      return {};
    }
  });
  
  // Get current role's state or create default
  const getCurrentRoleState = () => {
    if (!roleStates[reviewerRole]) {
      return {
        checkedItems: {},
        comments: '',
        overallRating: 0,
        justification: '',
        showAddSubtask: false,
        newSubtaskTitle: '',
        activeSection: null
      };
    }
    return roleStates[reviewerRole];
  };

  // Save to localStorage whenever roleStates changes
  useEffect(() => {
    try {
      const userKey = currentUser?.user_id || 'anonymous';
      const storageKey = `reviewPanel_roleStates_${userKey}`;
      const stateToSave = JSON.stringify(roleStates);
      localStorage.setItem(storageKey, stateToSave);
      console.log('💾 Saving role states to localStorage:', {
        userKey,
        storageKey,
        roleStates,
        stateToSave
      });
    } catch (error) {
      console.error('Error saving role states to localStorage:', error);
    }
  }, [roleStates, currentUser]);

  // Function to clear saved state (for debugging or reset)
  const clearSavedState = () => {
    try {
      const userKey = currentUser?.user_id || 'anonymous';
      const storageKey = `reviewPanel_roleStates_${userKey}`;
      localStorage.removeItem(storageKey);
      setRoleStates({});
      console.log('ReviewPanel state cleared from localStorage');
    } catch (error) {
      console.error('Error clearing role states from localStorage:', error);
    }
  };

  // Expose clear function to window for debugging (remove in production)
  if (typeof window !== 'undefined') {
    window.clearReviewPanelState = clearSavedState;
  }

  const currentRoleState = getCurrentRoleState();
  
  // Local state derived from current role state
  const [checkedItems, setCheckedItems] = useState(currentRoleState.checkedItems);
  const [comments, setComments] = useState(currentRoleState.comments);
  const [overallRating, setOverallRating] = useState(currentRoleState.overallRating);
  const [justification, setJustification] = useState(currentRoleState.justification);
  const [showAddSubtask, setShowAddSubtask] = useState(currentRoleState.showAddSubtask);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState(currentRoleState.newSubtaskTitle);
  const [activeSection, setActiveSection] = useState(currentRoleState.activeSection);
  
  // 🔹 Template sections fetched based on parent's reviewerRole prop
  const [templateSections, setTemplateSections] = useState([]);
  
  // 🔹 Subtask documents state
  const [subtaskDocuments, setSubtaskDocuments] = useState({});
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [loadingDocs, setLoadingDocs] = useState({});
  const [subtasksWithReviewerDocs, setSubtasksWithReviewerDocs] = useState({});
  const [processingDoc, setProcessingDoc] = useState(null);

  // Define tabs for the ReviewPanel
  const tabs = [
    { id: "review", label: "Review", icon: "FileCheck" },
    { id: "task", label: "Task Details", icon: "Clock" },
    { id: "collaboration", label: "Collaboration", icon: "Users" },
  ];

  const [activeTab, setActiveTab] = useState("review");
  const [showMessaging, setShowMessaging] = useState(false);

  // 🔹 Reload state from localStorage when user becomes available
  useEffect(() => {
    if (currentUser?.user_id) {
      try {
        const userKey = currentUser.user_id;
        const storageKey = `reviewPanel_roleStates_${userKey}`;
        const savedStates = localStorage.getItem(storageKey);
        if (savedStates) {
          const parsedStates = JSON.parse(savedStates);
          console.log('🔄 Reloading role states for user:', {
            userKey,
            storageKey,
            parsedStates
          });
          setRoleStates(parsedStates);
        }
      } catch (error) {
        console.error('Error reloading role states from localStorage:', error);
      }
    }
  }, [currentUser?.user_id]);

  // 🔹 Sync local state with role-specific state when role changes
  useEffect(() => {
    console.log('🔄 Role changed, syncing state for:', reviewerRole);
    console.log('🔄 Current roleStates:', roleStates);
    
    // Get the state for the current role directly from roleStates
    const roleState = roleStates[reviewerRole] || {
      checkedItems: {},
      comments: '',
      overallRating: 0,
      justification: '',
      showAddSubtask: false,
      newSubtaskTitle: '',
      activeSection: null
    };
    
    console.log('🔄 Role state to apply:', roleState);
    
    // Force update all local state variables with a slight delay to ensure proper rendering
    setTimeout(() => {
      setCheckedItems(roleState.checkedItems || {});
      setComments(roleState.comments || '');
      setOverallRating(roleState.overallRating || 0);
      setJustification(roleState.justification || '');
      setShowAddSubtask(roleState.showAddSubtask || false);
      setNewSubtaskTitle(roleState.newSubtaskTitle || '');
      setActiveSection(roleState.activeSection || null);
      
      console.log('🔄 Applied state:', {
        comments: roleState.comments || '',
        overallRating: roleState.overallRating || 0,
        justification: roleState.justification || ''
      });
    }, 50); // Small delay to ensure state is applied after component is fully mounted
  }, [reviewerRole, roleStates, currentTask?.task_id, subtasks?.length]);

  // 🔹 Update role-specific state when local state changes
  useEffect(() => {
    console.log('🔄 State changed, updating role state for:', reviewerRole, {
      comments,
      overallRating,
      justification
    });
    
    setRoleStates(prev => ({
      ...prev,
      [reviewerRole]: {
        checkedItems,
        comments,
        overallRating,
        justification,
        showAddSubtask,
        newSubtaskTitle,
        activeSection
      }
    }));
  }, [checkedItems, comments, overallRating, justification, showAddSubtask, newSubtaskTitle, activeSection, reviewerRole]);

  // 🔹 Log component mount/remount
  useEffect(() => {
    console.log('🎬 ReviewPanel: Component mounted/remounted');
    console.log('   Props from parent:', {
      reviewerRole,
      taskId: currentTask?.task_id,
      taskTitle: currentTask?.title || currentTask?.task_type,
      subtasksCount: subtasks?.length,
      subtasksList: subtasks?.map(s => ({ id: s.subtask_id, title: s.title, status: s.status }))
    });
    
    return () => {
      console.log('🔚 ReviewPanel: Component unmounting for role:', reviewerRole);
    };
  }, []);

  // 🔹 Pre-fetch documents for all subtasks to show document icons
  useEffect(() => {
    if (subtasks && subtasks.length > 0) {
      subtasks.forEach(subtask => {
        if (subtask.subtask_id && !subtaskDocuments[subtask.subtask_id] && !loadingDocs[subtask.subtask_id]) {
          fetchSubtaskDocuments(subtask.subtask_id);
        }
      });
    }
  }, [subtasks]);

  // 🔹 Track when parent changes the reviewerRole prop
  useEffect(() => {
    console.log('👤 ReviewPanel: Parent changed reviewerRole prop to:', reviewerRole);
    console.log('   This will trigger template fetch and UI update');
  }, [reviewerRole]);

  // 🔹 Fetch all subtask documents when subtasks change
  useEffect(() => {
    const fetchAllDocuments = async () => {
      if (subtasks && subtasks.length > 0) {
        for (const subtask of subtasks) {
          if (subtask.subtask_id && !subtaskDocuments[subtask.subtask_id]) {
            await fetchSubtaskDocuments(subtask.subtask_id);
          }
        }
      }
    };
    fetchAllDocuments();
  }, [subtasks]);

  // 🔹 Log when props change from parent (but don't reset state)
  useEffect(() => {
    console.log('🔄 ReviewPanel: Props changed from parent');
    console.log('   → Role:', reviewerRole);
    console.log('   → Task:', currentTask?.task_id);
    console.log('   → Subtasks count:', subtasks?.length);
    console.log('   → State preserved per role');
  }, [reviewerRole, currentTask, subtasks]);

  // 🔹 Fetch template sections based on parent's reviewerRole prop
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        console.log('📥 ReviewPanel: Fetching templates based on parent role prop:', reviewerRole);
        const templates = await taskAPI.getSubtaskTemplates(reviewerRole);
        console.log('📦 ReviewPanel: Received templates for', reviewerRole, ':', templates);
        
        const sections = {};
        templates.templates.forEach(template => {
          if (!sections[template.section]) {
            sections[template.section] = { title: template.section, items: [] };
          }
          sections[template.section].items.push(template.title);
        });
        
        setTemplateSections(Object.values(sections));
        console.log('✅ ReviewPanel: Template sections updated for', reviewerRole, ':', Object.values(sections).length, 'sections');
      } catch (error) {
        console.error('❌ ReviewPanel: Error fetching subtask templates for', reviewerRole, ':', error);
        setTemplateSections([]);
      }
    };

    if (reviewerRole) {
      console.log('🔍 ReviewPanel: reviewerRole prop exists, fetching templates...');
      fetchTemplates();
    }
  }, [reviewerRole]); // Re-fetch whenever parent changes reviewerRole

  // 🔹 Role-specific display logic (memoized based on parent's reviewerRole prop)
  const currentCriteria = React.useMemo(() => {
    console.log('🎨 ReviewPanel: Computing criteria based on parent role:', reviewerRole);
    
    const criteria = {
      title: reviewerRole === 're_sales_advisor' ? 'Market Analysis Review' :
             reviewerRole === 're_analyst' ? 'Technical & Financial Assessment' :
             reviewerRole === 're_governance_lead' ? 'Regulatory Compliance Review' :
             'Technical & Financial Assessment',
      icon: reviewerRole === 're_sales_advisor' ? 'TrendingUp' :
            reviewerRole === 're_analyst' ? 'Calculator' :
            reviewerRole === 're_governance_lead' ? 'Shield' :
            'Calculator',
      sections: templateSections
    };
    
    console.log('   ✅ Criteria computed:', {
      role: reviewerRole,
      title: criteria.title,
      icon: criteria.icon,
      sectionsCount: criteria.sections?.length
    });
    
    return criteria;
  }, [reviewerRole, templateSections]); // Recompute when parent changes role or templates load

  // 🔹 Group subtasks from parent prop by section
  const groupedSubtasks = React.useMemo(() => {
    console.log('📊 ReviewPanel: Grouping subtasks from parent prop');
    console.log('   Input:', {
      subtasksCount: subtasks?.length,
      parentRole: reviewerRole,
      templateSections: templateSections?.length
    });

    if (!subtasks || subtasks.length === 0) {
      console.log('   → No subtasks from parent, returning template sections');
      return currentCriteria?.sections || [];
    }

    const groups = {};
    subtasks.forEach(subtask => {
      const descParts = subtask.description?.split(' - ') || [];
      const section = descParts[0] || 'General';
      if (!groups[section]) {
        groups[section] = { title: section, items: [] };
      }
      groups[section].items.push({ ...subtask, checked: subtask.status === 'completed' });
    });

    const result = Object.values(groups);
    console.log('   → Grouped parent subtasks into', result.length, 'sections for role:', reviewerRole);
    return result;
  }, [subtasks, currentCriteria, reviewerRole]); // Recompute when parent changes subtasks, criteria, or role

  // 🔹 Check if user is admin (view-only for subtask status)
  const isAdmin = currentUser?.roles?.includes('administrator') || false;
  const isTaskAssignedToMe = currentTask?.assigned_to === currentUser?.user_id;
  
  // Admin can only change status if they are also the assigned reviewer
  const canChangeSubtaskStatus = !isAdmin || isTaskAssignedToMe;
  
  // Debug log for admin status
  console.log('🔐 ReviewPanel: Admin Status:', {
    currentUser: currentUser?.email,
    roles: currentUser?.roles,
    isAdmin,
    canApproveDocuments: isAdmin
  });

  // 🔹 Document Handlers
  const fetchSubtaskDocuments = async (subtaskId) => {
    try {
      setLoadingDocs(prev => ({ ...prev, [subtaskId]: true }));
      const docs = await documentsAPI.getSubtaskDocuments(subtaskId);
      setSubtaskDocuments(prev => ({ ...prev, [subtaskId]: docs }));
      
      // Check if any documents are uploaded by reviewers
      const hasReviewerDocs = docs.some(doc => {
        return doc.uploaded_by && doc.status !== 'draft' && doc.subtask_id;
      });
      
      setSubtasksWithReviewerDocs(prev => ({ 
        ...prev, 
        [subtaskId]: hasReviewerDocs 
      }));
    } catch (error) {
      console.error('Failed to fetch subtask documents:', error);
    } finally {
      setLoadingDocs(prev => ({ ...prev, [subtaskId]: false }));
    }
  };

  // 🔹 Helper function to check if documents are uploaded by reviewers
  const hasReviewerDocuments = (subtaskId) => {
    // Use the cached state for better performance
    return subtasksWithReviewerDocs[subtaskId] || false;
  };

  const toggleSubtaskExpanded = (subtaskId) => {
    const isExpanded = !expandedSubtasks[subtaskId];
    setExpandedSubtasks(prev => ({ ...prev, [subtaskId]: isExpanded }));
    
    // Fetch documents when expanding if not already loaded
    if (isExpanded && !subtaskDocuments[subtaskId]) {
      fetchSubtaskDocuments(subtaskId);
    }
  };

  const handleApproveDocument = async (docId, subtaskId) => {
    if (!isAdmin) {
      alert('Only administrators can approve documents');
      return;
    }
    
    try {
      setProcessingDoc(docId);
      await documentsAPI.approveDocument(docId, 'Approved by admin');
      await fetchSubtaskDocuments(subtaskId);
      alert('Document approved successfully!');
    } catch (error) {
      console.error('Failed to approve document:', error);
      alert('Failed to approve document');
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleRejectDocument = async (docId, subtaskId) => {
    if (!isAdmin) {
      alert('Only administrators can reject documents');
      return;
    }
    
    const reason = prompt('Please provide a rejection reason:');
    if (!reason) return;
    
    try {
      setProcessingDoc(docId);
      await documentsAPI.rejectDocument(docId, reason);
      await fetchSubtaskDocuments(subtaskId);
      alert('Document rejected');
    } catch (error) {
      console.error('Failed to reject document:', error);
      alert('Failed to reject document');
    } finally {
      setProcessingDoc(null);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document');
    }
  };

  // 🔹 Handlers
  const handleCheckboxChange = async (subtask, checked) => {
    // Prevent admin from changing status unless they're the assigned reviewer
    if (!canChangeSubtaskStatus) {
      alert('Administrators can only view subtasks. Only the assigned reviewer can change subtask status.');
      return;
    }
    
    const newStatus = checked ? 'completed' : 'pending';
    const updates = { status: newStatus, ...(checked ? {} : { completed_at: null }) };
    await onSubtaskUpdate(subtask.subtask_id, updates);
  };

  const handleRatingClick = (rating) => setOverallRating(rating);

  const getCompletionPercentage = () => {
    if (!subtasks?.length) return 0;
    const completedCount = subtasks.filter(s => s.status === 'completed').length;
    return Math.round((completedCount / subtasks.length) * 100);
  };

  // Calculate document approval progress
  const getDocumentProgress = () => {
    const allDocs = Object.values(subtaskDocuments).flat();
    const totalDocs = allDocs.length;
    const pendingDocs = allDocs.filter(doc => doc.status === 'pending').length;
    const approvedDocs = allDocs.filter(doc => doc.status === 'approved').length;
    const rejectedDocs = allDocs.filter(doc => doc.status === 'rejected').length;
    
    return {
      total: totalDocs,
      pending: pendingDocs,
      approved: approvedDocs,
      rejected: rejectedDocs,
      pendingPercentage: totalDocs > 0 ? Math.round((pendingDocs / totalDocs) * 100) : 0,
      approvedPercentage: totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0,
      allApproved: totalDocs > 0 && pendingDocs === 0 && rejectedDocs === 0
    };
  };

  const isReviewComplete = () => {
    const docProgress = getDocumentProgress();
    return subtasks?.length > 0 &&
      subtasks.every(s => s.status === 'completed') &&
      overallRating > 0 &&
      docProgress.allApproved;
  };

  const handleAddNewSubtask = async (sectionTitle) => {
    if (!newSubtaskTitle.trim()) return;
    
    try {
      // Include section in description for proper categorization
      const description = sectionTitle ? `${sectionTitle} - ${newSubtaskTitle}` : newSubtaskTitle;
      
      await onAddSubtask({
        title: newSubtaskTitle,
        description: description,
        status: 'pending',
        order_index: subtasks.length
      });
      
      setNewSubtaskTitle('');
      setActiveSection(null);
      setShowAddSubtask(false);
    } catch (error) {
      console.error('Error adding subtask:', error);
      alert('Failed to add subtask. Please try again.');
    }
  };

  const handleCancelAddSubtask = () => {
    setNewSubtaskTitle('');
    setActiveSection(null);
    setShowAddSubtask(false);
  };

  const handleSubmitSubtasks = async () => {
    if (!currentTask?.task_id) return;
    try {
      const result = await taskAPI.submitSubtasksStatus(currentTask.task_id);
      alert(`Subtasks submitted successfully!\n${result.completed_subtasks}/${result.total_subtasks} completed (${result.completion_percentage}%)`);
      window.location.reload();
    } catch (error) {
      console.error('Error submitting subtasks:', error);
      alert('Failed to submit subtasks. Please try again.');
    }
  };

  const handleSubmitReview = (action) => {
    const docProgress = getDocumentProgress();
    
    const reviewData = {
      checkedItems,
      comments,
      overallRating,
      justification,
      completionPercentage: getCompletionPercentage(),
      timestamp: new Date().toISOString(),
      reviewerRole,
      documentCategory,
      documentsApproved: docProgress.approved,
      totalDocuments: docProgress.total,
      subtasksData: subtasks?.map(s => ({
        id: s.subtask_id,
        title: s.title,
        status: s.status,
        completedAt: s.completed_at
      }))
    };

    switch (action) {
      case 'approve': 
        // Auto-populate review summary before approving
        console.log('📝 Auto-populating review data:', reviewData);
        onApprove(reviewData); 
        break;
      case 'reject': onReject(reviewData); break;
      case 'clarification': onRequestClarification(reviewData); break;
      default: onSaveProgress(reviewData);
    }
  };

  // 🔹 Display "No Task Assigned"
  const hasNoTask = !currentTask;

  // 🔹 Log render with parent props
  console.log('🎨 ReviewPanel: RENDERING based on parent props:');
  console.log('   Parent reviewerRole:', reviewerRole);
  console.log('   Parent currentTask:', currentTask?.task_id);
  console.log('   Parent subtasks count:', subtasks?.length);
  console.log('   Computed groupedSections:', groupedSubtasks?.length);
  console.log('   Criteria title:', currentCriteria?.title);
  console.log('   ⚡ Everything renders based on parent Document Review page props');

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      {/* Role Selection Buttons - Always visible */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Role:</span>
            <div className="flex bg-background rounded-lg p-1 border">
              {reviewerRoles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRoleChange(r.id)}
                  disabled={isRoleChanging}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm ${
                    reviewerRole === r.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon name={r.icon} size={16} />
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Messaging Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMessaging(!showMessaging)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                showMessaging
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <Icon name="MessageCircle" size={16} />
              <span>Messaging</span>
            </button>
          </div>
          
        </div>
     
      </div>

      {/* Tabs - Always visible */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center px-4 py-3 text-sm ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon name={tab.icon} size={16} />
            <span className="ml-1">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Messaging Content */}
      {showMessaging && (
        <div className="flex-1 overflow-hidden">
          <ProjectMessaging 
            currentUser={currentUser}
            onMessageSent={(message) => console.log('Message sent:', message)}
            onMessageReceived={(message) => console.log('Message received:', message)}
          />
        </div>
      )}

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {!showMessaging && activeTab === "review" && (
          <div className="h-full overflow-y-auto">
            {hasNoTask ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <Icon name="AlertCircle" size={64} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Task Assigned</h3>
                  <p className="text-muted-foreground mb-2">
                    No task has been assigned for the selected reviewer role yet.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <div className="p-4 border-b border-border">
                  {/* Role Badge - Always shows current role from parent prop */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Reviewing as:</span>
                    <span className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full shadow-sm">
                      {reviewerRole === 're_sales_advisor' ? '🏢 RE Sales Advisor' :
                       reviewerRole === 're_analyst' ? '📊 RE Analyst' :
                       reviewerRole === 're_governance_lead' ? '⚖️ RE Governance Lead' :
                       reviewerRole}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 flex-1">
                      <Icon name={currentCriteria?.icon} size={24} className="text-primary" />
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-foreground">
                          {currentCriteria?.title}
                        </h2>
                        {currentTask && (
                          <p className="text-sm font-medium text-primary mt-1">
                            Task: {currentTask.title || currentTask.task_type || 'Untitled Task'}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Document Category: {documentCategory?.replace('_', ' ')?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-2xl font-bold text-primary">{getCompletionPercentage()}%</div>
                      <div className="text-xs text-muted-foreground">Complete</div>
                    </div>
                  </div>

                  {/* Summary */}
                  {subtasks?.length > 0 && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
                      <span className="flex items-center gap-1">
                        <Icon name="ListChecks" size={14} />
                        {subtasks.length} Subtasks
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="CheckCircle2" size={14} className="text-green-500" />
                        {subtasks.filter(s => s.status === 'completed').length} Completed
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="Clock" size={14} className="text-orange-500" />
                        {subtasks.filter(s => s.status === 'pending').length} Pending
                      </span>
                    </div>
                  )}
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[500px]">
                  {/* Admin View-Only Notice */}
                  {isAdmin && !isTaskAssignedToMe && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Icon name="Eye" size={18} className="text-orange-600" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-600">Admin View-Only Mode</p>
                          <p className="text-xs text-orange-600/80 mt-1">
                            You can view and add subtasks, but only the assigned reviewer can change subtask status.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {groupedSubtasks?.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-foreground flex items-center space-x-2">
                          <Icon name="CheckSquare" size={18} className="text-primary" />
                          <span>{section?.title}</span>
                        </h3>
                        {/* Add Subtask Button per Section */}
                        <button
                          onClick={() => {
                            setActiveSection(section?.title);
                            setShowAddSubtask(false);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title={`Add subtask to ${section?.title}`}
                        >
                          <Icon name="Plus" size={14} />
                          <span>Add</span>
                        </button>
                      </div>
                      
                      {/* Add Subtask Form - Show under specific section */}
                      {activeSection === section?.title && (
                        <div className="bg-muted/50 border border-primary/30 rounded-lg p-3 space-y-2">
                          <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder={`Enter subtask for ${section?.title}...`}
                            className="w-full p-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNewSubtask(section?.title);
                              }
                            }}
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleAddNewSubtask(section?.title)} 
                              disabled={!newSubtaskTitle.trim()}
                            >
                              <Icon name="Plus" size={14} />
                              Add to {section?.title}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleCancelAddSubtask}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                        {section?.items?.map((item, itemIndex) => {
                          const isExpanded = expandedSubtasks[item.subtask_id];
                          const docs = subtaskDocuments[item.subtask_id] || [];
                          const isLoadingDocs = loadingDocs[item.subtask_id];
                          
                          return (
                            <div
                              key={item.subtask_id || itemIndex}
                              className="border border-border rounded-lg hover:border-primary/50 transition-colors"
                            >
                              {/* Subtask Header */}
                              <div className="flex items-center justify-between p-3">
                                <div className="flex items-center space-x-3 flex-1">
                                  <button
                                    onClick={() => handleCheckboxChange(item, item.status !== 'completed')}
                                    disabled={!canChangeSubtaskStatus}
                                    className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                                      item.status === 'completed'
                                        ? 'bg-green-500 border-green-500'
                                        : 'border-border hover:border-primary'
                                    } ${!canChangeSubtaskStatus ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={!canChangeSubtaskStatus ? 'Admin view-only: Only the assigned reviewer can change status' : ''}
                                  >
                                    {item.status === 'completed' && <Icon name="Check" size={20} className="text-white" />}
                                  </button>
                                  <span className={`text-sm flex-1 ${item.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}`}>
                                    {item.title || item}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      item.status === 'completed'
                                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                        : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                    }`}
                                  >
                                    {item.status === 'completed' ? 'Completed' : 'Pending'}
                                  </span>
                                  
                                  {/* Document icon - show when reviewer has uploaded documents */}
                                  {hasReviewerDocuments(item.subtask_id) && (
                                    <div className="flex items-center relative">
                                      <Icon 
                                        name="FileText" 
                                        size={16} 
                                        className="text-blue-500" 
                                        title="Documents uploaded by reviewer"
                                      />
                                      {subtaskDocuments[item.subtask_id]?.length > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-medium">
                                          {subtaskDocuments[item.subtask_id].length}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  
                                  <button
                                    onClick={() => toggleSubtaskExpanded(item.subtask_id)}
                                    className="p-1 hover:bg-muted rounded transition-colors"
                                    title="Toggle documents"
                                  >
                                    <Icon 
                                      name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                                      size={18} 
                                      className="text-muted-foreground" 
                                    />
                                  </button>
                                </div>
                              </div>

                              {/* Documents Section - Collapsible */}
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-0 border-t border-border/50">
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <h6 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                        <Icon name="Paperclip" size={12} />
                                        Uploaded Documents ({docs.length})
                                      </h6>
                                    </div>
                                    
                                    {isLoadingDocs ? (
                                      <div className="text-center py-3">
                                        <Icon name="Loader2" size={20} className="animate-spin text-primary mx-auto" />
                                      </div>
                                    ) : docs.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded">
                                        No documents uploaded yet
                                      </p>
                                    ) : (
                                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                        {docs.map((doc) => (
                                          <div 
                                            key={doc.document_id} 
                                            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg hover:shadow-sm transition-shadow"
                                          >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                                                <Icon name="FileText" size={16} className="text-primary" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate text-foreground">{doc.file_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {new Date(doc.created_at).toLocaleDateString()}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                                                doc.status === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                                doc.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                'bg-orange-500/10 text-orange-600 border-orange-500/20'
                                              }`}>
                                                {doc.status?.toUpperCase()}
                                              </span>
                                              {doc.status === 'pending' && isAdmin && (
                                                <>
                                                  <button
                                                    onClick={() => handleApproveDocument(doc.document_id, item.subtask_id)}
                                                    disabled={processingDoc === doc.document_id}
                                                    className="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50"
                                                    title="Approve Document"
                                                  >
                                                    <Icon name={processingDoc === doc.document_id ? "Loader2" : "CheckCircle"} size={16} className={processingDoc === doc.document_id ? "animate-spin" : ""} />
                                                  </button>
                                                  <button
                                                    onClick={() => handleRejectDocument(doc.document_id, item.subtask_id)}
                                                    disabled={processingDoc === doc.document_id}
                                                    className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded transition-colors disabled:opacity-50"
                                                    title="Reject Document"
                                                  >
                                                    <Icon name="XCircle" size={16} />
                                                  </button>
                                                </>
                                              )}
                                              <button
                                                onClick={() => handleDownloadDocument(doc)}
                                                className="p-1.5 text-primary hover:bg-primary/10 border border-primary/30 rounded transition-colors"
                                                title="Download Document"
                                              >
                                                <Icon name="Download" size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* ADD GENERAL SUBTASK (Optional - for items not in a specific section) */}
                  {subtasks?.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border">
                      {!showAddSubtask ? (
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowAddSubtask(true);
                            setActiveSection(null);
                          }} 
                          className="w-full"
                        >
                          <Icon name="Plus" size={16} />
                          Add General Subtask
                        </Button>
                      ) : (
                        <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                          <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Enter general subtask title..."
                            className="w-full p-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddNewSubtask(null);
                              }
                            }}
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleAddNewSubtask(null)} 
                              disabled={!newSubtaskTitle.trim()}
                            >
                              <Icon name="Plus" size={14} />
                              Add
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleCancelAddSubtask}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RATING + COMMENTS */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <h3 className="text-base font-semibold text-foreground">Overall Assessment</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Rating (1–5 stars)</label>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={`rating-${reviewerRole}-${star}`}
                            onClick={() => setOverallRating(star)}
                            className="p-1 rounded hover:bg-muted transition-smooth"
                          >
                            <Icon
                              name="Star"
                              size={24}
                              className={`${star <= overallRating ? 'text-warning fill-current' : 'text-muted-foreground'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Review Comments</label>
                    <textarea
                      key={`comments-${reviewerRole}`}
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add your detailed review comments here..."
                      className="w-full h-24 p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">Action Justification</label>
                    <textarea
                      key={`justification-${reviewerRole}`}
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Provide justification for your decision..."
                      className="w-full h-20 p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-border space-y-4">
                  {/* Document Progress Section */}
                  {(() => {
                    const docProgress = getDocumentProgress();
                    return docProgress.total > 0 ? (
                      <div className="space-y-3 pb-3 border-b border-border">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-foreground">Document Approval Progress</span>
                          <span className="text-xs text-muted-foreground">
                            {docProgress.approved}/{docProgress.total} Approved
                          </span>
                        </div>

                        {/* Pending Documents Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-orange-600 font-medium flex items-center gap-1">
                              <Icon name="Clock" size={12} />
                              Pending Documents
                            </span>
                            <span className="text-orange-600">{docProgress.pending} ({docProgress.pendingPercentage}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${docProgress.pendingPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Approved Documents Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600 font-medium flex items-center gap-1">
                              <Icon name="CheckCircle2" size={12} />
                              Approved Documents
                            </span>
                            <span className="text-green-600">{docProgress.approved} ({docProgress.approvedPercentage}%)</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${docProgress.approvedPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Rejected Documents (if any) */}
                        {docProgress.rejected > 0 && (
                          <div className="text-xs text-red-600 flex items-center gap-1 p-2 bg-red-500/10 rounded">
                            <Icon name="XCircle" size={12} />
                            {docProgress.rejected} document(s) rejected
                          </div>
                        )}

                        {/* All Approved Indicator */}
                        {docProgress.allApproved && (
                          <div className="text-xs text-green-600 font-medium flex items-center gap-1 p-2 bg-green-500/10 rounded">
                            <Icon name="CheckCircle" size={12} />
                            All documents approved! You can now save progress.
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}

                  {/* Subtask Review Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Subtask Review Progress</span>
                      <span>{getCompletionPercentage()}% Complete</span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getCompletionPercentage()}%` }}
                      />
                    </div>
                  </div>

                  {(() => {
                    const docProgress = getDocumentProgress();
                    const documentsNotReady = docProgress.total > 0 && !docProgress.allApproved;
                    
                    return (
                      <>
                        {/* Warning if documents not approved */}
                        {documentsNotReady && (
                          <div className="text-xs text-orange-600 flex items-center gap-1 p-2 bg-orange-500/10 rounded border border-orange-500/20">
                            <Icon name="AlertCircle" size={14} />
                            Please approve all pending documents before submitting your review
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => handleSubmitReview('save')} 
                            className="w-full"
                            disabled={documentsNotReady}
                            title={documentsNotReady ? "All documents must be approved first" : "Save your progress"}
                          >
                            <Icon name="Save" size={16} /> Save Progress
                          </Button>
                          <Button
                            variant="warning"
                            onClick={() => handleSubmitReview('clarification')}
                            disabled={!justification?.trim() || documentsNotReady}
                            className="w-full"
                            title={documentsNotReady ? "All documents must be approved first" : "Request clarification"}
                          >
                            <Icon name="MessageCircle" size={16} /> Request Clarification
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleSubmitReview('reject')}
                            disabled={!justification?.trim() || documentsNotReady}
                            className="w-full"
                            title={documentsNotReady ? "All documents must be approved first" : "Reject submission"}
                          >
                            <Icon name="XCircle" size={16} /> Reject
                          </Button>
                          <Button
                            variant="success"
                            onClick={() => handleSubmitReview('approve')}
                            disabled={!isReviewComplete() || !justification?.trim()}
                            className="w-full"
                            title={!isReviewComplete() ? "Complete all requirements first" : "Approve submission"}
                          >
                            <Icon name="CheckCircle" size={16} /> Approve
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}
        
        {!showMessaging && activeTab === "task" && (
          <div className="p-4 h-full overflow-y-auto">
            {hasNoTask ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <Icon name="AlertCircle" size={64} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Task Assigned</h3>
                  <p className="text-muted-foreground mb-2">
                    No task has been assigned for the selected reviewer role yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon name="Clock" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Task Details</h3>
                <p className="text-muted-foreground">Task details content will be displayed here.</p>
              </div>
            )}
          </div>
        )}
        
        {!showMessaging && activeTab === "collaboration" && (
          <div className="p-4 h-full overflow-y-auto">
            {hasNoTask ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <Icon name="AlertCircle" size={64} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Task Assigned</h3>
                  <p className="text-muted-foreground mb-2">
                    No task has been assigned for the selected reviewer role yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Icon name="Users" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Collaboration</h3>
                <p className="text-muted-foreground">Collaboration tools will be displayed here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPanel;