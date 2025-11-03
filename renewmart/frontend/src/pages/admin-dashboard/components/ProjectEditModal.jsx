import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { landsAPI } from '../../../services/api';

const ProjectEditModal = ({ isOpen, onClose, project, onUpdate }) => {
  const [updatedProject, setUpdatedProject] = useState({
    title: "",
    project_due_date: "",
    priority: "",
    status: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setUpdatedProject({
        title: project.title || "",
        project_due_date: project.project_due_date ? new Date(project.project_due_date).toISOString().split("T")[0] : "",
        priority: project.priority || "",
        status: project.status || ""
      });
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedProject((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!project?.land_id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Update project details via API
      await landsAPI.updateProject(project.land_id, updatedProject);
      
      // Call the parent update function
      if (onUpdate) {
        onUpdate(project.land_id, updatedProject);
      }
      
      onClose();
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err.response?.data?.detail || 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Edit Project</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Update project details and timeline
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
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex items-center">
              <Icon name="AlertCircle" size={16} className="text-error mr-2" />
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Project Name *
            </label>
            <input
              type="text"
              name="title"
              value={updatedProject.title}
              onChange={handleChange}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              placeholder="Enter project name"
              disabled={loading}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Project End Date
            </label>
            <input
              type="date"
              name="project_due_date"
              value={updatedProject.project_due_date}
              onChange={handleChange}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              disabled={loading}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={updatedProject.priority}
              onChange={handleChange}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              disabled={loading}
            >
              <option value="">Select Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status
            </label>
            <select
              name="status"
              value={updatedProject.status}
              onChange={handleChange}
              className="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              disabled={loading}
            >
              <option value="">Select Status</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="rtb">Ready to Buy</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

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
              type="button"
              variant="default"
              onClick={handleSave}
              loading={loading}
              iconName="Save"
              iconSize={18}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditModal;
