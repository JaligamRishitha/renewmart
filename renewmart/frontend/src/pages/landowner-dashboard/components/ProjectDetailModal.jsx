import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import StatusBadge from './StatusBadge';
import { investorsAPI, landsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const ProjectDetailModal = ({ project, onClose, initialTab = 'details' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [investorInterests, setInvestorInterests] = useState([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [fullProjectData, setFullProjectData] = useState(null);
  const [loadingProject, setLoadingProject] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch full project details when modal opens
  useEffect(() => {
    if (project?.id || project?.land_id) {
      fetchFullProjectDetails();
    }
  }, [project]);

  const fetchFullProjectDetails = async () => {
    const projectId = project?.id || project?.land_id;
    if (!projectId) return;
    
    try {
      setLoadingProject(true);
      const fullData = await landsAPI.getLandById(projectId);
      console.log('[ProjectDetailModal] Fetched full project data:', fullData);
      setFullProjectData(fullData);
    } catch (err) {
      console.error('[ProjectDetailModal] Error fetching full project details:', err);
      // Fallback to provided project data
      setFullProjectData(project);
    } finally {
      setLoadingProject(false);
    }
  };

  useEffect(() => {
    if (fullProjectData && (fullProjectData.status === 'published' || fullProjectData.status === 'rtb')) {
      fetchInvestorInterests();
    }
  }, [fullProjectData]);

  const fetchInvestorInterests = async () => {
    const projectId = fullProjectData?.id || fullProjectData?.land_id;
    if (!projectId) return;
    
    try {
      setLoadingInterests(true);
      const interests = await investorsAPI.getLandInterests(projectId);
      console.log('[ProjectDetailModal] Fetched investor interests:', interests);
      setInvestorInterests(interests || []);
    } catch (err) {
      console.error('[ProjectDetailModal] Error fetching investor interests:', err);
      toast.error('Failed to load investor interests');
      setInvestorInterests([]);
    } finally {
      setLoadingInterests(false);
    }
  };

  // Use full project data if available, otherwise fallback to provided project
  const displayProject = fullProjectData || project;
  
  if (!displayProject) return null;

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
      currency: 'GBP',
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

        {/* Tabs */}
        {(displayProject.status === 'published' || displayProject.status === 'rtb') && (
          <div className="px-6 border-b border-border flex space-x-1 bg-muted/20">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium transition-smooth border-b-2 ${
                activeTab === 'details'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Icon name="FileText" size={16} className="inline mr-2" />
              Project Details
            </button>
            <button
              onClick={() => setActiveTab('interests')}
              className={`px-4 py-3 text-sm font-medium transition-smooth border-b-2 relative ${
                activeTab === 'interests'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <Icon name="Users" size={16} className="inline mr-2" />
              View Interest
              {investorInterests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  {investorInterests.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingProject ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading project details...</span>
            </div>
          ) : activeTab === 'details' ? (
            <>
          {/* Project Header */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 mb-6 border border-primary/20">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
                  <Icon name="Zap" size={28} color="white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-2xl text-foreground mb-1">
                    {displayProject.name || displayProject.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Icon name="MapPin" size={14} />
                    <span>{displayProject.location || displayProject.location_text}</span>
                    {displayProject.post_code && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{displayProject.post_code}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <StatusBadge status={displayProject.status} />
            </div>
            
            {(displayProject.description || displayProject.project_description) && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayProject.description || displayProject.project_description}
              </p>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                <Icon name="Zap" size={16} />
                <span className="text-xs font-medium">Capacity</span>
              </div>
              <div className="font-heading font-bold text-xl text-foreground">
                {displayProject.capacity || displayProject.capacity_mw} <span className="text-sm font-normal">MW</span>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                <Icon name="Wind" size={16} />
                <span className="text-xs font-medium">Type</span>
              </div>
              <div className="font-heading font-bold text-lg text-foreground capitalize">
                {displayProject.type || displayProject.energy_key || displayProject.energyType || 'N/A'}
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                <Icon name="Map" size={16} />
                <span className="text-xs font-medium">Land Area</span>
              </div>
              <div className="font-heading font-bold text-lg text-foreground">
                {displayProject.areaAcres || displayProject.area_acres
                  ? `${parseFloat(displayProject.areaAcres || displayProject.area_acres).toFixed(2)} acres`
                  : 'N/A'}
              </div>
            </div>
            
            {(displayProject.timeline || displayProject.timeline_text) && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                  <Icon name="Clock" size={16} />
                  <span className="text-xs font-medium">Timeline</span>
                </div>
                <div className="font-heading font-bold text-sm text-foreground">
                  {displayProject.timeline || displayProject.timeline_text}
                </div>
              </div>
            )}
            
            {displayProject.estimatedRevenue && (
              <div className="bg-muted/30 rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 text-muted-foreground mb-2">
                  <Icon name="PoundSterling" size={16} />
                  <span className="text-xs font-medium">Est. Revenue</span>
                </div>
                <div className="font-heading font-bold text-lg text-foreground">
                  {formatCurrency(displayProject.estimatedRevenue)}M
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
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div className="font-body text-sm text-foreground capitalize">
                  {displayProject.status?.replace(/-/g, ' ') || 'N/A'}
                </div>
              </div>
              
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <div className="text-sm text-muted-foreground mb-1">Last Updated</div>
                <div className="font-body text-sm text-foreground">
                  {formatDate(displayProject.lastUpdated || displayProject.updated_at)}
                </div>
              </div>
              
              {displayProject.post_code && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Post Code</div>
                  <div className="font-body text-sm text-foreground">{displayProject.post_code}</div>
                </div>
              )}
              
              {displayProject.land_type && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Land Type</div>
                  <div className="font-body text-sm text-foreground capitalize">
                    {displayProject.land_type?.replace(/_/g, ' ') || displayProject.landType?.replace(/_/g, ' ') || 'N/A'}
                  </div>
                </div>
              )}
              
              {displayProject.price_per_mwh && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Price per MWh</div>
                  <div className="font-body text-sm text-foreground">
                    {formatCurrency(displayProject.price_per_mwh || displayProject.pricePerMWh)}
                  </div>
                </div>
              )}
              
              {displayProject.contract_term_years && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Contract Duration</div>
                  <div className="font-body text-sm text-foreground">
                    {displayProject.contract_term_years || displayProject.contractTermYears} years
                  </div>
                </div>
              )}
              
              
              
              {displayProject.potential_partners && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border md:col-span-2">
                  <div className="text-sm text-muted-foreground mb-1">Potential Partners</div>
                  <div className="font-body text-sm text-foreground">
                    {displayProject.potential_partners || displayProject.potentialPartners || 'N/A'}
                  </div>
                </div>
              )}
              
              {(displayProject.timeline || displayProject.timeline_text) && (
                <div className="bg-muted/20 rounded-lg p-4 border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Project Timeline</div>
                  <div className="font-body text-sm text-foreground">
                    {displayProject.timeline || displayProject.timeline_text || 'N/A'}
                  </div>
                </div>
              )}
              
             
            </div>
            
            {displayProject.project_description && (
              <div className="bg-muted/20 rounded-lg p-4 border border-border mt-4">
                <div className="text-sm text-muted-foreground mb-2">Project Description</div>
                <div className="font-body text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {displayProject.project_description || displayProject.description || 'N/A'}
                </div>
              </div>
            )}
          </div>

          {/* Status-specific information */}
          {displayProject.status === 'draft' && (
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

          {displayProject.status === 'submitted' && (
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

          {displayProject.status === 'published' && (
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
            </>
          ) : (
            /* Investor Interests Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    Investor Interests
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    View all investors who have expressed interest in this project
                  </p>
                </div>
              </div>

              {loadingInterests ? (
                <div className="flex items-center justify-center py-12">
                  <Icon name="Loader2" size={32} className="animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading investor interests...</span>
                </div>
              ) : investorInterests.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="Users" size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold text-foreground mb-2">No Investor Interests Yet</h4>
                  <p className="text-muted-foreground">
                    No investors have expressed interest in this project yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {investorInterests.map((interest, index) => (
                    <div
                      key={interest.interest_id || interest.id || index}
                      className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-smooth"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Icon name="User" size={20} className="text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {interest.investor_name || 
                                 interest.investorName || 
                                 `${interest.first_name || interest.investor?.first_name || ''} ${interest.last_name || interest.investor?.last_name || ''}`.trim() || 
                                 `${interest.investor?.first_name || ''} ${interest.investor?.last_name || ''}`.trim() ||
                                 'Unknown Investor'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {interest.investor_email || 
                                 interest.investorEmail || 
                                 interest.email || 
                                 interest.investor?.email || 
                                 'No email provided'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">
  {/* Phone */}
  <div className="flex items-center text-sm min-h-[28px]">
    <Icon name="Phone" size={14} className="text-muted-foreground mr-2" />
    <span className="text-muted-foreground w-32">Phone:</span>
    <span className="text-foreground truncate">
      {interest.phone || interest.investor?.phone || '—'}
    </span>
  </div>

  {/* Status */}
  <div className="flex items-center text-sm min-h-[28px]">
    <Icon name="Info" size={14} className="text-muted-foreground mr-2" />
    <span className="text-muted-foreground w-32">Status:</span>
    {interest.status ? (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          interest.status === 'approved'
            ? 'bg-green-500/10 text-green-600'
            : interest.status === 'pending'
            ? 'bg-yellow-500/10 text-yellow-600'
            : interest.status === 'rejected'
            ? 'bg-red-500/10 text-red-600'
            : 'bg-blue-500/10 text-blue-600'
        }`}
      >
        {interest.status.charAt(0).toUpperCase() + interest.status.slice(1)}
      </span>
    ) : (
      <span className="text-muted-foreground opacity-50">—</span>
    )}
  </div>

  {/* Expressed Interest */}
  <div className="flex items-center text-sm min-h-[28px]">
    <Icon name="Calendar" size={14} className="text-muted-foreground mr-2" />
    <span className="text-muted-foreground w-32">Expressed Interest:</span>
    <span className="text-foreground truncate">
      {interest.created_at ? formatDate(interest.created_at) : '—'}
    </span>
  </div>
</div>


                          
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;

