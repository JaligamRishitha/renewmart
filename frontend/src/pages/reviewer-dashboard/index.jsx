import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import { taskAPI, documentsAPI } from '../../services/api';

// Role-specific document types from Workflow.txt
const ROLE_DOCUMENTS = {
  're_sales_advisor': [
    'land-valuation',
    'ownership-documents',
    'sale-contract',
    'land_valuation',
    'ownership_documents',
    'sale_contract'
  ],
  're_analyst': [
    'topographical-survey',
    'grid-connectivity',
    'financial-model',
    'topographical_survey',
    'grid_connectivity',
    'financial_model'
  ],
  're_governance_lead': [
    'zoning-approval',
    'environmental-assessment',
    'government-noc',
    'zoning_approval',
    'environmental_assessment',
    'government_noc'
  ]
};

const ROLE_TITLES = {
  're_sales_advisor': 'RE Sales Advisor',
  're_analyst': 'RE Analyst',
  're_governance_lead': 'RE Governance Lead'
};

const ROLE_DESCRIPTIONS = {
  're_sales_advisor': 'Market evaluation and investor alignment',
  're_analyst': 'Technical and financial feasibility analysis',
  're_governance_lead': 'Compliance, regulatory, and local authority validation'
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'delayed', label: 'Delayed', color: 'orange' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [updating, setUpdating] = useState(false);

  // Get user's reviewer role
  const reviewerRole = user?.roles?.find(role => 
    ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
  );

  useEffect(() => {
    if (reviewerRole) {
      fetchDashboardData();
    }
  }, [reviewerRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks assigned to me
      const tasksResponse = await taskAPI.getTasksAssignedToMe();
      setTasks(tasksResponse.data || []);

      // Fetch documents for each task (filtered by role)
      const allDocuments = [];
      for (const task of tasksResponse.data || []) {
        if (task.land_id) {
          try {
            const docsResponse = await documentsAPI.getDocuments(task.land_id);
            const filteredDocs = (docsResponse.data || []).filter(doc => 
              ROLE_DOCUMENTS[reviewerRole]?.includes(doc.document_type?.toLowerCase())
            );
            allDocuments.push(...filteredDocs.map(doc => ({ ...doc, task_id: task.task_id })));
          } catch (err) {
            console.error(`Failed to fetch documents for land ${task.land_id}:`, err);
          }
        }
      }
      setDocuments(allDocuments);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (task) => {
    setSelectedTask(task);
    setStatusUpdate({ status: task.status || 'pending', notes: '' });
    setShowStatusModal(true);
  };

  const handleSubmitStatusUpdate = async () => {
    if (!selectedTask) return;

    try {
      setUpdating(true);
      await taskAPI.updateTask(selectedTask.task_id, {
        status: statusUpdate.status,
        notes: statusUpdate.notes
      });

      // Update local state
      setTasks(prev => prev.map(t => 
        t.task_id === selectedTask.task_id 
          ? { ...t, status: statusUpdate.status }
          : t
      ));

      setShowStatusModal(false);
      setSelectedTask(null);
      setStatusUpdate({ status: '', notes: '' });

      // Show success notification
      alert('Status updated successfully!');
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status);
    return statusObj?.color || 'gray';
  };

  const getStatusLabel = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status);
    return statusObj?.label || status;
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Failed to download document');
    }
  };

  if (!reviewerRole) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have reviewer permissions to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {ROLE_TITLES[reviewerRole]} Dashboard
              </h1>
              <p className="text-muted-foreground">
                {ROLE_DESCRIPTIONS[reviewerRole]}
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon name="RefreshCw" size={18} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="Clipboard" size={24} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {tasks.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="Clock" size={24} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="CheckCircle" size={24} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="FileText" size={24} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {documents.length}
            </div>
            <div className="text-sm text-muted-foreground">Documents to Review</div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="List" size={24} />
            My Tasks
          </h2>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tasks assigned yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {task.task_type?.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium bg-${getStatusColor(task.status)}-500/10 text-${getStatusColor(task.status)}-500`}>
                          {getStatusLabel(task.status)}
                        </span>
                        {task.priority && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            task.priority === 'urgent' ? 'bg-red-500/10 text-red-500' :
                            task.priority === 'high' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-gray-500/10 text-gray-500'
                          }`}>
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {task.description || 'No description provided'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" size={14} />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.created_at && (
                          <span className="flex items-center gap-1">
                            <Icon name="Clock" size={14} />
                            Created: {new Date(task.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateStatus(task)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <Icon name="Edit" size={16} />
                      Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon name="FileText" size={24} />
            Documents to Review
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No documents to review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Document Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Uploaded</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.document_id} className="border-b border-border hover:bg-muted/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon name="File" size={16} className="text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {doc.file_name || 'Unnamed Document'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {doc.document_type?.replace(/-|_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm flex items-center gap-1"
                        >
                          <Icon name="Download" size={14} />
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Update Task Status</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTask.task_type?.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  placeholder="Add any notes about this status update..."
                  rows={4}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedTask(null);
                  setStatusUpdate({ status: '', notes: '' });
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitStatusUpdate}
                disabled={updating}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Icon name="Check" size={16} />
                    Update Status
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerDashboard;

