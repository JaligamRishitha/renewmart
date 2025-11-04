import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { usersAPI } from '../../../services/api';

const AssignReviewerModal = ({ project, onClose, onAssign, preselectedRole = null, preselectedTaskType = null }) => {
  const [formData, setFormData] = useState({
    reviewerRole: preselectedRole || '',
    assignedTo: '',
    taskType: preselectedTaskType || '',
    description: '',
    dueDate: '',
    priority: 'medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddTaskTypeModal, setShowAddTaskTypeModal] = useState(false);
  const [newTaskType, setNewTaskType] = useState({ label: '', value: '' });
  const [customTaskTypes, setCustomTaskTypes] = useState([]);

  const reviewerRoles = [
    { 
      value: 're_sales_advisor', 
      label: 'RE Sales Advisor',
      description: 'Market evaluation and investor alignment'
    },
    { 
      value: 're_analyst', 
      label: 'RE Analyst',
      description: 'Technical and financial feasibility analysis'
    },
    { 
      value: 're_governance_lead', 
      label: 'RE Governance Lead',
      description: 'Compliance, regulatory, and local authority validation'
    }
  ];

  const defaultTaskTypes = [
    { value: 'market_evaluation', label: 'Market Evaluation' },
    { value: 'technical_analysis', label: 'Technical Analysis' },
    { value: 'financial_analysis', label: 'Financial Analysis' },
    { value: 'compliance_review', label: 'Compliance Review' },
    { value: 'document_verification', label: 'Document Verification' },
    { value: 'site_assessment', label: 'Site Assessment' },
    { value: 'regulatory_approval', label: 'Regulatory Approval' },
    { value: 'environmental_review', label: 'Environmental Review' }
  ];

  const taskTypes = [...defaultTaskTypes, ...customTaskTypes];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  // Initialize form with preselected values
  useEffect(() => {
    if (preselectedRole) {
      setFormData(prev => ({ ...prev, reviewerRole: preselectedRole }));
    }
    if (preselectedTaskType) {
      setFormData(prev => ({ ...prev, taskType: preselectedTaskType }));
    }
  }, [preselectedRole, preselectedTaskType]);

  // Fetch users when reviewer role changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (!formData.reviewerRole) {
        setAvailableUsers([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const users = await usersAPI.getUsers({ role: formData.reviewerRole, is_active: true });
        
        // Transform to dropdown format
        const userOptions = users.map(user => ({
          value: user.user_id,
          label: `${user.first_name} ${user.last_name}`,
          email: user.email
        }));
        
        setAvailableUsers(userOptions);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users for selected role');
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [formData.reviewerRole]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.reviewerRole || !formData.assignedTo || !formData.taskType) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onAssign({
        landId: project.landId || project.id,  // Use landId if available, fallback to id
        reviewerRole: formData.reviewerRole,
        assignedTo: formData.assignedTo,
        taskType: formData.taskType,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to assign reviewer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTaskType = () => {
    if (!newTaskType.label.trim()) {
      alert('Please enter a task type name');
      return;
    }

    // Generate value from label (lowercase, replace spaces with underscores)
    const value = newTaskType.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if already exists
    if (taskTypes.some(t => t.value === value)) {
      alert('This task type already exists');
      return;
    }

    const taskType = {
      value: value,
      label: newTaskType.label
    };

    setCustomTaskTypes([...customTaskTypes, taskType]);
    setFormData({ ...formData, taskType: value });
    setNewTaskType({ label: '', value: '' });
    setShowAddTaskTypeModal(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Assign Reviewer</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Project: {project.projectName || project.title} - {project.location}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon name="X" size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex items-center">
              <Icon name="AlertCircle" size={16} className="text-error mr-2" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Project Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Landowner:</span>
                <p className="font-medium text-foreground">{project.landownerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Project Type:</span>
                <p className="font-medium text-foreground">{project.projectType || project.energyType}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Capacity:</span>
                <p className="font-medium text-foreground">{project.capacity}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium text-foreground">{project.status}</p>
              </div>
            </div>
          </div>

          {/* Reviewer Role Selection */}
          <Select
            label="Select Reviewer Role *"
            placeholder="Choose reviewer role"
            options={reviewerRoles}
            value={formData.reviewerRole}
            onChange={(value) => {
              handleInputChange('reviewerRole', value);
              handleInputChange('assignedTo', ''); // Reset assigned user when role changes
            }}
            required
            disabled={loading || !!preselectedRole}
          />

          {/* Assigned To */}
          {formData.reviewerRole && (
            <Select
              label="Assign To *"
              placeholder={loadingUsers ? "Loading users..." : "Select a user"}
              options={availableUsers.map(user => ({
                value: user.value,
                label: `${user.label}${user.email ? ` (${user.email})` : ''}`,
                description: user.email
              }))}
              value={formData.assignedTo}
              onChange={(value) => handleInputChange('assignedTo', value)}
              required
              disabled={loading || loadingUsers}
              searchable={true}
              clearable={true}
            />
          )}

          {/* Task Type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Task Type *
              </label>
              <button
                type="button"
                onClick={() => setShowAddTaskTypeModal(true)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Icon name="Plus" size={14} />
                Add New Type
              </button>
            </div>
            <Select
              placeholder="Select task type"
              options={taskTypes}
              value={formData.taskType}
              onChange={(value) => handleInputChange('taskType', value)}
              required
              disabled={loading || !!preselectedTaskType}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Task Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter task description and requirements..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Due Date and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              disabled={loading}
            />
            <Select
              label="Priority"
              options={priorityOptions}
              value={formData.priority}
              onChange={(value) => handleInputChange('priority', value)}
              disabled={loading}
            />
          </div>

          {/* Workflow Info */}
          {formData.reviewerRole && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                <Icon name="Info" size={16} className="mr-2" />
                Role Responsibilities
              </h4>
              <p className="text-sm text-muted-foreground">
                {reviewerRoles.find(r => r.value === formData.reviewerRole)?.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              loading={loading}
              iconName="UserCheck"
              iconSize={18}
            >
              Assign Reviewer
            </Button>
          </div>
        </form>
      </div>

      {/* Add Task Type Modal */}
      {showAddTaskTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Add New Task Type</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a custom task type for this assignment
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Task Type Name *
                </label>
                <input
                  type="text"
                  value={newTaskType.label}
                  onChange={(e) => setNewTaskType({ ...newTaskType, label: e.target.value })}
                  placeholder="e.g., Grid Connection Review"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used as the task type label
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddTaskTypeModal(false);
                  setNewTaskType({ label: '', value: '' });
                }}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddTaskType}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icon name="Plus" size={16} />
                Add Task Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignReviewerModal;

