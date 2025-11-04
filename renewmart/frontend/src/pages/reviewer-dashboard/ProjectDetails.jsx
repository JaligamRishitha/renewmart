import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Header from '../../components/ui/Header';
import { taskAPI, documentsAPI, landsAPI, usersAPI, reviewerAPI } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SubtaskManager from './SubtaskManager';
import ReviewPanelCompact from './ReviewPanelCompact';
import TaskPanel from './TaskPanel';
import TeamsStyleMessaging from './components/TeamsStyleMessaging';
import CollaborationWork from './components/CollaborationWork';
import toast from 'react-hot-toast';

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
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [slotStatusSummary, setSlotStatusSummary] = useState({});
  const [isProcessingSlot, setIsProcessingSlot] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [messagingUnreadCount, setMessagingUnreadCount] = useState(0);

  // Get user's reviewer role
  const reviewerRole = user?.roles?.find(role => 
['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
  );
  const isAdmin = user?.roles?.includes('administrator');

  // Document type to roles mapping - matches backend mapping
  const roleDocumentMapping = {
    're_sales_advisor': [
      'land-valuation',
      'sale-contracts',
      'topographical-surveys',
      'grid-connectivity'
    ],
    're_analyst': [
      'financial-models'
    ],
    're_governance_lead': [
      'land-valuation',
      'ownership-documents',
      'zoning-approvals',
      'environmental-impact',
      'government-nocs'
    ]
  };

  // Helper function to check if a document type is allowed for the reviewer role
  const isDocumentTypeAllowed = (documentType) => {
    // Admin can see all documents
    if (isAdmin) return true;
    
    // If no reviewer role, don't show any documents
    if (!reviewerRole) return false;
    
    // Check if document type is in the allowed list for this role
    const allowedTypes = roleDocumentMapping[reviewerRole] || [];
    return allowedTypes.includes(documentType);
  };

  // Debug: Log user roles
  console.log('Current user:', user);
  console.log('User roles:', user?.roles);
  console.log('Reviewer role found:', reviewerRole);
  console.log('Is admin:', isAdmin);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'all-tasks', label: 'All Tasks & Reviewers', icon: 'Users' },
    { id: 'documents', label: 'Documents', icon: 'FileText' },
    { id: 'collaboration', label: 'Collaboration Work', icon: 'Handshake' },
    { id: 'messaging', label: 'Messaging', icon: 'MessageSquare' }
  ];

  useEffect(() => {
    fetchProjectDetails();
    loadMessagingUnreadCount();
  }, [landId]);

  // Refresh messaging unread count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if messaging tab is not active
      if (activeTab !== 'messaging') {
        loadMessagingUnreadCount();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [activeTab]);
  
  // Clear count when messaging tab is opened
  useEffect(() => {
    if (activeTab === 'messaging') {
      setMessagingUnreadCount(0);
    } else {
      // Refresh count when leaving messaging tab
      loadMessagingUnreadCount();
    }
  }, [activeTab]);

  // Debug: Log document changes
  useEffect(() => {
    console.log('Documents state changed:', documents.map(d => ({
      file_name: d.file_name,
      status: d.status,
      version_status: d.version_status,
      document_type: d.document_type
    })));
  }, [documents]);

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
            
            // Filter out "Document type" subtasks
            const filteredSubtasks = (subtasks || []).filter(subtask => 
              subtask.title !== 'Document type' && 
              subtask.title !== 'document type' &&
              !subtask.title.toLowerCase().includes('document type')
            );
            return { ...task, subtasks: filteredSubtasks };
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

      // Fetch all documents (backend already filters by role, but we'll filter client-side too for safety)
      const docsResponse = await documentsAPI.getDocuments(landId);
      // Filter out subtask documents and filter by role
      const filteredDocs = (docsResponse || [])
        .filter(doc => !doc.subtask_id)
        .filter(doc => {
          // Admin can see all documents
          if (isAdmin) return true;
          // Filter by reviewer role
          return isDocumentTypeAllowed(doc.document_type);
        });
      setDocuments(filteredDocs);

      // Fetch slot status summary
      try {
        const slotStatus = await documentsAPI.getSlotStatusSummary(landId);
        setSlotStatusSummary(slotStatus.slot_status || {});
      } catch (err) {
        console.error('Failed to fetch slot status summary:', err);
      }

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
      // Filter out "Document type" subtasks
      const filteredSubtasks = (updatedSubtasks || []).filter(subtask => 
        subtask.title !== 'Document type' && 
        subtask.title !== 'document type' &&
        !subtask.title.toLowerCase().includes('document type')
      );
      setSelectedTask({ ...task, subtasks: filteredSubtasks });
      setShowTaskModal(true);
    } catch (err) {
      console.error("Failed to fetch subtasks for modal:", err);
      setSelectedTask(task); // fallback
      setShowTaskModal(true);
    }
  };

 const handleSubtaskUpdate = async (taskId) => {
  try {
    // Refresh the specific task data to get updated status
    const updatedTask = await taskAPI.getTaskById(taskId);
    const updatedSubtasks = await taskAPI.getSubtasks(taskId);
    
    // Filter out "Document type" subtasks
    const filteredSubtasks = (updatedSubtasks || []).filter(subtask => 
      subtask.title !== 'Document type' && 
      subtask.title !== 'document type' &&
      !subtask.title.toLowerCase().includes('document type')
    );
    
    // Update the selected task with new data
    setSelectedTask(prev => ({ 
      ...prev, 
      ...updatedTask, 
      subtasks: filteredSubtasks 
    }));
    
    // Update the task in the allTasks list
    setAllTasks(prevTasks => 
      prevTasks.map(task => 
        task.task_id === taskId 
          ? { ...task, ...updatedTask, subtasks: filteredSubtasks }
          : task
      )
    );
    
    console.log('Task status updated:', {
      taskId,
      oldStatus: 'previous',
      newStatus: updatedTask.status,
      completionPercentage: Math.round((filteredSubtasks.filter(s => s.status === 'completed').length / filteredSubtasks.length) * 100)
    });
    
  } catch (err) {
    console.error("Failed to refresh task after subtask update:", err);
    // Fallback: refresh entire project details
    await fetchProjectDetails();
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

  const toggleAccordion = (docIndex) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [docIndex]: !prev[docIndex]
    }));
  };

  const groupDocumentsBySlot = (docs) => {
    // Only use D1, D2 for Ownership Documents and Government NOCs
    const multiSlotTypes = ['ownership-documents', 'government-nocs'];
    const isMultiSlot = multiSlotTypes.includes(selectedDocumentType?.id);
    
    if (!isMultiSlot) {
      // For other document types, return as single group
      return { 'D1': docs };
    }
    
    // Group documents by actual doc_slot field for multi-slot types
    const grouped = {};
    docs.forEach((doc) => {
      const docSlot = doc.doc_slot || 'D1'; // Default to D1 if no slot specified
      if (!grouped[docSlot]) {
        grouped[docSlot] = [];
      }
      grouped[docSlot].push(doc);
    });
    
    // Ensure D1 and D2 slots exist even if empty
    if (!grouped['D1']) grouped['D1'] = [];
    if (!grouped['D2']) grouped['D2'] = [];
    
    return grouped;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'under_review': 
        return 'text-yellow-600 bg-yellow-100';
      case 'archived': 
        return 'text-gray-600 bg-gray-100';
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

  // Document management helper functions
  const getDocumentTypes = () => {
    const typeMap = new Map();
    
    // Process each document type separately to ensure consistent version numbering
    // Filter out subtask documents, subtask document types, and filter by role
    const documentTypes = [...new Set(documents
      .filter(doc => !doc.subtask_id)
      .filter(doc => {
        const docType = doc.document_type || 'unknown';
        // Filter out subtask document types
        if (docType === 'subtask-document' || 
            docType === 'subtask_document' ||
            docType.toLowerCase().includes('subtask document') ||
            docType.toLowerCase().includes('subtask-document') ||
            docType.toLowerCase().includes('subtask_document')) {
          return false;
        }
        // Filter by role - only show document types allowed for this reviewer
        return isDocumentTypeAllowed(docType);
      })
      .map(doc => doc.document_type || 'unknown'))];
    
    documentTypes.forEach(type => {
      // Get all documents of this type
      const docsOfType = documents
        .filter(doc => (doc.document_type || 'unknown') === type && !doc.subtask_id);
      
      if (docsOfType.length === 0) return;
      
      // Group by doc_slot for independent D1/D2 processing
      const groupedDocs = groupDocumentsBySlot(docsOfType);
      
      // Calculate total count and latest version across all slots
      let totalCount = 0;
      let maxVersion = 0;
      const underReviewVersions = {}; // Track under review versions per slot: { D1: 3, D2: 5 }
      
      Object.entries(groupedDocs).forEach(([slot, slotDocs]) => {
        const sortedSlotDocs = slotDocs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        totalCount += sortedSlotDocs.length;
        
        // Find the document that's under review in this slot
        sortedSlotDocs.forEach((doc, index) => {
          const versionNumber = doc.version_number || (index + 1); // Use actual version_number if available, otherwise calculate
          const isUnderReview = doc.version_status === 'under_review' || doc.status === 'under_review';
          
          if (isUnderReview) {
            console.log(`Document ${doc.file_name} in ${slot} is under review with version ${versionNumber}`);
            underReviewVersions[slot] = versionNumber;
          }
        });
        
        maxVersion = Math.max(maxVersion, sortedSlotDocs.length);
      });
      
      // Initialize document type
      typeMap.set(type, {
        id: type,
        name: type.replace(/-|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: getDocumentTypeIcon(type),
        count: totalCount,
        latestVersion: maxVersion, // Latest version across all slots
        underReviewVersions: underReviewVersions, // Object with slot -> version mapping
        documents: docsOfType
      });
    });
    
    const result = Array.from(typeMap.values()).map(type => ({
      ...type,
      isLatest: true // Mark the latest document
    }));
    
    console.log('Document types processed:', result.map(type => ({
      name: type.name,
      count: type.count,
      latestVersion: type.latestVersion,
      underReviewVersions: type.underReviewVersions
    })));
    
    return result;
  };

  const getDocumentsByType = (typeId) => {
    const filteredDocs = documents
      .filter(doc => (doc.document_type || 'unknown') === typeId)
      .filter(doc => !doc.subtask_id); // Exclude subtask documents
    
    // Group by doc_slot for independent D1/D2 processing
    const groupedDocs = groupDocumentsBySlot(filteredDocs);
    
    // Process each slot independently
    const processedDocs = [];
    Object.entries(groupedDocs).forEach(([slot, slotDocs]) => {
      const sortedSlotDocs = slotDocs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      sortedSlotDocs.forEach((doc, index) => {
        // Determine the final status
        const isUnderReview = doc.version_status === 'under_review' || doc.status === 'under_review';
        const finalStatus = isUnderReview ? 'under_review' : (doc.version_status || doc.status || 'pending');
        
        const processedDoc = {
          ...doc,
          version: index + 1, // Independent version numbering per slot
          isLatest: index === sortedSlotDocs.length - 1, // Last document in slot is latest
          // Ensure both status and version_status are set correctly
          status: finalStatus,
          // Preserve version_status if it's 'under_review', otherwise set it to match status
          version_status: doc.version_status === 'under_review' ? 'under_review' : (doc.version_status || finalStatus)
        };
        
        console.log(`Processing document ${doc.file_name} in ${slot}:`, {
          original_status: doc.status,
          original_version_status: doc.version_status,
          final_status: processedDoc.status,
          final_version_status: processedDoc.version_status,
          isUnderReview: isDocumentUnderReview(processedDoc),
          slot: slot,
          version: processedDoc.version
        });
        
        processedDocs.push(processedDoc);
      });
    });
    
    return processedDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest first
  };

  const getDocumentTypeIcon = (type) => {
    const iconMap = {
      'land-valuation': 'FileText',
      'ownership-documents': 'Scale',
      'sale-contracts': 'FileText',
      'topographical-surveys': 'Map',
      'grid-connectivity': 'Zap',
      'financial-models': 'DollarSign',
      'zoning-approvals': 'Building',
      'environmental-impact': 'Leaf',
      'government-nocs': 'Shield'
    };
    return iconMap[type] || 'File';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'under_review': return 'Clock';
      case 'archived': return 'Archive';
      default: return 'File';
    }
  };

  // Helper function to check if a document is under review
  const isDocumentUnderReview = (doc) => {
    return doc.status === 'under_review' || doc.version_status === 'under_review';
  };

  const refreshDocuments = async () => {
    try {
      console.log('Refreshing documents from server...');
      const docsResponse = await documentsAPI.getDocuments(landId);
      console.log('Raw documents response:', docsResponse);
      
      // Filter out subtask documents, filter by role, and ensure proper status mapping
      const filteredDocs = (docsResponse || [])
        .filter(doc => !doc.subtask_id)
        .filter(doc => {
          // Admin can see all documents
          if (isAdmin) return true;
          // Filter by reviewer role
          return isDocumentTypeAllowed(doc.document_type);
        })
        .map(doc => {
          // Determine if document is under review
          const isUnderReview = doc.version_status === 'under_review' || doc.status === 'under_review';
          const finalStatus = isUnderReview ? 'under_review' : (doc.version_status || doc.status || 'pending');
          
          const processedDoc = {
            ...doc,
            // Ensure both status and version_status are set correctly
            status: finalStatus,
            // Preserve version_status if it's 'under_review', otherwise set it appropriately
            version_status: doc.version_status === 'under_review' ? 'under_review' : (doc.version_status || finalStatus)
          };
          console.log(`Refreshed document ${doc.file_name}:`, {
            original_version_status: doc.version_status,
            original_status: doc.status,
            final_status: processedDoc.status,
            final_version_status: processedDoc.version_status,
            isUnderReview: isDocumentUnderReview(processedDoc)
          });
          return processedDoc;
        });
      
      console.log('Setting documents state:', filteredDocs.map(d => ({
        file_name: d.file_name,
        status: d.status,
        version_status: d.version_status
      })));
      
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('Failed to refresh documents:', error);
    }
  };

  const handleMarkSlotForReview = async (documentType, docSlot) => {
    if (isProcessingSlot) return;
    
    try {
      setIsProcessingSlot(true);
      await documentsAPI.markSlotForReview(landId, documentType, docSlot, `Marked ${docSlot} slot for review`);
      
      toast.success(`Successfully marked ${docSlot} slot for review`);
      
      // Refresh documents and slot status
      await refreshDocuments();
      const slotStatus = await documentsAPI.getSlotStatusSummary(landId);
      setSlotStatusSummary(slotStatus.slot_status || {});
      
    } catch (err) {
      console.error('Failed to mark slot for review:', err);
      toast.error('Failed to mark slot for review: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsProcessingSlot(false);
    }
  };

  const handleUnlockSlotFromReview = async (documentType, docSlot) => {
    if (isProcessingSlot) return;
    
    try {
      setIsProcessingSlot(true);
      await documentsAPI.unlockSlotFromReview(landId, documentType, docSlot, `Unlocked ${docSlot} slot from review`);
      
      toast.success(`Successfully unlocked ${docSlot} slot from review`);
      
      // Refresh documents and slot status
      await refreshDocuments();
      const slotStatus = await documentsAPI.getSlotStatusSummary(landId);
      setSlotStatusSummary(slotStatus.slot_status || {});
      
    } catch (err) {
      console.error('Failed to unlock slot from review:', err);
      toast.error('Failed to unlock slot from review: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsProcessingSlot(false);
    }
  };

  const getSlotStatusIndicator = (documentType) => {
    const slotStatus = slotStatusSummary[documentType];
    if (!slotStatus || !slotStatus.show_slot_indicators) {
      return null;
    }
    
    return slotStatus.status_summary;
  };

  const loadMessagingUnreadCount = async () => {
    try {
      const response = await api.get('/messaging/messages/stats/unread-count');
      setMessagingUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error loading messaging unread count:', error);
    }
  };

 const handleMarkForReview = async (doc) => {
  if (isProcessing) return;

  try {
    setIsProcessing(true);

    if (isDocumentUnderReview(doc)) {
      toast.error('Document is already under review');
      return;
    }

    // Get the doc_slot (default to 'D1' if not specified)
    const docSlot = doc.doc_slot || 'D1';
    const documentType = doc.document_type;

    // Optimistic UI update: Mark current doc as under_review and unmark others in same slot
    setDocuments(prevDocs => {
      const updated = prevDocs.map(d => {
        // Same document - mark as under review
        if (d.document_id === doc.document_id) {
          console.log('Marking document as under review:', d.file_name);
          return { ...d, version_status: 'under_review', status: 'under_review' };
        }
        // Other documents in same slot and type - unmark from review
        if (d.document_type === documentType && 
            (d.doc_slot || 'D1') === docSlot && 
            d.document_id !== doc.document_id &&
            (d.version_status === 'under_review' || d.status === 'under_review')) {
          console.log('Unmarking document from review:', d.file_name);
          return { ...d, version_status: 'active', status: 'active' };
        }
        return d;
      });
      console.log('Updated documents state:', updated.map(d => ({
        file_name: d.file_name,
        status: d.status,
        version_status: d.version_status,
        isUnderReview: isDocumentUnderReview(d)
      })));
      return updated;
    });
    setForceUpdate(prev => prev + 1);

     // API call - backend will handle unmarking others in the same slot
     const response = await reviewerAPI.claimDocument(doc.document_id);

    // ✅ Wait for backend confirmation before showing toast
    await refreshDocuments();
    console.log("📦 API response:", response);
    toast.success(response.message || 'Document marked for review successfully');
  } catch (error) {
    console.error('Error marking document for review:', error);

    // Revert optimistic update on error
    await refreshDocuments();

    setForceUpdate(prev => prev + 1);
    toast.error(error.response?.data?.detail || 'Failed to mark document for review');
  } finally {
    setIsProcessing(false);
  }
};


const handleReleaseFromReview = async (doc) => {
  if (isProcessing) return;

  try {
    setIsProcessing(true);

    if (!isDocumentUnderReview(doc)) {
      toast.error('Document is not under review');
      return;
    }

    // Optimistic UI update
    setDocuments(prevDocs =>
      prevDocs.map(d =>
        d.document_id === doc.document_id
          ? { ...d, version_status: 'pending', status: 'pending' }
          : d
      )
    );
    setForceUpdate(prev => prev + 1);

    // API call
    await reviewerAPI.completeReview(
      doc.document_id,
      'request_changes',
      'Released from review'
    );

    // ✅ Wait for backend data before toast
    await refreshDocuments();

    toast.success('Document released from review successfully');
  } catch (error) {
    console.error('Error releasing document from review:', error);
    toast.error(error.response?.data?.detail || 'Failed to release document from review');
    // Revert optimistic UI
    setDocuments(prevDocs =>
      prevDocs.map(d =>
        d.document_id === doc.document_id
          ? { ...d, version_status: 'under_review', status: 'under_review' }
          : d
      )
    );
    setForceUpdate(prev => prev + 1);
  } finally {
    setIsProcessing(false);
  }
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
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'messaging') {
                    loadMessagingUnreadCount(); // Refresh count when messaging tab is opened
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
                {tab.id === 'messaging' && messagingUnreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                    {messagingUnreadCount > 99 ? '99+' : messagingUnreadCount}
                  </span>
                )}
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
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="FileText" size={24} color="white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-2xl text-foreground">
                  Document Review
                </h1>
                <p className="font-body text-lg text-muted-foreground">
                  Review and manage documents for: {project?.title || 'Project'}
                </p>
              </div>
            </div>

            {/* Project Info Card */}
            <div className="bg-card border border-border rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Project:</span>
                  <p className="font-medium text-foreground">{project?.title || 'Untitled Project'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Land ID:</span>
                  <p className="font-medium text-foreground">{landId}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total Documents:</span>
                  <p className="font-medium text-foreground">{documents.length} documents</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Sidebar - Document Types */}
              <div className="lg:col-span-1">
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
                    Document Types
                  </h3>
                  <div className="space-y-2">
                    {getDocumentTypes().map((docType) => (
                      <button
                        key={docType.id}
                        onClick={() => setSelectedDocumentType(docType)}
                        className={`w-full text-left p-3 rounded-lg transition-smooth ${
                          selectedDocumentType?.id === docType.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted border border-border'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Icon 
                            name={docType.icon} 
                            size={20} 
                            className={selectedDocumentType?.id === docType.id ? 'text-primary-foreground' : 'text-primary'} 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {docType.name}
                            </p>
                            <p className="text-xs opacity-75 mt-1">
                              {docType.count} version{docType.count !== 1 ? 's' : ''}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                Latest: v{docType.latestVersion}
                              </span>
                              {docType.underReviewVersions && Object.keys(docType.underReviewVersions).length > 0 && (
                                <div className="flex items-center space-x-1 flex-wrap">
                                  {Object.entries(docType.underReviewVersions).map(([slot, version]) => (
                                    <span key={slot} className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                                      {slot}: v{version}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Slot Status Indicator */}
                            {getSlotStatusIndicator(docType.id) && (
                              <div className="mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {getSlotStatusIndicator(docType.id)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side - Document Versions */}
              <div className="lg:col-span-2">
                {selectedDocumentType ? (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-heading font-semibold text-lg text-foreground">
                          {selectedDocumentType.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedDocumentType.count} version{selectedDocumentType.count !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    </div>

                        {/* Document Versions Grid */}
                        <div className="space-y-4">
                          {Object.entries(groupDocumentsBySlot(getDocumentsByType(selectedDocumentType.id))).map(([docSlot, docs], docIndex) => (
                            <div key={docSlot} className="border border-border rounded-lg">
                              {/* Accordion Header */}
                              <div className="p-4">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => toggleAccordion(docIndex)}
                                    className="flex items-center space-x-3 text-left hover:bg-muted/50 transition-colors rounded p-2"
                                  >
                                    <Icon name="File" size={20} className="text-primary" />
                                    <span className="font-medium text-foreground">{docSlot}</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                                      {docs.length} version{docs.length !== 1 ? 's' : ''}
                                    </span>
                                    <Icon 
                                      name={expandedAccordions[docIndex] ? "ChevronUp" : "ChevronDown"} 
                                      size={20} 
                                      className="text-muted-foreground" 
                                    />
                                  </button>
                                  
                                  {/* Slot Review Buttons */}
                                  {docs.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                      {docs.some(doc => isDocumentUnderReview(doc)) ? (
                                        <button
                                          onClick={() => handleUnlockSlotFromReview(selectedDocumentType.id, docSlot)}
                                          disabled={isProcessingSlot}
                                          className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isProcessingSlot ? 'Unlocking...' : 'Unlock Slot'}
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleMarkSlotForReview(selectedDocumentType.id, docSlot)}
                                          disabled={isProcessingSlot}
                                          className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isProcessingSlot ? 'Marking...' : 'Mark Slot for Review'}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Accordion Content */}
                              {expandedAccordions[docIndex] && (
                                <div className="border-t border-border">
                                  <div className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {docs.map((doc, versionIndex) => {
                                        // Debug log for each document being rendered
                                        if (versionIndex === 0) {
                                          console.log('Rendering documents - First document:', {
                                            file_name: doc.file_name,
                                            status: doc.status,
                                            version_status: doc.version_status,
                                            isUnderReview: isDocumentUnderReview(doc),
                                            allDocs: docs.map(d => ({
                                              file_name: d.file_name,
                                              status: d.status,
                                              version_status: d.version_status,
                                              isUnderReview: isDocumentUnderReview(d)
                                            }))
                                          });
                                        }
                                        return (
                                        <div
                                          key={`${doc.document_id}-${doc.status}-${doc.version_status}-${forceUpdate}`}
                                          className={`p-4 rounded-lg border hover:shadow-md transition-all ${
                                            doc.isLatest ? 'border-primary bg-primary/5' : 'border-border bg-card'
                                          }`}
                                        >
                                          <div className="flex flex-col h-full">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3">
                                              <div className="flex items-center space-x-2">
                                                <div>
                                                  <div className="flex items-center space-x-2">
                                                    <span className="font-medium text-foreground text-sm">
                                                      Version {doc.version || 1}
                                                    </span>
                                                    {doc.isLatest && (
                                                      <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                                                        Latest
                                                      </span>
                                                    )}
                                                    {isDocumentUnderReview(doc) && (
                                                      <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                                                        Under Review
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>

                                            {/* File Info */}
                                            <div className="flex-1 mb-3">
                                              <h3 className="font-medium text-foreground mb-2 text-sm truncate" title={doc.file_name}>
                                                {doc.file_name || 'Unnamed Document'}
                                              </h3>
                                              <div className="space-y-1 text-xs text-muted-foreground">
                                                <div className="flex items-center justify-between">
                                                  <span>Size:</span>
                                                  <span>{formatFileSize(doc.file_size)}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span>Uploaded:</span>
                                                  <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span>By:</span>
                                                  <span className="truncate">{doc.uploader_name || 'Unknown'}</span>
                                                </div>
                                              </div>

                                              {isDocumentUnderReview(doc) && doc.reviewedBy && (
                                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                                  <div className="flex items-center space-x-1 mb-1">
                                                    <Icon name="Clock" size={12} className="text-yellow-600" />
                                                    <span className="font-medium text-yellow-800">Under Review</span>
                                                  </div>
                                                  <div className="text-yellow-700">
                                                    <p className="truncate">By {doc.reviewedBy}</p>
                                                    <p>Since {doc.reviewStartedAt ? new Date(doc.reviewStartedAt).toLocaleDateString() : 'Recently'}</p>
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-between pt-3 border-t border-border">
                                              <div className="flex items-center space-x-1">
                                                <button
                                                  onClick={() => {
                                                    console.log('Button clicked for document:', {
                                                      file_name: doc.file_name,
                                                      status: doc.status,
                                                      version_status: doc.version_status,
                                                      document_id: doc.document_id,
                                                      isUnderReview: isDocumentUnderReview(doc)
                                                    });
                                                    isDocumentUnderReview(doc) ? handleReleaseFromReview(doc) : handleMarkForReview(doc);
                                                  }}
                                                  disabled={isProcessing}
                                                  className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                                                    isProcessing 
                                                      ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                                                      : isDocumentUnderReview(doc)
                                                        ? 'bg-orange-500 text-white border-orange-600 hover:bg-orange-600' 
                                                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                                  }`}
                                                  title={isProcessing ? 'Processing...' : (isDocumentUnderReview(doc) ? 'Release from Review' : 'Mark for Review')}
                                                >
                                                  <Icon name={isProcessing ? 'Loader' : (isDocumentUnderReview(doc) ? 'Clock' : 'Check')} size={16} />
                                                </button>
                                                <button
                                                  onClick={() => handleViewDocument(doc)}
                                                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                                >
                                                  <Icon name="Eye" size={16} />
                                                </button>
                                                <button
                                                  onClick={() => handleDownloadDocument(doc)}
                                                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                                >
                                                  <Icon name="Download" size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-8 text-center">
                    <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                      Select a Document Type
                    </h3>
                    <p className="text-muted-foreground">
                      Choose a document type from the left sidebar to view its versions
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Messaging Tab */}
        {activeTab === 'collaboration' && (
          <div className="bg-card border border-border rounded-lg p-6">
            <CollaborationWork />
          </div>
        )}

        {activeTab === 'messaging' && (
          <div className="bg-card border border-border rounded-lg overflow-hidden h-[600px]">
            <TeamsStyleMessaging 
              currentUser={user}
              onMessageSent={(message) => {
                console.log('Message sent:', message);
                loadMessagingUnreadCount(); // Refresh count after sending
              }}
              onMessageReceived={(message) => {
                console.log('Message received:', message);
                loadMessagingUnreadCount(); // Refresh count on new message
              }}
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
  
  // Calculate completion percentage
  const completionPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
  
  // Determine display status based on subtask completion
  const getDisplayStatus = () => {
    if (totalSubtasks === 0) {
      return task.status; // No subtasks, use original status
    }
    
    if (completionPercentage === 100) {
      return 'completed'; // All subtasks completed
    } else if (completionPercentage > 0) {
      return 'in_progress'; // Some subtasks completed
    } else {
      return 'pending'; // No subtasks completed
    }
  };
  
  const displayStatus = getDisplayStatus();
  
  // Debug logging for status changes
  if (totalSubtasks > 0 && displayStatus !== task.status) {
    console.log(`Task ${task.task_id} status changed:`, {
      originalStatus: task.status,
      displayStatus: displayStatus,
      completionPercentage: completionPercentage,
      completedSubtasks: completedSubtasks,
      totalSubtasks: totalSubtasks
    });
  }
  
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
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(displayStatus)}`}>
              {displayStatus?.toUpperCase()}
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
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;

