import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { documentsAPI } from '../../../services/api';

const DocumentsModal = ({ project, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const fetchDocuments = async () => {
    if (!project?.id) {
      setError('No land selected');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching documents for land_id:', project?.id);
      const data = await documentsAPI.getDocuments(project?.id);
      console.log('Documents fetched:', data);
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load documents. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (doc) => {
    try {
      console.log('Attempting to view document:', doc.document_id, doc.file_name);
      
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      console.log('Blob received:', blob);
      console.log('Blob size:', blob?.size, 'Blob type:', blob?.type);
      
      if (!blob || blob.size === 0) {
        throw new Error('Document has no data. It may not have been stored in the database yet.');
      }
      
      const url = window.URL.createObjectURL(blob);
      console.log('Created blob URL:', url);
      
      // Open in new tab
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        alert('Pop-up blocked! Please allow pop-ups for this site and try again.');
        window.URL.revokeObjectURL(url);
        return;
      }
      
      // Clean up after a delay to allow the tab to load
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 2000);
    } catch (err) {
      console.error('Error viewing document:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to view document. ';
      
      if (err.response?.status === 404) {
        errorMessage += 'Document not found in database.';
      } else if (err.response?.status === 403) {
        errorMessage += 'You do not have permission to view this document.';
      } else if (err.message?.includes('no data')) {
        errorMessage += err.message;
      } else if (err.response?.data?.detail) {
        errorMessage += err.response.data.detail;
      } else {
        errorMessage += 'Please check console for details.';
      }
      
      alert(errorMessage);
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloading(doc.document_id);
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      
      if (!blob) {
        throw new Error('No data received from server');
      }
      
      // Create download link - using global document object
      const url = window.URL.createObjectURL(blob);
      const linkElement = window.document.createElement('a');
      linkElement.href = url;
      linkElement.download = doc.file_name;
      window.document.body.appendChild(linkElement);
      linkElement.click();
      window.document.body.removeChild(linkElement);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      console.error('Error details:', err.response?.data);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to download document';
      alert(errorMsg + '. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.')?.pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'FileText';
      case 'doc':
      case 'docx':
        return 'FileText';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'Image';
      case 'xls':
      case 'xlsx':
        return 'FileSpreadsheet';
      default:
        return 'File';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="FolderOpen" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-foreground">
                Land Documents
              </h2>
              <p className="text-sm text-muted-foreground">
                {project?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-smooth"
            title="Close"
          >
            <Icon name="X" size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="AlertCircle" size={32} className="text-red-600" />
                </div>
                <p className="text-foreground font-medium mb-2">Error Loading Documents</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchDocuments}
                  iconName="RefreshCw"
                  iconPosition="left"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="FileText" size={32} className="text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-2">No Documents Yet</p>
                <p className="text-sm text-muted-foreground">
                  No documents have been uploaded for this land.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Document Count */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{documents.length}</span> {documents.length === 1 ? 'document' : 'documents'} found
                </p>
              </div>

              {/* Documents List */}
              {documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-smooth"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon name={getFileIcon(doc.file_name)} size={20} className="text-primary" />
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-body font-medium text-foreground truncate">
                          {doc.file_name}
                        </p>
                        {doc.is_draft && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        {doc.document_type && (
                          <span className="flex items-center space-x-1">
                            <Icon name="Tag" size={12} />
                            <span>{doc.document_type}</span>
                          </span>
                        )}
                        {doc.version_number && (
                          <span className="flex items-center space-x-1">
                            <Icon name="Hash" size={12} />
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                              v{doc.version_number}
                              {doc.is_latest_version && ' (Latest)'}
                            </span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Icon name="HardDrive" size={12} />
                          <span>{formatFileSize(doc.file_size)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Icon name="Clock" size={12} />
                          <span>{formatDate(doc.created_at)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(doc)}
                      iconName="Eye"
                      title="View Document"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      iconName={downloading === doc.document_id ? "Loader" : "Download"}
                      title="Download"
                      disabled={downloading === doc.document_id}
                      className={downloading === doc.document_id ? "animate-spin" : ""}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentsModal;

