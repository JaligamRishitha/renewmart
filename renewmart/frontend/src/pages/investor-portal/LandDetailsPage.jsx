import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { landsAPI, investorsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';

const LandDetailsPage = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const [landData, setLandData] = useState(null);
  const [interestStatus, setInterestStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ctaAccepted, setCtaAccepted] = useState(false);
  const [submittingInterest, setSubmittingInterest] = useState(false);

  useEffect(() => {
    if (landId) {
      fetchLandData();
      checkInterestStatus();
    }
  }, [landId]);

  const fetchLandData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await landsAPI.getLandById(landId);
      setLandData(data);
    } catch (err) {
      console.error('Error fetching land data:', err);
      setError('Failed to load land details');
      toast.error('Failed to load land details');
    } finally {
      setLoading(false);
    }
  };

  const checkInterestStatus = async () => {
    try {
      const interests = await investorsAPI.getMyInterests({ land_id: landId });
      if (interests && interests.length > 0) {
        setInterestStatus(interests[0]);
      }
    } catch (err) {
      console.error('Error checking interest status:', err);
      // Don't show error, just continue without interest status
    }
  };

  const handleExpressInterest = () => {
    setShowInterestModal(true);
  };

  const handleSubmitInterest = async () => {
    if (!ndaAccepted || !ctaAccepted) {
      toast.error('Please accept both NDA and CTA to continue');
      return;
    }

    try {
      setSubmittingInterest(true);
      await investorsAPI.expressInterest(landId, {
        nda_accepted: ndaAccepted,
        cta_accepted: ctaAccepted
      });
      toast.success('Interest submitted successfully! Waiting for approval.');
      setShowInterestModal(false);
      setNdaAccepted(false);
      setCtaAccepted(false);
      // Refresh interest status
      await checkInterestStatus();
      await fetchLandData();
    } catch (err) {
      console.error('Error submitting interest:', err);
      toast.error(err.response?.data?.detail || 'Failed to submit interest');
    } finally {
      setSubmittingInterest(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return 'N/A';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  const canViewFullDetails = interestStatus?.status === 'approved';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="investor" />
        <div className="pt-16">
          <WorkflowBreadcrumbs />
          <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
            <div className="flex items-center justify-center h-64">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
              <span className="ml-3 text-lg text-muted-foreground">Loading land details...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !landData) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="investor" />
        <div className="pt-16">
          <WorkflowBreadcrumbs />
          <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
            <div className="flex flex-col items-center justify-center h-64">
              <Icon name="AlertCircle" size={48} className="text-red-600 mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Land Not Found</h2>
              <p className="text-muted-foreground mb-4">{error || 'The requested land could not be found.'}</p>
              <Button variant="default" onClick={() => navigate('/investor/portal')} iconName="ArrowLeft" iconSize={16}>
                Back to Marketplace
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="investor" />
      <div className="pt-16">
        <WorkflowBreadcrumbs />
        <main className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
                  {landData.title || landData.name || 'Land Details'}
                </h1>
                <p className="font-body text-muted-foreground">
                  {landData.location_text || landData.location || 'Location not specified'}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/investor/portal')}
                  iconName="ArrowLeft"
                  iconSize={18}
                >
                  Back to Marketplace
                </Button>
                {!interestStatus && (
                  <Button
                    variant="default"
                    onClick={handleExpressInterest}
                    iconName="Heart"
                    iconSize={18}
                  >
                    Express Interest
                  </Button>
                )}
                {interestStatus && interestStatus.status === 'pending' && (
                  <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Icon name="Clock" size={16} />
                      <span>Pending Approval</span>
                    </div>
                  </div>
                )}
                {interestStatus && interestStatus.status === 'approved' && (
                  <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Icon name="CheckCircle" size={16} />
                      <span>Interest Approved</span>
                    </div>
                  </div>
                )}
                {interestStatus && interestStatus.status === 'rejected' && (
                  <div className="px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Icon name="XCircle" size={16} />
                      <span>Interest Rejected</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-foreground mt-1">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
                        {landData.status || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="text-foreground mt-1">{landData.location_text || landData.location || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Area (Acres)</label>
                    <p className="text-foreground mt-1">
                      {landData.area_acres !== null && landData.area_acres !== undefined && landData.area_acres !== '' 
                        ? (typeof landData.area_acres === 'number' ? landData.area_acres : parseFloat(landData.area_acres))
                        : (landData.areaAcres !== null && landData.areaAcres !== undefined && landData.areaAcres !== ''
                          ? (typeof landData.areaAcres === 'number' ? landData.areaAcres : parseFloat(landData.areaAcres))
                          : 'N/A')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Land Type</label>
                    <p className="text-foreground mt-1">
                      {landData.land_type && landData.land_type.trim() !== '' 
                        ? landData.land_type 
                        : (landData.landType && landData.landType.trim() !== ''
                          ? landData.landType
                          : 'N/A')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Energy Type</label>
                    <p className="text-foreground mt-1 capitalize">
                      {landData.energy_key || landData.energyType || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Capacity (MW)</label>
                    <p className="text-foreground mt-1">
                      {(() => {
                        const capacity = landData.capacity_mw || landData.capacity;
                        if (capacity !== null && capacity !== undefined && capacity !== '') {
                          const numCapacity = typeof capacity === 'string' ? parseFloat(capacity) : capacity;
                          return isNaN(numCapacity) ? 'N/A' : `${numCapacity} MW`;
                        }
                        return 'N/A';
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Price per MWh</label>
                    <p className="text-foreground mt-1">
                      {landData.price_per_mwh !== null && landData.price_per_mwh !== undefined && landData.price_per_mwh !== '' 
                        ? formatCurrency(landData.price_per_mwh) 
                        : landData.pricePerMWh ? formatCurrency(landData.pricePerMWh) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timeline</label>
                    <p className="text-foreground mt-1">
                      {landData.timeline_text || landData.timeline || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Contract Term (Years)</label>
                    <p className="text-foreground mt-1">
                      {landData.contract_term_years !== null && landData.contract_term_years !== undefined 
                        ? `${landData.contract_term_years} years` 
                        : (landData.contractTerm !== null && landData.contractTerm !== undefined
                          ? (typeof landData.contractTerm === 'string' && landData.contractTerm.includes('years')
                            ? landData.contractTerm
                            : `${landData.contractTerm} years`)
                          : (landData.contract_term !== null && landData.contract_term !== undefined
                            ? `${landData.contract_term} years`
                            : 'N/A'))}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Published Date</label>
                    <p className="text-foreground mt-1">
                      {formatDate(landData.published_at || landData.published_date)}
                    </p>
                  </div>
              
                </div>
              </div>

              {/* Additional Project Details - Only visible if approved */}
              {canViewFullDetails && landData.admin_notes && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Additional Notes</h2>
                  <p className="text-foreground whitespace-pre-wrap">{landData.admin_notes}</p>
                </div>
              )}
              
              {!canViewFullDetails && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3">
                    <Icon name="Lock" size={24} className="text-yellow-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">Additional Details Locked</h3>
                      <p className="text-muted-foreground">
                        {interestStatus 
                          ? 'Your interest is pending approval. Once approved by a sales advisor, you will have access to additional project notes and confidential information.'
                          : 'Express your interest to unlock additional project details. After approval by a sales advisor, you will have access to confidential notes and information.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Metadata</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-foreground mt-1">{formatDate(landData.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                    <p className="text-foreground mt-1">{formatDate(landData.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
             

              {/* Status Card */}
              {interestStatus && (
                <div className="bg-card border border-border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Interest Status</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-foreground mt-1">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          interestStatus.status === 'approved' ? 'bg-green-100 text-green-800' :
                          interestStatus.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {interestStatus.status || 'Pending'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                      <p className="text-foreground mt-1">{formatDate(interestStatus.created_at)}</p>
                    </div>
                    {interestStatus.updated_at && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                        <p className="text-foreground mt-1">{formatDate(interestStatus.updated_at)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Express Interest Modal */}
      <Modal
        isOpen={showInterestModal}
        onClose={() => {
          setShowInterestModal(false);
          setNdaAccepted(false);
          setCtaAccepted(false);
        }}
        title="Express Interest"
      >
        <div className="space-y-6">
          <p className="text-muted-foreground">
            To express interest in this project, please review and accept the following:
          </p>

          <div className="space-y-4">
            <div className="border border-border rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ndaAccepted}
                  onChange={(e) => setNdaAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  required
                />
                <div className="flex-1">
                  <span className="font-medium text-foreground">NDA (Non-Disclosure Agreement)</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    I agree to keep all project information confidential and not disclose it to any third parties without authorization.
                  </p>
                </div>
              </label>
            </div>

            <div className="border border-border rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ctaAccepted}
                  onChange={(e) => setCtaAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-primary border-border rounded focus:ring-primary"
                  required
                />
                <div className="flex-1">
                  <span className="font-medium text-foreground">CTA (Consent to Assign)</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    I consent to having my interest assigned to a sales advisor for review and approval.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowInterestModal(false);
                setNdaAccepted(false);
                setCtaAccepted(false);
              }}
              disabled={submittingInterest}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSubmitInterest}
              disabled={!ndaAccepted || !ctaAccepted || submittingInterest}
              iconName="Send"
              iconPosition="right"
            >
              {submittingInterest ? 'Submitting...' : 'Submit Interest'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LandDetailsPage;

