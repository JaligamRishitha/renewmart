import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import StatusBadge from './StatusBadge';

const ProjectDetailModal = ({ project, onClose }) => {
  if (!project) return null;

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground">
              Project Details
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete information about your land
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-smooth"
          >
            <Icon name="X" size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Project Header */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6 border border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
                  <Icon name="Zap" size={28} color="white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-2xl text-foreground mb-1">
                    {project.name}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Icon name="MapPin" size={14} />
                    <span>{project.location}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={project.status} />
            </div>
            
            {project.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                <Icon name="Zap" size={16} />
                <span className="text-xs font-medium">Capacity</span>
              </div>
              <div className="font-heading font-bold text-xl text-foreground">
                {project.capacity} <span className="text-sm font-normal">MW</span>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                <Icon name="Wind" size={16} />
                <span className="text-xs font-medium">Type</span>
              </div>
              <div className="font-heading font-bold text-lg text-foreground capitalize">
                {project.type}
              </div>
            </div>
            
            {project.timeline && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                  <Icon name="Clock" size={16} />
                  <span className="text-xs font-medium">Timeline</span>
                </div>
                <div className="font-heading font-bold text-sm text-foreground">
                  {project.timeline}
                </div>
              </div>
            )}
            
            {project.estimatedRevenue && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                  <Icon name="DollarSign" size={16} />
                  <span className="text-xs font-medium">Est. Revenue</span>
                </div>
                <div className="font-heading font-bold text-lg text-foreground">
                  {formatCurrency(project.estimatedRevenue)}M
                </div>
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-lg text-foreground mb-3">
              Additional Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Project ID</div>
                <div className="font-mono text-sm text-foreground">{project.id}</div>
              </div>
              
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div className="font-body text-sm text-foreground capitalize">
                  {project.status.replace(/-/g, ' ')}
                </div>
              </div>
              
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Last Updated</div>
                <div className="font-body text-sm text-foreground">
                  {formatDate(project.lastUpdated)}
                </div>
              </div>
              
              {project.timeline && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Project Timeline</div>
                  <div className="font-body text-sm text-foreground">{project.timeline}</div>
                </div>
              )}
            </div>
          </div>

          {/* Status-specific information */}
          {project.status === 'draft' && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="AlertCircle" size={20} className="text-yellow-600 mt-0.5" />
                <div>
                  <h5 className="font-body font-semibold text-yellow-900 mb-1">Draft Land</h5>
                  <p className="text-sm text-yellow-700">
                    This Land is saved as a draft. Complete all required information and submit it for admin review to proceed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {project.status === 'submitted' && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="Clock" size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-body font-semibold text-blue-900 mb-1">Under Review</h5>
                  <p className="text-sm text-blue-700">
                    Your land details has been submitted and is currently under admin review. You'll be notified once the review is complete.
                  </p>
                </div>
              </div>
            </div>
          )}

          {project.status === 'published' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="CheckCircle" size={20} className="text-green-600 mt-0.5" />
                <div>
                  <h5 className="font-body font-semibold text-green-900 mb-1">Published</h5>
                  <p className="text-sm text-green-700">
                    Your land is now live and visible to potential investors on the marketplace.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {project.status === 'draft' && (
            <Button
              variant="default"
              iconName="Edit"
              iconPosition="left"
              onClick={() => {
                window.location.href = `/document-upload?id=${project.id}`;
              }}
            >
              Continue Editing
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;

