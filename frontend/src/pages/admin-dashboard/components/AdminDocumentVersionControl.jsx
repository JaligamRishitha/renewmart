import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { documentVersionsAPI, documentAssignmentAPI, documentsAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const AdminDocumentVersionControl = ({ landId, onClose, isModal = true }) => {
  const { user } = useAuth();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [versionHistory, setVersionHistory] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'LayoutGrid' },
    { id: 'versions', label: 'Versions', icon: 'FileText' },
    { id: 'assignments', label: 'Assignments', icon: 'UserCheck' },
    { id: 'audit', label: 'Audit Trail', icon: 'History' },
    { id: 'notifications', label: 'Notifications', icon: 'Bell' }
  ];

  useEffect(() => {
    if (landId) {
      loadDocumentData();
    }
  }, [landId]);

  const loadDocumentData = async () => {
    try {
      setLoading(true);
      console.log('Loading document data for landId:', landId);
      
      // Get document status summary
      const summary = await documentVersionsAPI.getStatusSummary(landId);
      console.log('Document status summary:', summary);
      setDocumentTypes(summary);
      
      // Get document assignments
      const landAssignments = await documentAssignmentAPI.getLandAssignments(landId);
      console.log('Land assignments:', landAssignments);
      setAssignments(landAssignments);
      
      // Get notifications
      const notificationData = await getNotifications();
      setNotifications(notificationData);
      
    } catch (err) {
      console.error('Failed to load document data:', err);
      setError('Failed to load document data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (documentType) => {
    try {
      setLoading(true);
      console.log('Loading versions for documentType:', documentType, 'landId:', landId);
      const response = await documentVersionsAPI.getDocumentVersions(landId, documentType);
      console.log('Document versions response:', response);
      setVersions(response);
      setSelectedDocumentType(documentType);
      if (response.length > 0) {
        setSelectedVersion(response[0]);
      }
    } catch (err) {
      console.error('Failed to load document versions:', err);
      setError('Failed to load document versions: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async (documentId) => {
    try {
      const history = await documentVersionsAPI.getVersionHistory(documentId);
      setVersionHistory(history);
    } catch (err) {
      console.error('Failed to load version history:', err);
    }
  };

  const handleLockVersion = async (version) => {
    try {
      await documentVersionsAPI.lockVersionForReview(version.document_id, {
        lock_reason: 'Locked for review process',
        assignment_notes: 'Document version locked for ongoing review'
      });
      await loadVersions(selectedDocumentType);
      await loadDocumentData();
    } catch (err) {
      console.error('Failed to lock version:', err);
      setError('Failed to lock version: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUnlockVersion = async (version) => {
    try {
      await documentVersionsAPI.unlockVersion(version.document_id, 'Unlocked by admin');
      await loadVersions(selectedDocumentType);
      await loadDocumentData();
    } catch (err) {
      console.error('Failed to unlock version:', err);
      setError('Failed to unlock version: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleArchiveVersion = async (version) => {
    try {
      await documentVersionsAPI.archiveVersion(version.document_id, 'Archived by admin');
      await loadVersions(selectedDocumentType);
      await loadDocumentData();
    } catch (err) {
      console.error('Failed to archive version:', err);
      setError('Failed to archive version: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getNotifications = async () => {
    // Mock notifications - replace with actual API call
    return [
      {
        id: 1,
        type: 'new_version',
        message: 'New version uploaded: LandDeed_v3.pdf',
        timestamp: new Date().toISOString(),
        read: false,
        document_type: 'land_deed',
        version_number: 3
      },
      {
        id: 2,
        type: 'review_completed',
        message: 'Review completed for LandDeed_v2.pdf',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
        document_type: 'land_deed',
        version_number: 2
      }
    ];
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'locked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'CheckCircle';
      case 'under_review': return 'Clock';
      case 'archived': return 'Archive';
      case 'locked': return 'Lock';
      default: return 'FileText';
    }
  };

  if (loading && !selectedDocumentType) {
    return (
      <div className={isModal ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" : "flex items-center justify-center p-8"}>
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <Icon name="Loader2" size={24} className="animate-spin text-primary" />
            <span className="text-foreground">Loading document data...</span>
          </div>
        </div>
      </div>
    );
  }

  const containerClass = isModal
    ? "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    : "w-full";

  const contentClass = isModal
    ? "bg-card border border-border rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden"
    : "bg-card border border-border rounded-lg overflow-hidden";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Document Version Control</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage document versions, assignments, and audit trail for this project
            </p>
          </div>
          {isModal && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Icon name="X" size={24} />
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 mx-6 mt-4">
            <div className="flex items-center">
              <Icon name="AlertTriangle" size={20} className="text-error mr-2" />
              <div>
                <p className="text-error font-medium">Error Loading Document Data</p>
                <p className="text-error text-sm mt-1">{error}</p>
                <p className="text-error text-xs mt-2">Land ID: {landId}</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-6 mb-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Debug Information</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Land ID:</strong> {landId}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
              <p><strong>Document Types:</strong> {documentTypes.length}</p>
              <p><strong>Assignments:</strong> {assignments.length}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className={`flex ${isModal ? 'h-[calc(95vh-200px)]' : 'h-[700px]'}`}>
          {/* Sidebar - Document Types */}
          <div className="w-1/3 border-r border-border bg-muted/20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Document Types</h3>
                <Button
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                  className="text-xs"
                >
                  <Icon name="Upload" size={14} className="mr-1" />
                  Upload
                </Button>
              </div>
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
                            {docType.document_type.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {docType.total_versions} version{docType.total_versions !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {docType.under_review_versions > 0 && (
                            <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Under Review" />
                          )}
                          {docType.active_versions > 0 && (
                            <span className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                          )}
                          {docType.archived_versions > 0 && (
                            <span className="w-2 h-2 bg-gray-500 rounded-full" title="Archived" />
                          )}
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon name="FileText" size={24} className="text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                        <p className="text-2xl font-semibold text-foreground">{documentTypes.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Icon name="Clock" size={24} className="text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                        <p className="text-2xl font-semibold text-foreground">
                          {documentTypes.reduce((sum, doc) => sum + doc.under_review_versions, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Icon name="CheckCircle" size={24} className="text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted-foreground">Active Versions</p>
                        <p className="text-2xl font-semibold text-foreground">
                          {documentTypes.reduce((sum, doc) => sum + doc.active_versions, 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {versionHistory.slice(0, 5).map((entry, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm text-foreground">{entry.action}</p>
                            <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowUploadModal(true)}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Icon name="Upload" size={16} className="mr-2" />
                        Upload New Document
                      </Button>
                      <Button
                        onClick={() => setShowAssignmentModal(true)}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Icon name="UserCheck" size={16} className="mr-2" />
                        Assign Reviewer
                      </Button>
                      <Button
                        onClick={() => setActiveTab('audit')}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Icon name="History" size={16} className="mr-2" />
                        View Audit Trail
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Versions Tab */}
            {activeTab === 'versions' && (
              <div className="p-6">
                {selectedDocumentType ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">
                        Versions: {selectedDocumentType.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => setShowUploadModal(true)}
                        >
                          <Icon name="Upload" size={14} className="mr-1" />
                          Upload New Version
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowVersionHistory(true)}
                        >
                          <Icon name="History" size={14} className="mr-1" />
                          History
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Versions List */}
                      <div className="space-y-3">
                        {versions.map((version) => (
                          <div
                            key={version.document_id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedVersion?.document_id === version.document_id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedVersion(version)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${getStatusColor(version.status)}`}>
                                  <Icon name={getStatusIcon(version.status)} size={16} />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    Version {version.version_number || 'N/A'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {version.file_name || 'Unknown file'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(version.status)}`}>
                                  {version.status || 'Unknown'}
                                </span>
                                <div className="flex space-x-1">
                                  {version.status === 'active' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLockVersion(version);
                                      }}
                                    >
                                      <Icon name="Lock" size={12} />
                                    </Button>
                                  )}
                                  {version.status === 'under_review' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnlockVersion(version);
                                      }}
                                    >
                                      <Icon name="Unlock" size={12} />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveVersion(version);
                                    }}
                                  >
                                    <Icon name="Archive" size={12} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              <p>Uploaded: {version.upload_date || 'Unknown'}</p>
                              <p>By: {version.uploaded_by || 'Unknown'}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Version Details */}
                      {selectedVersion && (
                        <div className="bg-card border border-border rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-foreground mb-4">Version Details</h4>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">File Name</label>
                              <p className="text-sm text-foreground">{selectedVersion.file_name || 'Unknown'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Version Number</label>
                              <p className="text-sm text-foreground">{selectedVersion.version_number || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Status</label>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getStatusColor(selectedVersion.status)}`}>
                                {selectedVersion.status || 'Unknown'}
                              </span>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Upload Date</label>
                              <p className="text-sm text-foreground">{selectedVersion.upload_date || 'Unknown'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Uploaded By</label>
                              <p className="text-sm text-foreground">{selectedVersion.uploaded_by || 'Unknown'}</p>
                            </div>
                            <div className="pt-4 border-t border-border">
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => documentVersionsAPI.downloadVersion(selectedVersion.document_id)}
                                >
                                  <Icon name="Download" size={14} className="mr-1" />
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadVersionHistory(selectedVersion.document_id)}
                                >
                                  <Icon name="History" size={14} className="mr-1" />
                                  View History
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Select a Document Type</h3>
                    <p className="text-muted-foreground">
                      Choose a document type from the sidebar to view its versions.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Assignments Tab */}
            {activeTab === 'assignments' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Document Assignments</h3>
                  <Button onClick={() => setShowAssignmentModal(true)}>
                    <Icon name="UserPlus" size={16} className="mr-2" />
                    Assign Reviewer
                  </Button>
                </div>

                {assignments.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon name="UserCheck" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Assignments</h3>
                    <p className="text-muted-foreground">
                      No document versions have been assigned to reviewers yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.assignment_id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Icon name="User" size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{assignment.reviewer_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {assignment.document_type.replace(/_/g, ' ').toUpperCase()} - Version {assignment.version_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs rounded-full border ${
                              assignment.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                              assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }`}>
                              {assignment.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <div className="text-sm text-muted-foreground">
                              <p>Assigned: {assignment.assigned_date}</p>
                              <p>Due: {assignment.due_date}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audit Trail Tab */}
            {activeTab === 'audit' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Audit Trail</h3>
                <div className="space-y-4">
                  {versionHistory.map((entry, index) => (
                    <div key={index} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Icon name="History" size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{entry.action}</p>
                          <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                            <span>By: {entry.user_name}</span>
                            <span>Date: {entry.timestamp}</span>
                            <span>Version: {entry.version_number}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">Notifications</h3>
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`bg-card border border-border rounded-lg p-4 ${
                      !notification.read ? 'border-primary/50 bg-primary/5' : ''
                    }`}>
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-lg ${
                          notification.type === 'new_version' ? 'bg-green-100' :
                          notification.type === 'review_completed' ? 'bg-blue-100' :
                          'bg-yellow-100'
                        }`}>
                          <Icon name="Bell" size={16} className={
                            notification.type === 'new_version' ? 'text-green-600' :
                            notification.type === 'review_completed' ? 'text-blue-600' :
                            'text-yellow-600'
                          } />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{notification.message}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(notification.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentVersionControl;
