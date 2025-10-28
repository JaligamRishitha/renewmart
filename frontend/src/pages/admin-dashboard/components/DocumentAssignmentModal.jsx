import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { documentAssignmentAPI, usersAPI } from '../../../services/api';

const DocumentAssignmentModal = ({ isOpen, onClose, landId, documentVersions, onAssignmentSuccess }) => {
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [reviewers, setReviewers] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadReviewers();
      // Set default due date to 7 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      setDueDate(futureDate.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const loadReviewers = async () => {
    try {
      const response = await usersAPI.getUsers({ role: 'reviewer' });
      setReviewers(response);
    } catch (err) {
      console.error('Failed to load reviewers:', err);
      setError('Failed to load reviewers');
    }
  };

  const handleAssign = async () => {
    if (!selectedVersion || !selectedReviewer || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const assignmentData = {
        document_id: selectedVersion.document_id,
        reviewer_id: selectedReviewer,
        due_date: dueDate,
        assignment_notes: assignmentNotes,
        priority: 'medium'
      };

      const response = await documentAssignmentAPI.createAssignment(assignmentData);
      
      onAssignmentSuccess(response);
      onClose();
      
      // Reset form
      setSelectedVersion(null);
      setSelectedReviewer('');
      setAssignmentNotes('');
      
    } catch (err) {
      setError('Assignment failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setSelectedVersion(null);
      setSelectedReviewer('');
      setAssignmentNotes('');
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Assign Document Reviewer</h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <Icon name="X" size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Version Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Document Version *
            </label>
            <select
              value={selectedVersion?.document_id || ''}
              onChange={(e) => {
                const version = documentVersions.find(v => v.document_id === e.target.value);
                setSelectedVersion(version);
              }}
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
              disabled={loading}
            >
              <option value="">Choose a document version...</option>
              {documentVersions.map((version) => (
                <option key={version.document_id} value={version.document_id}>
                  {version.file_name} - Version {version.version_number} ({version.status})
                </option>
              ))}
            </select>
          </div>

          {/* Reviewer Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Reviewer *
            </label>
            <select
              value={selectedReviewer}
              onChange={(e) => setSelectedReviewer(e.target.value)}
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
              disabled={loading}
            >
              <option value="">Choose a reviewer...</option>
              {reviewers.map((reviewer) => (
                <option key={reviewer.user_id} value={reviewer.user_id}>
                  {reviewer.full_name} ({reviewer.email})
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground"
              disabled={loading}
            />
          </div>

          {/* Assignment Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Assignment Notes
            </label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              placeholder="Add any specific instructions or notes for the reviewer..."
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground resize-none"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Selected Version Info */}
          {selectedVersion && (
            <div className="bg-muted/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Selected Version Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File:</span>
                  <span className="text-foreground">{selectedVersion.file_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version:</span>
                  <span className="text-foreground">{selectedVersion.version_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-foreground">{selectedVersion.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upload Date:</span>
                  <span className="text-foreground">{selectedVersion.upload_date}</span>
                </div>
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedVersion || !selectedReviewer || !dueDate || loading}
            className="min-w-[100px]"
          >
            {loading ? (
              <div className="flex items-center">
                <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                Assigning...
              </div>
            ) : (
              'Assign Reviewer'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DocumentAssignmentModal;
