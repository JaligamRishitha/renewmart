import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { usersAPI, documentVersionsAPI, documentAssignmentAPI } from '../../../services/api';

const DocumentVersionAssignmentModal = ({ project, onClose, onAssign }) => {
  const [formData, setFormData] = useState({
    reviewerRole: '',
    assignedTo: '',
    documentType: '',
    versionId: '',
    priority: 'medium',
    dueDate: '',
    assignmentNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documentVersions, setDocumentVersions] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);

  const reviewerRoles = [
    { 
      value: 're_sales_advisor', 
      label: 'RE Sales Advisor',
      description: 'Market evaluation and investor alignment'
    },
    { 
      value: 're_analyst', 
      label: 'RE Analyst',
      description: 'Technical and financial feasibility analysis'
    },
    { 
      value: 're_governance_lead', 
      label: 'RE Governance Lead',
      description: 'Compliance, regulatory, and local authority validation'
    }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  // Load document types and versions when component mounts
  useEffect(() => {
    loadDocumentData();
  }, [project]);

  // Fetch users when reviewer role changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!formData.reviewerRole) {
        setAvailableUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const users = await usersAPI.getUsers({ role: formData.reviewerRole, is_active: true });
        
        const userOptions = users.map(user => ({
          value: user.user_id,
          label: `${user.first_name} ${user.last_name}`,
          email: user.email
        }));
        
        setAvailableUsers(userOptions);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users for selected role');
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [formData.reviewerRole]);

  // Load versions when document type changes
  useEffect(() => {
    if (formData.documentType) {
      loadDocumentVersions(formData.documentType);
    } else {
      setDocumentVersions([]);
      setSelectedVersion(null);
    }
  }, [formData.documentType]);

  const loadDocumentData = async () => {
    try {
      setLoadingDocuments(true);
      const landId = project.landId || project.id;
      
      // Get document status summary to see all document types
      const summary = await documentVersionsAPI.getStatusSummary(landId);
      setDocumentTypes(summary);
      
    } catch (err) {
      console.error('Failed to load document data:', err);
      setError('Failed to load document data');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadDocumentVersions = async (documentType) => {
    try {
      setLoadingDocuments(true);
      const landId = project.landId || project.id;
      const versions = await documentVersionsAPI.getDocumentVersions(landId, documentType);
      
      // Filter out versions that are already under review or locked
      const availableVersions = versions.filter(version => 
        version.version_status === 'active' && !version.is_locked_for_review
      );
      
      setDocumentVersions(availableVersions);
      
      // Auto-select the latest version if available
      if (availableVersions.length > 0) {
        const latestVersion = availableVersions.find(v => v.is_latest_version) || availableVersions[0];
        setSelectedVersion(latestVersion);
        setFormData(prev => ({ ...prev, versionId: latestVersion.document_id }));
      }
      
    } catch (err) {
      console.error('Failed to load document versions:', err);
      setError('Failed to load document versions');
      setDocumentVersions([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleVersionSelect = (version) => {
    setSelectedVersion(version);
    setFormData(prev => ({ ...prev, versionId: version.document_id }));
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.reviewerRole || !formData.assignedTo || !formData.documentType || !formData.versionId) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const assignmentData = {
        document_id: formData.versionId,
        assigned_to: formData.assignedTo,
        reviewer_role: formData.reviewerRole,
        priority: formData.priority,
        due_date: formData.dueDate || null,
        assignment_notes: formData.assignmentNotes,
        land_id: project.landId || project.id
      };

      // Create document assignment
      await documentAssignmentAPI.createAssignment(assignmentData);

      // Lock the version for review
      await documentVersionsAPI.lockVersionForReview(formData.versionId, {
        locked_by: formData.assignedTo,
        lock_reason: 'Assigned for review',
        assignment_notes: formData.assignmentNotes
      });

      // Send notification to assigned reviewer
      await documentAssignmentAPI.sendAssignmentNotification({
        document_id: formData.versionId,
        assigned_to: formData.assignedTo,
        assignment_type: 'document_review',
        priority: formData.priority,
        due_date: formData.dueDate
      });

      await onAssign([assignmentData]);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign document version');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Assign Document Version</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Project: {project.projectName || project.title} - {project.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex items-center">
              <Icon name="AlertCircle" size={16} className="text-error mr-2" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Project Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Landowner:</span>
                <p className="font-medium text-foreground">{project.landownerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Project Type:</span>
                <p className="font-medium text-foreground">{project.projectType || project.energyType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Capacity:</span>
                <p className="font-medium text-foreground">{project.capacity}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium text-foreground">{project.status}</p>
              </div>
            </div>
          </div>

          {/* Reviewer Role Selection */}
          <Select
            label="Select Reviewer Role *"
            placeholder="Choose reviewer role"
            options={reviewerRoles}
            value={formData.reviewerRole}
            onChange={(value) => {
              handleInputChange('reviewerRole', value);
              handleInputChange('assignedTo', ''); // Reset assigned user when role changes
            }}
            required
            disabled={loading}
          />

          {/* Assigned To */}
          {formData.reviewerRole && (
            <Select
              label="Assign To *"
              placeholder={loadingUsers ? "Loading users..." : "Select a user"}
              options={availableUsers}
              value={formData.assignedTo}
              onChange={(value) => handleInputChange('assignedTo', value)}
              required
              disabled={loading || loadingUsers}
            />
          )}

          {/* Document Type Selection */}
          <Select
            label="Document Type *"
            placeholder={loadingDocuments ? "Loading document types..." : "Select document type"}
            options={documentTypes.map(docType => ({
              value: docType.document_type,
              label: docType.document_type.replace(/_/g, ' ').toUpperCase(),
              description: `${docType.total_versions} versions available`
            }))}
            value={formData.documentType}
            onChange={(value) => {
              handleInputChange('documentType', value);
              handleInputChange('versionId', ''); // Reset version selection
            }}
            required
            disabled={loading || loadingDocuments}
          />

          {/* Document Version Selection */}
          {formData.documentType && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Document Version *
              </label>
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Icon name="Loader2" size={24} className="animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading versions...</span>
                </div>
              ) : documentVersions.length === 0 ? (
                <div className="text-center py-8 bg-muted/50 rounded-lg">
                  <Icon name="FileX" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Available Versions</h3>
                  <p className="text-muted-foreground">
                    All versions of this document are currently under review or locked.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {documentVersions.map((version) => (
                    <div
                      key={version.document_id}
                      onClick={() => handleVersionSelect(version)}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedVersion?.document_id === version.document_id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="flex items-center space-x-2">
                              <Icon name="File" size={20} className="text-primary" />
                              <span className="font-medium text-foreground">
                                Version {version.version_number}
                              </span>
                              {version.is_latest_version && (
                                <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                                  Latest
                                </span>
                              )}
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(version.version_status)}`}>
                              <Icon name={getStatusIcon(version.version_status)} size={12} className="mr-1" />
                              {version.version_status.replace('_', ' ').toUpperCase()}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">File:</span> {version.file_name}
                            </div>
                            <div>
                              <span className="font-medium">Size:</span> {formatFileSize(version.file_size)}
                            </div>
                            <div>
                              <span className="font-medium">Uploaded:</span> {formatDate(version.created_at)}
                            </div>
                            <div>
                              <span className="font-medium">By:</span> {version.uploader_name}
                            </div>
                          </div>

                          {version.version_change_reason && (
                            <div className="text-sm text-muted-foreground mt-2">
                              <span className="font-medium">Reason:</span> {version.version_change_reason}
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          <Icon 
                            name={selectedVersion?.document_id === version.document_id ? "CheckCircle" : "Circle"} 
                            size={20} 
                            className={selectedVersion?.document_id === version.document_id ? "text-primary" : "text-muted-foreground"} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Assignment Details */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority"
              options={priorityOptions}
              value={formData.priority}
              onChange={(value) => handleInputChange('priority', value)}
              disabled={loading}
            />
            <Input
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Assignment Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assignment Notes
            </label>
            <textarea
              value={formData.assignmentNotes}
              onChange={(e) => handleInputChange('assignmentNotes', e.target.value)}
              placeholder="Enter specific instructions or requirements for this document review..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Version Management Info */}
          {selectedVersion && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <Icon name="Info" size={16} className="mr-2" />
                Version Management
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• This version will be locked for review once assigned</p>
                <p>• The reviewer will receive a notification about the assignment</p>
                <p>• If newer versions are uploaded, they won't affect this review</p>
                <p>• Each version maintains its own feedback and approval status</p>
              </div>
            </div>
          )}

          {/* Workflow Info */}
          {formData.reviewerRole && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                <Icon name="Info" size={16} className="mr-2" />
                Role Responsibilities
              </h4>
              <p className="text-sm text-muted-foreground">
                {reviewerRoles.find(r => r.value === formData.reviewerRole)?.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={loading}
              iconName="FileCheck"
              iconSize={18}
              disabled={!selectedVersion}
            >
              Assign Document Version
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentVersionAssignmentModal;
