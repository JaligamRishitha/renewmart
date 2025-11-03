import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { documentsAPI } from '../../../services/api';

const DocumentUploadModal = ({ isOpen, onClose, landId, documentType, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('land_id', landId);
      formData.append('document_type', documentType);
      formData.append('version_notes', `New version uploaded: ${file.name}`);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await documentsAPI.uploadDocument(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Wait a moment to show 100% progress
      setTimeout(() => {
        onUploadSuccess(response);
        onClose();
        setFile(null);
        setUploadProgress(0);
      }, 500);

    } catch (err) {
      setError('Upload failed: ' + (err.response?.data?.detail || err.message));
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      onClose();
      setFile(null);
      setError(null);
      setUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Upload New Document Version</h2>
            <button
              onClick={handleClose}
              disabled={uploading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Icon name="X" size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Document File
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <Icon name="Upload" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-2">
                  Click to select file or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </p>
              </label>
            </div>
            {file && (
              <div className="mt-3 p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon name="File" size={20} className="text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    disabled={uploading}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon name="X" size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Uploading...</span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <div className="flex items-center">
                <Icon name="AlertTriangle" size={16} className="text-error mr-2" />
                <p className="text-error text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Document Info */}
          <div className="bg-muted/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Document Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document Type:</span>
                <span className="text-foreground">{documentType?.replace(/_/g, ' ').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project ID:</span>
                <span className="text-foreground font-mono text-xs">{landId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span className="text-foreground">Auto-generated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="min-w-[100px]"
          >
            {uploading ? (
              <div className="flex items-center">
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Uploading...
              </div>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
