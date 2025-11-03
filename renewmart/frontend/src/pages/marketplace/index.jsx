import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import FilterSidebar from './components/FilterSidebar';
import SearchHeader from './components/SearchHeader';
import FilterChips from './components/FilterChips';
import PPACard from './components/PPACard';
import ActivitySidebar from './components/ActivitySidebar';
import MapView from './components/MapView';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { landsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Marketplace = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filterSidebarCollapsed, setFilterSidebarCollapsed] = useState(false);
  const [activitySidebarCollapsed, setActivitySidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    location: '',
    priceRange: [0, 100],
    capacityRange: [0, 200],
    timeline: '',
    certifications: []
  });
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLands = async () => {
      try {
        setLoading(true);
        const params = {
          page: currentPage,
          limit: 12,
          search: searchQuery,
          sort_by: sortBy,
          ...filters
        };
        
        const response = await landsAPI.getLands(params);
        setLands(response.data.lands || []);
        setTotalPages(Math.ceil((response.data.total || 0) / 12));
      } catch (error) {
        console.error('Failed to fetch lands:', error);
        setLands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLands();
  }, [currentPage, searchQuery, sortBy, filters]);

  const totalResults = lands?.length || 0;

  // Transform lands data to match the expected PPA format for existing components
  const transformedLands = lands.map(land => ({
    id: land.id,
    title: land.name || `${land.land_type} Project`,
    type: land.land_type || 'Solar',
    location: `${land.city || ''}, ${land.state || ''}`.trim(),
    capacity: land.size_acres || 0,
    price: land.lease_rate || 0,
    timeline: land.availability_status || 'Available',
    contractLength: '20 years', // Default value
    image: land.image_url || 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=400&h=300&fit=crop',
    seller: {
      name: land.owner_name || 'Property Owner',
      rating: 4.5,
      reviews: 50
    },
    certifications: land.certifications || [],
    isNew: new Date(land.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    isWatchlisted: false,
    listedDate: new Date(land.created_at).toLocaleDateString(),
    views: Math.floor(Math.random() * 1000) + 100,
    inquiries: Math.floor(Math.random() * 50) + 5
  }));

  const filteredPPAs = transformedLands;

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRemoveFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearAllFilters = () => {
    setFilters({
      location: [],
      projectType: [],
      minCapacity: '',
      maxCapacity: '',
      minPrice: '',
      maxPrice: '',
      timeline: [],
      certifications: []
    });
  };

  const handleViewDetails = (ppaId) => {
    console.log('View details for PPA:', ppaId);
    // Navigate to PPA details page
  };

  const handleExpressInterest = (ppaId) => {
    console.log('Express interest in PPA:', ppaId);
    // Open interest modal or navigate to contact form
  };

  const handleToggleWatchlist = (ppaId, isWatchlisted) => {
    console.log('Toggle watchlist for PPA:', ppaId, isWatchlisted);
    // Update watchlist status
  };

  const handleSelectPPA = (ppa) => {
    console.log('Selected PPA from map:', ppa);
    // Handle PPA selection from map
  };

  // Get current page items
  const startIndex = (currentPage - 1) * 12;
  const currentPPAs = loading ? [] : transformedLands;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar 
          isCollapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        }`}>
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Filter Sidebar */}
            <FilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearAllFilters}
              isCollapsed={filterSidebarCollapsed}
              onToggleCollapse={() => setFilterSidebarCollapsed(!filterSidebarCollapsed)}
            />

            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${
              filterSidebarCollapsed ? 'ml-0' : 'ml-0'
            } ${
              activitySidebarCollapsed ? 'mr-0' : 'mr-0'
            }`}>
              {/* Search Header */}
              <SearchHeader
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalResults={totalResults}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />

              {/* Filter Chips */}
              <FilterChips
                filters={filters}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
              />

              {/* Breadcrumb */}
              <div className="px-6 pt-4">
                <BreadcrumbNavigation />
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {viewMode === 'map' ? (
                  <MapView
                    ppas={filteredPPAs}
                    onSelectPPA={handleSelectPPA}
                    selectedPPA={null}
                  />
                ) : (
                  <>
                    {loading ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                          <p className="text-muted-foreground">Loading renewable energy projects...</p>
                        </div>
                      </div>
                    ) : currentPPAs?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Icon name="Search" size={48} className="text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          No projects found
                        </h3>
                        <p className="text-muted-foreground mb-4 max-w-md">
                          Try adjusting your search criteria or filters to find more renewable energy projects.
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleClearAllFilters}
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    ) : (
                      <div className={`grid gap-6 ${
                        viewMode === 'grid' ?'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :'grid-cols-1'
                      }`}>
                        {currentPPAs?.map((ppa) => (
                          <PPACard
                            key={ppa?.id}
                            ppa={ppa}
                            onViewDetails={handleViewDetails}
                            onExpressInterest={handleExpressInterest}
                            onToggleWatchlist={handleToggleWatchlist}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Activity Sidebar */}
            <ActivitySidebar
              isCollapsed={activitySidebarCollapsed}
              onToggleCollapse={() => setActivitySidebarCollapsed(!activitySidebarCollapsed)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;