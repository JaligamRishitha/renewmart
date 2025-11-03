import React from 'react';
import Icon from '../../../components/AppIcon';

const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    // Normalize status: replace underscores with hyphens and convert to lowercase
    const normalizedStatus = status?.toLowerCase().replace(/_/g, '-');
    
    switch (normalizedStatus) {
      case 'draft':
        return {
          label: 'Draft',
          icon: 'FileText',
          description: 'Not submitted - visible to admin',
          className: 'bg-gray-100 text-gray-700 border-gray-300'
        };
      case 'submitted':
      case 'under-review':
        return {
          label: 'Under Review',
          icon: 'Clock',
          description: 'Submitted - admin reviewing',
          className: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'in-review':
        return {
          label: 'In Review',
          icon: 'Search',
          description: 'Admin assigned sections',
          className: 'bg-yellow-50 text-yellow-700 border-yellow-200'
        };
      case 'approved':
        return {
          label: 'Approved',
          icon: 'CheckCircle',
          description: 'Ready for publishing',
          className: 'bg-green-50 text-green-700 border-green-200'
        };
      case 'published':
        return {
          label: 'Published',
          icon: 'Globe',
          description: 'Visible to investors',
          className: 'bg-primary/10 text-primary border-primary/20'
        };
      case 'rtb':
      case 'ready-to-buy':
        return {
          label: 'RTB',
          icon: 'DollarSign',
          description: 'Ready to Buy',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'interest-locked':
        return {
          label: 'Interest Locked',
          icon: 'Lock',
          description: 'Investor expressed interest',
          className: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      default:
        return {
          label: status,
          icon: 'Circle',
          description: '',
          className: 'bg-muted text-muted-foreground border-muted-foreground/20'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div className="flex items-center space-x-1">
      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-body font-medium border ${config?.className}`}>
        <Icon name={config?.icon} size={12} />
        <span>{config?.label}</span>
      </span>
    </div>
  );
};

export default StatusBadge;