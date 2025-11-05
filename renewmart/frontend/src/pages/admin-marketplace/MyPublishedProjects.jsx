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

const MyPublishedProjects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchMine = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await landsAPI.getMarketplaceProjects();
        console.log('[MyPublishedProjects] Raw API data:', data);
        console.log('[MyPublishedProjects] User email:', user?.email);
        
        const email = (user?.email || '').toLowerCase();
        
        // For admins, show all published projects (they can manage all)
        // For non-admins, filter by landowner email
        const isAdmin = user?.roles?.includes('administrator') || user?.roles?.includes('admin');
        const mine = isAdmin 
          ? (data || []) // Admin sees all projects
          : (data || []).filter(p => {
              const projectEmail = (p.landownerEmail || '').toLowerCase();
              console.log('[MyPublishedProjects] Comparing:', projectEmail, 'vs', email);
              return projectEmail === email;
            });
        
        console.log('[MyPublishedProjects] Filtered projects:', mine);
        setProjects(mine);
      } catch (err) {
        console.error('[MyPublishedProjects] Error:', err);
        setError('Failed to load your published projects');
      } finally {
        setLoading(false);
      }
    };
    fetchMine();
  }, [user?.email, user?.roles]);

  const totalCapacity = (projects || []).reduce((s, p) => s + (parseFloat(p.capacity || p.capacityMW || p.capacity_mw) || 0), 0);
  const avgPrice = ((projects || []).reduce((s, p) => s + (parseFloat(p.price || p.pricePerMWh || p.price_per_mwh) || 0), 0) / ((projects || []).length || 1));
  const totalInterest = (projects || []).reduce((s, p) => s + (parseInt(p.interestCount || p.interest_count) || 0), 0);

  const Card = ({ project }) => {
    const rawType = String(project.energy_key || project.energyType || project.project_type || project.type || '').toLowerCase();
    const isSolar = rawType.includes('solar');
    const isWind = rawType.includes('wind');
    const imgSrc = isSolar ? '/assets/images/solar.png' : (isWind ? '/assets/images/wind.png' : null);

    const titleText = project.title || project.name || 'Untitled Project';
    const locationText = project.location_text || project.location || project.locationText || 'N/A';
    const capacityValue = project.capacity || project.capacityMW || project.capacity_mw;
    const priceValue = project.price || project.pricePerMWh || project.price_per_mwh;

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
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">My Published Projects</h1>
                <p className="text-sm text-muted-foreground">Projects published by your admin account</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => navigate('/admin/marketplace')} iconName="Store" iconSize={16}>Marketplace</Button>
                <Button variant="default" onClick={() => window.location.reload()} iconName="RefreshCw" iconSize={16}>Refresh</Button>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Published</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{projects.length}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{totalCapacity.toFixed(1)} MW</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">${avgPrice.toFixed(2)}</p>
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
                  <p className="text-2xl font-bold text-foreground mt-1">{totalInterest}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Icon name="Users" size={24} className="text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          

          {/* Cards */}
          <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-heading font-semibold text-lg text-foreground">Market Projects ({projects.length})</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-medium">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()} className="mt-4" iconName="RefreshCw">Retry</Button>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Package" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No projects found</p>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                {projects.map(project => (
                  <Card key={project.land_id} project={project} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPublishedProjects;


