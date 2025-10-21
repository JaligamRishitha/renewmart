import React from 'react';
import Icon from '../../../components/AppIcon';
import StatusBadge from '../../landowner-dashboard/components/StatusBadge';

const LandownerReviewPanel = ({ tasks, projectData }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTaskTypeLabel = (taskType) => {
    const labels = {
      'land_title_verification': 'Land Title Verification',
      'environmental_assessment': 'Environmental Assessment',
      'market_viability': 'Market Viability',
      'regulatory_compliance': 'Regulatory Compliance',
      'financial_analysis': 'Financial Analysis'
    };
    return labels[taskType] || taskType?.replace(/_/g, ' ').toUpperCase();
  };

  const getRoleLabel = (role) => {
    const labels = {
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead',
      'administrator': 'Administrator'
    };
    return labels[role] || role;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'Clock';
      case 'in_progress':
        return 'RefreshCw';
      case 'completed':
        return 'CheckCircle';
      case 'approved':
        return 'CheckCircle';
      case 'rejected':
        return 'XCircle';
      default:
        return 'Circle';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-warning';
      case 'in_progress':
        return 'text-primary';
      case 'completed':
        return 'text-success';
      case 'approved':
        return 'text-success';
      case 'rejected':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-heading font-semibold text-lg text-foreground">
          Review Status
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Track the progress of your land verification
        </p>
      </div>

      {/* Project Overview */}
      {projectData && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Project Status</p>
                <div className="mt-1">
                  <StatusBadge status={projectData.status} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {formatDate(projectData.lastUpdated)}
                </p>
              </div>
            </div>
            
            {projectData.description && (
              <p className="text-sm text-muted-foreground italic">
                {projectData.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="max-h-[600px] overflow-y-auto">
        {tasks && tasks.length > 0 ? (
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <div key={task.task_id} className="p-4 hover:bg-muted/30 transition-smooth">
                <div className="space-y-3">
                  {/* Task Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon 
                          name={getStatusIcon(task.status)} 
                          size={16} 
                          className={getStatusColor(task.status)}
                        />
                        <h4 className="font-body font-medium text-sm text-foreground">
                          {getTaskTypeLabel(task.task_type)}
                        </h4>
                      </div>
                      {task.title && task.title !== task.task_type && (
                        <p className="text-xs text-muted-foreground ml-6">
                          {task.title}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={task.status} size="sm" />
                  </div>

                  {/* Assigned Reviewer */}
                  {task.assigned_to && (
                    <div className="flex items-center space-x-3 ml-6 bg-muted/50 rounded-lg p-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon name="User" size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Assigned to</p>
                        <p className="text-sm font-medium text-foreground truncate">
                          {task.reviewer_name || 'Reviewer'}
                        </p>
                        {task.assigned_role && (
                          <p className="text-xs text-muted-foreground">
                            {getRoleLabel(task.assigned_role)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Task Description */}
                  {task.description && task.description !== task.title && (
                    <p className="text-xs text-muted-foreground ml-6 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Task Timeline */}
                  <div className="grid grid-cols-2 gap-3 ml-6 text-xs">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-foreground font-medium mt-0.5">
                        {formatDate(task.created_at)}
                      </p>
                    </div>
                    {task.due_date && (
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p className="text-foreground font-medium mt-0.5">
                          {formatDate(task.due_date)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subtasks Progress (if available) */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="ml-6 pt-2 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">
                          Subtasks Progress
                        </p>
                        <p className="text-xs font-medium text-foreground">
                          {task.subtasks.filter(st => st.status === 'completed').length} / {task.subtasks.length}
                        </p>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ 
                            width: `${(task.subtasks.filter(st => st.status === 'completed').length / task.subtasks.length) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Icon name="FileSearch" size={48} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No Review Tasks Yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tasks will appear here once your project is submitted for review
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={14} className="text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Reviewers are working on verifying your land details. You'll be notified of any updates or if additional information is needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandownerReviewPanel;

