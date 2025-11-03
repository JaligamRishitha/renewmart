import React, { useState, useEffect } from 'react';
import Icon from './AppIcon';
import Button from './ui/Button';
import { documentsAPI } from '../services/api';

const DocumentAuditTrail = ({ landId, documentType = null, onClose }) => {
  const [auditEntries, setAuditEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  useEffect(() => {
    if (landId) {
      loadAuditTrail();
    }
  }, [landId, documentType]);

  const loadAuditTrail = async (offset = 0) => {
    try {
      setLoading(true);
      const response = await documentsAPI.getDocumentAuditTrail(
        landId, 
        documentType, 
        null, 
        pagination.limit, 
        offset
      );
      
      if (offset === 0) {
        setAuditEntries(response.audit_entries);
      } else {
        setAuditEntries(prev => [...prev, ...response.audit_entries]);
      }
      
      setPagination({
        total: response.total_count,
        limit: response.limit,
        offset: response.offset,
        hasMore: response.has_more
      });
    } catch (err) {
      console.error('Failed to load audit trail:', err);
      setError('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    loadAuditTrail(newOffset);
  };

  const getActionIcon = (actionType) => {
    const icons = {
      'version_upload': 'Upload',
      'status_change': 'RefreshCw',
      'review_lock': 'Lock',
      'review_unlock': 'Unlock',
      'archive': 'Archive',
      'update': 'Edit'
    };
    return icons[actionType] || 'Activity';
  };

  const getActionColor = (actionType) => {
    const colors = {
      'version_upload': 'text-blue-600 bg-blue-100',
      'status_change': 'text-yellow-600 bg-yellow-100',
      'review_lock': 'text-red-600 bg-red-100',
      'review_unlock': 'text-green-600 bg-green-100',
      'archive': 'text-gray-600 bg-gray-100',
      'update': 'text-purple-600 bg-purple-100'
    };
    return colors[actionType] || 'text-gray-600 bg-gray-100';
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

  const formatActionDescription = (entry) => {
    const descriptions = {
      'version_upload': `New version ${entry.new_version_number} uploaded`,
      'status_change': `Status changed from ${entry.old_status} to ${entry.new_status}`,
      'review_lock': `Version ${entry.new_version_number} locked for review`,
      'review_unlock': `Version ${entry.new_version_number} unlocked from review`,
      'archive': `Version ${entry.new_version_number} archived`,
      'update': `Version ${entry.new_version_number} updated`
    };
    return descriptions[entry.action_type] || 'Document updated';
  };

  if (loading && auditEntries.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading audit trail...</p>
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
              Document Audit Trail
            </h2>
            <p className="text-sm text-muted-foreground">
              {documentType ? `For ${documentType}` : 'All document changes'}
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

        {/* Audit Entries */}
        {auditEntries.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Activity" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Audit Entries Found</h3>
            <p className="text-muted-foreground">
              No changes have been recorded for this document yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {auditEntries.map((entry, index) => (
              <div
                key={entry.audit_id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${getActionColor(entry.action_type)}`}>
                    <Icon name={getActionIcon(entry.action_type)} size={16} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-foreground">
                          {formatActionDescription(entry)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(entry.action_type)}`}>
                          {entry.action_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Document:</span> {entry.file_name}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {entry.document_type}
                      </div>
                      <div>
                        <span className="font-medium">Changed by:</span> {entry.user_name}
                      </div>
                      {entry.change_reason && (
                        <div>
                          <span className="font-medium">Reason:</span> {entry.change_reason}
                        </div>
                      )}
                    </div>

                    {/* Status Change Details */}
                    {entry.old_status && entry.new_status && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <span className="font-medium">Status Change:</span>
                        <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">
                          {entry.old_status}
                        </span>
                        <Icon name="ArrowRight" size={12} className="mx-2 text-muted-foreground" />
                        <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
                          {entry.new_status}
                        </span>
                      </div>
                    )}

                    {/* Version Change Details */}
                    {entry.old_version_number && entry.new_version_number && entry.old_version_number !== entry.new_version_number && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <span className="font-medium">Version Change:</span>
                        <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">
                          v{entry.old_version_number}
                        </span>
                        <Icon name="ArrowRight" size={12} className="mx-2 text-muted-foreground" />
                        <span className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
                          v{entry.new_version_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {pagination.hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  iconName={loading ? "Loader" : "Plus"}
                  iconPosition="left"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Audit Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Entries:</span> {pagination.total}
                </div>
                <div>
                  <span className="font-medium">Loaded:</span> {auditEntries.length}
                </div>
                <div>
                  <span className="font-medium">Has More:</span> {pagination.hasMore ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Filter:</span> {documentType || 'All Types'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAuditTrail;
