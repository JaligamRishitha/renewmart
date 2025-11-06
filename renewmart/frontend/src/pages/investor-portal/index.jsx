import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';
import Pagination from '../../components/ui/Pagination';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ProjectCard from './components/ProjectCard';
import FilterPanel from './components/FilterPanel';
import MapView from './components/MapView';
import SavedSearches from './components/SavedSearches';
import WatchlistPanel from './components/WatchlistPanel';
import { landsAPI, investorsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const InvestorPortal = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'map'
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    projectType: '',
    location: '',
    capacityRange: { min: '', max: '' },
    priceRange: { min: '', max: '' },
    timeline: '',
    sortBy: 'newest',
    availableOnly: true
  });

  // Projects state
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const mockSavedSearches = [];
  const mockWatchlistItems = [];
  
  // Express Interest Modal state
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedProjectForInterest, setSelectedProjectForInterest] = useState(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ctaAccepted, setCtaAccepted] = useState(false);
  const [submittingInterest, setSubmittingInterest] = useState(false);
  
  // Interest status for each project
  const [projectInterests, setProjectInterests] = useState({});

  // Fetch published projects and interest status
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const data = await landsAPI.getMarketplaceProjects();
        setProjects(data || []);
        
        // Fetch interest status for all projects
        if (data && data.length > 0) {
          fetchInterestStatus(data);
        }
      } catch (error) {
        console.error('Error fetching marketplace projects:', error);
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    
    fetchProjects();
  }, []);
  
  // Fetch interest status for projects
  const fetchInterestStatus = async (projectsList) => {
    try {
      const interests = await investorsAPI.getMyInterests();
      const interestsMap = {};
      
      if (interests && Array.isArray(interests)) {
        interests.forEach(interest => {
          // Handle both land_id and landId (camelCase) formats
          const landId = interest.land_id || interest.landId;
          if (landId) {
            interestsMap[landId] = interest;
          }
        });
      }
      
      setProjectInterests(interestsMap);
    } catch (error) {
      console.error('Error fetching interest status:', error);
      // Don't show error to user, just continue without interest status
    }
  };

  // Filter projects based on current filters
  const filteredProjects = projects?.filter(project => {
    // Exclude projects with active interests (interestCount > 0) from marketplace
    // These projects should only be visible in "My Interest" section
    if ((project?.interestCount || 0) > 0) {
      return false; // Hide projects with any active interests
    }
    
    // Exclude locked projects unless user has an active interest (backup check)
    if (project?.status === 'interest_locked') {
      const projectId = project?.id || project?.land_id;
      const interestStatus = projectInterests[projectId];
      // Only show locked projects if user has an active (pending or approved) interest
      if (!interestStatus || !['pending', 'approved'].includes(interestStatus.status)) {
        return false; // Hide locked projects from other investors
      }
    }
    
    if (filters?.search && !project?.name?.toLowerCase()?.includes(filters?.search?.toLowerCase()) && 
        !project?.location?.toLowerCase()?.includes(filters?.search?.toLowerCase())) {
      return false;
    }
    if (filters?.projectType && project?.type !== filters?.projectType) {
      return false;
    }
    if (filters?.location && !project?.location?.includes(filters?.location)) {
      return false;
    }
    if (filters?.capacityRange?.min && project?.capacity < parseInt(filters?.capacityRange?.min)) {
      return false;
    }
    if (filters?.capacityRange?.max && project?.capacity > parseInt(filters?.capacityRange?.max)) {
      return false;
    }
    if (filters?.priceRange?.min && project?.pricePerMWh < parseFloat(filters?.priceRange?.min)) {
      return false;
    }
    if (filters?.priceRange?.max && project?.pricePerMWh > parseFloat(filters?.priceRange?.max)) {
      return false;
    }
    if (filters?.availableOnly && !project?.isAvailable) {
      return false;
    }
    return true;
  });

  // Sort filtered projects
  const sortedProjects = [...filteredProjects]?.sort((a, b) => {
    switch (filters?.sortBy) {
      case 'price-low':
        return a?.pricePerMWh - b?.pricePerMWh;
      case 'price-high':
        return b?.pricePerMWh - a?.pricePerMWh;
      case 'capacity-high':
        return b?.capacity - a?.capacity;
      case 'capacity-low':
        return a?.capacity - b?.capacity;
      case 'newest':
      default:
        return new Date(b.publishedAt) - new Date(a.publishedAt);
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = sortedProjects.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    // Initialize with mock data
    setWatchlistItems(mockWatchlistItems);
    setSavedSearches(mockSavedSearches);

    // Show welcome notification
    const welcomeNotification = {
      id: 'welcome',
      type: 'info',
      title: 'Welcome to Investor Portal',
      message: 'Discover renewable energy investment opportunities and express your interest in promising projects.',
      timestamp: new Date(),
      actions: [
        {
          label: 'View Tutorial',
          onClick: () => console.log('Tutorial clicked')
        }
      ]
    };
    setNotifications([welcomeNotification]);
  }, []);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      projectType: '',
      location: '',
      capacityRange: { min: '', max: '' },
      priceRange: { min: '', max: '' },
      timeline: '',
      sortBy: 'newest',
      availableOnly: true
    };
    setFilters(clearedFilters);
  };

  const handleViewDetails = (projectId) => {
    console.log('View details for project:', projectId);
    // Navigate to investor-specific land details page
    navigate(`/investor/land-details/${projectId}`);
  };

  const handleExpressInterest = (projectId) => {
    const project = projects?.find(p => p?.id === projectId);
    if (project) {
      setSelectedProjectForInterest(project);
      setShowInterestModal(true);
    }
  };
  
  const handleSubmitInterest = async () => {
    if (!ndaAccepted || !ctaAccepted) {
      toast.error('Please accept both NDA and CTA to continue');
      return;
    }
    
    if (!selectedProjectForInterest) {
      toast.error('No project selected');
      return;
    }
    
    try {
      setSubmittingInterest(true);
      await investorsAPI.expressInterest(selectedProjectForInterest.id, {
        nda_accepted: ndaAccepted,
        cta_accepted: ctaAccepted
      });
      
      toast.success('Interest submitted successfully! The project is now locked and visible only to you.');
      
      // Close modal and reset form
      setShowInterestModal(false);
      setNdaAccepted(false);
      setCtaAccepted(false);
      
      // Refresh projects to get updated status
      const data = await landsAPI.getMarketplaceProjects();
      setProjects(data || []);
      
      // Refresh interest status
      if (data && data.length > 0) {
        await fetchInterestStatus(data);
      }
    } catch (err) {
      console.error('Error submitting interest:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to submit interest';
      
      // Handle specific error cases
      if (errorMessage.includes('locked') || errorMessage.includes('another investor')) {
        toast.error('This project is currently locked as another investor has expressed interest. Please try again later.');
      } else if (errorMessage.includes('cannot express interest') || errorMessage.includes('rejected')) {
        // Extract days remaining if available
        const daysMatch = errorMessage.match(/(\d+)\s*day/);
        if (daysMatch) {
          toast.error(errorMessage, { duration: 6000 });
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmittingInterest(false);
    }
  };
  
  const handleCloseInterestModal = () => {
    setShowInterestModal(false);
    setNdaAccepted(false);
    setCtaAccepted(false);
    setSelectedProjectForInterest(null);
  };

  const handleSaveToWatchlist = (projectId) => {
    const project = projects?.find(p => p?.id === projectId);
    const isAlreadyWatchlisted = watchlistItems?.some(item => item?.id === projectId);
    
    if (isAlreadyWatchlisted) {
      setWatchlistItems(prev => prev?.filter(item => item?.id !== projectId));
      const notification = {
        id: `remove-watchlist-${projectId}-${Date.now()}`,
        type: 'info',
        message: `"${project?.name || project?.title}" removed from watchlist.`,
        timestamp: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    } else {
      setWatchlistItems(prev => [...prev, project]);
      const notification = {
        id: `add-watchlist-${projectId}-${Date.now()}`,
        type: 'success',
        message: `"${project?.name || project?.title}" added to watchlist.`,
        timestamp: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    }
  };

  const handleRemoveFromWatchlist = (projectId) => {
    const project = projects?.find(p => p?.id === projectId);
    setWatchlistItems(prev => prev?.filter(item => item?.id !== projectId));
    const notification = {
      id: `remove-watchlist-${projectId}-${Date.now()}`,
      type: 'info',
      message: `"${project?.name || project?.title}" removed from watchlist.`,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleSaveSearch = (searchData) => {
    setSavedSearches(prev => [...prev, searchData]);
    const notification = {
      id: `save-search-${Date.now()}`,
      type: 'success',
      message: `Search "${searchData?.name}" has been saved.`,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleLoadSearch = (search) => {
    setFilters(search?.filters);
    const notification = {
      id: `load-search-${Date.now()}`,
      type: 'info',
      message: `Loaded search "${search?.name}".`,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleDeleteSearch = (searchId) => {
    const search = savedSearches?.find(s => s?.id === searchId);
    setSavedSearches(prev => prev?.filter(s => s?.id !== searchId));
    const notification = {
      id: `delete-search-${Date.now()}`,
      type: 'info',
      message: `Search "${search?.name}" has been deleted.`,
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleProjectSelect = (projectId, action = null) => {
    if (projectId) {
      const project = projects?.find(p => p?.id === projectId);
      setSelectedProject(project);
      
      if (action === 'view') {
        handleViewDetails(projectId);
      } else if (action === 'interest') {
        handleExpressInterest(projectId);
      }
    } else {
      setSelectedProject(null);
    }
  };

  const handleQuickAction = (actionId) => {
    switch (actionId) {
      case 'express-interest':
        if (sortedProjects?.length > 0) {
          handleExpressInterest(sortedProjects?.[0]?.id);
        }
        break;
      case 'request-info':
        const notification = {
          id: `request-info-${Date.now()}`,
          type: 'info',
          message: 'Information request form would open.',
          timestamp: new Date()
        };
        setNotifications(prev => [...prev, notification]);
        break;
      case 'schedule-visit':
        const visitNotification = {
          id: `schedule-visit-${Date.now()}`,
          type: 'info',
          message: 'Site visit scheduling interface would open.',
          timestamp: new Date()
        };
        setNotifications(prev => [...prev, visitNotification]);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="investor" notifications={{ opportunities: sortedProjects?.length }} />
      <div className="pt-16">
       
        <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
        {/* Investment Opportunities View */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-heading font-bold text-3xl text-foreground">
              Market Place
            </h1>
            
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-smooth ${
                    viewMode === 'grid' ?'bg-primary text-primary-foreground' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="Grid3X3" size={18} />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-md transition-smooth ${
                    viewMode === 'map' ?'bg-primary text-primary-foreground' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name="Map" size={18} />
                </button>
              </div>
            </div>
          </div>
          
          <p className="text-muted-foreground">
            Discover and evaluate renewable energy projects ready for investment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters and Saved Content */}
          <div className="lg:col-span-1 space-y-6">
            <FilterPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              isOpen={isFilterPanelOpen}
              onToggle={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              totalResults={sortedProjects?.length}
            />
            
  
           
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            

            {/* Content Area */}
            {isLoadingProjects ? (
              <div className="text-center py-12">
                <Icon name="Loader2" size={64} className="text-primary mx-auto mb-4 animate-spin" />
                <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
                  Loading Projects...
                </h3>
                <p className="text-muted-foreground">
                  Fetching latest investment opportunities
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedProjects?.map((project) => {
                    // Match interest status by project ID (handle both id and land_id formats)
                    const projectId = project?.id || project?.land_id;
                    const interestStatus = projectInterests[projectId];
                    
                    return (
                      <ProjectCard
                        key={projectId}
                        project={project}
                        onViewDetails={handleViewDetails}
                        onExpressInterest={handleExpressInterest}
                        onSaveToWatchlist={handleSaveToWatchlist}
                        isWatchlisted={watchlistItems?.some(item => item?.id === projectId)}
                        interestStatus={interestStatus}
                      />
                    );
                  })}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={sortedProjects.length}
                      showInfo={true}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="h-[600px] rounded-lg overflow-hidden">
                <MapView
                  projects={sortedProjects}
                  onProjectSelect={handleProjectSelect}
                  selectedProject={selectedProject}
                  projectInterests={projectInterests}
                />
              </div>
            )}

            {/* No Results */}
            {!isLoadingProjects && sortedProjects?.length === 0 && (
              <div className="text-center py-12">
                <Icon name="Search" size={64} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
                  No projects found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {projects?.length === 0 
                    ? 'No published projects available yet. Check back later for new opportunities!' 
                    : 'Try adjusting your filters to see more opportunities'}
                </p>
                {projects?.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilters}
                    iconName="RotateCcw"
                    iconPosition="left"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

  
      </main>
      </div>
      {/* Notifications */}
      <NotificationIndicator
        notifications={notifications}
        position="top-right"
        maxVisible={3}
        autoHide={true}
        hideDelay={5000}
      />
      {/* Quick Actions */}
      <QuickActions
        userRole="investor"
        currentContext="investor-portal"
        onActionComplete={handleQuickAction}
        position="bottom-right"
      />
      
      {/* Express Interest Modal */}
      <Modal
        isOpen={showInterestModal}
        onClose={handleCloseInterestModal}
        title="Express Interest"
      >
        <div className="space-y-6">
          {selectedProjectForInterest && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Project:</p>
              <p className="font-semibold text-foreground">
                {selectedProjectForInterest?.name || selectedProjectForInterest?.title}
              </p>
            </div>
          )}
          
          <p className="text-muted-foreground">
            To express interest in this project, please review and accept the following:
          </p>
          
          <div className="bg-info/10 border border-info/20 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-info mt-0.5 flex-shrink-0" />
              <p className="text-sm text-info">
                <strong>Note:</strong> Once you express interest, this project will be locked and hidden from other investors until your interest is reviewed by the sales advisor.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ndaAccepted}
                  onChange={(e) => setNdaAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  required
                />
                <div className="flex-1">
                  <span className="font-medium text-foreground">NDA (Non-Disclosure Agreement)</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    I agree to keep all project information confidential and not disclose it to any third parties without authorization.
                  </p>
                </div>
              </label>
            </div>

            <div className="border border-border rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ctaAccepted}
                  onChange={(e) => setCtaAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  required
                />
                <div className="flex-1">
                  <span className="font-medium text-foreground">CTA (Consent to Assign)</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    I consent to having my interest assigned to a sales advisor for review and approval.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCloseInterestModal}
              disabled={submittingInterest}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSubmitInterest}
              disabled={!ndaAccepted || !ctaAccepted || submittingInterest}
              iconName="Send"
              iconPosition="right"
            >
              {submittingInterest ? 'Submitting...' : 'Submit Interest'}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default InvestorPortal;