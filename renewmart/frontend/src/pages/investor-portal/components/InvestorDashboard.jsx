import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import MetricCard from '../../dashboard/components/MetricCard';
import InvestorActivityChart from './InvestorActivityChart';
import RecentInterests from './RecentInterests';
import { investorsAPI } from '../../../services/api';

const InvestorDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentInterests, setRecentInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsResponse, interestsResponse] = await Promise.all([
        investorsAPI.getDashboardMetrics(),
        investorsAPI.getDashboardInterests(5)
      ]);

      setDashboardData(metricsResponse);
      setRecentInterests(interestsResponse || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0';
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}K`;
    }
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
          <p className="text-error mb-4">{error || 'Failed to load dashboard'}</p>
          <Button onClick={fetchDashboardData} iconName="RefreshCw" iconPosition="left">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Interests',
      value: dashboardData.total_interests?.toString() || '0',
      change: dashboardData.recent_interests > 0 ? `+${dashboardData.recent_interests} this week` : null,
      changeType: dashboardData.recent_interests > 0 ? 'positive' : 'neutral',
      icon: 'Heart',
      color: 'primary'
    },
    {
      title: 'Total Invested',
      value: formatCurrency(dashboardData.total_invested || 0),
      change: null,
      changeType: 'neutral',
      icon: 'DollarSign',
      color: 'success'
    },
    {
      title: 'Recent Interests',
      value: dashboardData.recent_interests?.toString() || '0',
      change: 'Last 7 days',
      changeType: 'neutral',
      icon: 'TrendingUp',
      color: 'secondary'
    },
    {
      title: 'Approved Interests',
      value: dashboardData.approved_interests?.toString() || '0',
      change: dashboardData.pending_interests > 0 ? `${dashboardData.pending_interests} pending` : null,
      changeType: 'neutral',
      icon: 'CheckCircle',
      color: 'success'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Investor Dashboard</h2>
            <p className="text-muted-foreground">
              Overview of your investment activities and engagement metrics
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/investor/portal')}
            iconName="Search"
            iconPosition="left"
          >
            Browse Opportunities
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            change={metric.change}
            changeType={metric.changeType}
            icon={metric.icon}
            color={metric.color}
          />
        ))}
      </div>

      {/* Charts and Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts - 2 columns */}
        <div className="lg:col-span-2">
          <InvestorActivityChart
            monthlyTrends={dashboardData.monthly_trends || []}
            interestByType={dashboardData.interest_by_type || []}
          />
        </div>

        {/* Recent Interests - 1 column */}
        <div className="lg:col-span-1">
          <RecentInterests interests={recentInterests} isLoading={false} />
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Pending Interests</h3>
            <Icon name="Clock" size={20} className="text-warning" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {dashboardData.pending_interests || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Contacted</h3>
            <Icon name="MessageCircle" size={20} className="text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {dashboardData.contacted_interests || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">In communication</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Rejected</h3>
            <Icon name="XCircle" size={20} className="text-error" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {dashboardData.rejected_interests || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Not pursued</p>
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;

