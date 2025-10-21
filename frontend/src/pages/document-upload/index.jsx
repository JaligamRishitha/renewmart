import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';
import DocumentAccordion from './components/DocumentAccordion';
import ProgressSidebar from './components/ProgressSidebar';
import ProjectDetailsForm from './components/ProjectDetailsForm';
import SubmissionPreview from './components/SubmissionPreview';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { landsAPI, documentsAPI } from '../../services/api';

const DocumentUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState(['project-details']);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [projectDetails, setProjectDetails] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [errors, setErrors] = useState({});
  const [showToast, setShowToast] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  const documentSections = [
    {
      id: 'land-valuation',
      title: 'Land Valuation Reports',
      description: 'Professional appraisal and valuation documents for the property',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx'],
      maxSize: '10MB'
    },
    {
      id: 'ownership-documents',
      title: 'Ownership Documents',
      description: 'Legal documents proving ownership of the land parcel',
      required: true,
      requiredFiles: 2,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '5MB'
    },
    {
      id: 'sale-contracts',
      title: 'Sale Contracts',
      description: 'Existing sale agreements or contract templates',
      required: false,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx'],
      maxSize: '10MB'
    },
    {
      id: 'topographical-surveys',
      title: 'Topographical Surveys',
      description: 'Detailed land surveys and topographical maps',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'jpg', 'png', 'dwg'],
      maxSize: '20MB'
    },
    {
      id: 'grid-connectivity',
      title: 'Grid Connectivity Details',
      description: 'Electrical grid connection studies and feasibility reports',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
      maxSize: '15MB'
    },
    {
      id: 'financial-models',
      title: 'Financial Models',
      description: 'Economic analysis and financial projections for the project',
      required: false,
      requiredFiles: 1,
      acceptedFormats: ['xls', 'xlsx', 'pdf'],
      maxSize: '10MB'
    },
    {
      id: 'zoning-approvals',
      title: 'Zoning Approvals',
      description: 'Municipal zoning permits and land use approvals',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '5MB'
    },
    {
      id: 'environmental-impact',
      title: 'Environmental Impact Assessments',
      description: 'Environmental studies and impact assessment reports',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx'],
      maxSize: '25MB'
    },
    {
      id: 'government-nocs',
      title: 'Government NOCs',
      description: 'No Objection Certificates from relevant government authorities',
      required: true,
      requiredFiles: 2,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '5MB'
    }
  ];

  // Load existing project data in edit mode
  useEffect(() => {
    const loadProjectData = async () => {
      const projectId = location.state?.projectId;
      const mode = location.state?.mode;
      
      if (projectId && (mode === 'edit' || mode === 'continue')) {
        console.log('[Document Upload] Loading project for editing:', projectId);
        setIsEditMode(true);
        setEditingProjectId(projectId);
        setIsLoadingProject(true);
        
        try {
          // Fetch project details
          const project = await landsAPI.getLandById(projectId);
          console.log('[Document Upload] Loaded project:', project);
          
          // Populate ALL project details form fields
          // Using exact backend field names from schemas.py
          console.log('[Document Upload] Raw project data:', project);
          
          setProjectDetails({
            // Basic Info (from LandBase schema)
            projectName: project.title || '',
            location: project.location_text || project.location || '',
            landArea: String(project.area_acres || project.landArea || ''),
            projectType: project.energy_key || project.energy_type || project.projectType || '',
            capacity: String(project.capacity_mw || project.capacity || ''),
            
            // Pricing & Financial
            pricePerMWh: String(project.price_per_mwh || project.pricePerMWh || ''),
            estimatedBudget: project.estimated_budget || project.estimatedBudget || '',
            
            // Timeline & Contract
            timeline: project.timeline_text || project.timeline || '',
            contractDuration: project.contract_term_years ? `${project.contract_term_years}-years` : 
                            (project.contractDuration || ''),
            
            // Additional Info
            partners: project.developer_name || project.partners || '',
            description: project.admin_notes || project.description || project.land_type || '',
            additionalNotes: project.admin_notes || project.additional_notes || '',
            
            // Confirmation
            detailsConfirmed: true
          });
          
          console.log('[Document Upload] ✅ ALL Fields Populated from backend:', {
            title: project.title,
            location_text: project.location_text,
            area_acres: project.area_acres,
            energy_key: project.energy_key,
            capacity_mw: project.capacity_mw,
            price_per_mwh: project.price_per_mwh,
            timeline_text: project.timeline_text,
            contract_term_years: project.contract_term_years,
            developer_name: project.developer_name,
            admin_notes: project.admin_notes,
            land_type: project.land_type
          });
          
          // Fetch and load existing documents
          try {
            const documents = await documentsAPI.getDocuments(projectId);
            console.log('[Document Upload] Loaded documents:', documents);
            
            // Group documents by type/section
            const filesBySection = {};
            documents.forEach(doc => {
              const sectionId = doc.document_type || 'other';
              if (!filesBySection[sectionId]) {
                filesBySection[sectionId] = [];
              }
              // Create a file-like object for existing documents
              filesBySection[sectionId].push({
                name: doc.file_name || doc.document_type,
                size: doc.file_size || 0,
                type: doc.mime_type || 'application/pdf',
                uploadedAt: doc.uploaded_at,
                documentId: doc.document_id,
                url: doc.file_path,
                isExisting: true
              });
            });
            
            setUploadedFiles(filesBySection);
          } catch (err) {
            console.error('[Document Upload] Failed to load documents:', err);
          }
          
          addNotification({
            id: Date.now(),
            type: 'info',
            title: 'Project Loaded',
            message: `Editing "${project.title || project.name}". You can update details and add more documents.`,
            timestamp: new Date()
          });
          
        } catch (err) {
          console.error('[Document Upload] Failed to load project:', err);
          addNotification({
            id: Date.now(),
            type: 'error',
            title: 'Load Failed',
            message: 'Failed to load project data. Starting fresh.',
            timestamp: new Date()
          });
        } finally {
          setIsLoadingProject(false);
        }
      }
    };
    
    loadProjectData();
  }, [location.state]);

  // Calculate overall progress
  const calculateOverallProgress = () => {
    const totalSections = documentSections?.length;
    let completedSections = 0;
    
    documentSections?.forEach(section => {
      const sectionFiles = uploadedFiles?.[section?.id] || [];
      const requiredCount = section?.requiredFiles || 1;
      if (sectionFiles?.length >= requiredCount) {
        completedSections++;
      }
    });
    
    return (completedSections / totalSections) * 100;
  };

  // Check if submission is possible
  const canSubmit = () => {
    const requiredSections = documentSections?.filter(section => section?.required);
    return requiredSections?.every(section => {
      const sectionFiles = uploadedFiles?.[section?.id] || [];
      return sectionFiles?.length >= (section?.requiredFiles || 1);
    }) && projectDetails?.detailsConfirmed;
  };

  // Handle file upload
  const handleFileUpload = (sectionId, files) => {
    const validFiles = files?.filter(file => {
      const section = documentSections?.find(s => s?.id === sectionId);
      const extension = file?.name?.split('.')?.pop()?.toLowerCase();
      const maxSizeBytes = parseInt(section?.maxSize) * 1024 * 1024;
      
      return section?.acceptedFormats?.includes(extension) && file?.size <= maxSizeBytes;
    });

    if (validFiles?.length !== files?.length) {
      addNotification({
        id: Date.now(),
        type: 'warning',
        title: 'Some files were rejected',
        message: 'Please check file format and size requirements',
        timestamp: new Date()
      });
    }

    setUploadedFiles(prev => ({
      ...prev,
      [sectionId]: [...(prev?.[sectionId] || []), ...validFiles]
    }));

    // if (validFiles?.length > 0) {
    //   addNotification({
    //     id: Date.now(),
    //     type: 'success',
    //     title: 'Files uploaded successfully',
    //     message: `${validFiles?.length} file(s) added to ${documentSections?.find(s => s?.id === sectionId)?.title}`,
    //     timestamp: new Date()
    //   });
    // }
  };

  // Handle file removal
  const handleFileRemove = (sectionId, fileIndex) => {
    setUploadedFiles(prev => ({
      ...prev,
      [sectionId]: prev?.[sectionId]?.filter((_, index) => index !== fileIndex)
    }));
  };

  // Handle section toggle
  const handleSectionToggle = (sectionId) => {
    setExpandedSections(prev => 
      prev?.includes(sectionId) 
        ? prev?.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Handle section navigation
  const handleSectionNavigate = (sectionId) => {
    if (!expandedSections?.includes(sectionId)) {
      setExpandedSections(prev => [...prev, sectionId]);
    }
    
    // Scroll to section
    setTimeout(() => {
      const element = document.getElementById(`section-${sectionId}`);
      if (element) {
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      
      // Check if we have at least project name
      if (!projectDetails.projectName) {
        showErrorToast('Please enter a project name before saving');
        setIsSaving(false);
        return;
      }
      
      // Create land entry as draft
      const landData = {
        title: projectDetails.projectName || 'Untitled Project',
        location_text: projectDetails.location || '',
        coordinates: projectDetails.coordinates || { lat: 0, lng: 0 },
        area_acres: parseFloat(projectDetails.totalArea) || 0,
        energy_key: projectDetails.energyType?.toLowerCase() || 'solar',
        capacity_mw: parseFloat(projectDetails.capacity) || 0,
        price_per_mwh: parseFloat(projectDetails.pricePerMWh) || 0,
        timeline_text: projectDetails.timeline || '',
        land_type: projectDetails.landType || '',
        contract_term_years: parseInt(projectDetails.contractTerm) || null,
        developer_name: projectDetails.developerName || null
      };
      
      const createdLand = await landsAPI.createLand(landData);
      const landId = createdLand.land_id;
      
      // Upload any documents that are already added
      if (Object.keys(uploadedFiles).length > 0) {
        const uploadPromises = [];
        Object.entries(uploadedFiles).forEach(([sectionId, files]) => {
          files.forEach(file => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', sectionId);
            formData.append('is_draft', 'true');
            uploadPromises.push(documentsAPI.uploadDocument(landId, formData));
          });
        });
        
        await Promise.all(uploadPromises);
      }
      
      setIsSaving(false);
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Draft saved successfully',
        message: 'Your progress has been saved and can be resumed later',
        timestamp: new Date()
      });
      
      showSuccessToast('Draft saved successfully! You can continue editing later.');
      
      // Store land ID for future use
      sessionStorage.setItem('draftLandId', landId);
      
    } catch (error) {
      console.error('Error saving draft:', error);
      setIsSaving(false);
      
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Failed to save draft',
        message: error.response?.data?.detail || 'Could not save draft. Please try again.',
        timestamp: new Date()
      });
      
      showErrorToast(error.response?.data?.detail || 'Failed to save draft');
    }
  };

  // Handle submit for review
  const handleSubmitForReview = () => {
    if (!canSubmit()) {
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Submission incomplete',
        message: 'Please complete all required sections before submitting',
        timestamp: new Date()
      });
      return;
    }
    
    setShowPreview(true);
  };

  // Handle preview submission
  const handlePreviewSubmission = () => {
    setShowPreview(true);
  };

  // Handle confirm submission
  const handleConfirmSubmission = async () => {
    try {
      setIsSaving(true);
      
      // Step 1: Create land entry
      const landData = {
        title: projectDetails.projectName || 'Untitled Project',
        location_text: projectDetails.location || '',
        coordinates: projectDetails.coordinates || { lat: 0, lng: 0 },
        area_acres: parseFloat(projectDetails.totalArea) || 0,
        energy_key: projectDetails.energyType?.toLowerCase() || 'solar',
        capacity_mw: parseFloat(projectDetails.capacity) || 0,
        price_per_mwh: parseFloat(projectDetails.pricePerMWh) || 0,
        timeline_text: projectDetails.timeline || '',
        land_type: projectDetails.landType || '',
        contract_term_years: parseInt(projectDetails.contractTerm) || null,
        developer_name: projectDetails.developerName || null
      };
      
      const createdLand = await landsAPI.createLand(landData);
      const landId = createdLand.land_id;
      
      // Step 2: Upload all documents
      const uploadPromises = [];
      Object.entries(uploadedFiles).forEach(([sectionId, files]) => {
        files.forEach(file => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('document_type', sectionId);
          formData.append('is_draft', 'false');
          uploadPromises.push(documentsAPI.uploadDocument(landId, formData));
        });
      });
      
      await Promise.all(uploadPromises);
      
      // Step 3: Submit for review
      await landsAPI.submitForReview(landId);
      
      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Submission successful',
        message: `Your project "${projectDetails.projectName}" has been submitted for administrative review`,
        timestamp: new Date()
      });
      
      setShowPreview(false);
      setIsSaving(false);
      
      // Show success toast
      showSuccessToast('Project uploaded successfully! Redirecting to dashboard...');
      
      // Navigate to dashboard after a delay
      setTimeout(() => {
        navigate('/landowner-dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting project:', error);
      setIsSaving(false);
      
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Submission failed',
        message: error.response?.data?.detail || 'Failed to submit project. Please try again.',
        timestamp: new Date()
      });
      
      showErrorToast(error.response?.data?.detail || 'Failed to submit project');
    }
  };

  // Add notification
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  // Toast functions
  const showSuccessToast = (message = 'Operation completed successfully!') => {
    setShowToast({
      type: 'success',
      title: 'Success!',
      message: message
    });
    setTimeout(() => setShowToast(null), 3000);
  };

  const showErrorToast = (message) => {
    setShowToast({
      type: 'error',
      title: 'Error',
      message: message
    });
    setTimeout(() => setShowToast(null), 5000);
  };

  // Handle project details change
  const handleProjectDetailsChange = (details) => {
    setProjectDetails(details);
  };

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (Object.keys(uploadedFiles)?.length > 0 || Object.keys(projectDetails)?.length > 0) {
        // Auto-save logic here
        console.log('Auto-saving...');
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [uploadedFiles, projectDetails]);

  // Initialize with project details section expanded
  useEffect(() => {
    setExpandedSections(['project-details']);
  }, []);

  const overallProgress = calculateOverallProgress();

  // Show loading state when loading project data
  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="landowner" />
        <WorkflowBreadcrumbs />
        <div className="max-w-9xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading project data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="landowner" />
      <WorkflowBreadcrumbs />
      <div className="max-w-9xl mx-auto px-4 lg:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          {isEditMode && (
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/landowner-dashboard')}
                iconName="ArrowLeft"
                iconPosition="left"
              >
                Back to Dashboard
              </Button>
            </div>
          )}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name={isEditMode ? "Edit" : "Upload"} size={24} color="white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-3xl text-foreground">
                {isEditMode ? "Edit Project" : "Document Upload"}
              </h1>
              <p className="font-body text-lg text-muted-foreground">
                {isEditMode 
                  ? "Update your land details and upload additional documents"
                  : "Submit your land documentation for renewable energy project review"}
              </p>
            </div>
          </div>
          {isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900 font-medium">Editing Existing Project</p>
                  <p className="text-sm text-blue-700 mt-1">
                    You can update project details and add more documents. Existing documents will be preserved.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Icon name="Clock" size={16} className="text-muted-foreground" />
              <span className="font-body text-muted-foreground">
                Last saved: {new Date()?.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="FileCheck" size={16} className="text-muted-foreground" />
              <span className="font-body text-muted-foreground">
                {Math.round(overallProgress)}% complete
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Project Details Form */}
            <div id="section-project-details">
              <ProjectDetailsForm
                projectDetails={projectDetails}
                onProjectDetailsChange={handleProjectDetailsChange}
                errors={errors}
              />
            </div>

            {/* Document Upload Sections */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <span className="text-secondary-foreground font-heading font-semibold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    Document Upload
                  </h3>
                  <p className="font-body text-sm text-muted-foreground">
                    Upload required documents for your renewable energy project
                  </p>
                </div>
              </div>

              <DocumentAccordion
                sections={documentSections}
                uploadedFiles={uploadedFiles}
                onFileUpload={handleFileUpload}
                onFileRemove={handleFileRemove}
                expandedSections={expandedSections}
                onSectionToggle={handleSectionToggle}
              />
            </div>

            {/* Mobile Actions */}
            <div className="xl:hidden flex flex-col space-y-3">
              <Button
                variant="outline"
                fullWidth
                onClick={handleSaveDraft}
                loading={isSaving}
                iconName="Save"
                iconPosition="left"
              >
                Save Draft
              </Button>
              
              <Button
                variant="secondary"
                fullWidth
                onClick={handlePreviewSubmission}
                iconName="Eye"
                iconPosition="left"
              >
                Preview Submission
              </Button>
              
              <Button
                variant="default"
                fullWidth
                onClick={handleSubmitForReview}
                disabled={!canSubmit()}
                iconName="Send"
                iconPosition="left"
              >
                Submit for Review
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden xl:block">
            <ProgressSidebar
              sections={documentSections}
              uploadedFiles={uploadedFiles}
              overallProgress={overallProgress}
              onSectionNavigate={handleSectionNavigate}
              onSaveDraft={handleSaveDraft}
              onSubmitForReview={handleSubmitForReview}
              onPreviewSubmission={handlePreviewSubmission}
              canSubmit={canSubmit()}
              isSaving={isSaving}
            />
          </div>
        </div>
      </div>
      {/* Submission Preview Modal */}
      {showPreview && (
        <SubmissionPreview
          projectDetails={projectDetails}
          uploadedFiles={uploadedFiles}
          sections={documentSections}
          onClose={() => setShowPreview(false)}
          onConfirmSubmission={handleConfirmSubmission}
        />
      )}
      {/* Notifications */}
      <NotificationIndicator
        notifications={notifications}
        position="top-right"
        maxVisible={3}
        autoHide={true}
        hideDelay={5000}
      />
      {/* Quick Actions */}
      <QuickActions
        userRole="landowner"
        currentContext="document-upload"
        onActionComplete={(action) => {
          if (action === 'save-draft') {
            handleSaveDraft();
          }
        }}
        position="bottom-right"
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div className={`
            flex items-start space-x-3 p-4 rounded-lg shadow-lg max-w-md
            ${showToast.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'}
          `}>
            <div className={`flex-shrink-0 ${showToast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              <Icon name={showToast.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={24} />
            </div>
            <div className="flex-1">
              <h4 className={`font-heading font-semibold text-sm ${showToast.type === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                {showToast.title}
              </h4>
              <p className={`font-body text-sm mt-1 ${showToast.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {showToast.message}
              </p>
            </div>
            <button
              onClick={() => setShowToast(null)}
              className={`flex-shrink-0 ${showToast.type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
            >
              <Icon name="X" size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;