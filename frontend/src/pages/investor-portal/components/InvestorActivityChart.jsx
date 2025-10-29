import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Icon from '../../../components/AppIcon';

const InvestorActivityChart = ({ monthlyTrends = [], interestByType = [] }) => {
  // Format monthly trends data
  const trendData = monthlyTrends.map(item => ({
    month: item.month,
    count: item.count
  }));

  // Format interest by type data
  const typeData = interestByType.map(item => ({
    name: item.type || 'Unknown',
    value: item.count
  }));

  const COLORS = ['#10B981', '#2D5A3D', '#7FB069', '#F59E0B', '#EF4444', '#6366F1'];

  // If no data, show empty state
  if (trendData.length === 0 && typeData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
        <h3 className="text-lg font-semibold text-foreground mb-4">Investment Activity</h3>
        <div className="text-center py-12">
          <Icon name="BarChart3" size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No activity data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Trends Chart */}
      {trendData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="TrendingUp" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Monthly Interest Trends</h3>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6B7280"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const [year, month] = value.split('-');
                    return `${month}/${year.slice(2)}`;
                  }}
                />
                <YAxis 
                  stroke="#6B7280"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  labelFormatter={(value) => {
                    const [year, month] = value.split('-');
                    return `Month: ${month}/${year}`;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Interest by Project Type */}
      {typeData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6 shadow-subtle">
          <div className="flex items-center space-x-2 mb-4">
            <Icon name="PieChart" size={20} className="text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Interests by Project Type</h3>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {typeData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvestorActivityChart;

