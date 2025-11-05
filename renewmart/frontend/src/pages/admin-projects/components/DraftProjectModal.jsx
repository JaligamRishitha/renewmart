import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { usersAPI } from '../../../services/api';

const DraftProjectModal = ({ project, onClose }) => {
  const [landownerDetails, setLandownerDetails] = useState(null);
  const [loadingLandowner, setLoadingLandowner] = useState(false);
  const [landownerError, setLandownerError] = useState(null);

  useEffect(() => {
    if (project?.landowner_id) {
      fetchLandownerDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.landowner_id]);

  const fetchLandownerDetails = async () => {
    if (!project?.landowner_id) return;

    try {
      setLoadingLandowner(true);
      setLandownerError(null);
      const userDetails = await usersAPI.getUserById(project.landowner_id);
      setLandownerDetails(userDetails);
    } catch (err) {
      console.error('[DraftProjectModal] Error fetching landowner details:', err);
      setLandownerError('Failed to load landowner details');
      // Fallback to project data if available
      setLandownerDetails({
        email: project.landowner_email || 'N/A',
        first_name: project.first_name || '',
        last_name: project.last_name || '',
        phone: project.phone || project.landownerPhone || 'N/A',
        address: project.address || 'N/A'
      });
    } finally {
      setLoadingLandowner(false);
    }
  };

  if (!project) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
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

  const getLandTypeLabel = (landType) => {
    if (!landType) return 'N/A';
    
    // Handle both snake_case and other formats from backend
    const normalized = String(landType).toLowerCase().trim();
    
    const typeMap = {
      'agricultural_land': 'Agricultural Land',
      'agricultural': 'Agricultural Land',
      'commercial_property': 'Commercial Property',
      'commercial': 'Commercial Property',
      'residential_property': 'Residential Property',
      'residential': 'Residential Property',
      'industrial_land': 'Industrial Land',
      'industrial': 'Industrial Land',
      'vacant_land': 'Vacant Land',
      'vacant': 'Vacant Land'
    };
    
    // Try exact match first
    if (typeMap[normalized]) {
      return typeMap[normalized];
    }
    
    // Try partial match (check if normalized contains key or vice versa)
    for (const [key, value] of Object.entries(typeMap)) {
      const keyWithoutUnderscore = key.replace('_', '');
      if (normalized.includes(keyWithoutUnderscore) || normalized.includes(key)) {
        return value;
      }
    }
    
    // Fallback: capitalize first letter of each word
    return normalized.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const projectName = project?.title || project?.name || 'Untitled Project';
  const location = project?.location_text || project?.location || 'Location not specified';
  const capacity = project?.capacity_mw || project?.capacity || null;
  const areaAcres = project?.area_acres || project?.areaAcres || null;
  const pricePerMWh = project?.price_per_mwh || project?.pricePerMWh || null;
  const timeline = project?.timeline_text || project?.timeline || null;
  const contractTerm = project?.contract_term_years || null;
  const developerName = project?.developer_name || project?.partners || null;
  const landType = project?.land_type || null;
  const description = project?.description || project?.admin_notes || null;

  // Use fetched landowner details if available, otherwise fallback to project data
  const landownerName = landownerDetails 
    ? `${landownerDetails.first_name || ''} ${landownerDetails.last_name || ''}`.trim() || landownerDetails.email || 'Unknown Owner'
    : (project?.landownerName || 
       `${project?.first_name || ''} ${project?.last_name || ''}`.trim() ||
       project?.landowner_email ||
       'Unknown Owner');
  const landownerEmail = landownerDetails?.email || project?.landowner_email || 'N/A';
  const landownerPhone = landownerDetails?.phone || project?.phone || project?.landownerPhone || 'N/A';
  const landownerAddress = landownerDetails?.address || project?.address || 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h2 className="font-heading font-bold text-xl text-foreground">
              {project?.status === 'draft' ? 'Draft' : 'Project'} Details
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              View-only access to project information
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
          <div className="space-y-6">
            {/* Landowner Information Section */}
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center">
                <Icon name="User" size={18} className="mr-2 text-primary" />
                Landowner Information
              </h3>
              {loadingLandowner ? (
                <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-center">
                  <Icon name="Loader" size={20} className="animate-spin text-primary mr-2" />
                  <span className="text-sm text-muted-foreground">Loading landowner details...</span>
                </div>
              ) : landownerError ? (
                <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                  <p className="text-sm text-error">{landownerError}</p>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Name:</span>
                    <span className="text-sm text-foreground text-right">{landownerName}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Email:</span>
                    <span className="text-sm text-foreground text-right break-all">{landownerEmail}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                    <span className="text-sm text-foreground text-right">{landownerPhone}</span>
                  </div>
                  {landownerAddress && landownerAddress !== 'N/A' && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">Address:</span>
                      <span className="text-sm text-foreground text-right break-words max-w-[60%]">{landownerAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Project Details Section */}
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center">
                <Icon name="FileText" size={18} className="mr-2 text-primary" />
                Project Details
              </h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Project Name:</span>
                  <span className="text-sm text-foreground text-right">{projectName}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Location:</span>
                  <span className="text-sm text-foreground text-right">{location}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Project Type:</span>
                  <span className="text-sm text-foreground text-right">{getProjectTypeLabel(project)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Land Type:</span>
                  <span className="text-sm text-foreground text-right">{getLandTypeLabel(landType)}</span>
                </div>
                {capacity && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Capacity:</span>
                    <span className="text-sm text-foreground text-right">{capacity} MW</span>
                  </div>
                )}
                {areaAcres && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Land Area:</span>
                    <span className="text-sm text-foreground text-right">{parseFloat(areaAcres).toFixed(2)} acres</span>
                  </div>
                )}
                {pricePerMWh && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Price per MWh:</span>
                    <span className="text-sm text-foreground text-right">£{parseFloat(pricePerMWh).toFixed(2)}</span>
                  </div>
                )}
                {timeline && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Timeline:</span>
                    <span className="text-sm text-foreground text-right">{timeline}</span>
                  </div>
                )}
                {contractTerm && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Contract Term:</span>
                    <span className="text-sm text-foreground text-right">{contractTerm} years</span>
                  </div>
                )}
                {developerName && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground">Developer/Partner:</span>
                    <span className="text-sm text-foreground text-right">{developerName}</span>
                  </div>
                )}
                {description && (
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-muted-foreground mb-2">Description:</span>
                    <span className="text-sm text-foreground">{description}</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <span className="text-sm text-foreground text-right">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                      Draft
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-sm text-foreground text-right">{formatDate(project?.created_at)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Last Updated:</span>
                  <span className="text-sm text-foreground text-right">{formatDate(project?.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
          <Button variant="outline" onClick={onClose} iconName="X">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DraftProjectModal;

