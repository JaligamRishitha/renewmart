import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import ProjectCard from './components/ProjectCard';
import FilterPanel from './components/FilterPanel';
import MapView from './components/MapView';
import SavedSearches from './components/SavedSearches';
import WatchlistPanel from './components/WatchlistPanel';

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

  // TODO: Replace with real API integration
  const mockProjects = [];
  const mockSavedSearches = [];
  const mockWatchlistItems = [];

  // Filter projects based on current filters
  const filteredProjects = mockProjects?.filter(project => {
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
    // In a real app, this would navigate to project details page
    const notification = {
      id: `view-${projectId}-${Date.now()}`,
      type: 'info',
      message: 'Project details would open in a new view.',
      timestamp: new Date()
    };
    setNotifications(prev => [...prev, notification]);
  };

  const handleExpressInterest = (projectId) => {
    const project = mockProjects?.find(p => p?.id === projectId);
    if (project) {
      const notification = {
        id: `interest-${projectId}-${Date.now()}`,
        type: 'success',
        title: 'Interest Expressed',
        message: `Your interest in "${project?.name}" has been recorded. The project team will contact you soon.`,
        timestamp: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    }
  };

  const handleSaveToWatchlist = (projectId) => {
    const project = mockProjects?.find(p => p?.id === projectId);
    const isAlreadyWatchlisted = watchlistItems?.some(item => item?.id === projectId);
    
    if (isAlreadyWatchlisted) {
      setWatchlistItems(prev => prev?.filter(item => item?.id !== projectId));
      const notification = {
        id: `remove-watchlist-${projectId}-${Date.now()}`,
        type: 'info',
        message: `"${project?.name}" removed from watchlist.`,
        timestamp: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    } else {
      setWatchlistItems(prev => [...prev, project]);
      const notification = {
        id: `add-watchlist-${projectId}-${Date.now()}`,
        type: 'success',
        message: `"${project?.name}" added to watchlist.`,
        timestamp: new Date()
      };
      setNotifications(prev => [...prev, notification]);
    }
  };

  const handleRemoveFromWatchlist = (projectId) => {
    const project = mockProjects?.find(p => p?.id === projectId);
    setWatchlistItems(prev => prev?.filter(item => item?.id !== projectId));
    const notification = {
      id: `remove-watchlist-${projectId}-${Date.now()}`,
      type: 'info',
      message: `"${project?.name}" removed from watchlist.`,
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
      const project = mockProjects?.find(p => p?.id === projectId);
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
      <WorkflowBreadcrumbs />
      <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-heading font-bold text-3xl text-foreground">
              Investment Opportunities
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
            
            <div className="hidden lg:block">
              <SavedSearches
                savedSearches={savedSearches}
                onLoadSearch={handleLoadSearch}
                onSaveSearch={handleSaveSearch}
                onDeleteSearch={handleDeleteSearch}
                currentFilters={filters}
              />
            </div>
            
            <div className="hidden lg:block">
              <WatchlistPanel
                watchlistItems={watchlistItems}
                onRemoveFromWatchlist={handleRemoveFromWatchlist}
                onViewProject={handleViewDetails}
                onExpressInterest={handleExpressInterest}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h2 className="font-heading font-semibold text-xl text-foreground">
                  {sortedProjects?.length} {sortedProjects?.length === 1 ? 'Project' : 'Projects'} Found
                </h2>
                
                {Object.values(filters)?.some(value => 
                  value && (typeof value === 'string' ? value : Object.values(value)?.some(v => v))
                ) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    iconName="X"
                    iconPosition="left"
                    iconSize={14}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Content Area */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedProjects?.map((project) => (
                  <ProjectCard
                    key={project?.id}
                    project={project}
                    onViewDetails={handleViewDetails}
                    onExpressInterest={handleExpressInterest}
                    onSaveToWatchlist={handleSaveToWatchlist}
                    isWatchlisted={watchlistItems?.some(item => item?.id === project?.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="h-[600px] rounded-lg overflow-hidden">
                <MapView
                  projects={sortedProjects}
                  onProjectSelect={handleProjectSelect}
                  selectedProject={selectedProject}
                />
              </div>
            )}

            {/* No Results */}
            {sortedProjects?.length === 0 && (
              <div className="text-center py-12">
                <Icon name="Search" size={64} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
                  No projects found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters to see more opportunities
                </p>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  iconName="RotateCcw"
                  iconPosition="left"
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Saved Content */}
        <div className="lg:hidden mt-8 space-y-6">
          <SavedSearches
            savedSearches={savedSearches}
            onLoadSearch={handleLoadSearch}
            onSaveSearch={handleSaveSearch}
            onDeleteSearch={handleDeleteSearch}
            currentFilters={filters}
          />
          
          <WatchlistPanel
            watchlistItems={watchlistItems}
            onRemoveFromWatchlist={handleRemoveFromWatchlist}
            onViewProject={handleViewDetails}
            onExpressInterest={handleExpressInterest}
          />
        </div>
      </main>
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
    </div>
  );
};

export default InvestorPortal;