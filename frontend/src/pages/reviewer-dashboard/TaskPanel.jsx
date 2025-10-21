import React, { useState } from 'react';
import Icon from '../../components/AppIcon';
import SubtaskManager from './SubtaskManager';
import ReviewPanel from './ReviewPanelCompact';
import TaskDocuments from './TaskDocuments';

const TaskPanel = ({ task, onClose, onRefresh, reviewerRole }) => {
  const [activeTab, setActiveTab] = useState('details');

  const tabs = [
    { id: 'details', label: 'Task Details', icon: 'FileCheck' },
    { id: 'subtasks', label: 'Subtasks', icon: 'List' },
    { id: 'documents', label: 'Documents', icon: 'FileText' },
    { id: 'review', label: 'Review', icon: 'CheckSquare' }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'in_progress':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'pending':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'rejected':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
      <div className="bg-card h-full w-full max-w-4xl shadow-xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {task.task_type?.replace(/_/g, ' ').toUpperCase()}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Task ID: {task.task_id}
              </p>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                  {task.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                  {task.status?.replace('_', ' ')?.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Icon name="X" size={24} className="text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-border -mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Description */}
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Icon name="FileText" size={18} className="text-primary" />
                  Description
                </h3>
                <p className="text-sm text-foreground">
                  {task.description || 'No description provided'}
                </p>
              </div>

              {/* Timeline */}
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="Calendar" size={18} className="text-primary" />
                  Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Icon name="Calendar" size={14} />
                      Created
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Icon name="CalendarX" size={14} />
                      Due Date
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned To */}
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon name="User" size={18} className="text-primary" />
                  Assignment
                </h3>
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Assigned To</div>
                    <div className="text-sm font-medium text-foreground">
                      {task.assigned_to_name || 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Assigned By</div>
                    <div className="text-sm font-medium text-foreground">
                      {task.assigned_by_name || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {task.completion_notes && (
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Icon name="MessageSquare" size={18} className="text-primary" />
                    Completion Notes
                  </h3>
                  <p className="text-sm text-foreground">
                    {task.completion_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subtasks' && (
            <SubtaskManager 
              taskId={task.task_id} 
              initialSubtasks={task.subtasks || []}
              onUpdate={onRefresh}
            />
          )}

          {activeTab === 'documents' && (
            <TaskDocuments
              taskId={task.task_id}
              onRefresh={onRefresh}
            />
          )}

          {activeTab === 'review' && (
            <ReviewPanelCompact
              reviewerRole={reviewerRole}
              taskId={task.task_id}
              onSave={() => {
                alert('Review saved!');
                onRefresh();
              }}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskPanel;

