import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { formatDistanceToNow } from 'date-fns';

const RecentInterests = ({ interests = [], isLoading = false }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'contacted':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'rejected':
        return 'bg-error/10 text-error border-error/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Interests</h3>
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Interests</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/investor/my-interests')}
          iconName="ArrowRight"
          iconPosition="right"
        >
          View All
        </Button>
      </div>

      {interests.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="Heart" size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-2">No interests yet</p>
          <p className="text-sm text-muted-foreground">
            Explore investment opportunities and express your interest
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate('/investor/portal')}
          >
            Browse Projects
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {interests.map((interest) => (
            <div
              key={interest.interest_id}
              className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-smooth cursor-pointer"
              onClick={() => navigate(`/investor/project-details/${interest.land_id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground truncate">
                    {interest.project_title || 'Untitled Project'}
                  </h4>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ml-2 flex-shrink-0 ${getStatusColor(interest.status)}`}>
                    {formatStatus(interest.status)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                  {interest.project_location && (
                    <div className="flex items-center space-x-1">
                      <Icon name="MapPin" size={12} />
                      <span className="truncate">{interest.project_location}</span>
                    </div>
                  )}
                  {interest.project_type && (
                    <div className="flex items-center space-x-1">
                      <Icon name="Zap" size={12} />
                      <span>{interest.project_type}</span>
                    </div>
                  )}
                </div>

                {(interest.capacity_mw || interest.price_per_mwh) && (
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    {interest.capacity_mw && (
                      <span>{interest.capacity_mw} MW</span>
                    )}
                    {interest.price_per_mwh && (
                      <span>${interest.price_per_mwh}/MWh</span>
                    )}
                  </div>
                )}

                {interest.created_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(interest.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentInterests;

