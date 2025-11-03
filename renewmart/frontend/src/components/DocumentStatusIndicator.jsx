import React from 'react';
import Icon from './AppIcon';

const DocumentStatusIndicator = ({ status, versionNumber, isLatest, reviewLocked, className = '' }) => {
  const getStatusConfig = (status) => {
    const configs = {
      'under_review': {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: 'Clock',
        label: 'Under Review'
      },
      'archived': {
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: 'Archive',
        label: 'Archived'
      },
      'locked': {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: 'Lock',
        label: 'Locked'
      }
    };
    return configs[status] || {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: 'File',
      label: 'Unknown'
    };
  };

  const config = getStatusConfig(status);

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {/* Version Badge */}
      <div className="flex items-center space-x-1">
        <span className="text-xs font-medium text-muted-foreground">v{versionNumber}</span>
        {isLatest && (
          <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
            Latest
          </span>
        )}
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}>
        <Icon name={config.icon} size={12} />
        <span>{config.label}</span>
      </div>

      {/* Review Lock Indicator */}
      {reviewLocked && (
        <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
          <Icon name="Lock" size={12} />
          <span>Review Locked</span>
        </div>
      )}
    </div>
  );
};

export default DocumentStatusIndicator;
