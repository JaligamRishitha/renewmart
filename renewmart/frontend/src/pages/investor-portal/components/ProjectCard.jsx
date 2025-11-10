import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { useMarketplaceSettings } from '../../../context/MarketplaceSettingsContext';

const ProjectCard = ({ project, onViewDetails, onExpressInterest, onSaveToWatchlist, isWatchlisted = false, interestStatus = null }) => {
  const { settings } = useMarketplaceSettings();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })?.format(price);
  };

  const formatCapacity = (capacity) => {
    return `${capacity?.toLocaleString('en-US')} MW`;
  };

  const getProjectTypeIcon = (type) => {
    const iconMap = {
      'Solar': 'Sun',
      'Wind': 'Wind',
      'Hydroelectric': 'Waves',
      'Biomass': 'Leaf',
      'Geothermal': 'Zap'
    };
    return iconMap?.[type] || 'Zap';
  };

  const getProjectTypeColor = (type) => {
    const colorMap = {
      'Solar': 'text-yellow-600 bg-yellow-50',
      'Wind': 'text-blue-600 bg-blue-50',
      'Hydroelectric': 'text-cyan-600 bg-cyan-50',
      'Biomass': 'text-green-600 bg-green-50' ,
      'Geothermal': 'text-orange-600 bg-orange-50'
    };
    return colorMap?.[type] || 'text-primary bg-primary/10';
  };

  const getProjectTypeTextColor = (type) => {
    const colorMap = {
      'Solar': 'text-yellow-600',
      'Wind': 'text-blue-600',
      'Hydroelectric': 'text-cyan-600',
      'Biomass': 'text-green-600',
      'Geothermal': 'text-orange-600'
    };
    return colorMap?.[type] || 'text-primary';
  };

  // Get project type image from assets - same logic as admin marketplace
  const getProjectTypeImage = (project) => {
    // First check if project has a site image uploaded by saleadvisor
    if (project?.has_site_image && project?.image_url) {
      // Use site image if available
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      return project.image_url.startsWith('/api') 
        ? `${apiBaseUrl}${project.image_url.substring(4)}`
        : project.image_url;
    }
    
    // Then check if project has a custom image
    if (project?.image) {
      return project.image;
    }
    
    // Otherwise, determine image based on project type
    const rawType = String(
      project?.energy_key || 
      project?.energyType || 
      project?.project_type || 
      project?.type || 
      ''
    ).toLowerCase();
    
    if (rawType.includes('solar')) {
      return '/assets/images/solar.png';
    } else if (rawType.includes('wind')) {
      return '/assets/images/wind.png';
    } else if (rawType.includes('biomass') || rawType.includes('bio')) {
      return '/assets/images/biomass.png';
    } else if (rawType.includes('geothermal') || rawType.includes('geo')) {
      return '/assets/images/geothermal.png';
    } else if (rawType.includes('hydroelectric') || rawType.includes('water')) {
      return '/assets/images/hydro.png';
    }
    
    // Fallback to no_image.png if type doesn't match
    return '/assets/images/no_image.png';
  };

  const imgSrc = getProjectTypeImage(project);

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 overflow-hidden group">
      {/* Project Image */}
      <div className="relative h-44 overflow-hidden bg-muted">
        <Image
          src={imgSrc}
          alt={`${project?.name || 'Project'} renewable energy project`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onLoad={() => setIsImageLoaded(true)}
        />
        
        {/* Project Type Badge */}
        {settings?.showEnergyType !== false && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 bg-white shadow-sm">
            <Icon name={getProjectTypeIcon(project?.type)} size={12} className={getProjectTypeTextColor(project?.type)} />
            <span className={getProjectTypeTextColor(project?.type)}>{project?.type}</span>
          </div>
        )}

        {/* Watchlist Button */}
        <button
          onClick={() => onSaveToWatchlist(project?.id)}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <Icon 
            name={isWatchlisted ? "Heart" : "Heart"} 
            size={16} 
            className={isWatchlisted ? "text-red-500 fill-current" : "text-muted-foreground"} 
          />
        </button>

        {/* Status Indicator */}
        {project?.status && (
          <div className={`absolute bottom-3 left-3 px-2 py-1 rounded-full text-xs font-medium ${
            project.status === 'interest_locked' 
              ? 'bg-warning text-warning-foreground' 
              : project.status === 'published'
              ? 'bg-success text-success-foreground'
              : 'bg-muted text-muted-foreground'
          }`}>
            {project.status === 'interest_locked' ? 'Locked' : project.status === 'published' ? 'Available' : project.status}
          </div>
        )}
        
        {/* Locked Badge - Show if project is locked and user has interest */}
        {project?.status === 'interest_locked' && interestStatus && (
          <div className="absolute top-12 right-3 px-2 py-1 bg-primary/90 text-primary-foreground rounded-full text-xs font-medium flex items-center space-x-1">
            <Icon name="Lock" size={12} />
            <span>Your Interest</span>
          </div>
        )}
      </div>
      {/* Project Details */}
      <div className="p-3.5">
        {/* Header */}
        <div className="mb-2.5">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1 line-clamp-1">
            {project?.name}
          </h3>
          {settings?.showLocation !== false && (
            <div className="flex items-center text-muted-foreground text-sm">
              <Icon name="MapPin" size={14} className="mr-1" />
              <span className="line-clamp-1">{project?.location}</span>
            </div>
          )}
        </div>

        {/* Key Metrics */}
        {(settings?.showCapacity !== false || settings?.showPrice !== false) && (
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {settings?.showCapacity !== false && (
              <div className="bg-muted rounded-lg p-2.5">
                <div className="text-xs text-muted-foreground mb-0.5">Capacity</div>
                <div className="font-heading font-semibold text-sm text-foreground">
                  {formatCapacity(project?.capacity)}
                </div>
              </div>
            )}
            {settings?.showPrice !== false && (
              <div className="bg-muted rounded-lg p-2.5">
                <div className="text-xs text-muted-foreground mb-0.5">Price/MWh</div>
                <div className="font-heading font-semibold text-sm text-foreground">
                  {formatPrice(project?.pricePerMWh)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timeline & Contract */}
        {(settings?.showTimeline !== false || settings?.showContractTerm !== false) && (
          <div className="space-y-1.5 mb-3">
            {settings?.showTimeline !== false && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Timeline:</span>
                <span className="font-medium text-foreground">{project?.timeline}</span>
              </div>
            )}
            {settings?.showContractTerm !== false && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Contract:</span>
                <span className="font-medium text-foreground">
                  {project?.contract || 
                   (project?.contract_term_years ? `${project.contract_term_years} years` : null) ||
                   (project?.contractTerm ? `${project.contractTerm} years` : null) ||
                   (project?.contractDuration ? project.contractDuration : null) ||
                   'N/A'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Partners */}
        {project?.partners && project?.partners?.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-2">Partners</div>
            <div className="flex flex-wrap gap-1">
              {project?.partners?.slice(0, 2)?.map((partner, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-secondary/10 text-secondary text-xs rounded-full"
                >
                  {partner}
                </span>
              ))}
              {project?.partners?.length > 2 && (
                <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  +{project?.partners?.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(project?.id)}
            className="flex-1 min-w-0"
            iconName="Eye"
            iconPosition="left"
            iconSize={14}
          >
            <span className="truncate">Details</span>
          </Button>
          {interestStatus ? (
            <div className="flex-1 min-w-0 flex items-center justify-center px-3 py-2 rounded-md border border-border">
              <div className="flex items-center space-x-2 min-w-0">
                {interestStatus.status === 'approved' && (
                  <>
                    <Icon name="CheckCircle" size={14} className="text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-600 truncate">Approved</span>
                  </>
                )}
                {interestStatus.status === 'pending' && (
                  <>
                    <Icon name="Clock" size={14} className="text-yellow-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-yellow-600 truncate">Pending</span>
                  </>
                )}
                {interestStatus.status === 'rejected' && (
                  <>
                    <Icon name="XCircle" size={14} className="text-red-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-600 truncate">Rejected</span>
                    {interestStatus.approved_at && (
                      <span className="text-xs text-muted-foreground ml-1 truncate">
                        (Can retry after 1 week)
                      </span>
                    )}
                  </>
                )}
                {!['approved', 'pending', 'rejected'].includes(interestStatus.status) && (
                  <>
                    <Icon name="Clock" size={14} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground truncate">
                      {interestStatus.status || 'Pending'}
                    </span>
                  </>
                )}
              </div>
            </div>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onExpressInterest(project?.id)}
              className="flex-1 min-w-0"
              iconName="Heart"
              iconPosition="left"
              iconSize={14}
              disabled={project?.status === 'interest_locked' && !interestStatus}
              title={project?.status === 'interest_locked' && !interestStatus ? 'This project is locked by another investor' : ''}
            >
              <span className="truncate">
                {project?.status === 'interest_locked' && !interestStatus ? 'Locked' : 'Interest'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;