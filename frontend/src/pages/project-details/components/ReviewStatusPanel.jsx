import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { reviewsAPI } from '../../../services/api';

/**
 * ReviewStatusPanel Component
 * 
 * Displays the review status and progress for all reviewer roles
 * in the investor portal project details page.
 */
const ReviewStatusPanel = ({ landId, projectData }) => {
  const [reviewStatuses, setReviewStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define the three reviewer roles
  const reviewerRoles = [
    {
      id: 're_sales_advisor',
      label: 'RE Sales Advisor',
      icon: 'TrendingUp',
      description: 'Market evaluation and investor alignment',
      color: 'blue'
    },
    {
      id: 're_analyst',
      label: 'RE Analyst', 
      icon: 'Calculator',
      description: 'Technical and financial feasibility analysis',
      color: 'green'
    },
    {
      id: 're_governance_lead',
      label: 'RE Governance Lead',
      icon: 'Shield',
      description: 'Compliance, regulatory, and local authority validation',
      color: 'orange'
    }
  ];

  useEffect(() => {
    if (landId) {
      fetchReviewStatuses();
    }
  }, [landId]);

  const fetchReviewStatuses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statuses = await reviewsAPI.getAllReviewStatuses(landId);
      setReviewStatuses(statuses || {});
    } catch (err) {
      console.error('Error fetching review statuses:', err);
      setError('Failed to load review status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'clarification_requested':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return 'CheckCircle';
      case 'rejected':
        return 'XCircle';
      case 'pending':
        return 'Clock';
      case 'in_progress':
        return 'PlayCircle';
      case 'clarification_requested':
        return 'MessageCircle';
      default:
        return 'Circle';
    }
  };

  const getRoleColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200', 
      orange: 'bg-orange-50 border-orange-200'
    };
    return colorMap[color] || 'bg-gray-50 border-gray-200';
  };

  const getRoleIconColor = (color) => {
    const colorMap = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600'
    };
    return colorMap[color] || 'text-gray-600';
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

  const calculateOverallProgress = () => {
    if (!reviewStatuses || Object.keys(reviewStatuses).length === 0) {
      return 0;
    }

    const totalRoles = reviewerRoles.length;
    let completedRoles = 0;

    reviewerRoles.forEach(role => {
      const status = reviewStatuses[role.id];
      if (status && (status.status === 'approved' || status.status === 'completed')) {
        completedRoles++;
      }
    });

    return Math.round((completedRoles / totalRoles) * 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center animate-pulse">
            <Icon name="FileCheck" size={24} className="text-gray-400" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Review Status</h4>
            <p className="text-sm text-gray-500">Loading review information...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Icon name="AlertCircle" size={24} className="text-red-600" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Review Status</h4>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Icon name="FileCheck" size={24} className="text-purple-600" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Review Status</h4>
          <p className="text-sm text-gray-500">
            Project review progress and reviewer assignments
          </p>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Review Progress</span>
          <span className="text-sm font-semibold text-gray-900">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {overallProgress === 100 ? 'All reviews completed' : 
           overallProgress === 0 ? 'No reviews started' : 
           `${overallProgress}% of reviews completed`}
        </p>
      </div>

      {/* Reviewer Roles Status */}
      <div className="space-y-4">
        {reviewerRoles.map((role) => {
          const status = reviewStatuses[role.id];
          const isAssigned = status && status.assigned_to;
          const isCompleted = status && (status.status === 'approved' || status.status === 'completed');
          const isInProgress = status && status.status === 'in_progress';
          const isPending = status && status.status === 'pending';
          const isRejected = status && status.status === 'rejected';
          const needsClarification = status && status.status === 'clarification_requested';

          return (
            <div 
              key={role.id}
              className={`border rounded-lg p-4 ${getRoleColorClasses(role.color)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRoleColorClasses(role.color)}`}>
                    <Icon 
                      name={role.icon} 
                      size={20} 
                      className={getRoleIconColor(role.color)} 
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-semibold text-gray-900">{role.label}</h5>
                      {status && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status.status)}`}>
                          <Icon 
                            name={getStatusIcon(status.status)} 
                            size={12} 
                            className="mr-1" 
                          />
                          {status.status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                    
                    {status && (
                      <div className="space-y-1 text-xs text-gray-500">
                        {status.assigned_to_name && (
                          <div className="flex items-center space-x-1">
                            <Icon name="User" size={12} />
                            <span>Assigned to: {status.assigned_to_name}</span>
                          </div>
                        )}
                        {status.updated_at && (
                          <div className="flex items-center space-x-1">
                            <Icon name="Clock" size={12} />
                            <span>Last updated: {formatDate(status.updated_at)}</span>
                          </div>
                        )}
                        {status.completion_percentage && (
                          <div className="flex items-center space-x-1">
                            <Icon name="BarChart3" size={12} />
                            <span>Progress: {status.completion_percentage}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!status && (
                      <div className="text-xs text-gray-500 flex items-center space-x-1">
                        <Icon name="AlertCircle" size={12} />
                        <span>No review assigned yet</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {isCompleted && (
                    <Icon name="CheckCircle" size={20} className="text-green-600" />
                  )}
                  {isInProgress && (
                    <Icon name="PlayCircle" size={20} className="text-blue-600" />
                  )}
                  {isPending && (
                    <Icon name="Clock" size={20} className="text-yellow-600" />
                  )}
                  {isRejected && (
                    <Icon name="XCircle" size={20} className="text-red-600" />
                  )}
                  {needsClarification && (
                    <Icon name="MessageCircle" size={20} className="text-purple-600" />
                  )}
                  {!status && (
                    <Icon name="Circle" size={20} className="text-gray-400" />
                  )}
                </div>
              </div>

              {/* Progress Bar for Individual Role */}
              {status && status.completion_percentage && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Review Progress</span>
                    <span className="text-xs font-semibold text-gray-800">{status.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' :
                        isInProgress ? 'bg-blue-500' :
                        isPending ? 'bg-yellow-500' :
                        isRejected ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}
                      style={{ width: `${status.completion_percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-green-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return status && (status.status === 'approved' || status.status === 'completed');
              }).length}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-blue-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return status && status.status === 'in_progress';
              }).length}
            </div>
            <div className="text-xs text-gray-500">In Progress</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-yellow-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return status && status.status === 'pending';
              }).length}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-600">
              {reviewerRoles.filter(role => {
                const status = reviewStatuses[role.id];
                return !status;
              }).length}
            </div>
            <div className="text-xs text-gray-500">Not Assigned</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewStatusPanel;
