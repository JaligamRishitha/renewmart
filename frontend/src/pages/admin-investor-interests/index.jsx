import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import { landsAPI } from '../../services/api';
import Icon from '../../components/AppIcon';
import InvestorDetailsModal from './components/InvestorDetailsModal';

const AdminInvestorInterests = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchInvestorInterests();
  }, []);

  const fetchInvestorInterests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await landsAPI.getAdminInvestorInterests();
      console.log('[Admin Investor Interests] Fetched data:', data);
      setInterests(data || []);
    } catch (err) {
      console.error('[Admin Investor Interests] Error:', err);
      setError('Failed to load investor interests');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'interested': 'bg-purple-100 text-purple-800 border-purple-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'contacted': 'bg-blue-100 text-blue-800 border-blue-200',
      'approved': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProjectTypeColor = (type) => {
    const colors = {
      'solar': 'bg-yellow-100 text-yellow-800',
      'wind': 'bg-blue-100 text-blue-800',
      'hydro': 'bg-cyan-100 text-cyan-800',
      'biomass': 'bg-green-100 text-green-800',
      'geothermal': 'bg-orange-100 text-orange-800'
    };
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const filteredInterests = interests.filter(interest => {
    const matchesSearch = !searchQuery || 
      interest.investorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interest.investorEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interest.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || interest.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewInvestorDetails = (interest) => {
    setSelectedInvestor(interest);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedInvestor(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" notifications={{ dashboard: 3, projects: 7 }} />
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <WorkflowBreadcrumbs />
      
      <main className={`pt-4 pb-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Investor Interests
                </h1>
                <p className="font-body text-muted-foreground">
                  View and manage all investor interest inquiries for renewable energy projects
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
                  onClick={fetchInvestorInterests}
                  iconName="RefreshCw"
                  iconSize={18}
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Investor name, email, or project..."
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="interested">Interested</option>
                  <option value="pending">Pending</option>
                  <option value="contacted">Contacted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Interests</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{filteredInterests.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon name="Users" size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {filteredInterests.filter(i => i.status === 'pending' || i.status === 'interested').length}
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
                  <p className="text-sm font-medium text-muted-foreground">Unique Investors</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {new Set(filteredInterests.map(i => i.investorId)).size}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon name="UserCheck" size={24} className="text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Interests Table */}
          <div className="bg-white rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-heading font-semibold text-lg text-foreground">
                Investor Interest List ({filteredInterests.length})
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
                  onClick={fetchInvestorInterests}
                  className="mt-4"
                  iconName="RefreshCw"
                >
                  Retry
                </Button>
              </div>
            ) : filteredInterests.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No investor interests found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Interests will appear here once investors express interest in projects'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Investor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Project
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInterests.map((interest) => (
                      <tr key={interest.interestId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">{interest.investorName}</p>
                            <p className="text-xs text-muted-foreground">{interest.investorEmail}</p>
                            {interest.investorPhone && (
                              <p className="text-xs text-muted-foreground">{interest.investorPhone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">{interest.projectTitle}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getProjectTypeColor(interest.projectType)}`}>
                                {interest.projectType?.toUpperCase() || 'N/A'}
                              </span>
                              <span className="text-xs text-muted-foreground">{interest.projectLocation}</span>
                            </div>
                            {interest.projectCapacity && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {interest.projectCapacity} MW • ${interest.projectPrice}/MWh
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(interest.status)}`}>
                            {interest.status || 'interested'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-foreground">{formatDate(interest.createdAt)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewInvestorDetails(interest)}
                              iconName="Eye"
                              iconSize={14}
                              title="View Investor Details"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/projects/${interest.landId}/reviewers`)}
                              iconName="BarChart3"
                              iconSize={14}
                              title="View Project Details & Tasks"
                            />
                            {interest.comments && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => alert(interest.comments)}
                                iconName="MessageCircle"
                                iconSize={14}
                                title="View Comments"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Investor Details Modal */}
      <InvestorDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        investorData={selectedInvestor}
      />
    </div>
  );
};

export default AdminInvestorInterests;

