import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentVersionsAPI, documentAssignmentAPI } from '../services/api';

const DocumentVersionsPage = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  // Get reviewer role from location state or user roles
  const reviewerRole = location.state?.reviewerRole || 
    user?.roles?.find(role => 
      ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
    );
  const isAdmin = user?.roles?.includes('administrator') || user?.role === 'admin';

  // Document type to roles mapping - matches backend mapping
  const roleDocumentMapping = {
    're_sales_advisor': [
      'land-valuation',
      'sale-contracts',
      'topographical-surveys',
      'grid-connectivity'
    ],
    're_analyst': [
      'financial-models'
    ],
    're_governance_lead': [
      'land-valuation',
      'ownership-documents',
      'zoning-approvals',
      'environmental-impact',
      'government-nocs'
    ]
  };

  // Helper function to check if a document type is allowed for the reviewer role
  const isDocumentTypeAllowed = useCallback((documentType) => {
    // Admin can see all documents
    if (isAdmin) return true;
    
    // If no reviewer role, don't show any documents
    if (!reviewerRole) return false;
    
    // Check if document type is in the allowed list for this role
    const allowedTypes = roleDocumentMapping[reviewerRole] || [];
    return allowedTypes.includes(documentType);
  }, [isAdmin, reviewerRole]);

  const loadDocumentData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading document data for landId:', landId);
      console.log('Reviewer role:', reviewerRole, 'Is admin:', isAdmin);
      
      // Get document status summary
      const summary = await documentVersionsAPI.getStatusSummary(landId);
      console.log('Document status summary (unfiltered):', summary);
      
      // Filter document types based on reviewer role
      const filteredSummary = summary.filter(docType => {
        const isAllowed = isDocumentTypeAllowed(docType.document_type);
        console.log(`Document type ${docType.document_type}: ${isAllowed ? 'allowed' : 'filtered out'}`);
        return isAllowed;
      });
      
      console.log('Document status summary (filtered):', filteredSummary);
      setDocumentTypes(filteredSummary);
      
    } catch (err) {
      console.error('Failed to load document data:', err);
      setError('Failed to load document data: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [landId, reviewerRole, isAdmin, isDocumentTypeAllowed]);

  useEffect(() => {
    if (landId) {
      loadDocumentData();
    }
  }, [landId, loadDocumentData]);

  const loadVersions = async (documentType) => {
    try {
      setLoading(true);
      console.log('Loading versions for documentType:', documentType, 'landId:', landId);
      
      // Double-check that the document type is allowed for this reviewer
      if (!isDocumentTypeAllowed(documentType)) {
        console.warn('Document type not allowed for reviewer role:', documentType, reviewerRole);
        setError(`You don't have permission to view ${documentType} documents.`);
        setLoading(false);
        return;
      }
      
      const response = await documentVersionsAPI.getDocumentVersions(landId, documentType);
      console.log('Document versions response:', response);
      setVersions(response);
      setSelectedDocumentType(documentType);
    } catch (err) {
      console.error('Failed to load document versions:', err);
      setError('Failed to load document versions: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'under_review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'locked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const toggleAccordion = (docIndex) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [docIndex]: !prev[docIndex]
    }));
  };

  const groupVersionsBySlot = (versions) => {
    // Only use D1, D2 for Ownership Documents and Government NOCs
    const multiSlotTypes = ['ownership-documents', 'government-nocs'];
    const isMultiSlot = multiSlotTypes.includes(selectedDocumentType);
    
    if (!isMultiSlot) {
      // For other document types, return as single group
      return { 'D1': versions };
    }
    
    // Group versions by actual doc_slot field for multi-slot types
    const grouped = {};
    versions.forEach((version) => {
      const docSlot = version.doc_slot || 'D1'; // Default to D1 if no slot specified
      if (!grouped[docSlot]) {
        grouped[docSlot] = [];
      }
      grouped[docSlot].push(version);
    });
    
    // Ensure D1 and D2 slots exist even if empty
    if (!grouped['D1']) grouped['D1'] = [];
    if (!grouped['D2']) grouped['D2'] = [];
    
    return grouped;
  };

  if (loading && !selectedDocumentType) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-700">Loading document data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Document Version Control</h1>
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Page Description */}
        <div className="mb-6">
          <p className="text-gray-600">
            Manage document versions, assignments, and audit trail for this project
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-2">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">Error Loading Document Data</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <p className="text-red-600 text-xs mt-2">Land ID: {landId}</p>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Debug Information</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p><strong>Land ID:</strong> {landId}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              <p><strong>Error:</strong> {error || 'None'}</p>
              <p><strong>Document Types:</strong> {documentTypes.length}</p>
            </div>
          </div>
        )}

        {/* Document Types */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Types</h3>
          <div className="space-y-2">
            {documentTypes.length > 0 ? (
              documentTypes.map((docType) => (
                <button
                  key={docType.document_type}
                  onClick={() => loadVersions(docType.document_type)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedDocumentType === docType.document_type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {docType.document_type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {docType.total_versions} version{docType.total_versions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {docType.under_review_versions > 0 && (
                        <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Under Review" />
                      )}
                      {docType.active_versions > 0 && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="Active" />
                      )}
                      {docType.archived_versions > 0 && (
                        <span className="w-2 h-2 bg-gray-500 rounded-full" title="Archived" />
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
                <p className="text-gray-500">
                  No documents have been uploaded for this project yet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Versions */}
        {selectedDocumentType && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Versions: {selectedDocumentType.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <div className="space-y-4">
              {Object.entries(groupVersionsBySlot(versions)).map(([docSlot, docVersions], docIndex) => (
                <div key={docSlot} className="border border-gray-200 rounded-lg">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleAccordion(docIndex)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">📄</span>
                      <span className="font-medium text-gray-900">{docSlot}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                        {docVersions.length} version{docVersions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-gray-500">
                      {expandedAccordions[docIndex] ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* Accordion Content */}
                  {expandedAccordions[docIndex] && (
                    <div className="border-t border-gray-200">
                      <div className="p-4 space-y-3">
                        {docVersions.map((version, versionIndex) => (
                          <div
                            key={version.document_id}
                            className="p-4 border border-gray-200 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${getStatusColor(version.status)}`}>
                                  <span className="text-sm">
                                    {version.status === 'under_review' ? '⏰' : 
                                     version.status === 'archived' ? '📦' : 
                                     version.status === 'locked' ? '🔒' : '📄'}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium text-sm">
                                      Version {version.version_number || 'N/A'}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {version.file_name || 'Unknown file'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(version.status)}`}>
                                  {version.status || 'Unknown'}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              <p>Uploaded: {version.upload_date || 'Unknown'}</p>
                              <p>By: {version.uploaded_by || 'Unknown'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVersionsPage;