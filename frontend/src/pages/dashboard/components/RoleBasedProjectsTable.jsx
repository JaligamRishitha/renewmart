import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { landsAPI } from '../../../services/api';

const RoleBasedProjectsTable = () => {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRoleBasedData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const hasRole = (role) => user?.roles?.includes(role);
        
        if (hasRole('landowner')) {
          // Fetch real landowner data
          const response = await landsAPI.getDashboardProjects();
          setData(response.slice(0, 5)); // Show top 5
        } else {
          // For other roles, show empty state for now
          setData([]);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadRoleBasedData();
    }
  }, [user]);

  const getTableHeaders = () => {
    const hasRole = (role) => user?.roles?.includes(role);
    
    if (hasRole('landowner')) {
      return ['Project', 'Location', 'Type', 'Status', 'Capacity', 'Timeline', 'Revenue'];
    }
    return [];
  };

  const renderTableRow = (item) => {
    const hasRole = (role) => user?.roles?.includes(role);
    
    if (hasRole('landowner')) {
      return (
        <tr key={item.id} className="border-b border-border hover:bg-muted/50">
          <td className="px-4 py-3">
            <div className="font-medium text-foreground">{item.name}</div>
          </td>
          <td className="px-4 py-3 text-muted-foreground">{item.location}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.type}</td>
          <td className="px-4 py-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              item.status === 'published' || item.status === 'rtb' ? 'bg-success/10 text-success' :
              item.status === 'under-review' || item.status === 'in-review' ? 'bg-warning/10 text-warning' :
              item.status === 'draft' ? 'bg-muted/50 text-muted-foreground' :
              'bg-muted/50 text-muted-foreground'
            }`}>
              {item.status}
            </span>
          </td>
          <td className="px-4 py-3 text-muted-foreground">{item.capacity}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.timeline}</td>
          <td className="px-4 py-3 font-medium text-foreground">{item.estimatedRevenue}</td>
        </tr>
      );
    }
    return null;
  };

  const getTableTitle = () => {
    const hasRole = (role) => user?.roles?.includes(role);
    
    if (hasRole('landowner')) return 'My Projects';
    if (hasRole('investor')) return 'My Investments';
    if (hasRole('administrator') || hasRole('re_governance_lead')) return 'Platform Overview';
    return 'My Portfolio';
  };

  const headers = getTableHeaders();

  return (
    <div className="bg-card border border-border rounded-lg shadow-subtle">
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{getTableTitle()}</h3>
          <p className="text-sm text-muted-foreground mt-1">Recent activity and performance</p>
        </div>
        {user?.roles?.includes('landowner') && (
          <Button variant="outline" size="sm" iconName="ExternalLink" onClick={() => window.location.href = '/landowner-dashboard'}>
            View All
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="p-8 text-center">
          <div className="inline-flex items-center space-x-2 text-muted-foreground">
            <Icon name="Loader2" size={20} className="animate-spin" />
            <span>Loading data...</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-error">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No data available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(renderTableRow)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoleBasedProjectsTable;
