import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import Image from '../../components/AppImage';
import { useAuth } from '../../contexts/AuthContext';
import { investorsAPI } from '../../services/api';

const MyInterests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interests, setInterests] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await investorsAPI.getMyInterests();
      console.log('[MyInterests] Fetched interests:', data);
      setInterests(data || []);
    } catch (err) {
      console.error('[MyInterests] Error:', err);
      setError('Failed to load your interests');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredInterests = interests.filter(interest => {
    if (filters.status && interest.status !== filters.status) return false;
    if (filters.search && !interest.project_title?.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'under_review': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-purple-100 text-purple-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const iconMap = {
      'pending': 'Clock',
      'approved': 'CheckCircle',
      'rejected': 'XCircle',
      'under_review': 'Eye',
      'contacted': 'MessageCircle'
    };
    return iconMap[status] || 'Clock';
  };

  const InterestCard = ({ interest }) => {
    // Get project type and image source - same logic as admin marketplace
    const rawType = String(
      interest.energy_key || 
      interest.energyType || 
      interest.project_type || 
      interest.type || 
      ''
    ).toLowerCase();
    
    let imgSrc = null;
    if (rawType.includes('solar')) {
      imgSrc = '/assets/images/solar.png';
    } else if (rawType.includes('wind')) {
      imgSrc = '/assets/images/wind.png';
    } else if (rawType.includes('biomass') || rawType.includes('bio')) {
      imgSrc = '/assets/images/biomass.png';
    } else if (rawType.includes('geothermal') || rawType.includes('geo')) {
      imgSrc = '/assets/images/geothermal.png';
    } else if (rawType.includes('hydro') || rawType.includes('water')) {
      imgSrc = '/assets/images/hydro.png';
    } else {
      imgSrc = '/assets/images/no_image.png';
    }

    return (
      <div className="bg-card border border-border rounded-lg shadow-elevation-1 hover:shadow-elevation-2 transition-all duration-300 overflow-hidden group">
        {/* Project Image */}
        <div className="relative h-48 overflow-hidden bg-muted">
          <Image
            src={imgSrc}
            alt={`${interest.project_title || 'Project'} renewable energy project`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Status Badge */}
          <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(interest.status)}`}>
            <Icon name={getStatusIcon(interest.status)} size={12} />
            <span className="capitalize">{interest.status.replace('_', ' ')}</span>
          </div>

          {/* Project Type Badge */}
          <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 rounded-full text-xs font-medium">
            {interest.project_type?.toUpperCase() || 'ENERGY'}
          </div>
        </div>

        {/* Project Details */}
        <div className="p-4">
          <div className="mb-3">
            <h3 className="font-heading font-semibold text-lg text-foreground mb-1 line-clamp-1">
              {interest.project_title || 'Untitled Project'}
            </h3>
            <div className="flex items-center text-muted-foreground text-sm mb-2">
              <Icon name="MapPin" size={14} className="mr-1" />
              <span className="line-clamp-1">{interest.project_location || 'Location not specified'}</span>
            </div>
            <div className="flex items-center text-muted-foreground text-sm">
              <Icon name="User" size={14} className="mr-1" />
              <span className="line-clamp-1">Owner: {interest.landowner_name || 'Unknown'}</span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Capacity</div>
              <div className="font-heading font-semibold text-foreground">
                {interest.capacity_mw ? `${interest.capacity_mw} MW` : 'N/A'}
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Price/MWh</div>
              <div className="font-heading font-semibold text-foreground">
                {interest.price_per_mwh ? `$${interest.price_per_mwh}` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Interest Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Interest Date:</span>
              <span className="font-medium text-foreground">
                {interest.created_at ? new Date(interest.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            {interest.comments && (
              <div className="text-sm">
                <span className="text-muted-foreground">Comments:</span>
                <p className="text-foreground mt-1 line-clamp-2">{interest.comments}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/project-details/${interest.land_id}`)}
              className="flex-1"
              iconName="Eye"
              iconPosition="left"
              iconSize={14}
            >
              View Project
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Implement withdraw interest functionality
                console.log('Withdraw interest:', interest.interest_id);
              }}
              className="flex-1"
              iconName="X"
              iconPosition="left"
              iconSize={14}
            >
              Withdraw
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'contacted', label: 'Contacted' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="investor" notifications={{ interests: interests.length }} />
      <WorkflowBreadcrumbs />
      <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-heading font-bold text-3xl text-foreground">
              My Interests
            </h1>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate('/investor/portal')} iconName="TrendingUp" iconSize={16}>
                Browse Opportunities
              </Button>
              <Button variant="default" onClick={fetchInterests} iconName="RefreshCw" iconSize={16}>
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Projects you've expressed interest in and their current status
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search Projects</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by project name..."
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status Filter</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ status: '', search: '' })}
                className="w-full"
                iconName="X"
                iconSize={16}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Interests</p>
                <p className="text-2xl font-bold text-foreground mt-1">{interests.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Heart" size={24} className="text-primary" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {interests.filter(i => i.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Icon name="Clock" size={24} className="text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {interests.filter(i => i.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={24} className="text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {interests.filter(i => i.status === 'under_review').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="Eye" size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-heading font-semibold text-lg text-foreground">
              Interested Projects ({filteredInterests.length})
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
              <Button variant="outline" onClick={fetchInterests} className="mt-4" iconName="RefreshCw">
                Retry
              </Button>
            </div>
          ) : filteredInterests.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Heart" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No interests found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {filters.status || filters.search ? 'Try adjusting your filters' : 'Start exploring opportunities to express interest'}
              </p>
              {!filters.status && !filters.search && (
                <Button variant="default" onClick={() => navigate('/investor/portal')} className="mt-4" iconName="TrendingUp">
                  Browse Opportunities
                </Button>
              )}
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {filteredInterests.map(interest => (
                <InterestCard key={interest.interest_id} interest={interest} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyInterests;
