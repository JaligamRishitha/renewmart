import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { investorsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const InvestorInterestsPage = () => {
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, rejected
  const [processingId, setProcessingId] = useState(null);
  const [showWithdrawals, setShowWithdrawals] = useState(false); // Toggle to show withdrawal requests

  useEffect(() => {
    fetchInterests();
  }, [filterStatus]);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await investorsAPI.getMasterAdvisorInterests(filterStatus === 'all' ? null : filterStatus);
      setInterests(response || []);
    } catch (err) {
      console.error('Error fetching investor interests:', err);
      setError(err.response?.data?.detail || 'Failed to load investor interests');
      toast.error('Failed to load investor interests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (interestId) => {
    try {
      setProcessingId(interestId);
      await investorsAPI.approveInterest(interestId);
      toast.success('Investor interest approved successfully');
      await fetchInterests();
    } catch (err) {
      console.error('Error approving interest:', err);
      toast.error(err.response?.data?.detail || 'Failed to approve interest');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (interestId) => {
    try {
      setProcessingId(interestId);
      await investorsAPI.rejectInterest(interestId);
      toast.success('Investor interest rejected');
      await fetchInterests();
    } catch (err) {
      console.error('Error rejecting interest:', err);
      toast.error(err.response?.data?.detail || 'Failed to reject interest');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveWithdrawal = async (interestId) => {
    try {
      setProcessingId(interestId);
      await investorsAPI.approveWithdrawal(interestId);
      toast.success('Withdrawal approved successfully');
      await fetchInterests();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
      toast.error(err.response?.data?.detail || 'Failed to approve withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectWithdrawal = async (interestId) => {
    try {
      setProcessingId(interestId);
      await investorsAPI.rejectWithdrawal(interestId);
      toast.success('Withdrawal request rejected');
      await fetchInterests();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
      toast.error(err.response?.data?.detail || 'Failed to reject withdrawal');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="re_sales_advisor" />
      
      <div className="pt-20">
        <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  Investor Interests
                </h1>
                <p className="font-body text-muted-foreground">
                  Review and manage investor interests assigned to you as master sales advisor
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/sales-advisor/dashboard')}
                iconName="ArrowLeft"
                iconSize={18}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="border-b border-border flex space-x-1">
                {['all', 'pending', 'approved', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      setShowWithdrawals(false);
                    }}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      filterStatus === status && !showWithdrawals
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)} ({status === 'all' ? interests.length : interests.filter(i => i.status === status).length})
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowWithdrawals(!showWithdrawals);
                  setFilterStatus('all');
                }}
                className={`px-4 py-2 font-medium text-sm transition-colors border rounded-lg ${
                  showWithdrawals
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name="AlertCircle" size={16} className="inline mr-2" />
                Withdrawal Requests ({interests.filter(i => i.withdrawal_requested && i.withdrawal_status === 'pending').length})
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
              <span className="ml-3 text-lg text-muted-foreground">Loading interests...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Icon name="AlertTriangle" size={20} className="text-error mr-2" />
                <p className="text-error font-medium">{error}</p>
              </div>
              <button
                onClick={fetchInterests}
                className="mt-2 text-sm text-error hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Interests List */}
          {!loading && !error && (
            <>
              {interests.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <Icon name="Inbox" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No Interests Found
                  </h3>
                  <p className="text-muted-foreground">
                    {showWithdrawals 
                      ? 'No pending withdrawal requests found.'
                      : filterStatus === 'all' 
                        ? 'You don\'t have any investor interests assigned yet.'
                        : `No ${filterStatus} interests found.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interests
                    .filter(interest => {
                      if (showWithdrawals) {
                        return interest.withdrawal_requested && interest.withdrawal_status === 'pending';
                      }
                      return filterStatus === 'all' || interest.status === filterStatus;
                    })
                    .map((interest) => (
                      <div
                        key={interest.interest_id}
                        className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-heading font-semibold text-lg text-foreground">
                              {interest.land_title || 'Untitled Project'}
                            </h3>
                            {getStatusBadge(interest.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                            {interest.land_location || 'Location not specified'}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="User" size={16} />
                              Investor: {interest.investor_name || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="Mail" size={16} />
                              {interest.investor_email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="Calendar" size={16} />
                              Submitted: {formatDate(interest.created_at)}
                            </span>
                            </div>
                          </div>
                        </div>

                        {/* Investment Details */}
                        {interest.investment_amount && (
                        <div className="bg-muted/50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">Investment Amount</span>
                            <span className="text-lg font-semibold text-primary">
                              ${parseFloat(interest.investment_amount).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        )}

                        {/* NDA/CTA Status */}
                        <div className="flex items-center gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-2">
                          <Icon 
                            name={interest.nda_accepted ? 'CheckCircle' : 'XCircle'} 
                            size={16} 
                            className={interest.nda_accepted ? 'text-green-600' : 'text-red-600'} 
                          />
                          <span className={interest.nda_accepted ? 'text-green-700' : 'text-red-700'}>
                            NDA {interest.nda_accepted ? 'Accepted' : 'Not Accepted'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon 
                            name={interest.cta_accepted ? 'CheckCircle' : 'XCircle'} 
                            size={16} 
                            className={interest.cta_accepted ? 'text-green-600' : 'text-red-600'} 
                          />
                          <span className={interest.cta_accepted ? 'text-green-700' : 'text-red-700'}>
                            CTA {interest.cta_accepted ? 'Accepted' : 'Not Accepted'}
                          </span>
                          </div>
                        </div>

                        {/* Withdrawal Request Section */}
                        {interest.withdrawal_requested && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon name="AlertCircle" size={20} className="text-yellow-600" />
                                <h4 className="font-semibold text-yellow-900">Withdrawal Request</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  interest.withdrawal_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  interest.withdrawal_status === 'approved' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {interest.withdrawal_status === 'pending' ? 'Pending' :
                                   interest.withdrawal_status === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                              </div>
                              <span className="text-xs text-yellow-700">
                                {formatDate(interest.withdrawal_requested_at)}
                              </span>
                            </div>
                            {interest.withdrawal_reason && (
                              <p className="text-sm text-yellow-800 mb-3">
                                <strong>Reason:</strong> {interest.withdrawal_reason}
                              </p>
                            )}
                            {interest.withdrawal_status === 'pending' && (
                              <div className="flex items-center justify-end gap-3 pt-2 border-t border-yellow-200">
                                <Button
                                  variant="outline"
                                  onClick={() => handleRejectWithdrawal(interest.interest_id)}
                                  disabled={processingId === interest.interest_id}
                                  iconName="X"
                                  iconSize={16}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  {processingId === interest.interest_id ? 'Rejecting...' : 'Reject Withdrawal'}
                                </Button>
                                <Button
                                  variant="default"
                                  onClick={() => handleApproveWithdrawal(interest.interest_id)}
                                  disabled={processingId === interest.interest_id}
                                  iconName="Check"
                                  iconSize={16}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  {processingId === interest.interest_id ? 'Approving...' : 'Approve Withdrawal'}
                                </Button>
                              </div>
                            )}
                            {interest.withdrawal_status === 'approved' && interest.withdrawal_approved_at && (
                              <div className="text-sm text-green-700 pt-2 border-t border-yellow-200">
                                <span className="flex items-center gap-2">
                                  <Icon name="CheckCircle" size={16} className="text-green-600" />
                                  Withdrawal approved on {formatDate(interest.withdrawal_approved_at)}
                                </span>
                              </div>
                            )}
                            {interest.withdrawal_status === 'rejected' && interest.withdrawal_approved_at && (
                              <div className="text-sm text-red-700 pt-2 border-t border-yellow-200">
                                <span className="flex items-center gap-2">
                                  <Icon name="XCircle" size={16} className="text-red-600" />
                                  Withdrawal rejected on {formatDate(interest.withdrawal_approved_at)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        {interest.status === 'pending' && !interest.withdrawal_requested && (
                          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            onClick={() => handleReject(interest.interest_id)}
                            disabled={processingId === interest.interest_id}
                            iconName="X"
                            iconSize={16}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {processingId === interest.interest_id ? 'Rejecting...' : 'Reject'}
                          </Button>
                          <Button
                            variant="default"
                            onClick={() => handleApprove(interest.interest_id)}
                            disabled={processingId === interest.interest_id}
                            iconName="Check"
                            iconSize={16}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processingId === interest.interest_id ? 'Approving...' : 'Approve'}
                          </Button>
                          </div>
                        )}

                        {interest.status === 'approved' && interest.approved_at && (
                          <div className="text-sm text-muted-foreground pt-4 border-t border-border">
                            <span className="flex items-center gap-2">
                            <Icon name="CheckCircle" size={16} className="text-green-600" />
                            Approved on {formatDate(interest.approved_at)}
                            </span>
                          </div>
                        )}

                        {interest.status === 'rejected' && (
                          <div className="text-sm text-muted-foreground pt-4 border-t border-border">
                            <span className="flex items-center gap-2">
                            <Icon name="XCircle" size={16} className="text-red-600" />
                            Rejected
                          </span>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default InvestorInterestsPage;

