import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const TaskEditModal = ({ isOpen, onClose, task, onUpdate }) => {
  const [formData, setFormData] = useState({
    endDate: '',
    priority: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const priorityOptions = [
    { value: '', label: 'Not Assigned' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  useEffect(() => {
    if (task && isOpen) {
      setFormData({
        endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
        priority: task.priority ? task.priority.toLowerCase() : ''
      });
      setError('');
    }
  }, [task, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Prepare update data
      const updateData = {};
      
      // Only include fields that have values
      if (formData.endDate) {
        updateData.due_date = formData.endDate;
      }
      
      if (formData.priority) {
        updateData.priority = formData.priority;
      }
      
      // If no fields to update, show message
      if (Object.keys(updateData).length === 0) {
        setError('Please select at least one field to update.');
        setIsLoading(false);
        return;
      }

      // Pass isPlaceholder flag to onUpdate so it knows whether to update land or task
      await onUpdate(task.taskId, updateData, task.isPlaceholder, task.landId);
      onClose();
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err.response?.data?.detail || 'Failed to update task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      endDate: '',
      priority: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-elevation-3 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon name="Edit" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-foreground">Edit Task Details</h2>
              <p className="font-body text-sm text-muted-foreground">
                {task?.projectName || 'Task'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-muted-foreground hover:text-foreground transition-smooth"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {task?.isPlaceholder && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-primary mt-0.5" />
              <p className="font-body text-sm text-primary">
                This is a project-level setting. These values will be inherited when a reviewer is assigned.
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex items-start space-x-2">
              <Icon name="AlertCircle" size={16} className="text-error mt-0.5" />
              <p className="font-body text-sm text-error">{error}</p>
            </div>
          )}

          {/* End Date Field */}
          <div>
            <label className="block font-body font-medium text-sm text-foreground mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="font-body text-xs text-muted-foreground mt-1">
              Leave empty to set as "Not Assigned"
            </p>
          </div>

          {/* Priority Field */}
          <div>
            <label className="block font-body font-medium text-sm text-foreground mb-2">
              Priority
            </label>
            <Select
              value={formData.priority}
              onChange={(value) => setFormData({ ...formData, priority: value })}
              options={priorityOptions}
              className="w-full"
            />
            <p className="font-body text-xs text-muted-foreground mt-1">
              Select "Not Assigned" to clear priority
            </p>
          </div>

          {/* Current Values Display */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Current Values {task?.isPlaceholder && <span className="text-warning">(Project Level)</span>}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-body text-xs text-muted-foreground">End Date</p>
                <p className="font-body text-sm text-foreground">
                  {task?.endDate
                    ? new Date(task.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Not Assigned'}
                </p>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground">Priority</p>
                <p className="font-body text-sm text-foreground capitalize">
                  {task?.priority ? task.priority : 'Not Assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isLoading}
              iconName={isLoading ? "Loader2" : "Check"}
              iconSize={16}
            >
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskEditModal;


