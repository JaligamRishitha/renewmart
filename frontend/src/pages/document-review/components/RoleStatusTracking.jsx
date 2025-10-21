import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RoleStatusTracking = ({ 
  roleStatuses = {},
  onPublish = () => {},
  isPublishing = false
}) => {
  
  const roles = [
    {
      id: 're_sales_advisor',
      label: 'RE Sales Advisor',
      icon: 'TrendingUp',
      color: 'blue'
    },
    {
      id: 're_analyst',
      label: 'RE Analyst',
      icon: 'Calculator',
      color: 'purple'
    },
    {
      id: 're_governance_lead',
      label: 'RE Governance Lead',
      icon: 'Shield',
      color: 'green'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-orange-500';
      case 'not_started':
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'pending':
        return 'In Review';
      case 'not_started':
      default:
        return 'Not Started';
    }
  };

  const getRoleProgress = (roleId) => {
    const status = roleStatuses[roleId] || {};
    const subtasksCompleted = status.subtasksCompleted || 0;
    const totalSubtasks = status.totalSubtasks || 0;
    const documentsApproved = status.documentsApproved || 0;
    const totalDocuments = status.totalDocuments || 0;
    
    if (totalSubtasks === 0) return 0;
    
    const subtaskProgress = (subtasksCompleted / totalSubtasks) * 50;
    const docProgress = totalDocuments > 0 ? (documentsApproved / totalDocuments) * 50 : 50;
    
    return Math.round(subtaskProgress + docProgress);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Icon name="UserCheck" size={24} className="text-primary" />
            Project Review Status by Role
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Track approval progress for each reviewer role
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {roles.map((role) => {
          const roleStatus = roleStatuses[role.id] || {};
          const status = roleStatus.status || 'not_started';
          const isApproved = status === 'approved';
          const progress = getRoleProgress(role.id);
          const canPublish = isApproved && !roleStatus.published;

          return (
            <div
              key={role.id}
              className="border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              {/* Role Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-${role.color}-500/10 flex items-center justify-center`}>
                    <Icon name={role.icon} size={20} className={`text-${role.color}-600`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{role.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {roleStatus.reviewerName || 'Not Assigned'}
                    </p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    isApproved ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                    status === 'pending' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                    'bg-gray-500/10 text-gray-600 border-gray-500/20'
                  }`}>
                    {getStatusText(status)}
                  </span>
                  {roleStatus.published && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                      <Icon name="CheckCircle" size={12} className="inline mr-1" />
                      Published
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Review Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`${getStatusColor(status)} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Icon name="ListChecks" size={12} />
                    {roleStatus.subtasksCompleted || 0}/{roleStatus.totalSubtasks || 0} Subtasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="FileText" size={12} />
                    {roleStatus.documentsApproved || 0}/{roleStatus.totalDocuments || 0} Docs
                  </span>
                </div>
                {roleStatus.approvedAt && (
                  <span className="text-xs text-muted-foreground">
                    Approved: {new Date(roleStatus.approvedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Publish Button */}
              <div className="flex items-center justify-end pt-2 border-t border-border">
                {roleStatus.published ? (
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <Icon name="Check" size={14} />
                    Published on {new Date(roleStatus.publishedAt).toLocaleDateString()}
                  </div>
                ) : canPublish ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onPublish(role.id)}
                    disabled={isPublishing}
                    className="flex items-center gap-1"
                  >
                    <Icon name={isPublishing ? "Loader2" : "Send"} size={14} className={isPublishing ? "animate-spin" : ""} />
                    Publish Review
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {status === 'not_started' ? 'Awaiting review' : 'Complete approval to publish'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Status */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="Activity" size={20} className="text-primary" />
            <span className="font-medium text-foreground">Overall Project Status:</span>
          </div>
          <div className="flex items-center gap-2">
            {Object.values(roleStatuses).filter(s => s.status === 'approved').length === roles.length ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                <Icon name="CheckCircle" size={14} className="inline mr-1" />
                All Reviews Approved
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-500/10 text-orange-600 border border-orange-500/20">
                <Icon name="Clock" size={14} className="inline mr-1" />
                Review in Progress
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleStatusTracking;


