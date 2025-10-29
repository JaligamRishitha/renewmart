import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Image from '../../components/AppImage';
import { useAuth } from '../../contexts/AuthContext';
import { landsAPI } from '../../services/api';
// You can optionally use marketplace components, e.g. PPACard
// import PPACard from '../marketplace/components/PPACard';

const MarketplaceV2 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('other'); // Page represents Other Marketplace Projects
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
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
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await landsAPI.getMarketplaceProjects({});
      setProjects(data || []);
      const email = (user?.email || '').toLowerCase();
      const mine = (data || []).filter(p => (p.landownerEmail || '').toLowerCase() === email);
      setMyProjects(mine);
    } catch (err) {
      console.error('[Admin Marketplace V2] Error fetching projects:', err);
      setError('Failed to load marketplace projects');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ search: '', energyType: '', minCapacity: '', maxCapacity: '', minPrice: '', maxPrice: '', location: '' });

  const applyFiltersFor = (list) => {
    return (list || []).filter(p => {
      if (filters.search && !(`${p.title || ''} ${p.location_text || ''}`.toLowerCase().includes(filters.search.toLowerCase()))) return false;
      if (filters.energyType && (p.energy_key || '').toLowerCase() !== filters.energyType.toLowerCase()) return false;
      if (filters.minCapacity && (parseFloat(p.capacity_mw) || 0) < parseFloat(filters.minCapacity)) return false;
      if (filters.maxCapacity && (parseFloat(p.capacity_mw) || 0) > parseFloat(filters.maxCapacity)) return false;
      if (filters.minPrice && (parseFloat(p.price_per_mwh) || 0) < parseFloat(filters.minPrice)) return false;
      if (filters.maxPrice && (parseFloat(p.price_per_mwh) || 0) > parseFloat(filters.maxPrice)) return false;
      if (filters.location && !(`${p.location_text || ''}`.toLowerCase().includes(filters.location.toLowerCase()))) return false;
      return true;
    });
  };

  const list = activeTab === 'other' ? applyFiltersFor(projects) : myProjects;

  const Card = ({ project }) => {
    const rawType = String(project.energy_key || project.energyType || project.project_type || project.type || '').toLowerCase();
    const isSolar = rawType.includes('solar');
    const isWind = rawType.includes('wind');
    const imgSrc = isSolar ? '/assets/images/solar.png' : (isWind ? '/assets/images/wind.png' : null);

    const titleText = project.title || project.name || 'Untitled Project';
    const locationText = project.location_text || project.location || project.locationText || 'N/A';
    const capacityValue = project.capacity_mw || project.capacityMW || project.capacity;
    const priceValue = project.price_per_mwh || project.pricePerMWh || project.price;

    return (
      <div className="rounded-lg border border-border bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {imgSrc && (
          <div className="w-full h-36 bg-muted/30">
            <Image src={imgSrc} alt={`${rawType || 'Project'} image`} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-semibold text-base text-foreground truncate">{titleText}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground`}>{(project.energy_key || project.energyType || project.project_type || project.type || 'N/A').toUpperCase()}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 truncate">{locationText}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Capacity</p>
              <p className="font-medium text-foreground">{capacityValue ? `${capacityValue} MW` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-medium text-foreground">{priceValue ? `$${priceValue}/MWh` : 'N/A'}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => navigate(`/project-details/${project.land_id || project.id}`)} iconName="Eye" iconSize={14}>View</Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" />
      <Sidebar isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <WorkflowBreadcrumbs />
      <main className={`pt-4 pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Header with Tabs */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">Marketplace</h1>
                <div className="flex items-center gap-2">
                  <button className={`px-3 py-1.5 rounded text-sm bg-primary text-primary-foreground`}>Other Marketplace Projects</button>
                  <button className={`px-3 py-1.5 rounded text-sm bg-muted text-foreground`} onClick={() => navigate('/admin/marketplace/my-projects')}>My Published Projects</button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={() => navigate('/admin/dashboard')} iconName="LayoutDashboard" iconSize={18}>Back to Dashboard</Button>
                <Button variant="default" onClick={fetchAll} iconName="RefreshCw" iconSize={18}>Refresh</Button>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Filters */}
            {true && (
              <aside className="col-span-12 lg:col-span-3">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="font-heading font-semibold text-lg text-foreground mb-4">Filters</h2>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Search</label>
                      <input type="text" value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} placeholder="Title, location..." className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Energy Type</label>
                      <select value={filters.energyType} onChange={(e) => handleFilterChange('energyType', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm">
                        <option value="">All Types</option>
                        <option value="solar">Solar</option>
                        <option value="wind">Wind</option>
                        <option value="hydro">Hydro</option>
                        <option value="biomass">Biomass</option>
                        <option value="geothermal">Geothermal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Min Capacity</label>
                      <input type="number" value={filters.minCapacity} onChange={(e) => handleFilterChange('minCapacity', e.target.value)} placeholder="MW (e.g., 50)" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Max Capacity</label>
                      <input type="number" value={filters.maxCapacity} onChange={(e) => handleFilterChange('maxCapacity', e.target.value)} placeholder="MW (e.g., 500)" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Min Price</label>
                      <input type="number" value={filters.minPrice} onChange={(e) => handleFilterChange('minPrice', e.target.value)} placeholder="$/MWh" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Max Price</label>
                      <input type="number" value={filters.maxPrice} onChange={(e) => handleFilterChange('maxPrice', e.target.value)} placeholder="$/MWh" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                      <input type="text" value={filters.location} onChange={(e) => handleFilterChange('location', e.target.value)} placeholder="City or State" className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={clearFilters} iconName="X" iconSize={16}>Clear</Button>
                    <Button variant="default" onClick={() => null} iconName="Filter" iconSize={16}>Apply</Button>
                  </div>
                </div>
              </aside>
            )}

            {/* Right content */}
            <section className={'col-span-12 lg:col-span-9'}>

              {/* Projects heading */}
              <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-heading font-semibold text-lg text-foreground">Market Projects ({list.length})</h2>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-medium">{error}</p>
                    <Button variant="outline" onClick={fetchAll} className="mt-4" iconName="RefreshCw">Retry</Button>
                  </div>
                ) : list.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon name="Package" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No projects found</p>
                    <p className="text-sm text-muted-foreground mt-2">Projects will appear here once available</p>
                  </div>
                ) : (
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                    {list.map(project => (
                      <Card key={project.land_id} project={project} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketplaceV2;


