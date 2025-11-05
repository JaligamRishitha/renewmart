import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const InvestorDetailsModal = ({ isOpen, onClose, investorData }) => {
  const navigate = useNavigate();

  if (!investorData) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GBP',
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
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getProjectTypeColor = (type) => {
    const colors = {
      'solar': 'bg-yellow-100 text-yellow-800',
      'wind': 'bg-blue-100 text-blue-800',
      'hydro': 'bg-cyan-100 text-cyan-800',
      'geothermal': 'bg-orange-100 text-orange-800',
      'biomass': 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Investor Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Investor Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Icon name="User" size={24} className="text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                {investorData.investorName}
              </h4>
              <p className="text-sm text-muted-foreground">
                Investor Profile
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email Address
              </label>
              <p className="text-sm text-foreground mt-1 flex items-center">
                <Icon name="Mail" size={14} className="text-muted-foreground mr-2" />
                {investorData.investorEmail}
              </p>
            </div>
            
            {investorData.investorPhone && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone Number
                </label>
                <p className="text-sm text-foreground mt-1 flex items-center">
                  <Icon name="Phone" size={14} className="text-muted-foreground mr-2" />
                  {investorData.investorPhone}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Project Information */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Icon name="MapPin" size={24} className="text-green-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                {investorData.projectTitle}
              </h4>
              <p className="text-sm text-muted-foreground">
                Project of Interest
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Project Type
              </label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProjectTypeColor(investorData.projectType)}`}>
                  {investorData.projectType?.toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Location
              </label>
              <p className="text-sm text-foreground mt-1 flex items-center">
                <Icon name="MapPin" size={14} className="text-muted-foreground mr-2" />
                {investorData.projectLocation}
              </p>
            </div>
            
            {investorData.projectCapacity && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Capacity
                </label>
                <p className="text-sm text-foreground mt-1 flex items-center">
                  <Icon name="Zap" size={14} className="text-muted-foreground mr-2" />
                  {investorData.projectCapacity} MW
                </p>
              </div>
            )}
            
            {investorData.projectPrice && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Price per MWh
                </label>
                <p className="text-sm text-foreground mt-1 flex items-center">
                  <Icon name="PoundSterling" size={14} className="text-muted-foreground mr-2" />
                  £{investorData.projectPrice}/MWh
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Interest Details */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Icon name="Heart" size={24} className="text-purple-600" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                Interest Details
              </h4>
              <p className="text-sm text-muted-foreground">
                Investment Information
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Interest Status
              </label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(investorData.status)}`}>
                  {investorData.status || 'interested'}
                </span>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Interest Date
              </label>
              <p className="text-sm text-foreground mt-1 flex items-center">
                <Icon name="Calendar" size={14} className="text-muted-foreground mr-2" />
                {formatDate(investorData.createdAt)}
              </p>
            </div>
            
            {investorData.investmentAmount && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Investment Amount
                </label>
                <p className="text-sm text-foreground mt-1 flex items-center">
                  <Icon name="PoundSterling" size={14} className="text-muted-foreground mr-2" />
                  {formatCurrency(investorData.investmentAmount)}
                </p>
              </div>
            )}
            
            {investorData.interestLevel && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Interest Level
                </label>
                <p className="text-sm text-foreground mt-1 flex items-center">
                  <Icon name="TrendingUp" size={14} className="text-muted-foreground mr-2" />
                  {investorData.interestLevel.charAt(0).toUpperCase() + investorData.interestLevel.slice(1)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        {investorData.comments && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Icon name="MessageCircle" size={16} className="text-yellow-600" />
              </div>
              <h4 className="text-md font-semibold text-foreground">
                Investor Comments
              </h4>
            </div>
            <div className="bg-white rounded-lg p-3 border border-yellow-200">
              <p className="text-sm text-foreground leading-relaxed">
                "{investorData.comments}"
              </p>
            </div>
          </div>
        )}

        {/* Landowner Information */}
        {investorData.landownerName && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Icon name="UserCheck" size={16} className="text-blue-600" />
              </div>
              <h4 className="text-md font-semibold text-foreground">
                Landowner Information
              </h4>
            </div>
            <p className="text-sm text-foreground">
              <strong>Landowner:</strong> {investorData.landownerName}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            iconName="X"
            iconSize={16}
          >
            Close
          </Button>
          <Button
            variant="default"
            onClick={() => {
              navigate(`/admin/projects/${investorData.landId}/reviewers`);
              onClose(); // Close the modal when navigating
            }}
            iconName="BarChart3"
            iconSize={16}
          >
            View Project Details & Tasks
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvestorDetailsModal;
