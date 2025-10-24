import React, { useState, useEffect } from 'react';
import Icon from './AppIcon';
import Button from './ui/Button';
import { documentsAPI } from '../services/api';

const DocumentVersions = ({ landId, documentType, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVersions();
  }, [landId, documentType]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.getDocumentVersions(landId, documentType);
      console.log('Document versions response:', response);
      // Handle both direct array response and nested data response
      const versions = Array.isArray(response) ? response : (response.data || []);
      setVersions(versions);
    } catch (err) {
      console.error('Failed to load document versions:', err);
      setError('Failed to load document versions');
    } finally {
      setLoading(false);
    }
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewDocument = async (version) => {
    try {
      const blob = await documentsAPI.downloadDocument(version.document_id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Clean up the URL after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Failed to view document:', error);
      setError('Failed to open document');
    }
  };

  const handleDownloadDocument = async (version) => {
    try {
      const blob = await documentsAPI.downloadDocument(version.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = version.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      setError('Failed to download document');
    }
  };


  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground text-sm">Loading versions...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Document Versions: {documentType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
            <p className="text-xs text-muted-foreground">
              View and manage all versions of this document
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconName="X"
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

       

        {/* Versions List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No versions found for this document type</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.document_id}
                  className={`border rounded-lg p-3 ${
                    version.is_latest_version 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon name="File" size={16} className="text-muted-foreground" />
                          <span className="font-medium text-sm text-foreground">
                            Version {version.version_number}
                            {version.is_latest_version && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                                Latest
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
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
                          <span className="font-medium">Type:</span> {version.mime_type}
                        </div>
                      </div>

                      {version.version_notes && (
                        <div className="mt-2 p-2 bg-muted rounded-lg">
                          <span className="font-medium text-xs">Version Notes:</span>
                          <p className="text-xs text-muted-foreground mt-1">{version.version_notes}</p>
                        </div>
                      )}

                      {version.admin_comments && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <span className="font-medium text-xs text-blue-900">Admin Comments:</span>
                          <p className="text-xs text-blue-700 mt-1">{version.admin_comments}</p>
                        </div>
                      )}

                      {version.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded-lg">
                          <span className="font-medium text-xs text-red-900">Rejection Reason:</span>
                          <p className="text-xs text-red-700 mt-1">{version.rejection_reason}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Eye"
                        title="View Document"
                        onClick={() => handleViewDocument(version)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="Download"
                        title="Download"
                        onClick={() => handleDownloadDocument(version)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {versions.length} version{versions.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersions;
