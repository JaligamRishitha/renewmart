import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Select from '../../../components/ui/Select';
import Modal from '../../../components/ui/Modal';
import { usersAPI, investorsAPI } from '../../../services/api';
import toast from 'react-hot-toast';

const AssignMasterSalesAdvisorModal = ({ project, onClose, onAssign }) => {
  const [selectedAdvisor, setSelectedAdvisor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableAdvisors, setAvailableAdvisors] = useState([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState(null);

  // Fetch sales advisors when component mounts
  useEffect(() => {
    fetchSalesAdvisors();
    fetchCurrentAssignment();
  }, [project]);

  const fetchSalesAdvisors = async () => {
    setLoadingAdvisors(true);
    try {
      const users = await usersAPI.getUsers({ role: 're_sales_advisor', is_active: true });
      
      // Transform to dropdown format
      const advisorOptions = users.map(user => ({
        value: user.user_id,
        label: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email
      }));
      
      setAvailableAdvisors(advisorOptions);
    } catch (err) {
      console.error('Error fetching sales advisors:', err);
      setError('Failed to load sales advisors');
      setAvailableAdvisors([]);
    } finally {
      setLoadingAdvisors(false);
    }
  };

  const fetchCurrentAssignment = async () => {
    // This would need a backend endpoint to get current assignment
    // For now, we'll just proceed with assignment
    setCurrentAssignment(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Validation
    if (!selectedAdvisor) {
      setError('Please select a sales advisor');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const landId = project?.land_id || project?.id;
      await investorsAPI.assignMasterSalesAdvisor(landId, selectedAdvisor);
      
      toast.success('Master sales advisor assigned successfully');
      
      if (onAssign) {
        onAssign({
          land_id: landId,
          sales_advisor_id: selectedAdvisor,
          advisor_name: availableAdvisors.find(a => a.value === selectedAdvisor)?.label
        });
      }
      
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to assign master sales advisor';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Assign Master Sales Advisor"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6 pb-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <Icon name="AlertCircle" size={20} className="text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Assigning a master sales advisor to this project will automatically assign them to all pending investor interests for this project.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Master Sales Advisor <span className="text-red-500">*</span>
          </label>
          
          {loadingAdvisors ? (
            <div className="flex items-center justify-center py-4">
              <Icon name="Loader" size={20} className="animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading advisors...</span>
            </div>
          ) : availableAdvisors.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                No active sales advisors found. Please ensure there are active users with the 're_sales_advisor' role.
              </p>
            </div>
          ) : (
            <Select
              value={selectedAdvisor}
              onChange={(value) => {
                setSelectedAdvisor(value);
                setError('');
              }}
              options={[
                { value: '', label: '-- Select Sales Advisor --' },
                ...availableAdvisors
              ]}
              className="w-full"
            />
          )}

          {selectedAdvisor && (
            <div className="mt-2 text-xs text-muted-foreground">
              Selected: {availableAdvisors.find(a => a.value === selectedAdvisor)?.label}
              {availableAdvisors.find(a => a.value === selectedAdvisor)?.email && (
                <span className="ml-2">
                  ({availableAdvisors.find(a => a.value === selectedAdvisor)?.email})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            disabled={loading || !selectedAdvisor || loadingAdvisors || availableAdvisors.length === 0}
            iconName="UserCheck"
            iconPosition="right"
          >
            {loading ? 'Assigning...' : 'Assign Master Advisor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignMasterSalesAdvisorModal;

