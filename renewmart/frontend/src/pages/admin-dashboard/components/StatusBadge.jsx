import React from 'react';

const StatusBadge = ({ status, size = 'default' }) => {
  // Format status label for display
  const getStatusLabel = (status) => {
    const statusMap = {
      'pending': 'Pending',
      'submitted': 'Pending',
      'under_review': 'In Progress',
      'in_progress': 'In Progress',
      'approved': 'Approved',
      'published': 'Published',
      'completed': 'Completed',
      'rejected': 'Rejected',
      'rtb': 'Ready to Buy',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'delayed': 'Delayed'
    };
    return statusMap[status?.toLowerCase()] || status || 'Unknown';
  };

  const getStatusStyles = () => {
    switch (status?.toLowerCase()) {
      case 'in progress':
      case 'under_review':
      case 'in_progress':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pending':
      case 'submitted':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'delayed':
        return 'bg-error/10 text-error border-error/20';
      case 'completed':
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'published':
        return 'bg-success/10 text-success border-success/20';
      case 'rejected':
        return 'bg-error/10 text-error border-error/20';
      case 'high':
        return 'bg-error/10 text-error border-error/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-4 py-2 text-sm';
      default:
        return 'px-3 py-1 text-xs';
    }
  };

  return (
    <span className={`
      inline-flex items-center rounded-full border font-medium font-body
      ${getStatusStyles()} ${getSizeClasses()}
    `}>
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;