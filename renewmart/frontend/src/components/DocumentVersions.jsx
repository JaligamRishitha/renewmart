import React, { useState, useEffect } from 'react';
import Icon from './AppIcon';
import Button from './ui/Button';
import { documentsAPI } from '../services/api';

const DocumentVersions = ({ landId, documentType, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  useEffect(() => {
    if (landId && documentType) {
      loadVersions();
    }
  }, [landId, documentType]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getDocumentVersions(landId, documentType);
      setVersions(response);
    } catch (err) {
      console.error('Failed to load document versions:', err);
      setError('Failed to load document versions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'under_review': 'text-yellow-600 bg-yellow-100',
      'archived': 'text-gray-600 bg-gray-100',
      'locked': 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  const getStatusIcon = (status) => {
    const icons = {
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

  const toggleAccordion = (docIndex) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [docIndex]: !prev[docIndex]
    }));
  };

  const groupVersionsByDocument = () => {
    // Only use D1, D2 for Ownership Documents and Government NOCs
    const multiSlotTypes = ['ownership-documents', 'government-nocs'];
    const isMultiSlot = multiSlotTypes.includes(documentType);
    
    if (!isMultiSlot) {
      // For other document types, return as single group
      return { 'D1': versions };
    }
    
    // Group versions by actual doc_slot field for multi-slot types
    const grouped = {};
    versions.forEach((version) => {
      const docSlot = version.doc_slot || 'D1'; // Default to D1 if no slot specified
      if (!grouped[docSlot]) {
        grouped[docSlot] = [];
      }
      grouped[docSlot].push(version);
    });
    
    // Ensure D1 and D2 slots exist even if empty
    if (!grouped['D1']) grouped['D1'] = [];
    if (!grouped['D2']) grouped['D2'] = [];
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading document versions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Document Versions: {documentType}
            </h2>
            <p className="text-sm text-muted-foreground">
              View and manage all versions of this document
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconName="X"
          >
            Close
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={16} className="text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* Versions List */}
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Versions Found</h3>
            <p className="text-muted-foreground">
              No versions of this document have been uploaded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupVersionsByDocument()).map(([docSlot, docVersions], docIndex) => (
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
                      {docVersions.length} version{docVersions.length !== 1 ? 's' : ''}
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
                    <div className="p-4 space-y-3">
                      {docVersions.map((version, versionIndex) => (
                        <div
                          key={version.document_id}
                          className={`border rounded-lg p-4 ${
                            version.is_latest_version
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="flex items-center space-x-2">
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

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
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
                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                  <span className="font-medium">Change Reason:</span> {version.version_change_reason}
                                </div>
                              )}

                              {version.review_locked_at && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Icon name="Lock" size={14} className="text-yellow-600" />
                                    <span className="font-medium text-yellow-800">
                                      Locked for Review
                                    </span>
                                  </div>
                                  <p className="text-yellow-700 mt-1">
                                    This version is currently under review and cannot be modified.
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col space-y-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                iconName="Download"
                                iconPosition="left"
                              > 
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {versions.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Version Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Versions:</span> {versions.length}
              </div>
              <div>
                <span className="font-medium">Latest Version: v{Math.max(...versions.map(v => v.version_number))}</span> {Math.max(...versions.map(v => v.version_number))}
              </div>
              
              <div>
                <span className="font-medium">Under Review:</span> {versions.filter(v => v.version_status === 'under_review').length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVersions;