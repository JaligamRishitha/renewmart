import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Button from '../../components/ui/Button';
import { landsAPI } from '../../services/api';
import Icon from '../../components/AppIcon';

const AdminMarketplace = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    energyType: '',
    minCapacity: '',
    maxCapacity: '',
    minPrice: '',
    maxPrice: '',
    location: ''
  });

  useEffect(() => {
    fetchPublishedProjects();
  }, []);

  const fetchPublishedProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (filters.energyType) params.energy_type = filters.energyType;
      if (filters.minCapacity) params.min_capacity = parseFloat(filters.minCapacity);
      if (filters.maxCapacity) params.max_capacity = parseFloat(filters.maxCapacity);
      if (filters.minPrice) params.min_price = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.max_price = parseFloat(filters.maxPrice);
      if (filters.location) params.location = filters.location;
      
      const data = await landsAPI.getMarketplaceProjects(params);
      console.log('[Admin Marketplace] Fetched projects:', data);
      setProjects(data || []);
    } catch (err) {
      console.error('[Admin Marketplace] Error fetching projects:', err);
      setError('Failed to load marketplace projects');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyFilters = () => {
    fetchPublishedProjects();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      energyType: '',
      minCapacity: '',
      maxCapacity: '',
      minPrice: '',
      maxPrice: '',
      location: ''
    });
    setTimeout(() => fetchPublishedProjects(), 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEnergyTypeColor = (energyType) => {
    const colors = {
      'solar': 'bg-yellow-100 text-yellow-800',
      'wind': 'bg-blue-100 text-blue-800',
      'hydro': 'bg-cyan-100 text-cyan-800',
      'biomass': 'bg-green-100 text-green-800',
      'geothermal': 'bg-orange-100 text-orange-800'
    };
    return colors[energyType?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const filteredProjects = projects.filter(project => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      project.title?.toLowerCase().includes(searchLower) ||
      project.location_text?.toLowerCase().includes(searchLower) ||
      project.developer_name?.toLowerCase().includes(searchLower) ||
      project.landowner_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      
      <main className={`pt-4 pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Marketplace - Published Projects
                </h1>
                <p className="font-body text-muted-foreground">
                  View and manage all published renewable energy projects visible to investors
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/dashboard')}
                  iconName="LayoutDashboard"
                  iconSize={18}
                >
                  Back to Dashboard
                </Button>
                <Button
                  variant="default"
                  onClick={fetchPublishedProjects}
                  iconName="RefreshCw"
                  iconSize={18}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
            <h2 className="font-heading font-semibold text-lg text-foreground mb-4">
              Filters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Title, location..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              {/* Energy Type */}
              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Energy Type
                </label>
                <select
                  value={filters.energyType}
                  onChange={(e) => handleFilterChange('energyType', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                >
                  <option value="">All Types</option>
                  <option value="solar">Solar</option>
                  <option value="wind">Wind</option>
                  <option value="hydro">Hydro</option>
                  <option value="biomass">Biomass</option>
                  <option value="geothermal">Geothermal</option>
                </select>
              </div>

              {/* Capacity Range */}
              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Min Capacity
                </label>
                <input
                  type="number"
                  value={filters.minCapacity}
                  onChange={(e) => handleFilterChange('minCapacity', e.target.value)}
                  placeholder="MW (e.g., 50)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Max Capacity
                </label>
                <input
                  type="number"
                  value={filters.maxCapacity}
                  onChange={(e) => handleFilterChange('maxCapacity', e.target.value)}
                  placeholder="MW (e.g., 500)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              {/* Price Range */}
              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="$/MWh (e.g., 40)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="$/MWh (e.g., 60)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>

              {/* Location */}
              <div className="w-full">
                <label className="block text-sm font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
                  Location
                </label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  placeholder="City or State"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={clearFilters}
                iconName="X"
                iconSize={16}
              >
                Clear Filters
              </Button>
              <Button
                variant="default"
                onClick={applyFilters}
                iconName="Filter"
                iconSize={16}
              >
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Published</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{filteredProjects.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="Building2" size={24} className="text-primary" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Capacity</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {filteredProjects.reduce((sum, p) => sum + (parseFloat(p.capacity_mw) || 0), 0).toFixed(1)} MW
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon name="Zap" size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Price</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    £{(filteredProjects.reduce((sum, p) => sum + (parseFloat(p.price_per_mwh) || 0), 0) / (filteredProjects.length || 1)).toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon name="PoundSterling" size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Interest</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {filteredProjects.reduce((sum, p) => sum + (parseInt(p.interest_count) || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Icon name="Users" size={24} className="text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Projects List */}
          <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-heading font-semibold text-lg text-foreground">
                Published Projects ({filteredProjects.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <Button
                  variant="outline"
                  onClick={fetchPublishedProjects}
                  className="mt-4"
                  iconName="RefreshCw"
                >
                  Retry
                </Button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Package" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No published projects found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Projects will appear here once reviewers publish their reviews
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredProjects.map((project) => (
                  <div
                    key={project.land_id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-heading font-semibold text-lg text-foreground">
                            {project.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnergyTypeColor(project.energy_key)}`}>
                            {project.energy_key?.toUpperCase() || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Published
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.location_text || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Capacity</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.capacity_mw ? `${project.capacity_mw} MW` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.price_per_mwh ? `$${project.price_per_mwh}/MWh` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Timeline</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.timeline_text || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Developer</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.developer_name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Landowner</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.landowner_name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Interest Count</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {project.interest_count || 0} {project.interest_count === 1 ? 'investor' : 'investors'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Published</p>
                            <p className="text-sm font-medium text-foreground mt-1">
                              {formatDate(project.published_at)}
                            </p>
                          </div>
                        </div>

                        {project.area_acres && (
                          <div className="mt-4">
                            <p className="text-xs text-muted-foreground">
                              Area: <span className="font-medium text-foreground">{project.area_acres} acres</span>
                              {project.contract_term_years && (
                                <span className="ml-4">
                                  Contract: <span className="font-medium text-foreground">{project.contract_term_years} years</span>
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/document-review/${project.land_id}`)}
                          iconName="Eye"
                          iconSize={16}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminMarketplace;

