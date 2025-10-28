import React, { useState } from 'react';
import Icon from '../../../AppIcon';
import Button from '../../../components/ui/Button';
import documentVersionService from '../../../services/documentVersionService';

const ReviewerActions = ({ document, onMarkForReview, onCompleteReview, onArchive }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState('');

  const handleMarkForReview = async () => {
    setIsLoading(true);
    try {
      await documentVersionService.claimDocumentForReview(document.document_id, reason);
      await onMarkForReview(document.document_id, reason);
      setShowReasonModal(false);
      setReason('');
    } catch (error) {
      console.error('Error marking document for review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteReview = async () => {
    setIsLoading(true);
    try {
      await documentVersionService.completeDocumentReview(document.document_id, 'approve', reason);
      await onCompleteReview(document.document_id, reason);
      setShowReasonModal(false);
      setReason('');
    } catch (error) {
      console.error('Error completing review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsLoading(true);
    try {
      await documentVersionService.completeDocumentReview(document.document_id, 'reject', reason);
      await onArchive(document.document_id, reason);
      setShowReasonModal(false);
      setReason('');
    } catch (error) {
      console.error('Error archiving document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        {document.status === 'active' && document.isLatest && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReasonModal(true)}
            disabled={isLoading}
          >
            <Icon name="Eye" size={16} />
            Mark for Review
          </Button>
        )}
        
        {document.status === 'under_review' && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowReasonModal(true)}
            disabled={isLoading}
          >
            <Icon name="Check" size={16} />
            Complete Review
          </Button>
        )}
        
        {document.status === 'active' && !document.isLatest && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReasonModal(true)}
            disabled={isLoading}
          >
            <Icon name="Archive" size={16} />
            Archive
          </Button>
        )}
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {document.status === 'active' && document.isLatest ? 'Mark for Review' :
               document.status === 'under_review' ? 'Complete Review' :
               'Archive Document'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Enter reason for this action..."
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonModal(false);
                  setReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  if (document.status === 'active' && document.isLatest) {
                    handleMarkForReview();
                  } else if (document.status === 'under_review') {
                    handleCompleteReview();
                  } else {
                    handleArchive();
                  }
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <>
                    {document.status === 'active' && document.isLatest ? 'Mark for Review' :
                     document.status === 'under_review' ? 'Complete Review' :
                     'Archive'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewerActions;
