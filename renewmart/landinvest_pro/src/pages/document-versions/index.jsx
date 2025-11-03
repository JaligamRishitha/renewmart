import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import DocumentTypeSelector from './components/DocumentTypeSelector';
import DocumentVersionList from './components/DocumentVersionList';
import documentVersionService from '../../services/documentVersionService';

const DocumentVersions = () => {
  const { landId } = useParams();
  const navigate = useNavigate();
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin'); // admin, reviewer, landowner

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch document status summary
        const statusSummary = await documentVersionService.getDocumentStatusSummary(landId);
        
        // Transform API data to match component structure
        const transformedTypes = statusSummary.map(item => ({
          id: item.document_type,
          name: item.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          icon: getDocumentTypeIcon(item.document_type),
          count: item.total_versions,
          latestVersion: item.max_version,
          underReview: item.under_review_versions,
          archived: item.archived_versions
        }));

        setDocumentTypes(transformedTypes);
      } catch (error) {
        console.error('Error fetching document types:', error);
        // Fallback to mock data if API fails
        setDocumentTypes(getMockDocumentTypes());
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [landId]);

  // Fetch documents when a type is selected
  useEffect(() => {
    if (selectedDocumentType) {
      const fetchDocuments = async () => {
        try {
          const documents = await documentVersionService.getDocumentVersions(
            landId, 
            selectedDocumentType.id
          );
          setDocuments(documents);
        } catch (error) {
          console.error('Error fetching documents:', error);
          // Fallback to mock data
          setDocuments(getMockDocuments(selectedDocumentType.id));
        }
      };

      fetchDocuments();
    }
  }, [selectedDocumentType, landId]);

  // Helper functions
  const getDocumentTypeIcon = (documentType) => {
    const iconMap = {
      'survey_report': 'Map',
      'ownership_certificate': 'FileText',
      'environmental_assessment': 'Leaf',
      'financial_documents': 'DollarSign',
      'legal_documents': 'Scale',
      'technical_specifications': 'Settings',
      'permits': 'Shield',
      'insurance': 'Umbrella'
    };
    return iconMap[documentType] || 'File';
  };

  const getMockDocumentTypes = () => [
    {
      id: 'survey_report',
      name: 'Survey Report',
      icon: 'Map',
      count: 3,
      latestVersion: 2,
      underReview: 1,
      archived: 2
    },
    {
      id: 'ownership_certificate',
      name: 'Ownership Certificate',
      icon: 'FileText',
      count: 1,
      latestVersion: 1,
      underReview: 0,
      archived: 0
    }
  ];

  const getMockDocuments = (documentType) => [
    {
      id: 'doc-1',
      fileName: `${documentType}_v2.pdf`,
      version: 2,
      isLatest: true,
      status: 'active',
      uploadedBy: 'John Doe',
      uploadedAt: '2025-01-15T10:30:00Z',
      fileSize: '2.4 MB',
      mimeType: 'application/pdf'
    },
    {
      id: 'doc-2',
      fileName: `${documentType}_v1.pdf`,
      version: 1,
      isLatest: false,
      status: 'under_review',
      uploadedBy: 'Jane Smith',
      uploadedAt: '2025-01-10T14:20:00Z',
      fileSize: '2.1 MB',
      mimeType: 'application/pdf',
      reviewedBy: 'Mike Johnson',
      reviewStartedAt: '2025-01-16T09:00:00Z'
    }
  ];

  const handleDocumentTypeSelect = (docType) => {
    setSelectedDocumentType(docType);
  };

  const handleMarkForReview = async (documentId, reason = null) => {
    try {
      await documentVersionService.lockDocumentForReview(documentId, reason);
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.document_id === documentId 
          ? { ...doc, version_status: 'under_review', review_locked_at: new Date().toISOString() }
          : doc
      ));
    } catch (error) {
      console.error('Error marking document for review:', error);
      throw error;
    }
  };

  const handleCompleteReview = async (documentId, reason = null) => {
    try {
      await documentVersionService.unlockDocument(documentId, reason);
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.document_id === documentId 
          ? { ...doc, version_status: 'active', review_locked_at: null }
          : doc
      ));
    } catch (error) {
      console.error('Error completing review:', error);
      throw error;
    }
  };

  const handleArchiveDocument = async (documentId, reason = null) => {
    try {
      await documentVersionService.archiveDocument(documentId, reason);
      // Update local state
      setDocuments(prev => prev.map(doc => 
        doc.document_id === documentId 
          ? { ...doc, version_status: 'archived' }
          : doc
      ));
    } catch (error) {
      console.error('Error archiving document:', error);
      throw error;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'under_review': return 'text-yellow-600 bg-yellow-100';
      case 'archived': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return 'CheckCircle';
      case 'under_review': return 'Clock';
      case 'archived': return 'Archive';
      default: return 'File';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole={userRole} />
        <div className="pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Icon name="Loader2" size={48} className="text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">Loading document versions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole={userRole} />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin-dashboard')}
              iconName="ArrowLeft"
              iconPosition="left"
            >
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="FileText" size={24} color="white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground">
                Document Versions
              </h1>
              <p className="font-body text-lg text-muted-foreground">
                Manage document versions and review status for Land ID: {landId}
              </p>
            </div>
          </div>

          {/* Project Info Card */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Land ID:</span>
                <p className="font-medium text-foreground">{landId}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Document Types:</span>
                <p className="font-medium text-foreground">{documentTypes.length} types</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Versions:</span>
                <p className="font-medium text-foreground">{documentTypes.reduce((sum, type) => sum + type.count, 0)} versions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Document Types */}
          <div className="lg:col-span-1">
            <DocumentTypeSelector
              documentTypes={documentTypes}
              selectedType={selectedDocumentType}
              onTypeSelect={handleDocumentTypeSelect}
            />
          </div>

          {/* Right Side - Document Versions */}
          <div className="lg:col-span-2">
            <DocumentVersionList
              selectedDocumentType={selectedDocumentType}
              documents={documents}
              userRole={userRole}
              onMarkForReview={handleMarkForReview}
              onCompleteReview={handleCompleteReview}
              onArchive={handleArchiveDocument}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersions;
