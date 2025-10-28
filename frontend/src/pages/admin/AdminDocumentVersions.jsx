import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';
import Header from '../../components/ui/Header';
import { documentsAPI, reviewerAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const AdminDocumentVersions = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  useEffect(() => {
    if (landId) {
      refreshDocuments();
    } else {
      console.error('No landId provided');
      setLoading(false);
    }
  }, [landId]);

  // Document management helper functions (same as reviewer)
  const getDocumentTypes = () => {
    const typeMap = new Map();
    
    // Process each document type separately to ensure consistent version numbering
    const documentTypes = [...new Set(documents.filter(doc => !doc.subtask_id).map(doc => doc.document_type || 'unknown'))];
    
    documentTypes.forEach(type => {
      // Get all documents of this type
      const docsOfType = documents
        .filter(doc => (doc.document_type || 'unknown') === type && !doc.subtask_id);
      
      if (docsOfType.length === 0) return;
      
      // Group by doc_slot for independent D1/D2 processing
      const groupedDocs = groupDocumentsBySlot(docsOfType);
      
      // Calculate total count and latest version across all slots
      let totalCount = 0;
      let maxVersion = 0;
      let underReviewVersion = null;
      
      Object.entries(groupedDocs).forEach(([slot, slotDocs]) => {
        const sortedSlotDocs = slotDocs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        totalCount += sortedSlotDocs.length;
        
        // Find the document that's under review in this slot
        sortedSlotDocs.forEach((doc, index) => {
          const versionNumber = index + 1; // Version numbers start from 1
          const isUnderReview = doc.version_status === 'under_review' || doc.status === 'under_review';
          
          if (isUnderReview) {
            console.log(`Document ${doc.file_name} in ${slot} is under review with version ${versionNumber}`);
            underReviewVersion = versionNumber;
          }
        });
        
        maxVersion = Math.max(maxVersion, sortedSlotDocs.length);
      });
      
      // Initialize document type
      typeMap.set(type, {
        id: type,
        name: type.replace(/-|_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: getDocumentTypeIcon(type),
        count: totalCount,
        latestVersion: maxVersion, // Latest version across all slots
        underReviewVersion: underReviewVersion,
        documents: docsOfType
      });
    });
    
    const result = Array.from(typeMap.values()).map(type => ({
      ...type,
      isLatest: true // Mark the latest document
    }));
    
    console.log('Document types processed:', result.map(type => ({
      name: type.name,
      count: type.count,
      latestVersion: type.latestVersion,
      underReviewVersion: type.underReviewVersion
    })));
    
    return result;
  };

  const getDocumentsByType = (typeId) => {
    const filteredDocs = documents
      .filter(doc => (doc.document_type || 'unknown') === typeId)
      .filter(doc => !doc.subtask_id); // Exclude subtask documents
    
    // Group by doc_slot for independent D1/D2 processing
    const groupedDocs = groupDocumentsBySlot(filteredDocs);
    
    // Process each slot independently
    const processedDocs = [];
    Object.entries(groupedDocs).forEach(([slot, slotDocs]) => {
      const sortedSlotDocs = slotDocs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      sortedSlotDocs.forEach((doc, index) => {
        const processedDoc = {
          ...doc,
          version: index + 1, // Independent version numbering per slot
          isLatest: index === sortedSlotDocs.length - 1, // Last document in slot is latest
          // Use status if it's 'under_review', otherwise use version_status or default to 'pending'
          status: doc.status === 'under_review' ? 'under_review' : (doc.version_status || doc.status || 'pending')
        };
        
        console.log(`Processing document ${doc.file_name} in ${slot}:`, {
          original_status: doc.status,
          version_status: doc.version_status,
          final_status: processedDoc.status,
          slot: slot,
          version: processedDoc.version
        });
        
        processedDocs.push(processedDoc);
      });
    });
    
    return processedDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest first
  };

  const getDocumentTypeIcon = (type) => {
    const iconMap = {
      'land-valuation': 'FileText',
      'ownership-documents': 'Scale',
      'sale-contracts': 'FileText',
      'topographical-surveys': 'Map',
      'grid-connectivity': 'Zap',
      'financial-models': 'DollarSign',
      'zoning-approvals': 'Building',
      'environmental-impact': 'Leaf',
      'government-nocs': 'Shield'
    };
    return iconMap[type] || 'File';
  };

  const refreshDocuments = async () => {
    try {
      setLoading(true);
      console.log('Refreshing documents from server...');
      const docsResponse = await documentsAPI.getDocuments(landId);
      console.log('Raw documents response:', docsResponse);
      
      // Filter out subtask documents and ensure proper status mapping
      const filteredDocs = (docsResponse || [])
        .filter(doc => !doc.subtask_id)
        .map(doc => {
          const processedDoc = {
            ...doc,
            // Use status if it's 'under_review', otherwise use version_status or default to 'pending'
            status: doc.status === 'under_review' ? 'under_review' : (doc.version_status || doc.status || 'pending')
          };
          console.log(`Refreshed document ${doc.file_name}:`, {
            version_status: doc.version_status,
            original_status: doc.status,
            final_status: processedDoc.status
          });
          return processedDoc;
        });
      
      console.log('Setting documents state:', filteredDocs.map(d => ({
        file_name: d.file_name,
        status: d.status,
        version_status: d.version_status
      })));
      
      setDocuments(filteredDocs);
    } catch (error) {
      console.error('Failed to refresh documents:', error);
      toast.error('Failed to load documents: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Admin can only view documents, not mark them for review
  // Review functionality is restricted to reviewers only

  const handleViewDocument = (doc) => {
    // Open document in new tab
    window.open(`/api/documents/download/${doc.document_id}`, '_blank');
  };

  const handleDownloadDocument = (doc) => {
    // Download document
    const link = document.createElement('a');
    link.href = `/api/documents/download/${doc.document_id}`;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleAccordion = (docIndex) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [docIndex]: !prev[docIndex]
    }));
  };

  const groupDocumentsBySlot = (docs) => {
    // Only use D1, D2 for Ownership Documents and Government NOCs
    const multiSlotTypes = ['ownership-documents', 'government-nocs'];
    const isMultiSlot = multiSlotTypes.includes(selectedDocumentType?.id);
    
    if (!isMultiSlot) {
      // For other document types, return as single group
      return { 'D1': docs };
    }
    
    // Group documents by actual doc_slot field for multi-slot types
    const grouped = {};
    docs.forEach((doc) => {
      const docSlot = doc.doc_slot || 'D1'; // Default to D1 if no slot specified
      if (!grouped[docSlot]) {
        grouped[docSlot] = [];
      }
      grouped[docSlot].push(doc);
    });
    
    // Ensure D1 and D2 slots exist even if empty
    if (!grouped['D1']) grouped['D1'] = [];
    if (!grouped['D2']) grouped['D2'] = [];
    
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon name="Loader" size={32} className="animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Document Versions</h1>
              <p className="text-muted-foreground mt-2">
                View document versions and review status for this project (Read-only)
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Icon name="Eye" size={16} className="text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">Admin View - Read Only</span>
              </div>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon name="ArrowLeft" size={16} />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Document Types */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
                Document Types
              </h3>
              <div className="space-y-2">
                {getDocumentTypes().map((docType) => (
                  <button
                    key={docType.id}
                    onClick={() => setSelectedDocumentType(docType)}
                    className={`w-full text-left p-3 rounded-lg transition-smooth ${
                      selectedDocumentType?.id === docType.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted border border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon 
                        name={docType.icon} 
                        size={20} 
                        className={selectedDocumentType?.id === docType.id ? 'text-primary-foreground' : 'text-primary'} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {docType.name}
                        </p>
                        <p className="text-xs opacity-75 mt-1">
                          {docType.count} version{docType.count !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                            Latest: v{docType.latestVersion}
                          </span>
                          {docType.underReviewVersion && (
                            <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">
                              Under Review: v{docType.underReviewVersion}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Document Versions */}
          <div className="lg:col-span-2">
            {selectedDocumentType ? (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-foreground">
                      {selectedDocumentType.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDocumentType.count} version{selectedDocumentType.count !== 1 ? 's' : ''} available
                    </p>
                  </div>
                </div>

                {/* Document Versions Grid */}
                <div className="space-y-4">
                  {Object.entries(groupDocumentsBySlot(getDocumentsByType(selectedDocumentType.id))).map(([docSlot, docs], docIndex) => (
                    <div key={docSlot} className="border border-border rounded-lg">
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleAccordion(docIndex)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon name="File" size={20} className="text-primary" />
                          <span className="font-medium text-foreground">{docSlot}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                            {docs.length} version{docs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <Icon 
                          name={expandedAccordions[docIndex] ? "ChevronUp" : "ChevronDown"} 
                          size={20} 
                          className="text-muted-foreground" 
                        />
                      </button>

                      {/* Accordion Content */}
                      {expandedAccordions[docIndex] && (
                        <div className="border-t border-border">
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {docs.map((doc, versionIndex) => (
                                <div
                                  key={`${doc.document_id}-${doc.status}-${forceUpdate}`}
                                  className={`p-4 rounded-lg border hover:shadow-md transition-all ${
                                    doc.isLatest ? 'border-primary bg-primary/5' : 'border-border bg-card'
                                  }`}
                                >
                                  <div className="flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-medium text-foreground text-sm">
                                              Version {doc.version || 1}
                                            </span>
                                            {doc.isLatest && (
                                              <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                                                Latest
                                              </span>
                                            )}
                                            {doc.status === 'under_review' && (
                                              <span className="px-2 py-1 bg-orange-500 text-white text-xs rounded">
                                                Under Review
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* File Info */}
                                    <div className="flex-1 mb-3">
                                      <h3 className="font-medium text-foreground mb-2 text-sm truncate" title={doc.file_name}>
                                        {doc.file_name || 'Unnamed Document'}
                                      </h3>
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                          <span>Size:</span>
                                          <span>{formatFileSize(doc.file_size)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>Uploaded:</span>
                                          <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span>By:</span>
                                          <span className="truncate">{doc.uploader_name || 'Unknown'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions - Read-only for Admin */}
                                    <div className="flex items-center justify-between pt-3 border-t border-border">
                                      <div className="flex items-center space-x-1">
                                        {/* Review Status Indicator (Read-only) */}
                                        <div className={`px-3 py-1 text-sm border rounded-md ${
                                          doc.status === 'under_review' 
                                            ? 'bg-orange-100 text-orange-700 border-orange-300' 
                                            : 'bg-green-100 text-green-700 border-green-300'
                                        }`}>
                                          <Icon name={doc.status === 'under_review' ? 'Clock' : 'Check'} size={16} />
                                        </div>
                                        <button
                                          onClick={() => handleViewDocument(doc)}
                                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                          <Icon name="Eye" size={16} />
                                        </button>
                                        <button
                                          onClick={() => handleDownloadDocument(doc)}
                                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                                        >
                                          <Icon name="Download" size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center py-12">
                  <Icon name="FileText" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Select a Document Type</h3>
                  <p className="text-muted-foreground">
                    Choose a document type from the sidebar to view its versions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentVersions;
