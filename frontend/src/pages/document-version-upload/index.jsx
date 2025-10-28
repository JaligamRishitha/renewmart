import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { landsAPI, documentsAPI } from '../../services/api';
import DocumentVersions from '../../components/DocumentVersions';
import DocumentStatusIndicator from '../../components/DocumentStatusIndicator';
import toast from 'react-hot-toast';

const DocumentVersionUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [error, setError] = useState(null);
  const [expandedAccordions, setExpandedAccordions] = useState({});

  const documentTypes = [
    {
      id: 'land-valuation',
      title: 'Land Valuation Reports',
      description: 'Professional appraisal and valuation documents',
      icon: 'FileText',
      required: true
    },
    {
      id: 'ownership-documents',
      title: 'Ownership Documents',
      description: 'Legal documents proving ownership',
      icon: 'Scale',
      required: true
    },
    {
      id: 'sale-contracts',
      title: 'Sale Contracts',
      description: 'Existing sale agreements or contract templates',
      icon: 'FileText',
      required: false
    },
    {
      id: 'topographical-surveys',
      title: 'Topographical Surveys',
      description: 'Detailed land surveys and topographical maps',
      icon: 'Map',
      required: true
    },
    {
      id: 'grid-connectivity',
      title: 'Grid Connectivity Details',
      description: 'Electrical grid connection studies',
      icon: 'Zap',
      required: true
    },
    {
      id: 'financial-models',
      title: 'Financial Models',
      description: 'Economic analysis and financial projections',
      icon: 'DollarSign',
      required: false
    },
    {
      id: 'zoning-approvals',
      title: 'Zoning Approvals',
      description: 'Municipal zoning permits and land use approvals',
      icon: 'Building',
      required: true
    },
    {
      id: 'environmental-impact',
      title: 'Environmental Impact Assessments',
      description: 'Environmental studies and impact assessment reports',
      icon: 'Leaf',
      required: true
    },
    {
      id: 'government-nocs',
      title: 'Government NOCs',
      description: 'No Objection Certificates from government authorities',
      icon: 'Shield',
      required: true
    }
  ];

  useEffect(() => {
    const projectId = location.state?.projectId;
    if (projectId) {
      loadProject(projectId);
    } else {
      setError('No project selected');
      setLoading(false);
    }
  }, [location.state]);

  const loadProject = async (projectId) => {
    try {
      setLoading(true);
      const projectData = await landsAPI.getLandById(projectId);
      setProject(projectData);
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentTypeSelect = (documentType) => {
    setSelectedDocumentType(documentType);
    setError(null);
  };

  const handleFileUpload = async (files, docSlot = 'D1') => {
    if (!selectedDocumentType || !project) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('document_type', selectedDocumentType.id);
      formData.append('is_draft', 'false');
      formData.append('doc_slot', docSlot); // Add doc slot information

      await documentsAPI.uploadDocument(project.land_id, formData);
      
      // Show success toast message
      toast.success(`New version of ${selectedDocumentType.title} uploaded successfully to ${docSlot}!`, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#10b981',
          color: '#fff',
        },
      });
      
      setSelectedDocumentType(null);
      
      // Reset file input
      const fileInput = document.getElementById(`file-input-${docSlot}`);
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Upload failed:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to upload document. Please try again.';
      setError(errorMessage);
      
      // Show error toast message
      toast.error(`Upload failed: ${errorMessage}`, {
        duration: 5000,
        position: 'top-right',
        style: {
          background: '#ef4444',
          color: '#fff',
        },
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e, docSlot = 'D1') => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileUpload(files, docSlot);
    }
  };

  const handleViewVersions = (documentType) => {
    setShowVersions(true);
  };

  const toggleAccordion = (docIndex) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [docIndex]: !prev[docIndex]
    }));
  };

  const getDocumentSlots = (documentType) => {
    // Only show D1, D2 for Ownership Documents and Government NOCs
    const multiSlotTypes = ['ownership-documents', 'government-nocs'];
    const isMultiSlot = multiSlotTypes.includes(documentType.id);
    
    if (isMultiSlot) {
      return ['D1', 'D2'];
    }
    // For other document types, show only D1 slot
    return ['D1'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="landowner" />
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading project details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="landowner" />
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="text-center">
            <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button
              variant="default"
              onClick={() => navigate('/landowner/dashboard')}
              iconName="ArrowLeft"
              iconPosition="left"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="landowner" />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/landowner/dashboard')}
              iconName="ArrowLeft"
              iconPosition="left"
            >
              Back to Dashboard
            </Button>
          </div>
          
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Upload" size={24} color="white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground">
                Upload Document Versions
              </h1>
              <p className="font-body text-lg text-muted-foreground">
                Add new versions of documents for: {project?.title}
              </p>
            </div>
          </div>

          {/* Project Info Card */}
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Project Name:</span>
                <p className="font-medium text-foreground">{project?.title}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Location:</span>
                <p className="font-medium text-foreground">{project?.location_text}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status:</span>
                <p className="font-medium text-foreground capitalize">{project?.status}</p>
              </div>
            </div>
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
                {documentTypes.map((docType) => (
                  <button
                    key={docType.id}
                    onClick={() => handleDocumentTypeSelect(docType)}
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
                          {docType.title}
                        </p>
                        <p className="text-xs opacity-75 mt-1">
                          {docType.description}
                        </p>
                        {docType.required && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Upload Interface */}
          <div className="lg:col-span-2">
            {selectedDocumentType ? (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-foreground">
                      Upload New Version: {selectedDocumentType.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDocumentType.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewVersions(selectedDocumentType)}
                    iconName="History"
                    iconPosition="left"
                  >
                    View Versions
                  </Button>
                </div>

                {/* Document Slots Accordion */}
                <div className="space-y-4">
                  {getDocumentSlots(selectedDocumentType).map((docSlot, docIndex) => (
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
                            Upload Slot
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
                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                              <Icon name="Upload" size={48} className="text-muted-foreground mx-auto mb-4" />
                              <h4 className="text-lg font-medium text-foreground mb-2">
                                Upload Document for {docSlot}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-4">
                                Drag and drop your file here, or click to browse
                              </p>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileSelect(e, docSlot)}
                                className="hidden"
                                id={`file-input-${docSlot}`}
                              />
                              <Button
                                onClick={() => document.getElementById(`file-input-${docSlot}`).click()}
                                variant="outline"
                                size="sm"
                                iconName="Upload"
                                iconPosition="left"
                              >
                                Choose File
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* File Requirements */}
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h5 className="font-medium text-sm text-foreground mb-2">File Requirements:</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Accepted formats: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX</li>
                    <li>• Maximum file size: 25MB</li>
                    <li>• File will be automatically versioned</li>
                    <li>• Previous versions will be preserved</li>
                  </ul>
                </div>

                {/* Status Messages */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Icon name="AlertCircle" size={16} className="text-red-600" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  Select a Document Type
                </h3>
                <p className="text-muted-foreground">
                  Choose a document type from the left sidebar to upload a new version
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Versions Modal */}
      {showVersions && selectedDocumentType && project && (
        <DocumentVersions
          landId={project.land_id}
          documentType={selectedDocumentType.id}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
};

export default DocumentVersionUpload;
