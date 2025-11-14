import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Header from '../../../components/ui/Header';
import { documentsAPI, documentVersionsAPI, documentAssignmentAPI, usersAPI, landsAPI } from '../../../services/api';

const AdminProjectDocuments = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [versions, setVersions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [reviewers, setReviewers] = useState({}); // Store reviewer info: {userId: {name, roles}}
  const [allDocuments, setAllDocuments] = useState([]); // Store all documents for lookup
  const [roleMappings, setRoleMappings] = useState({}); // Store role mappings: {documentType: [roles]}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSlots, setExpandedSlots] = useState([]); // Track expanded accordion slots

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load project details
      try {
        const projectData = await landsAPI.getLandById(projectId);
        setProject(projectData);
      } catch (err) {
        // Try alternative API method
        try {
          const projectData = await landsAPI.getLand(projectId);
          setProject(projectData);
        } catch (err2) {
          console.error('Failed to load project:', err2);
        }
      }

      // Load document status summary
      const summary = await documentVersionsAPI.getStatusSummary(projectId);
      setDocumentTypes(summary);

      // Load document role mappings for this project
      try {
        const mappingsData = await landsAPI.getProjectDocumentRoleMappings(projectId);
        const mappings = {};
        // Use project_mappings if available, otherwise use default_mappings
        const sourceMappings = mappingsData.project_mappings && Object.keys(mappingsData.project_mappings).length > 0
          ? mappingsData.project_mappings
          : mappingsData.default_mappings || {};
        
        Object.keys(sourceMappings).forEach(docType => {
          mappings[docType] = sourceMappings[docType] || [];
        });
        setRoleMappings(mappings);
        console.log('Loaded role mappings:', mappings);
      } catch (err) {
        console.error('Failed to load role mappings:', err);
        setRoleMappings({});
      }

      // Load document assignments
      let landAssignments = [];
      try {
        landAssignments = await documentAssignmentAPI.getLandAssignments(projectId);
        console.log('Loaded document assignments:', landAssignments);
      } catch (err) {
        console.error('Failed to load document assignments:', err);
        console.error('Error details:', err.response?.data);
      }

      // Also check documents that are under review via review_locked_by
      // This creates virtual assignments from documents that are locked for review
      try {
        const allDocs = await documentsAPI.getDocuments(projectId);
        setAllDocuments(allDocs || []); // Store for later use in version loading
        const documentsUnderReview = (allDocs || []).filter(doc => 
          doc.review_locked_by && 
          doc.version_status === 'under_review' &&
          !doc.subtask_id
        );

        console.log('Documents under review (via review_locked_by):', documentsUnderReview);

        // Create a map of document_id -> doc_slot for quick lookup
        const documentSlotMap = {};
        (allDocs || []).forEach(doc => {
          if (doc.document_id) {
            documentSlotMap[doc.document_id] = doc.doc_slot || 'D1';
          }
        });

        // Create virtual assignments from documents under review
        const virtualAssignments = documentsUnderReview.map(doc => {
          // Check if this document already has an assignment
          const existingAssignment = landAssignments.find(a => a.document_id === doc.document_id);
          if (existingAssignment) {
            return null; // Skip if already has explicit assignment
          }

          // Create virtual assignment
          return {
            assignment_id: `virtual-${doc.document_id}`, // Virtual ID
            document_id: doc.document_id,
            land_id: doc.land_id,
            assigned_to: doc.review_locked_by,
            assigned_by: doc.uploaded_by, // Use uploader as fallback
            reviewer_role: null, // Will be determined from reviewer's roles
            task_id: doc.task_id || null,
            assignment_status: 'in_progress', // Assume in progress if under review
            assignment_notes: 'Document marked for review',
            assigned_at: doc.review_locked_at || doc.created_at,
            started_at: doc.review_locked_at,
            completed_at: null,
            due_date: null,
            priority: 'medium',
            is_locked: true,
            lock_reason: 'Document locked for review',
            document_type: doc.document_type,
            file_name: doc.file_name,
            version_number: doc.version_number,
            version_status: doc.version_status,
            doc_slot: doc.doc_slot || 'D1',
            assignee_name: null, // Will be populated when we fetch reviewer info
            assigner_name: null
          };
        }).filter(Boolean); // Remove null entries

        // Enrich explicit assignments with doc_slot
        const enrichedLandAssignments = (landAssignments || []).map(assignment => ({
          ...assignment,
          doc_slot: documentSlotMap[assignment.document_id] || 'D1'
        }));

        // Combine explicit assignments with virtual assignments
        const allAssignments = [...enrichedLandAssignments, ...virtualAssignments];
        console.log('Total assignments (explicit + virtual):', allAssignments);
        setAssignments(allAssignments);

        // Load all unique reviewer IDs from assignments and documents
        const reviewerIds = new Set();
        allAssignments.forEach(assignment => {
          if (assignment.assigned_to) reviewerIds.add(assignment.assigned_to);
        });
        documentsUnderReview.forEach(doc => {
          if (doc.review_locked_by) reviewerIds.add(doc.review_locked_by);
        });

        // Fetch reviewer information
        const reviewerData = {};
        for (const userId of reviewerIds) {
          try {
            const userData = await usersAPI.getUserById(userId);
            reviewerData[userId] = {
              name: `${userData.first_name} ${userData.last_name}`,
              email: userData.email,
              roles: userData.roles || []
            };
          } catch (err) {
            console.error(`Failed to fetch user ${userId}:`, err);
          }
        }
        setReviewers(reviewerData);
      } catch (err) {
        console.error('Failed to load documents for review status:', err);
        // Still set assignments even if document loading fails
        setAssignments(landAssignments || []);
      }

    } catch (err) {
      console.error('Failed to load project data:', err);
      setError('Failed to load project data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (documentType) => {
    try {
      setLoading(true);
      const response = await documentVersionsAPI.getDocumentVersions(projectId, documentType);
      console.log('Document versions response:', response);
      
      // Fetch reviewer and uploader information for each version
      const versionsWithReviewers = await Promise.all(
        response.map(async (version) => {
          // Log version structure to debug field mapping
          console.log('Version data:', {
            document_id: version.document_id,
            created_at: version.created_at,
            uploader_name: version.uploader_name,
            first_name: version.first_name,
            last_name: version.last_name,
            uploaded_by: version.uploaded_by,
            uploader_email: version.uploader_email,
            email: version.email,
            all_keys: Object.keys(version)
          });
          
          // Fetch reviewer info if review_locked_by exists
          if (version.review_locked_by) {
            // Check if we already have this reviewer
            if (!reviewers[version.review_locked_by]) {
              try {
                const userData = await usersAPI.getUserById(version.review_locked_by);
                setReviewers(prev => ({
                  ...prev,
                  [version.review_locked_by]: {
                    name: `${userData.first_name} ${userData.last_name}`,
                    email: userData.email,
                    roles: userData.roles || []
                  }
                }));
              } catch (err) {
                console.error(`Failed to fetch reviewer ${version.review_locked_by}:`, err);
              }
            }
          }

          // Fetch approver info if approved_by exists
          if (version.approved_by) {
            // Check if we already have this approver
            if (!reviewers[version.approved_by]) {
              try {
                const userData = await usersAPI.getUserById(version.approved_by);
                setReviewers(prev => ({
                  ...prev,
                  [version.approved_by]: {
                    name: `${userData.first_name} ${userData.last_name}`,
                    email: userData.email,
                    roles: userData.roles || []
                  }
                }));
              } catch (err) {
                console.error(`Failed to fetch approver ${version.approved_by}:`, err);
              }
            }
          }
          
          // If uploader_name is missing/empty, try to get it from allDocuments or fetch from API
          const hasUploaderName = version.uploader_name && 
                                   version.uploader_name !== 'null' && 
                                   version.uploader_name !== 'undefined' && 
                                   version.uploader_name.trim() !== '';
          
          if (!hasUploaderName) {
            // First, try to get uploaded_by from allDocuments
            const docFromAll = allDocuments.find(d => d.document_id === version.document_id);
            const uploadedById = version.uploaded_by || docFromAll?.uploaded_by;
            
            if (uploadedById) {
              try {
                const uploaderData = await usersAPI.getUserById(uploadedById);
                if (uploaderData && uploaderData.first_name) {
                  version.uploader_name = `${uploaderData.first_name} ${uploaderData.last_name || ''}`.trim();
                } else if (uploaderData && uploaderData.email) {
                  version.uploader_name = uploaderData.email;
                }
              } catch (err) {
                console.error(`Failed to fetch uploader ${uploadedById}:`, err);
              }
            }
            
            // If still no name, try to use uploader_email or email from version
            if (!version.uploader_name || version.uploader_name.trim() === '') {
              version.uploader_name = version.uploader_email || version.email || null;
            }
          }
          
          // Also ensure created_at is properly formatted if it exists
          if (version.created_at && (version.created_at === 'null' || version.created_at === 'undefined')) {
            version.created_at = null;
          }
          
          // If created_at is missing, try to get it from allDocuments
          if (!version.created_at) {
            const docFromAll = allDocuments.find(d => d.document_id === version.document_id);
            if (docFromAll?.created_at) {
              version.created_at = docFromAll.created_at;
            } else if (docFromAll?.uploaded_at) {
              version.created_at = docFromAll.uploaded_at;
            }
          }
          
          return version;
        })
      );
      
      setVersions(versionsWithReviewers);
      setSelectedDocumentType(documentType);
      
      // Log assignments for debugging
      console.log('Current assignments:', assignments);
      console.log('Selected document type:', documentType);
      console.log('Filtered assignments:', assignments.filter(a => {
        const assignmentType = a.document_type?.toLowerCase();
        const selectedType = documentType.toLowerCase();
        return assignmentType === selectedType;
      }));
    } catch (err) {
      console.error('Failed to load document versions:', err);
      setError('Failed to load document versions: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    // version_status values: pending, under_review, approved, rejected
    const colors = {
      'pending': 'text-gray-600 bg-gray-100',
      'under_review': 'text-yellow-600 bg-yellow-100',
      'approved': 'text-green-600 bg-green-100',
      'rejected': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    // version_status values: pending, under_review, approved, rejected
    const icons = {
      'pending': 'MinusCircle',
      'under_review': 'Clock',
      'approved': 'CheckCircle',
      'rejected': 'XCircle'
    };
    return icons[status] || 'File';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Error formatting date:', dateString, err);
      return 'N/A';
    }
  };

  const formatRoleName = (role) => {
    const roleMap = {
      'administrator': 'Admin',
      're_sales_advisor': 'Sales Advisor',
      're_analyst': 'Analyst',
      're_governance_lead': 'Governance Lead',
      'landowner': 'Landowner',
      'investor': 'Investor'
    };
    return roleMap[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAssignmentInfo = (documentId) => {
    return assignments.find(assignment => assignment.document_id === documentId);
  };

  const getReviewerInfo = (userId) => {
    return reviewers[userId] || null;
  };

  // Get role status for a document version - uses ONLY version_status from backend
  // version_status should have: pending, under_review, approved, rejected
  const getRoleStatus = (version, roleKey) => {
    // Use ONLY version_status as source of truth (no fallback to status field)
    const versionStatus = version.version_status || 'pending';
    
    // Primary logic: Use version_status directly
    // If version is approved, all roles should show approved
    if (versionStatus === 'approved') {
      // If this role was the approver, show approver info
      if (version.approved_by) {
        const approverInfo = getReviewerInfo(version.approved_by);
        if (approverInfo && approverInfo.roles.includes(roleKey)) {
          return { status: 'approved', userId: version.approved_by, timestamp: version.approved_at };
        }
      }
      // For other roles, still show approved status (version is approved)
      return { status: 'approved', userId: version.approved_by || null, timestamp: version.approved_at || null };
    }
    
    // If version is rejected, all roles should show rejected
    if (versionStatus === 'rejected') {
      // If this role was the rejector, show rejector info
      if (version.approved_by) {
        const rejectorInfo = getReviewerInfo(version.approved_by);
        if (rejectorInfo && rejectorInfo.roles.includes(roleKey)) {
          return { status: 'rejected', userId: version.approved_by, timestamp: version.approved_at };
        }
      }
      // For other roles, still show rejected status (version is rejected)
      return { status: 'rejected', userId: version.approved_by || null, timestamp: version.approved_at || null };
    }
    
    // If version is under_review, check if this role is reviewing
    if (versionStatus === 'under_review') {
      // Check if this role is the one reviewing
      if (version.review_locked_by) {
        const reviewerInfo = getReviewerInfo(version.review_locked_by);
        if (reviewerInfo && reviewerInfo.roles.includes(roleKey)) {
          return { status: 'under_review', userId: version.review_locked_by, timestamp: version.review_locked_at };
        }
      }
      // Check if there's an assignment for this role
      const assignment = assignments.find(a => 
        a.document_id === version.document_id && 
        a.reviewer_role === roleKey
      );
      if (assignment) {
        if (assignment.assignment_status === 'completed') {
          return { status: 'completed', userId: assignment.assigned_to, timestamp: assignment.completed_at };
        } else if (assignment.assignment_status === 'in_progress') {
          return { status: 'in_progress', userId: assignment.assigned_to, timestamp: assignment.started_at };
        } else {
          return { status: 'assigned', userId: assignment.assigned_to, timestamp: assignment.assigned_at };
        }
      }
      // Under review but not assigned to this role
      return { status: 'under_review', userId: null, timestamp: null };
    }
    
    // versionStatus === 'pending' or any other value
    // Check if there's an assignment for this role
    const assignment = assignments.find(a => 
      a.document_id === version.document_id && 
      a.reviewer_role === roleKey
    );
    if (assignment) {
      if (assignment.assignment_status === 'completed') {
        return { status: 'completed', userId: assignment.assigned_to, timestamp: assignment.completed_at };
      } else if (assignment.assignment_status === 'in_progress') {
        return { status: 'in_progress', userId: assignment.assigned_to, timestamp: assignment.started_at };
      } else {
        return { status: 'assigned', userId: assignment.assigned_to, timestamp: assignment.assigned_at };
      }
    }
    
    // No action taken - pending
    return { status: 'pending', userId: null, timestamp: null };
  };

  const toggleSlot = (slot) => {
    setExpandedSlots(prev => 
      prev.includes(slot) 
        ? prev.filter(s => s !== slot)
        : [...prev, slot]
    );
  };

  // Calculate assignment count for selected document type
  const assignmentCount = useMemo(() => {
    if (!selectedDocumentType) return assignments.length;
    
    const selectedType = selectedDocumentType.toLowerCase();
    const normalizedSelectedType = selectedType.replace(/-/g, '_');
    
    // Count assignments that match the document type
    return assignments.filter(a => {
      // First check if assignment has document_type field (most reliable)
      if (a.document_type) {
        const assignmentType = a.document_type.toLowerCase();
        const normalizedAssignmentType = assignmentType.replace(/-/g, '_');
        if (assignmentType === selectedType || normalizedAssignmentType === normalizedSelectedType) {
          return true;
        }
      }
      
      // If assignment doesn't have document_type, look it up from allDocuments
      if (a.document_id && allDocuments.length > 0) {
        const doc = allDocuments.find(d => d.document_id === a.document_id);
        if (doc && doc.document_type) {
          const docType = doc.document_type.toLowerCase();
          const normalizedDocType = docType.replace(/-/g, '_');
          if (docType === selectedType || normalizedDocType === normalizedSelectedType) {
            return true;
          }
        }
      }
      
      // Also check versions if loaded
      if (a.document_id && versions.length > 0) {
        const version = versions.find(v => v.document_id === a.document_id);
        if (version && version.document_type) {
          const versionType = version.document_type.toLowerCase();
          const normalizedVersionType = versionType.replace(/-/g, '_');
          if (versionType === selectedType || normalizedVersionType === normalizedSelectedType) {
            return true;
          }
        }
      }
      
      return false;
    }).length;
  }, [assignments, selectedDocumentType, allDocuments, versions]);

  if (loading && !selectedDocumentType) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="administrator" />
        <div className="pt-16">
          <div className="max-w-9xl mx-auto px-4 lg:px-6 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading project documents...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="administrator" />
      <div className="pt-16">
        <div className="max-w-9xl mx-auto px-4 lg:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/dashboard')}
                  iconName="ArrowLeft"
                  iconPosition="left"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="FileText" size={24} color="white" />
              </div>
              <div>
                <h1 className="font-heading font-bold text-2xl text-foreground">
                  Project Documents & Versions
                </h1>
                <p className="font-body text-lg text-muted-foreground">
                  {project?.title || 'Project'} - Complete document details and review history
                </p>
              </div>
            </div>

            {/* Project Info Card */}
            {project && (
              <div className="bg-card border border-border rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Project Name:</span>
                    <p className="font-medium text-foreground">{project.title}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <p className="font-medium text-foreground">{project.location_text || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <p className="font-medium text-foreground capitalize">{project.status}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertCircle" size={20} className="text-red-600" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex" style={{ minHeight: '600px' }}>
            {/* Sidebar - Document Types */}
            <div className="w-1/3 border-r border-border bg-muted/20">
              <div className="p-4">
                <h3 className="font-medium text-foreground mb-4">Document Types</h3>
                <div className="space-y-2">
                  {documentTypes.length > 0 ? (
                    documentTypes.map((docType) => (
                      <button
                        key={docType.document_type}
                        onClick={() => loadVersions(docType.document_type)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedDocumentType === docType.document_type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {docType.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {docType.total_versions} version{docType.total_versions !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Documents Found</h3>
                      <p className="text-muted-foreground">
                        No documents have been uploaded for this project yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
              {/* Tabs */}
              <div className="border-b border-border">
                <div className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('assignments')}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'assignments'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Assignments ({assignmentCount})
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'overview' && selectedDocumentType && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {selectedDocumentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - Versions
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        All versions with complete review details
                      </p>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading versions...</span>
                      </div>
                    ) : versions.length === 0 ? (
                      <div className="text-center py-8">
                        <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No Versions Found</h3>
                        <p className="text-muted-foreground">
                          No versions of this document have been uploaded yet.
                        </p>
                      </div>
                    ) : (() => {
                      // Group versions by slot (D1, D2)
                      const versionsBySlot = versions.reduce((acc, version) => {
                        const slot = version.doc_slot || 'D1';
                        if (!acc[slot]) {
                          acc[slot] = [];
                        }
                        acc[slot].push(version);
                        return acc;
                      }, {});

                      // Sort slots: D1 first, then D2, then others
                      const sortedSlots = Object.keys(versionsBySlot).sort((a, b) => {
                        if (a === 'D1') return -1;
                        if (b === 'D1') return 1;
                        if (a === 'D2') return -1;
                        if (b === 'D2') return 1;
                        return a.localeCompare(b);
                      });

                      return (
                        <div className="space-y-4">
                          {sortedSlots.map(slot => {
                            const slotVersions = versionsBySlot[slot];
                            const isExpanded = expandedSlots.includes(slot);

                            return (
                              <div key={slot} className="bg-card border border-border rounded-lg shadow-elevation-1">
                                {/* Accordion Header */}
                                <button
                                  onClick={() => toggleSlot(slot)}
                                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-smooth focus:outline-none focus:ring-2 focus:ring-ring rounded-t-lg"
                                >
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                      <Icon name="Folder" size={20} className="text-primary" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <h3 className="font-semibold text-lg text-foreground">
                                          {slot}
                                        </h3>
                                        <span className="text-sm text-muted-foreground">
                                          ({slotVersions.length} version{slotVersions.length !== 1 ? 's' : ''})
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <Icon 
                                    name={isExpanded ? "ChevronUp" : "ChevronDown"} 
                                    size={20} 
                                    className="text-muted-foreground ml-4"
                                  />
                                </button>

                                {/* Accordion Content */}
                                {isExpanded && (
                                  <div className="px-4 pb-4 border-t border-border">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                      {slotVersions.map((version) => {
                                        const assignment = getAssignmentInfo(version.document_id);
                                        const reviewerInfo = version.review_locked_by ? getReviewerInfo(version.review_locked_by) : null;
                                        
                                        return (
                                          <div
                                            key={version.document_id}
                                            className={`border rounded-lg p-4 bg-card hover:shadow-md transition-all ${
                                              version.is_latest_version
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border'
                                            }`}
                                          >
                                            <div className="flex flex-col h-full">
                                              {/* Header */}
                                              <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center space-x-2">
                                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                    <Icon name="File" size={20} className="text-primary" />
                                                  </div>
                                                  <div>
                                                    <div className="flex items-center space-x-2">
                                                      <span className="font-medium text-foreground text-sm">
                                                        Version {version.version_number}
                                                      </span>
                                                      {version.is_latest_version && (
                                                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                                                          Latest
                                                        </span>
                                                      )}
                                                    </div>
                                                    {version.version_status && version.version_status !== 'pending' && (
                                                      <div className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(version.version_status)}`}>
                                                        <Icon name={getStatusIcon(version.version_status)} size={12} className="mr-1" />
                                                        {version.version_status?.replace('_', ' ').toUpperCase()}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* File Info */}
                                              <div className="flex-1 mb-3">
                                                <h3 className="font-medium text-foreground mb-2 text-sm truncate" title={version.file_name}>
                                                  {version.file_name}
                                                </h3>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                  <div className="flex items-center justify-between">
                                                    <span>Size:</span>
                                                    <span>{formatFileSize(version.file_size)}</span>
                                                  </div>
                                                  <div className="flex items-center justify-between">
                                                    <span>Uploaded:</span>
                                                    <span>
                                                      {formatDate(
                                                        version.created_at || 
                                                        version.upload_date || 
                                                        version.uploaded_at ||
                                                        version.uploaded_date
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center justify-between">
                                                    <span>By:</span>
                                                    <span className="truncate">
                                                      {(() => {
                                                        // Try multiple field name variations
                                                        const uploaderName = version.uploader_name || 
                                                                              version.uploaded_by_name ||
                                                                              (version.first_name && version.last_name ? `${version.first_name} ${version.last_name}`.trim() : null) ||
                                                                              version.uploader_email ||
                                                                              version.email;
                                                        return uploaderName && uploaderName !== 'null' && uploaderName !== 'undefined' && uploaderName.trim() !== '' 
                                                          ? uploaderName 
                                                          : 'Unknown';
                                                      })()}
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Review Information - Show for under_review status */}
                                                {version.version_status === 'under_review' && (
                                                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                                    <div className="flex items-center space-x-1 mb-1">
                                                      <Icon name="Clock" size={12} className="text-yellow-600" />
                                                      <span className="font-medium text-yellow-800">Under Review</span>
                                                    </div>
                                                    {reviewerInfo && (
                                                      <>
                                                        <div className="text-yellow-700">
                                                          <p><span className="font-medium">Marked by:</span> {reviewerInfo.name}</p>
                                                          <p><span className="font-medium">Email:</span> {reviewerInfo.email}</p>
                                                          <p><span className="font-medium">Role(s):</span> {reviewerInfo.roles.map(formatRoleName).join(', ')}</p>
                                                          {version.review_locked_at && (
                                                            <p><span className="font-medium">Locked at:</span> {formatDate(version.review_locked_at)}</p>
                                                          )}
                                                        </div>
                                                      </>
                                                    )}
                                                    {!reviewerInfo && version.review_locked_by && (
                                                      <p className="text-yellow-700">Reviewer ID: {version.review_locked_by}</p>
                                                    )}
                                                  </div>
                                                )}

                                                

                                                {/* Assignment Info */}
                                               {/* {assignment && (
                                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                                    <div className="flex items-center space-x-1 mb-1">
                                                      <Icon name="UserCheck" size={12} className="text-blue-600" />
                                                      <span className="font-medium text-blue-800">Assigned</span>
                                                    </div>
                                                    <div className="text-blue-700">
                                                      <p className="truncate"><span className="font-medium">To:</span> {assignment.assignee_name || 'Unknown'}</p>
                                                      <p><span className="font-medium">Status:</span> {assignment.assignment_status}</p>
                                                      {assignment.reviewer_role && (
                                                        <p><span className="font-medium">Role:</span> {formatRoleName(assignment.reviewer_role)}</p>
                                                      )}
                                                      {assignment.assigned_at && (
                                                        <p><span className="font-medium">Assigned:</span> {formatDate(assignment.assigned_at)}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                )} */}
                                              </div>

                                              {/* Actions */}
                                              <div className="flex items-center justify-between pt-3 border-t border-border">
                                                <div className="flex items-center space-x-1">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    iconName="Eye"
                                                    title="View"
                                                    onClick={() => {
                                                      window.open(`/api/documents/${version.document_id}/download`, '_blank');
                                                    }}
                                                  />
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    iconName="Download"
                                                    title="Download"
                                                    onClick={() => {
                                                      const link = document.createElement('a');
                                                      link.href = `/api/documents/${version.document_id}/download`;
                                                      link.download = version.file_name;
                                                      link.click();
                                                    }}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'assignments' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Role Assignments & Status
                        {selectedDocumentType && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            - {selectedDocumentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDocumentType 
                          ? `All roles assigned to ${selectedDocumentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} and their review status`
                          : 'Select a document type to view role assignments and status'}
                      </p>
                    </div>

                    {!selectedDocumentType ? (
                      <div className="text-center py-8">
                        <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">Select a Document Type</h3>
                        <p className="text-muted-foreground">
                          Please select a document type from the sidebar to view role assignments.
                        </p>
                      </div>
                    ) : (() => {
                      // Get roles for this document type
                      const docTypeKey = selectedDocumentType.toLowerCase().replace(/-/g, '_');
                      const assignedRoles = roleMappings[docTypeKey] || roleMappings[selectedDocumentType] || [];
                      
                      if (assignedRoles.length === 0 && versions.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Icon name="UserCheck" size={48} className="text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">No Roles Assigned</h3>
                            <p className="text-muted-foreground">
                              No roles are assigned to this document type. Please configure role mappings first.
                            </p>
                          </div>
                        );
                      }

                      // Group versions by slot
                      const versionsBySlot = versions.reduce((acc, version) => {
                        const slot = version.doc_slot || 'D1';
                        if (!acc[slot]) {
                          acc[slot] = [];
                        }
                        acc[slot].push(version);
                        return acc;
                      }, {});

                      // Sort slots
                      const sortedSlots = Object.keys(versionsBySlot).sort((a, b) => {
                        if (a === 'D1') return -1;
                        if (b === 'D1') return 1;
                        if (a === 'D2') return -1;
                        if (b === 'D2') return 1;
                        return a.localeCompare(b);
                      });

                      const getStatusColor = (status) => {
                        const colors = {
                          'approved': 'bg-green-100 text-green-800 border-green-200',
                          'rejected': 'bg-red-100 text-red-800 border-red-200',
                          'under_review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
                          'assigned': 'bg-purple-100 text-purple-800 border-purple-200',
                          'completed': 'bg-green-100 text-green-800 border-green-200',
                          'pending': 'bg-gray-100 text-gray-800 border-gray-200'
                        };
                        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
                      };

                      const getStatusIcon = (status) => {
                        const icons = {
                          'approved': 'CheckCircle',
                          'rejected': 'XCircle',
                          'under_review': 'Clock',
                          'in_progress': 'PlayCircle',
                          'assigned': 'UserCheck',
                          'completed': 'CheckCircle',
                          'pending': 'MinusCircle'
                        };
                        return icons[status] || 'Circle';
                      };

                      return versions.length === 0 ? (
                        <div className="text-center py-8">
                          <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No Versions Found</h3>
                          <p className="text-muted-foreground">
                            No document versions found for this document type.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {sortedSlots.map(slot => {
                            const slotVersions = versionsBySlot[slot];
                            return (
                              <div key={slot} className="space-y-4">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-md font-semibold text-foreground">
                                    {slot}
                                  </h4>
                                  <span className="text-sm text-muted-foreground">
                                    ({slotVersions.length} version{slotVersions.length !== 1 ? 's' : ''})
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {slotVersions.map((version) => {
                                    return (
                                      <div
                                        key={version.document_id}
                                        className={`border rounded-lg p-4 bg-card hover:shadow-md transition-all ${
                                          version.is_latest_version
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border'
                                        }`}
                                      >
                                        <div className="flex flex-col h-full">
                                          {/* Header */}
                                          <div className="mb-3">
                                            <div className="flex items-center space-x-2 mb-2">
                                              <Icon name="File" size={16} className="text-primary" />
                                              <span className="font-medium text-foreground text-sm">
                                                Version {version.version_number}
                                              </span>
                                              {version.is_latest_version && (
                                                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded">
                                                  Latest
                                                </span>
                                              )}
                                            </div>
                                            {version.file_name && (
                                              <p className="text-xs text-muted-foreground truncate" title={version.file_name}>
                                                {version.file_name}
                                              </p>
                                            )}
                                          </div>

                                          {/* Role Statuses */}
                                          <div className="flex-1 space-y-2">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                              Role Statuses:
                                            </div>
                                            {assignedRoles.length > 0 ? (
                                              assignedRoles.map((roleKey) => {
                                                const roleStatus = getRoleStatus(version, roleKey);
                                                const userInfo = roleStatus.userId ? getReviewerInfo(roleStatus.userId) : null;
                                                
                                                return (
                                                  <div
                                                    key={roleKey}
                                                    className={`border rounded p-2 text-xs ${getStatusColor(roleStatus.status)}`}
                                                  >
                                                    <div className="flex items-center justify-between mb-1">
                                                      <div className="flex items-center space-x-1">
                                                        <Icon name={getStatusIcon(roleStatus.status)} size={12} />
                                                        <span className="font-medium">
                                                          {formatRoleName(roleKey)}
                                                        </span>
                                                      </div>
                                                      <span className="font-semibold uppercase text-[10px]">
                                                        {roleStatus.status}
                                                      </span>
                                                    </div>
                                                    {userInfo && (
                                                      <div className="mt-1 text-[10px] opacity-90">
                                                        <div>{userInfo.name}</div>
                                                        {roleStatus.timestamp && (
                                                          <div>{formatDate(roleStatus.timestamp)}</div>
                                                        )}
                                                      </div>
                                                    )}
                                                    {!userInfo && roleStatus.status === 'pending' && (
                                                      <div className="mt-1 text-[10px] opacity-75 italic">
                                                        No action taken
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="text-xs text-muted-foreground italic">
                                                No roles assigned to this document type
                                              </div>
                                            )}
                                          </div>

                                          {/* Document Info */}
                                          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                                            <div className="flex items-center justify-between">
                                              <span>Uploaded:</span>
                                              <span>{formatDate(version.created_at)}</span>
                                            </div>
                                            {version.uploader_name && (
                                              <div className="flex items-center justify-between">
                                                <span>By:</span>
                                                <span className="truncate">{version.uploader_name}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProjectDocuments;

