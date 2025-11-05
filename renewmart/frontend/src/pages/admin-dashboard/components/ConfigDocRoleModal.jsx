import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { landsAPI } from '../../../services/api';

const ConfigDocRoleModal = ({ projectId, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [mappings, setMappings] = useState({}); // { document_type: [role_keys] }
  const [defaultMappings, setDefaultMappings] = useState({});

  // Document type labels
  const documentTypeLabels = {
    'land-valuation': 'Land Valuation Reports',
    'ownership-documents': 'Ownership Documents',
    'sale-contracts': 'Sale Contracts',
    'topographical-surveys': 'Topographical Surveys',
    'grid-connectivity': 'Grid Connectivity Details',
    'financial-models': 'Financial Models',
    'zoning-approvals': 'Zoning Approvals',
    'environmental-impact': 'Environmental Impact Assessments',
    'government-nocs': 'Government NOCs'
  };

  // Role labels
  const roleLabels = {
    're_sales_advisor': 'RE Sales Advisor',
    're_analyst': 'RE Analyst',
    're_governance_lead': 'RE Governance Lead'
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await landsAPI.getProjectDocumentRoleMappings(projectId);
        setDocumentTypes(data.document_types || []);
        setRoles(data.roles || []);
        setDefaultMappings(data.default_mappings || {});
        
        // Initialize mappings with project mappings or default mappings
        const initialMappings = {};
        data.document_types?.forEach(docType => {
          // Use project mappings if available, otherwise use default
          if (data.project_mappings && data.project_mappings[docType]) {
            initialMappings[docType] = [...data.project_mappings[docType]];
          } else if (data.default_mappings && data.default_mappings[docType]) {
            initialMappings[docType] = [...data.default_mappings[docType]];
          } else {
            initialMappings[docType] = [];
          }
        });
        setMappings(initialMappings);
      } catch (err) {
        console.error('Error fetching document role mappings:', err);
        setError('Failed to load document role mappings');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const toggleRole = (docType, roleKey) => {
    setMappings(prev => {
      const currentRoles = prev[docType] || [];
      const newRoles = currentRoles.includes(roleKey)
        ? currentRoles.filter(r => r !== roleKey)
        : [...currentRoles, roleKey];
      
      return {
        ...prev,
        [docType]: newRoles
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await landsAPI.saveProjectDocumentRoleMappings(projectId, mappings);
      console.log('✅ Document role mappings saved successfully:', response);
      
      // Call the onSave callback if provided (parent component can handle refresh/notification)
      if (onSave) {
        onSave();
      }
      
      // Close the modal
      onClose();
    } catch (err) {
      console.error('Error saving document role mappings:', err);
      setError(err.response?.data?.detail || 'Failed to save document role mappings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const resetMappings = {};
    documentTypes.forEach(docType => {
      resetMappings[docType] = defaultMappings[docType] ? [...defaultMappings[docType]] : [];
    });
    setMappings(resetMappings);
  };

  const getLabel = (docType) => {
    return documentTypeLabels[docType] || docType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-700">Loading mappings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Configure Document Role Mappings</h2>
            <p className="text-sm text-gray-600 mt-1">Customize which roles can view each document type for this project</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon name="X" className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <Icon name="Info" className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Project-Specific Mappings</p>
              <p className="text-blue-700">
                These mappings will override the default document role mappings for this project only.
                Changes will affect which document types reviewers can view in all pages.
              </p>
            </div>
          </div>
        </div>

        {/* Mappings Table */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Document Type
                  </th>
                  {roles.map(role => (
                    <th key={role.role_key} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {roleLabels[role.role_key] || role.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentTypes.map(docType => (
                  <tr key={docType} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getLabel(docType)}
                      </div>
                      <div className="text-xs text-gray-500">{docType}</div>
                    </td>
                    {roles.map(role => {
                      const isChecked = mappings[docType]?.includes(role.role_key) || false;
                      const isDefault = defaultMappings[docType]?.includes(role.role_key) || false;
                      return (
                        <td key={role.role_key} className="px-4 py-4 text-center">
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRole(docType, role.role_key)}
                              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            {isDefault && !isChecked && (
                              <span className="ml-2 text-xs text-gray-400" title="Default mapping (not applied)">(default)</span>
                            )}
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
          >
            <Icon name="RefreshCw" className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="Check" className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigDocRoleModal;

