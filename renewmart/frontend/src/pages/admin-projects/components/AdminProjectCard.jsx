import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { usersAPI, landsAPI } from '../../../services/api';

const AdminProjectCard = ({ project, isDraft = false, onView, onPublish, onUnpublish, onViewDetails }) => {
  const navigate = useNavigate();
  const [landownerDetails, setLandownerDetails] = useState(null);
  const [siteImageUrl, setSiteImageUrl] = useState(null);
  const [loadingImage, setLoadingImage] = useState(false);

  // Fetch landowner details for draft projects
  useEffect(() => {
    if (isDraft && project?.landowner_id) {
      fetchLandownerDetails();
    }
  }, [isDraft, project?.landowner_id]);

  // Fetch site image for published projects
  useEffect(() => {
    const isPublished = project?.status === 'published' || project?.visibility === 'published';
    if (!isDraft && isPublished && project?.id) {
      fetchSiteImage();
    }
  }, [isDraft, project?.status, project?.visibility, project?.id]);

  const fetchLandownerDetails = async () => {
    if (!project?.landowner_id) return;
    try {
      const userDetails = await usersAPI.getUserById(project.landowner_id);
      setLandownerDetails(userDetails);
    } catch (err) {
      console.error('[AdminProjectCard] Error fetching landowner details:', err);
    }
  };

  const fetchSiteImage = async () => {
    const projectId = project?.id || project?.land_id;
    if (!projectId) return;
    
    try {
      setLoadingImage(true);
      const imageData = await landsAPI.getSiteImage(projectId);
      if (imageData?.has_image && imageData?.image_url) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const url = imageData.image_url.startsWith('/api') 
          ? `${apiBaseUrl}${imageData.image_url.substring(4)}`
          : imageData.image_url;
        setSiteImageUrl(url);
      }
    } catch (err) {
      console.error('[AdminProjectCard] Error fetching site image:', err);
    } finally {
      setLoadingImage(false);
    }
  };

  const getStatusColor = (status) => {
    const statusMap = {
      'draft': 'bg-gray-100 text-gray-800',
      'submitted': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'published': 'bg-purple-100 text-purple-800',
      'unpublished': 'bg-gray-100 text-gray-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status) => {
    if (!status) return 'Draft';
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getProjectTypeImage = (project) => {
    const isPublished = project?.status === 'published' || project?.visibility === 'published';
    
    // For published projects in submitted tab, use fetched site image
    if (!isDraft && isPublished && siteImageUrl) {
      return siteImageUrl;
    }
    
    // For published projects, try to use sale advisor uploaded image from project data
    if (isPublished && project?.has_site_image && project?.image_url) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      return project.image_url.startsWith('/api') 
        ? `${apiBaseUrl}${project.image_url.substring(4)}`
        : project.image_url;
    }
    
    // For all other projects (drafts, non-published), use no_image
    return '/assets/images/no_image.png';
  };

  const getProjectTypeLabel = (project) => {
    const type = project?.energy_key || project?.energyType || project?.type || '';
    const typeMap = {
      'solar': 'Solar Energy',
      'wind': 'Wind Energy',
      'hydro': 'Hydroelectric',
      'biomass': 'Biomass',
      'geothermal': 'Geothermal'
    };
    return typeMap[type.toLowerCase()] || type || 'Renewable Energy';
  };

  const projectId = project?.id || project?.land_id;
  const projectName = project?.title || project?.name || 'Untitled Project';
  const location = project?.location_text || project?.location || 'Location not specified';
  const capacity = project?.capacity_mw || project?.capacity || null;
  const areaAcres = project?.area_acres || project?.areaAcres || null;
  // Use fetched landowner details if available (for drafts), otherwise fallback to project data
  const landownerName = landownerDetails 
    ? `${landownerDetails.first_name || ''} ${landownerDetails.last_name || ''}`.trim() || landownerDetails.email || 'Unknown Owner'
    : (project?.landownerName || 
       `${project?.first_name || ''} ${project?.last_name || ''}`.trim() ||
       project?.landowner_email ||
       'Unknown Owner');

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 overflow-hidden">
      {/* Project Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        <Image
          src={getProjectTypeImage(project)}
          alt={projectName}
          className="w-full h-full object-cover"
        />
        
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project?.status)}`}>
            {formatStatus(project?.status)}
          </span>
        </div>
      </div>

      {/* Project Content */}
      <div className="p-6">
        {/* Project Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
          {projectName}
        </h3>

        {/* Project Type */}
        <div className="flex items-center space-x-2 mb-3">
          <Icon name="Zap" size={14} className="text-primary" />
          <span className="text-sm text-muted-foreground">
            {getProjectTypeLabel(project)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-start space-x-2 mb-3">
          <Icon name="MapPin" size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-sm text-muted-foreground line-clamp-2">
            {location}
          </span>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {capacity && (
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground mb-1">Capacity</div>
              <div className="text-sm font-semibold text-foreground">
                {capacity} MW
              </div>
            </div>
          )}
          {areaAcres && (
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-xs text-muted-foreground mb-1">Land Area</div>
              <div className="text-sm font-semibold text-foreground">
                {parseFloat(areaAcres).toFixed(2)} acres
              </div>
            </div>
          )}
        </div>

        {/* Landowner Info */}
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <Icon name="User" size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Owner: <span className="text-foreground font-medium">{landownerName}</span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {isDraft ? (
            // Draft projects - View only
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView && onView(project)}
              iconName="Eye"
              className="w-full"
            >
              View Details
            </Button>
          ) : (
            // Submitted projects - Can perform operations
            <div className="flex space-x-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onView && onView(project)}
                iconName="Eye"
                className="flex-1"
              >
                View & Manage
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails && onViewDetails(project)}
                iconName="FileText"
                className="flex-1"
              >
                Details
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProjectCard;

