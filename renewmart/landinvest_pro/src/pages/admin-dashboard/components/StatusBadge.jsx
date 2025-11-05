import React from 'react';

const StatusBadge = ({ status, size = 'default', completionPercentage, reviewStatus }) => {
  // Determine the actual status to display based on completion percentage or review status
  const getDisplayStatus = () => {
    // If completion percentage is 100% or review status shows completion, show "Completed"
    if (completionPercentage !== undefined && completionPercentage >= 100) {
      return 'completed';
    }
    
    // Check review status for completion indicators
    if (reviewStatus) {
      if (reviewStatus.published === true || 
          reviewStatus.status === 'completed' || 
          reviewStatus.status === 'published') {
        return 'completed';
      }
      if (reviewStatus.completion_percentage !== undefined && reviewStatus.completion_percentage >= 100) {
        return 'completed';
      }
    }
    
    // Otherwise, use the provided status
    return status?.toLowerCase();
  };

  const displayStatus = getDisplayStatus();

  const getStatusStyles = () => {
    switch (displayStatus) {
      case 'in progress':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'delayed':
        return 'bg-error/10 text-error border-error/20';
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
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

  // Get the display label
  const getDisplayLabel = () => {
    if (displayStatus === 'completed') {
      return 'Completed';
    }
    // Capitalize first letter of status
    return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : status;
  };

  return (
    <span className={`
      inline-flex items-center rounded-full border font-medium font-body
      ${getStatusStyles()} ${getSizeClasses()}
    `}>
      {getDisplayLabel()}
    </span>
  );
};

export default StatusBadge;