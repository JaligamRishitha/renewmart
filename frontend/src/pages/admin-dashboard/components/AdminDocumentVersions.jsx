import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { documentVersionsAPI, documentAssignmentAPI } from '../../../services/api';

const AdminDocumentVersions = ({ landId, onClose, isModal = true }) => {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [versions, setVersions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [versionHistory, setVersionHistory] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  useEffect(() => {
    if (landId) {
      loadDocumentData();
    }
  }, [landId]);

  const loadDocumentData = async () => {
    try {
      setLoading(true);
      console.log('Loading document data for landId:', landId);
      
      // Get document status summary to see all document types
      const summary = await documentVersionsAPI.getStatusSummary(landId);
      console.log('Document status summary:', summary);
      setDocumentTypes(summary);
      
      // Get document assignments for this land
      const landAssignments = await documentAssignmentAPI.getLandAssignments(landId);
      console.log('Land assignments:', landAssignments);
      setAssignments(landAssignments);
      
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
      setShowVersionHistory(true);
    } catch (err) {
      console.error('Failed to load version history:', err);
      setError('Failed to load version history');
    }
  };

  const handleLockVersion = async (documentId) => {
    try {
      await documentVersionsAPI.lockVersionForReview(documentId, {
        locked_by: 'admin',
        lock_reason: 'Manual lock for review',
        assignment_notes: 'Version locked by administrator'
      });
      
      // Refresh versions
      if (selectedDocumentType) {
        await loadVersions(selectedDocumentType);
      }
    } catch (err) {
      console.error('Failed to lock version:', err);
      setError('Failed to lock version');
    }
  };

  const handleUnlockVersion = async (documentId) => {
    try {
      await documentVersionsAPI.unlockVersion(documentId, 'Unlocked by administrator');
      
      // Refresh versions
      if (selectedDocumentType) {
        await loadVersions(selectedDocumentType);
      }
    } catch (err) {
      console.error('Failed to unlock version:', err);
      setError('Failed to unlock version');
    }
  };

  const handleArchiveVersion = async (documentId) => {
    try {
      await documentVersionsAPI.archiveVersion(documentId, 'Archived by administrator');
      
      // Refresh versions
      if (selectedDocumentType) {
        await loadVersions(selectedDocumentType);
      }
    } catch (err) {
      console.error('Failed to archive version:', err);
      setError('Failed to archive version');
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

  const getAssignmentInfo = (documentId) => {
    return assignments.find(assignment => assignment.document_id === documentId);
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
    ? "bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden"
    : "bg-card border border-border rounded-lg overflow-hidden";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Document Versions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and review document versions for this project
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

        {/* Content */}
        <div className={`flex ${isModal ? 'h-[calc(90vh-120px)]' : 'h-[600px]'}`}>
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
                  Assignments ({assignments.length})
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && selectedDocumentType && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {selectedDocumentType.replace(/_/g, ' ').toUpperCase()} - Versions
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All versions of this document type
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
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {versions.map((version) => {
                        const assignment = getAssignmentInfo(version.document_id);
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
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(version.version_status)}`}>
                                      <Icon name={getStatusIcon(version.version_status)} size={12} className="mr-1" />
                                      {version.version_status.replace('_', ' ').toUpperCase()}
                                    </div>
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
                                    <span>{formatDate(version.created_at)}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>By:</span>
                                    <span className="truncate">{version.uploader_name}</span>
                                  </div>
                                </div>

                                {version.version_change_reason && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <span className="font-medium">Reason:</span> {version.version_change_reason}
                                  </div>
                                )}

                                {assignment && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                    <div className="flex items-center space-x-1 mb-1">
                                      <Icon name="UserCheck" size={12} className="text-yellow-600" />
                                      <span className="font-medium text-yellow-800">Assigned</span>
                                    </div>
                                    <div className="text-yellow-700">
                                      <p className="truncate">{assignment.assignee_name}</p>
                                      <p>{assignment.assignment_status}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-3 border-t border-border">
                                <div className="flex items-center space-x-1">
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
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    iconName="History"
                                    title="View Version History"
                                    onClick={() => loadVersionHistory(version.document_id)}
                                  />
                                </div>
                                <div className="flex items-center space-x-1">
                                  {!assignment && version.version_status === 'active' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      iconName="Lock"
                                      title="Lock for Review"
                                      onClick={() => handleLockVersion(version.document_id)}
                                    />
                                  )}
                                  {assignment && assignment.assignment_status === 'assigned' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      iconName="Unlock"
                                      title="Unlock"
                                      onClick={() => handleUnlockVersion(version.document_id)}
                                    />
                                  )}
                                  {version.version_status === 'active' && !version.is_latest_version && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      iconName="Archive"
                                      title="Archive Version"
                                      onClick={() => handleArchiveVersion(version.document_id)}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'assignments' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Document Assignments
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      All document version assignments for this project
                    </p>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="text-center py-8">
                      <Icon name="UserCheck" size={48} className="text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Assignments</h3>
                      <p className="text-muted-foreground">
                        No document versions have been assigned to reviewers yet.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assignments.map((assignment) => (
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
                                      {assignment.document_type?.replace(/_/g, ' ').toUpperCase()}
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
                                    {assignment.assignment_status.replace('_', ' ').toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Assignment Info */}
                            <div className="flex-1 mb-3">
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center justify-between">
                                  <span>Assigned to:</span>
                                  <span className="truncate">{assignment.assignee_name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Role:</span>
                                  <span>{assignment.reviewer_role.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Assigned:</span>
                                  <span>{formatDate(assignment.assigned_at)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Priority:</span>
                                  <span>{assignment.priority}</span>
                                </div>
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
                              </div>

                              {assignment.assignment_notes && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <span className="font-medium">Notes:</span> {assignment.assignment_notes}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-3 border-t border-border">
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  iconName="Edit"
                                  title="Update Assignment"
                                />
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  iconName="X"
                                  title="Cancel Assignment"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Version History & Audit Trail</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete history of document changes and review activities
                </p>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon name="X" size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {versionHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Icon name="Clock" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No History Available</h3>
                  <p className="text-muted-foreground">
                    No version history has been recorded for this document yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {versionHistory.map((entry, index) => (
                    <div
                      key={index}
                      className={`border-l-4 pl-4 py-3 ${
                        entry.action_type === 'upload' ? 'border-green-500 bg-green-50' :
                        entry.action_type === 'review' ? 'border-blue-500 bg-blue-50' :
                        entry.action_type === 'lock' ? 'border-yellow-500 bg-yellow-50' :
                        entry.action_type === 'archive' ? 'border-gray-500 bg-gray-50' :
                        'border-primary bg-primary/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Icon 
                              name={
                                entry.action_type === 'upload' ? 'Upload' :
                                entry.action_type === 'review' ? 'FileCheck' :
                                entry.action_type === 'lock' ? 'Lock' :
                                entry.action_type === 'archive' ? 'Archive' :
                                'Activity'
                              } 
                              size={16} 
                              className={
                                entry.action_type === 'upload' ? 'text-green-600' :
                                entry.action_type === 'review' ? 'text-blue-600' :
                                entry.action_type === 'lock' ? 'text-yellow-600' :
                                entry.action_type === 'archive' ? 'text-gray-600' :
                                'text-primary'
                              }
                            />
                            <span className="font-medium text-foreground">
                              {entry.action_type === 'upload' ? 'Document Uploaded' :
                               entry.action_type === 'review' ? 'Review Activity' :
                               entry.action_type === 'lock' ? 'Version Locked' :
                               entry.action_type === 'archive' ? 'Version Archived' :
                               'System Activity'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><span className="font-medium">Version:</span> {entry.version_number}</p>
                            <p><span className="font-medium">User:</span> {entry.user_name || entry.action_by}</p>
                            {entry.action_description && (
                              <p><span className="font-medium">Description:</span> {entry.action_description}</p>
                            )}
                            {entry.reason && (
                              <p><span className="font-medium">Reason:</span> {entry.reason}</p>
                            )}
                            {entry.file_name && (
                              <p><span className="font-medium">File:</span> {entry.file_name}</p>
                            )}
                            {entry.file_size && (
                              <p><span className="font-medium">Size:</span> {formatFileSize(entry.file_size)}</p>
                            )}
                          </div>

                          {entry.review_feedback && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center space-x-2 mb-2">
                                <Icon name="MessageSquare" size={16} className="text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">Review Feedback</span>
                              </div>
                              <p className="text-sm text-blue-700">{entry.review_feedback}</p>
                            </div>
                          )}

                          {entry.approval_status && (
                            <div className="mt-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                entry.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                                entry.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                entry.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.approval_status.toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowVersionHistory(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentVersions;
