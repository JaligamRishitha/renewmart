import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Header from '../../components/ui/Header';
import { documentsAPI, reviewerAPI, landsAPI, taskAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminDocumentVersions = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  // State for reviewer role (can be set from location state, user roles, or task's assigned_role)
  const [reviewerRole, setReviewerRole] = useState(
    location.state?.reviewerRole || 
    user?.roles?.find(role => 
      ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
    ) || null
  );
  const isAdmin = user?.roles?.includes('administrator') || user?.role === 'admin';

  // Default document type to roles mapping (fallback)
  const defaultRoleDocumentMapping = {
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

  // State for project-specific mappings: { role_key: [document_types] }
  const [projectDocumentMappings, setProjectDocumentMappings] = useState(null);
  // State to track if project_mappings exists in API response
  const [hasProjectMappingsInAPI, setHasProjectMappingsInAPI] = useState(false);
  // State for allowed document types from backend (filtered by role)
  const [allowedDocumentTypes, setAllowedDocumentTypes] = useState([]);

  // Fetch project-specific document role mappings and determine reviewer role from tasks
  useEffect(() => {
    const fetchProjectMappingsAndRole = async () => {
      if (!landId) return;
      
      try {
        const mappings = await landsAPI.getProjectDocumentRoleMappings(landId);
        
        // Store the filtered document_types array from backend (already filtered by role)
        setAllowedDocumentTypes(mappings.document_types || []);
        console.log('[AdminDocumentVersions] Allowed document types from backend:', mappings.document_types);
        
        // Convert to a format similar to default mapping: role -> [document_types]
        // ALWAYS use project_mappings if it exists in API, never fall back to default_mappings
        const roleToDocTypes = {};
        console.log('[AdminDocumentVersions] API Response mappings:', {
          hasProjectMappings: !!mappings.project_mappings,
          projectMappingsKeys: mappings.project_mappings ? Object.keys(mappings.project_mappings) : [],
          projectMappings: mappings.project_mappings,
          hasDefaultMappings: !!mappings.default_mappings
        });
        
        if (mappings.project_mappings && Object.keys(mappings.project_mappings).length > 0) {
          // Use project_mappings (prioritize over default_mappings)
          Object.keys(mappings.project_mappings).forEach(docType => {
            mappings.project_mappings[docType].forEach(roleKey => {
              if (!roleToDocTypes[roleKey]) {
                roleToDocTypes[roleKey] = [];
              }
              roleToDocTypes[roleKey].push(docType);
            });
          });
          console.log('[AdminDocumentVersions] ✅ Using project_mappings (NOT default_mappings):', roleToDocTypes);
        } else {
          // Only use defaults if project_mappings doesn't exist or is empty
          console.log('[AdminDocumentVersions] ⚠️ No project_mappings found, using default_mappings');
          // Convert default_mappings if available
          if (mappings.default_mappings) {
            Object.keys(mappings.default_mappings).forEach(docType => {
              mappings.default_mappings[docType].forEach(roleKey => {
                if (!roleToDocTypes[roleKey]) {
                  roleToDocTypes[roleKey] = [];
                }
                roleToDocTypes[roleKey].push(docType);
              });
            });
          }
        }
        
        // IMPORTANT: Check if project_mappings exists in API response (even if empty)
        const projectMappingsExists = mappings.project_mappings !== null && mappings.project_mappings !== undefined;
        setHasProjectMappingsInAPI(projectMappingsExists);
        
        if (projectMappingsExists) {
          // project_mappings exists in API - ALWAYS use it
          setProjectDocumentMappings(roleToDocTypes);
          console.log('[AdminDocumentVersions] ✅ project_mappings EXISTS in API - using project_mappings:', roleToDocTypes);
        } else {
          // project_mappings doesn't exist in API - use defaults
          setProjectDocumentMappings(Object.keys(roleToDocTypes).length > 0 ? roleToDocTypes : null);
          console.log('[AdminDocumentVersions] ⚠️ project_mappings DOES NOT EXIST in API - using default_mappings:', roleToDocTypes);
        }

        // If reviewerRole is not set yet (not from location.state or user roles), try to get it from tasks for this land
        const initialRole = location.state?.reviewerRole || 
          user?.roles?.find(role => 
            ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
          );
        
        if (!initialRole && isAdmin) {
          try {
            const tasks = await taskAPI.getTasks({ land_id: landId });
            console.log('[AdminDocumentVersions] Tasks for land:', tasks);
            
            // Find first task with an assigned_role
            const taskWithRole = tasks.find(t => 
              t.assigned_role && 
              ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(t.assigned_role)
            );
            
            if (taskWithRole?.assigned_role) {
              console.log('[AdminDocumentVersions] Setting reviewer role from task:', taskWithRole.assigned_role);
              setReviewerRole(taskWithRole.assigned_role);
            }
          } catch (err) {
            console.error('[AdminDocumentVersions] Error fetching tasks:', err);
          }
        }
      } catch (err) {
        console.error('[AdminDocumentVersions] Error fetching project mappings, using defaults:', err);
        setProjectDocumentMappings(null);
        setHasProjectMappingsInAPI(false);
        setAllowedDocumentTypes([]);
      }
    };

    fetchProjectMappingsAndRole();
  }, [landId, isAdmin]);

  // Helper function to check if a document type is allowed for the reviewer role
  const isDocumentTypeAllowed = (documentType) => {
    // If there's a reviewer role (from location state or user roles), ALWAYS filter by that role
    // even if user is admin - this ensures role-based filtering
    if (reviewerRole) {
      // ALWAYS use project_mappings if it exists in API, only use defaults if project_mappings doesn't exist in API
      const roleMapping = hasProjectMappingsInAPI ? (projectDocumentMappings || {}) : defaultRoleDocumentMapping;
      const allowedTypes = roleMapping[reviewerRole] || [];
      const isAllowed = allowedTypes.includes(documentType);
      console.log(`[AdminDocumentVersions] Checking document type ${documentType} for role ${reviewerRole}:`, {
        hasProjectMappingsInAPI: hasProjectMappingsInAPI,
        usingProjectMappings: hasProjectMappingsInAPI,
        projectMappings: projectDocumentMappings,
        defaultMappings: defaultRoleDocumentMapping,
        roleMapping: roleMapping,
        allowedTypes: allowedTypes,
        isAllowed: isAllowed
      });
      return isAllowed;
    }
    
    // If no reviewer role and user is admin, show all documents
    if (isAdmin && !reviewerRole) {
      console.log(`[AdminDocumentVersions] No reviewer role - Admin viewing all documents`);
      return true;
    }
    
    // If no reviewer role and not admin, don't show any documents
    if (!reviewerRole) {
      console.log(`[AdminDocumentVersions] No reviewer role - showing no documents`);
      return false;
    }
    
    // Fallback: ALWAYS use project_mappings if it exists in API
    const roleMapping = hasProjectMappingsInAPI ? (projectDocumentMappings || {}) : defaultRoleDocumentMapping;
    const allowedTypes = roleMapping[reviewerRole] || [];
    return allowedTypes.includes(documentType);
  };

  useEffect(() => {
    if (landId) {
      refreshDocuments();
    } else {
      console.error('No landId provided');
      setLoading(false);
    }
  }, [landId, reviewerRole, projectDocumentMappings, hasProjectMappingsInAPI]);

  // Document management helper functions (same as reviewer)
  const getDocumentTypes = () => {
    const typeMap = new Map();
    
    // IMPORTANT: Filter document types based on project_mappings for the current reviewerRole
    // If project_mappings exists, use it to determine which document types to show
    let documentTypes = [];
    
    if (hasProjectMappingsInAPI && projectDocumentMappings && reviewerRole) {
      // Use project_mappings to get allowed document types for this role
      const allowedTypesForRole = projectDocumentMappings[reviewerRole] || [];
      documentTypes = allowedTypesForRole.filter(docType => {
        // Filter out subtask document types
        if (docType === 'subtask-document' || 
            docType === 'subtask_document' ||
            docType.toLowerCase().includes('subtask document') ||
            docType.toLowerCase().includes('subtask-document') ||
            docType.toLowerCase().includes('subtask_document')) {
          return false;
        }
        return true;
      });
      console.log('[AdminDocumentVersions] ✅ Using project_mappings document types for role:', {
        reviewerRole: reviewerRole,
        documentTypes: documentTypes,
        projectMappings: projectDocumentMappings
      });
    } else if (allowedDocumentTypes.length > 0 && reviewerRole) {
      // Fallback: Use backend-filtered document types, but filter by role using project_mappings if available
      documentTypes = allowedDocumentTypes.filter(docType => {
        // Filter out subtask document types
        if (docType === 'subtask-document' || 
            docType === 'subtask_document' ||
            docType.toLowerCase().includes('subtask document') ||
            docType.toLowerCase().includes('subtask-document') ||
            docType.toLowerCase().includes('subtask_document')) {
          return false;
        }
        // If project_mappings exists, check if this doc type is allowed for the role
        if (hasProjectMappingsInAPI && projectDocumentMappings) {
          const allowedTypesForRole = projectDocumentMappings[reviewerRole] || [];
          return allowedTypesForRole.includes(docType);
        }
        return true;
      });
      console.log('[AdminDocumentVersions] Using backend-filtered document types (with role filter):', documentTypes);
    } else {
      // Fallback: derive from existing documents (old behavior)
      const filteredDocuments = documents.filter(doc => {
        // Filter out subtask documents
        if (doc.subtask_id) return false;
        // Filter by reviewer role
        return isDocumentTypeAllowed(doc.document_type);
      });
      
      documentTypes = [...new Set(filteredDocuments.map(doc => doc.document_type || 'unknown'))];
      console.log('[AdminDocumentVersions] Fallback: deriving document types from documents:', documentTypes);
    }
    
    documentTypes.forEach(type => {
      // Get all documents of this type (filtered by role)
      const filteredDocuments = documents.filter(doc => {
        // Filter out subtask documents
        if (doc.subtask_id) return false;
        // Filter by reviewer role
        return isDocumentTypeAllowed(doc.document_type);
      });
      
      const docsOfType = filteredDocuments
        .filter(doc => (doc.document_type || 'unknown') === type);
      
      // Group by doc_slot for independent D1/D2 processing
      const groupedDocs = docsOfType.length > 0 ? groupDocumentsBySlot(docsOfType) : {};
      
      // Calculate total count and latest version across all slots
      let totalCount = 0;
      let maxVersion = 0;
      const underReviewVersions = {}; // Track under review versions per slot: { D1: 3, D2: 5 }
      const approvedVersions = {}; // Track approved versions per slot: { D1: 2, D2: 4 }
      const rejectedVersions = {}; // Track rejected versions per slot: { D1: 1, D2: 3 }
      
      if (docsOfType.length > 0) {
        Object.entries(groupedDocs).forEach(([slot, slotDocs]) => {
          const sortedSlotDocs = slotDocs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          totalCount += sortedSlotDocs.length;
          
          // Track the latest (highest version) status for each slot
          let latestUnderReviewVersion = null;
          let latestApprovedVersion = null;
          let latestRejectedVersion = null;
          
          // Find the latest document that's under review, approved, or rejected in this slot
          sortedSlotDocs.forEach((doc, index) => {
            const versionNumber = doc.version_number || (index + 1); // Use actual version_number if available, otherwise calculate
            const isUnderReview = doc.version_status === 'under_review' || doc.status === 'under_review';
            const isApproved = doc.status === 'approved';
            const isRejected = doc.status === 'rejected';
            
            // Track only the latest version for each status
            if (isUnderReview) {
              if (!latestUnderReviewVersion || versionNumber > latestUnderReviewVersion) {
                latestUnderReviewVersion = versionNumber;
                underReviewVersions[slot] = versionNumber;
              }
            } else if (isApproved) {
              if (!latestApprovedVersion || versionNumber > latestApprovedVersion) {
                latestApprovedVersion = versionNumber;
                approvedVersions[slot] = versionNumber;
              }
            } else if (isRejected) {
              if (!latestRejectedVersion || versionNumber > latestRejectedVersion) {
                latestRejectedVersion = versionNumber;
                rejectedVersions[slot] = versionNumber;
              }
            }
          });
          
          maxVersion = Math.max(maxVersion, sortedSlotDocs.length);
        });
      }
      
      // Initialize document type (show even if no documents exist yet)
      typeMap.set(type, {
        id: type,
        name: type.replace(/-|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: getDocumentTypeIcon(type),
        count: totalCount,
        latestVersion: maxVersion || 0, // Latest version across all slots (0 if no documents)
        underReviewVersions: underReviewVersions, // Object with slot -> version mapping
        approvedVersions: approvedVersions, // Object with slot -> version mapping
        rejectedVersions: rejectedVersions, // Object with slot -> version mapping
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
      underReviewVersions: type.underReviewVersions,
      approvedVersions: type.approvedVersions,
      rejectedVersions: type.rejectedVersions
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
        // Preserve approved/rejected status - these take priority
        let finalStatus = doc.status || 'pending';
        let finalVersionStatus = doc.version_status || 'active';
        
        // If document is approved or rejected, preserve that status
        if (doc.status === 'approved' || doc.status === 'rejected') {
          finalStatus = doc.status;
          finalVersionStatus = doc.version_status || 'active';
        } 
        // If document is under review, use that status
        else if (doc.version_status === 'under_review' || doc.status === 'under_review') {
          finalStatus = 'under_review';
          finalVersionStatus = 'under_review';
        }
        // Otherwise, use the status from the document
        else {
          finalStatus = doc.status || doc.version_status || 'pending';
          finalVersionStatus = doc.version_status || doc.status || 'active';
        }
        
        const processedDoc = {
          ...doc,
          version: index + 1, // Independent version numbering per slot
          isLatest: index === sortedSlotDocs.length - 1, // Last document in slot is latest
          // Preserve the actual status from backend (approved, rejected, under_review, pending, etc.)
          status: finalStatus,
          version_status: finalVersionStatus
        };
        
        console.log(`Processing document ${doc.file_name} in ${slot}:`, {
          original_status: doc.status,
          original_version_status: doc.version_status,
          final_status: processedDoc.status,
          final_version_status: processedDoc.version_status,
          isApproved: processedDoc.status === 'approved',
          isRejected: processedDoc.status === 'rejected',
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

  const refreshDocuments = async () => {
    try {
      setLoading(true);
      console.log('Refreshing documents from server...');
      console.log('Reviewer role:', reviewerRole, 'Is admin:', isAdmin);
      const docsResponse = await documentsAPI.getDocuments(landId);
      console.log('Raw documents response:', docsResponse);
      
      // Filter out subtask documents, filter by role, and ensure proper status mapping
      const filteredDocs = (docsResponse || [])
        .filter(doc => {
          // Filter out subtask documents
          if (doc.subtask_id) return false;
          // Filter by reviewer role
          return isDocumentTypeAllowed(doc.document_type);
        })
        .map(doc => {
          // Preserve approved/rejected status - these take priority
          let finalStatus = doc.status || 'pending';
          let finalVersionStatus = doc.version_status || 'active';
          
          // If document is approved or rejected, preserve that status
          if (doc.status === 'approved' || doc.status === 'rejected') {
            finalStatus = doc.status;
            // After approval/rejection, version_status should be 'active' (not under_review)
            finalVersionStatus = doc.version_status || 'active';
          } 
          // If document is under review, use that status
          else if (doc.version_status === 'under_review' || doc.status === 'under_review') {
            finalStatus = 'under_review';
            finalVersionStatus = 'under_review';
          }
          // Otherwise, use the status from the document
          else {
            finalStatus = doc.status || doc.version_status || 'pending';
            finalVersionStatus = doc.version_status || doc.status || 'active';
          }
          
          const processedDoc = {
            ...doc,
            // Preserve the actual status from backend (approved, rejected, under_review, pending, etc.)
            status: finalStatus,
            version_status: finalVersionStatus
          };
          console.log(`Refreshed document ${doc.file_name}:`, {
            version_status: doc.version_status,
            original_status: doc.status,
            final_status: processedDoc.status,
            final_version_status: processedDoc.version_status,
            isApproved: processedDoc.status === 'approved',
            isRejected: processedDoc.status === 'rejected',
            document_type: doc.document_type,
            allowed: isDocumentTypeAllowed(doc.document_type)
          });
          return processedDoc;
        });
      
      console.log('Setting documents state (filtered by role):', {
        totalDocs: docsResponse?.length || 0,
        filteredDocs: filteredDocs.length,
        reviewerRole: reviewerRole,
        isAdmin: isAdmin,
        filteredDocTypes: filteredDocs.map(d => d.document_type)
      });
      
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('Failed to refresh documents:', error);
      toast.error('Failed to load documents: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Admin can only view documents, not mark them for review
  // Review functionality is restricted to reviewers only

  const handleViewDocument = (doc) => {
    // Open document in new tab
    window.open(`/api/documents/download/${doc.document_id}`, '_blank');
  };

  const handleDownloadDocument = (doc) => {
    // Download document
    const link = document.createElement('a');
    link.href = `/api/documents/download/${doc.document_id}`;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon name="Loader" size={32} className="animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mt-5">
            <div>
              <h1 className="text-3xl font-bold text-foreground mt-8">Document Versions</h1>
              <p className="text-muted-foreground mt-2">
                View document versions and review status for this project (Read-only)
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Icon name="Eye" size={16} className="text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">Admin View - Read Only</span>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon name="ArrowLeft" size={16} />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Document Types */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
                Document Types
                {reviewerRole && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Role: {reviewerRole})
                  </span>
                )}
              </h3>
              {!reviewerRole && (
                <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 text-xs rounded">
                  ⚠️ No reviewer role set. Documents may not be filtered correctly.
                </div>
              )}
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
                        <div className="flex items-center space-x-2 mt-1 flex-wrap gap-1">
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            Latest: v{docType.latestVersion}
                          </span>
                          {/* Show only the latest status per slot - priority: Under Review > Approved > Rejected */}
                          {Object.keys(docType.underReviewVersions || {}).length > 0 && (
                            Object.entries(docType.underReviewVersions).map(([slot, version]) => (
                              <span key={slot} className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                                Under Review {slot}: v{version}
                              </span>
                            ))
                          )}
                          {/* Show approved only if not under review for that slot */}
                          {Object.keys(docType.approvedVersions || {}).length > 0 && (
                            Object.entries(docType.approvedVersions)
                              .filter(([slot]) => !docType.underReviewVersions?.[slot]) // Don't show approved if under review
                              .map(([slot, version]) => (
                                <span key={slot} className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  Approved {slot}: v{version}
                                </span>
                              ))
                          )}
                          {/* Show rejected only if not under review for that slot */}
                          {Object.keys(docType.rejectedVersions || {}).length > 0 && (
                            Object.entries(docType.rejectedVersions)
                              .filter(([slot]) => !docType.underReviewVersions?.[slot]) // Don't show rejected if under review
                              .map(([slot, version]) => (
                                <span key={slot} className="inline-block px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                                  Rejected {slot}: v{version}
                                </span>
                              ))
                          )}
                        </div>
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
                      <button
                        onClick={() => toggleAccordion(docIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon name="File" size={20} className="text-primary" />
                          <span className="font-medium text-foreground">{docSlot}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            {docs.length} version{docs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Icon 
                          name={expandedAccordions[docIndex] ? "ChevronUp" : "ChevronDown"} 
                          size={20} 
                          className="text-muted-foreground" 
                        />
                      </button>

                      {/* Accordion Content */}
                      {expandedAccordions[docIndex] && (
                        <div className="border-t border-border">
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {docs.map((doc, versionIndex) => (
                                <div
                                  key={`${doc.document_id}-${doc.status}-${forceUpdate}`}
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
                                            {/* Show approved/rejected status first, then under review - only one at a time */}
                                            {doc.status === 'approved' ? (
                                              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                                                Approved
                                              </span>
                                            ) : doc.status === 'rejected' ? (
                                              <span className="px-2 py-1 bg-red-500 text-white text-xs rounded">
                                                Rejected
                                              </span>
                                            ) : (doc.status === 'under_review' || doc.version_status === 'under_review') ? (
                                              <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                                                Under Review
                                              </span>
                                            ) : null}
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
                                          <span>{doc.created_at ? new Date(doc.created_at).toLocaleString() : 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>By:</span>
                                          <span className="truncate">{doc.uploader_name || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions - Read-only for Admin */}
                                    <div className="flex items-center justify-between pt-3 border-t border-border">
                                      <div className="flex items-center space-x-1">
                                        {/* Review Status Indicator (Read-only) */}
                                        <div className={`px-3 py-1 text-sm border rounded-md ${
                                          doc.status === 'approved' 
                                            ? 'bg-green-100 text-green-700 border-green-300' 
                                            : doc.status === 'rejected'
                                            ? 'bg-red-100 text-red-700 border-red-300'
                                            : doc.status === 'under_review' || doc.version_status === 'under_review'
                                            ? 'bg-orange-100 text-orange-700 border-orange-300' 
                                            : 'bg-gray-100 text-gray-700 border-gray-300'
                                        }`}>
                                          <Icon 
                                            name={
                                              doc.status === 'approved' ? 'CheckCircle' 
                                              : doc.status === 'rejected' ? 'XCircle'
                                              : doc.status === 'under_review' || doc.version_status === 'under_review' ? 'Clock' 
                                              : 'Check'
                                            } 
                                            size={16} 
                                          />
                                        </div>
                                        {doc.status === 'approved' && doc.approved_at && (
                                          <span className="text-xs text-muted-foreground px-2">
                                            Approved {new Date(doc.approved_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        {doc.status === 'rejected' && doc.rejection_reason && (
                                          <span className="text-xs text-red-600 px-2" title={doc.rejection_reason}>
                                            Rejected
                                          </span>
                                        )}
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
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center py-12">
                  <Icon name="FileText" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Select a Document Type</h3>
                  <p className="text-muted-foreground">
                    Choose a document type from the sidebar to view its versions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentVersions;
