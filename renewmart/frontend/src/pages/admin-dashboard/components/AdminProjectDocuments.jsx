import React, { useState, useEffect } from 'react';
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
    const colors = {
      'active': 'text-green-600 bg-green-100',
      'under_review': 'text-yellow-600 bg-yellow-100',
      'archived': 'text-gray-600 bg-gray-100',
      'locked': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'active': 'CheckCircle',
      'under_review': 'Clock',
      'archived': 'Archive',
      'locked': 'Lock'
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

  const toggleSlot = (slot) => {
    setExpandedSlots(prev => 
      prev.includes(slot) 
        ? prev.filter(s => s !== slot)
        : [...prev, slot]
    );
  };

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
                    Assignments ({(() => {
                      if (!selectedDocumentType) return assignments.length;
                      const selectedType = selectedDocumentType.toLowerCase();
                      return assignments.filter(a => {
                        const assignmentType = a.document_type?.toLowerCase();
                        // Also try matching with underscores/hyphens normalized
                        const normalizedAssignmentType = assignmentType?.replace(/-/g, '_');
                        const normalizedSelectedType = selectedType.replace(/-/g, '_');
                        return assignmentType === selectedType || normalizedAssignmentType === normalizedSelectedType;
                      }).length;
                    })()})
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
                                                    {version.version_status && version.version_status !== 'active' && (
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

                                                {/* Review Information */}
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
                        Document Assignments
                        {selectedDocumentType && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            - {selectedDocumentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedDocumentType 
                          ? `Assignments for ${selectedDocumentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                          : 'Select a document type to view assignments'}
                      </p>
                    </div>

                    {!selectedDocumentType ? (
                      <div className="text-center py-8">
                        <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">Select a Document Type</h3>
                        <p className="text-muted-foreground">
                          Please select a document type from the sidebar to view its assignments.
                        </p>
                      </div>
                    ) : (() => {
                      // Filter assignments by selected document type (case-insensitive, normalize hyphens/underscores)
                      const filteredAssignments = assignments.filter(assignment => {
                        if (!selectedDocumentType) return true;
                        const assignmentType = assignment.document_type?.toLowerCase();
                        const selectedType = selectedDocumentType.toLowerCase();
                        // Normalize hyphens to underscores for comparison
                        const normalizedAssignmentType = assignmentType?.replace(/-/g, '_');
                        const normalizedSelectedType = selectedType.replace(/-/g, '_');
                        return assignmentType === selectedType || normalizedAssignmentType === normalizedSelectedType;
                      });
                      
                      // Group assignments by slot (D1, D2)
                      const assignmentsBySlot = filteredAssignments.reduce((acc, assignment) => {
                        const slot = assignment.doc_slot || 'D1';
                        if (!acc[slot]) {
                          acc[slot] = [];
                        }
                        acc[slot].push(assignment);
                        return acc;
                      }, {});

                      // Sort slots: D1 first, then D2, then others
                      const sortedSlots = Object.keys(assignmentsBySlot).sort((a, b) => {
                        if (a === 'D1') return -1;
                        if (b === 'D1') return 1;
                        if (a === 'D2') return -1;
                        if (b === 'D2') return 1;
                        return a.localeCompare(b);
                      });
                      
                      return filteredAssignments.length === 0 ? (
                        <div className="text-center py-8">
                          <Icon name="UserCheck" size={48} className="text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No Assignments</h3>
                          <p className="text-muted-foreground">
                            No assignments found for this document type.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {sortedSlots.map(slot => (
                            <div key={slot} className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <h4 className="text-md font-semibold text-foreground">
                                  {slot}
                                </h4>
                                <span className="text-sm text-muted-foreground">
                                  ({assignmentsBySlot[slot].length} assignment{assignmentsBySlot[slot].length !== 1 ? 's' : ''})
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {assignmentsBySlot[slot].map((assignment) => {
                                  const reviewerInfo = getReviewerInfo(assignment.assigned_to);
                                  
                                  return (
                                    <div
                                      key={assignment.assignment_id}
                                      className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-all"
                                    >
                                      <div className="flex flex-col h-full">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                              <Icon name="FileText" size={20} className="text-blue-600" />
                                            </div>
                                            <div>
                                              <div className="flex items-center space-x-2">
                                                <span className="font-medium text-foreground text-sm">
                                                  {assignment.document_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  v{assignment.version_number}
                                                </span>
                                              </div>
                                              <div className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                                assignment.assignment_status === 'completed' ? 'bg-green-100 text-green-800' :
                                                assignment.assignment_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                              }`}>
                                                {assignment.assignment_status?.replace('_', ' ').toUpperCase() || 'ASSIGNED'}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                  {/* Assignment Info */}
                                  <div className="flex-1 mb-3">
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                      <div className="flex items-center justify-between">
                                        <span>Assigned to:</span>
                                        <span className="truncate">
                                          {assignment.assignee_name || (reviewerInfo ? reviewerInfo.name : 'Unknown')}
                                        </span>
                                      </div>
                                      {reviewerInfo && (
                                        <>
                                          <div className="flex items-center justify-between">
                                            <span>Email:</span>
                                            <span className="truncate">{reviewerInfo.email}</span>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span>Roles:</span>
                                            <span>{reviewerInfo.roles.map(formatRoleName).join(', ')}</span>
                                          </div>
                                        </>
                                      )}
                                      {!reviewerInfo && assignment.assigned_to && (
                                        <div className="flex items-center justify-between">
                                          <span>Reviewer ID:</span>
                                          <span className="truncate text-xs">{assignment.assigned_to}</span>
                                        </div>
                                      )}
                                      {assignment.reviewer_role && (
                                        <div className="flex items-center justify-between">
                                          <span>Reviewer Role:</span>
                                          <span>{formatRoleName(assignment.reviewer_role)}</span>
                                        </div>
                                      )}
                                      {!assignment.reviewer_role && reviewerInfo && reviewerInfo.roles.length > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span>Reviewer Role:</span>
                                          <span>{reviewerInfo.roles.map(formatRoleName).join(', ')}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <span>Assigned:</span>
                                        <span>{formatDate(assignment.assigned_at)}</span>
                                      </div>
                                      {assignment.started_at && (
                                        <div className="flex items-center justify-between">
                                          <span>Started:</span>
                                          <span>{formatDate(assignment.started_at)}</span>
                                        </div>
                                      )}
                                      {assignment.due_date && (
                                        <div className="flex items-center justify-between">
                                          <span>Due:</span>
                                          <span>{formatDate(assignment.due_date)}</span>
                                        </div>
                                      )}
                                      {assignment.completed_at && (
                                        <div className="flex items-center justify-between">
                                          <span>Completed:</span>
                                          <span>{formatDate(assignment.completed_at)}</span>
                                        </div>
                                      )}
                                      {assignment.file_name && (
                                        <div className="flex items-center justify-between">
                                          <span>File:</span>
                                          <span className="truncate" title={assignment.file_name}>{assignment.file_name}</span>
                                        </div>
                                      )}
                                    </div>

                                    {assignment.assignment_notes && (
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        <span className="font-medium">Notes:</span> {assignment.assignment_notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                              </div>
                            </div>
                          ))}
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

