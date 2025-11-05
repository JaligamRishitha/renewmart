import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';
import DocumentAccordion from './components/DocumentAccordion';
import ProgressSidebar from './components/ProgressSidebar';
import ProjectDetailsForm from './components/ProjectDetailsForm';
import SubmissionPreview from './components/SubmissionPreview';
import DocumentVersions from '../../components/DocumentVersions';
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
  const [showDocumentVersions, setShowDocumentVersions] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);

  const documentSections = [
    {
      id: 'land-valuation',
      title: 'Land Valuation Reports',
      description: 'Professional appraisal and valuation documents for the property',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      maxSize: '10MB',
      roles: ['administrator', 're_sales_advisor', 're_governance_lead']
    },
    {
      id: 'ownership-documents',
      title: 'Ownership Documents',
      description: 'Legal documents proving ownership of the land parcel',
      required: true,
      requiredFiles: 2,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '5MB',
      roles: ['administrator', 're_governance_lead']
    },
    {
      id: 'sale-contracts',
      title: 'Sale Contracts',
      description: 'Existing sale agreements or contract templates',
      required: false,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      maxSize: '10MB',
      roles: ['administrator', 're_sales_advisor']
    },
    {
      id: 'topographical-surveys',
      title: 'Topographical Surveys',
      description: 'Detailed land surveys and topographical maps',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'jpg', 'png', 'dwg'],
      maxSize: '20MB',
      roles: ['administrator', 're_sales_advisor']
    },
    {
      id: 'grid-connectivity',
      title: 'Grid Connectivity Details',
      description: 'Electrical grid connection studies and feasibility reports',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png'],
      maxSize: '15MB',
      roles: ['administrator', 're_sales_advisor']
    },
    {
      id: 'financial-models',
      title: 'Financial Models',
      description: 'Economic analysis and financial projections for the project',
      required: false,
      requiredFiles: 1,
      acceptedFormats: ['xls', 'xlsx', 'pdf', 'jpg', 'png'],
      maxSize: '10MB',
      roles: ['administrator', 're_analyst']
    },
    {
      id: 'zoning-approvals',
      title: 'Zoning Approvals',
      description: 'Municipal zoning permits and land use approvals',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '5MB',
      roles: ['administrator', 're_governance_lead']
    },
    {
      id: 'environmental-impact',
      title: 'Environmental Impact Assessments',
      description: 'Environmental studies and impact assessment reports',
      required: true,
      requiredFiles: 1,
      acceptedFormats: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      maxSize: '25MB',
      roles: ['administrator', 're_governance_lead']
    },
    {
      id: 'government-nocs',
      title: 'Government NOCs',
      description: 'No Objection Certificates from relevant government authorities',
      required: true,
      requiredFiles: 2,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '5MB',
      roles: ['administrator', 're_governance_lead']
    }
  ];

  // Helper function to format role names for display
  const formatRoleName = (role) => {
    const roleMap = {
      'administrator': 'Admin',
      're_sales_advisor': 'Sales Advisor',
      're_analyst': 'Analyst',
      're_governance_lead': 'Governance Lead'
    };
    return roleMap[role] || role;
  };

  // Helper function to get roles text for display (excluding admin)
  const getRolesText = (roles) => {
    if (!roles) return '';
    const nonAdminRoles = roles.filter(role => role !== 'administrator');
    if (nonAdminRoles.length === 0) return 'Admin only';
    const formattedRoles = nonAdminRoles.map(formatRoleName);
    return formattedRoles.join(', ');
  };

  // Load existing project data in edit mode
  useEffect(() => {
    const loadProjectData = async () => {
      const projectId = location.state?.projectId;
      const mode = location.state?.mode;
      const projectData = location.state?.projectData; // Use passed project data if available
      
      if (projectId && (mode === 'edit' || mode === 'continue')) {
        console.log('[Document Upload] Loading project for editing:', projectId);
        setIsEditMode(true);
        setEditingProjectId(projectId);
        setIsLoadingProject(true);
        
        try {
          // Use passed project data if available, otherwise fetch
          let project = projectData;
          if (!project) {
            project = await landsAPI.getLandById(projectId);
          }
          console.log('[Document Upload] Loaded project:', project);
          
          // Populate ALL project details form fields
          // Using exact backend field names from schemas.py
          console.log('[Document Upload] Raw project data:', project);
          
          // Parse contract_term_years to contractDuration format ("20-years")
          let contractDuration = '';
          if (project.contract_term_years) {
            contractDuration = `${project.contract_term_years}-years`;
          } else if (project.contractDuration) {
            contractDuration = project.contractDuration;
          }
          
          // Normalize energy_key from backend to form value
          let projectType = '';
          const energyKey = project.energy_key || project.energy_type || project.projectType || project.type || '';
          if (energyKey) {
            const normalized = energyKey.toLowerCase().trim();
            // Map backend enum values to form values
            if (normalized === 'hydro' || normalized === 'hydroelectric') {
              projectType = 'hydro';
            } else if (['solar', 'wind', 'biomass', 'geothermal'].includes(normalized)) {
              projectType = normalized;
            } else {
              projectType = normalized;
            }
          }
          
          setProjectDetails({
            // Basic Info (from LandBase schema)
            projectName: project.title || project.projectName || '',
            location: project.location_text || project.location || '',
            landArea: project.area_acres 
              ? String(project.area_acres) 
              : (project.landArea ? String(project.landArea) : ''),
            projectType: projectType,
            capacity: project.capacity_mw 
              ? String(project.capacity_mw) 
              : (project.capacity ? String(project.capacity) : ''),
            
            // Pricing & Financial
            pricePerMWh: project.price_per_mwh 
              ? String(project.price_per_mwh) 
              : (project.pricePerMWh ? String(project.pricePerMWh) : ''),
            estimatedBudget: project.estimated_budget || project.estimatedBudget || '',
            
            // Timeline & Contract
            timeline: project.timeline_text || project.timeline || '',
            contractDuration: contractDuration,
            
            // Additional Info
            landType: project.land_type || project.landType || '',
            partners: project.developer_name || project.partners || '',
            description: project.description || project.admin_notes || '',
            additionalNotes: project.additional_notes || project.admin_notes || '',
            coordinates: project.coordinates || { lat: 0, lng: 0 },
            
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
            land_type: project.land_type,
            coordinates: project.coordinates,
            description: project.description
          });
          
          console.log('[Document Upload] ✅ Form State Set:', {
            projectName: project.title || project.projectName,
            location: project.location_text || project.location,
            landArea: project.area_acres ? String(project.area_acres) : '',
            projectType: projectType,
            capacity: project.capacity_mw ? String(project.capacity_mw) : '',
            pricePerMWh: project.price_per_mwh ? String(project.price_per_mwh) : '',
            timeline: project.timeline_text || project.timeline,
            contractDuration: contractDuration,
            landType: project.land_type || project.landType,
            partners: project.developer_name || project.partners,
            description: project.description || project.admin_notes
          });
          
          // Fetch and load existing documents
          try {
            console.log('[Document Upload] Fetching documents for project:', projectId);
            const documents = await documentsAPI.getDocuments(projectId);
            console.log('[Document Upload] Loaded documents:', documents);
            
            if (!documents || documents.length === 0) {
              console.log('[Document Upload] No documents found for this project');
              setUploadedFiles({});
            } else {
              // Group documents by type/section
              const filesBySection = {};
              documents.forEach(doc => {
                const sectionId = doc.document_type || doc.documentType || 'other';
                if (!filesBySection[sectionId]) {
                  filesBySection[sectionId] = [];
                }
                // Create a file-like object for existing documents
                // Use document_id as the id for existing documents
                filesBySection[sectionId].push({
                  id: doc.document_id, // Use document_id as id for API calls
                  documentId: doc.document_id,
                  name: doc.file_name || doc.document_type || 'Unknown',
                  size: doc.file_size || 0,
                  type: doc.mime_type || 'application/pdf',
                  uploadedAt: doc.uploaded_at || doc.created_at || doc.upload_date,
                  url: doc.file_path || doc.url,
                  isExisting: true,
                  status: doc.status || 'pending',
                  version_number: doc.version_number || 1
                });
              });
              
              console.log('[Document Upload] Grouped documents by section:', filesBySection);
              setUploadedFiles(filesBySection);
              
              // Auto-expand sections that have documents
              const sectionsWithDocuments = Object.keys(filesBySection).filter(
                sectionId => filesBySection[sectionId]?.length > 0
              );
              if (sectionsWithDocuments.length > 0) {
                setExpandedSections(prev => {
                  const newSections = [...new Set([...prev, ...sectionsWithDocuments])];
                  return newSections;
                });
              }
            }
          } catch (err) {
            console.error('[Document Upload] Failed to load documents:', err);
            addNotification({
              id: Date.now(),
              type: 'warning',
              title: 'Could not load documents',
              message: 'Some documents may not be displayed. You can still upload new documents.',
              timestamp: new Date()
            });
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
    // Ensure we only process actual File objects
    const fileArray = Array.from(files || []);
    
    const validFiles = fileArray.filter(file => {
      // Must be a File object
      if (!(file instanceof File)) {
        console.warn('[Document Upload] Rejected non-File object:', file);
        return false;
      }
      
      const section = documentSections?.find(s => s?.id === sectionId);
      const extension = file?.name?.split('.')?.pop()?.toLowerCase();
      const maxSizeBytes = parseInt(section?.maxSize) * 1024 * 1024;
      
      const isValidFormat = section?.acceptedFormats?.includes(extension);
      const isValidSize = file?.size <= maxSizeBytes;
      
      return isValidFormat && isValidSize;
    });

    if (validFiles?.length !== fileArray?.length) {
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
    setUploadedFiles(prev => {
      const sectionFiles = prev?.[sectionId] || [];
      const fileToRemove = sectionFiles[fileIndex];
      
      // Safety check: Don't remove existing documents (they're read-only)
      if (fileToRemove?.isExisting) {
        console.warn('[Document Upload] Cannot remove existing document:', fileToRemove.name);
        addNotification({
          id: Date.now(),
          type: 'warning',
          title: 'Cannot Remove',
          message: 'Existing documents cannot be removed. They are saved to the server.',
          timestamp: new Date()
        });
        return prev;
      }
      
      // Remove non-existing files (newly uploaded files that haven't been saved)
      return {
        ...prev,
        [sectionId]: sectionFiles.filter((_, index) => index !== fileIndex)
      };
    });
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
      // Parse contract duration from "20-years" format to number 20
      let contractTermYears = null;
      if (projectDetails.contractDuration) {
        const match = projectDetails.contractDuration.match(/^(\d+)-years?$/i);
        if (match) {
          contractTermYears = parseInt(match[1], 10);
        }
      }
      
      // Normalize energy_key to match backend enum values
      let energyKey = 'solar'; // default
      if (projectDetails.projectType) {
        const normalized = projectDetails.projectType.toLowerCase().trim();
        // Map common variations to enum values
        if (normalized === 'wind' || normalized === 'wind energy') {
          energyKey = 'wind';
        } else if (normalized === 'solar' || normalized === 'solar energy') {
          energyKey = 'solar';
        } else if (normalized === 'hydro' || normalized === 'hydroelectric' || normalized === 'hydroelectric energy') {
          energyKey = 'hydro';
        } else if (normalized === 'biomass' || normalized === 'biomass energy') {
          energyKey = 'biomass';
        } else if (normalized === 'geothermal' || normalized === 'geothermal energy') {
          energyKey = 'geothermal';
        } else {
          energyKey = normalized; // Use as-is if it matches enum
        }
      }
      
      // Helper function to parse numeric values - return null if empty/invalid
      const parseNumericOrNull = (value) => {
        // Handle null/undefined
        if (value === null || value === undefined) return null;
        
        // Convert to string and trim
        const trimmed = String(value).trim();
        
        // Empty string means not set
        if (trimmed === '') return null;
        
        // Parse the value
        const parsed = parseFloat(trimmed);
        
        // If NaN or explicitly "0" (not set), return null
        if (isNaN(parsed)) return null;
        
        // For capacity and price, 0 probably means not set, return null
        // But allow other numeric values
        if (parsed === 0) return null;
        
        // Return the parsed value
        return parsed;
      };
      
      const landData = {
        title: projectDetails.projectName || 'Untitled Project',
        location_text: projectDetails.location || null,
        coordinates: projectDetails.coordinates || { lat: 0, lng: 0 },
        area_acres: parseNumericOrNull(projectDetails.landArea),
        energy_key: energyKey || null,
        capacity_mw: parseNumericOrNull(projectDetails.capacity),
        price_per_mwh: parseNumericOrNull(projectDetails.pricePerMWh),
        timeline_text: projectDetails.timeline || null,
        land_type: projectDetails.landType || null,
        contract_term_years: contractTermYears,
        developer_name: projectDetails.partners || projectDetails.developerName || null
      };
      
      console.log('[Document Upload] Saving draft land data:', landData);
      console.log('[Document Upload] Field values:', {
        capacity: projectDetails.capacity,
        capacity_mw: landData.capacity_mw,
        pricePerMWh: projectDetails.pricePerMWh,
        price_per_mwh: landData.price_per_mwh,
        timeline: projectDetails.timeline,
        timeline_text: landData.timeline_text,
        contractDuration: projectDetails.contractDuration,
        contract_term_years: landData.contract_term_years
      });
      
      let landId;
      if (isEditMode && editingProjectId) {
        // Update existing land
        console.log('[Document Upload] Updating existing land:', editingProjectId);
        console.log('[Document Upload] Request payload:', JSON.stringify(landData, null, 2));
        const updatedLand = await landsAPI.updateLand(editingProjectId, landData);
        console.log('[Document Upload] Update response:', updatedLand);
        landId = editingProjectId;
      } else {
        // Create new land
        console.log('[Document Upload] Creating new land');
        const createdLand = await landsAPI.createLand(landData);
        landId = createdLand.land_id;
      }
      
      // Upload any documents that are already added (only new File objects, skip existing ones)
      const filesToUpload = Object.entries(uploadedFiles).reduce((acc, [sectionId, files]) => {
        const newFiles = files.filter(file => file instanceof File && !file.isExisting);
        if (newFiles.length > 0) {
          acc[sectionId] = newFiles;
        }
        return acc;
      }, {});
      
      if (Object.keys(filesToUpload).length > 0) {
        const uploadPromises = [];
        Object.entries(filesToUpload).forEach(([sectionId, files]) => {
          files.forEach(file => {
            // Only upload if it's a real File object
            if (!(file instanceof File)) {
              console.warn('[Document Upload] Skipping non-File object:', file);
              return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('document_type', sectionId);
            formData.append('is_draft', 'true');
            
            // Debug: Verify FormData contents
            console.log('[Document Upload] FormData contents:', {
              file: file instanceof File ? `${file.name} (${file.size} bytes)` : 'Not a File',
              document_type: sectionId,
              is_draft: 'true',
              landId: landId
            });
            
            // Verify FormData entries
            for (const [key, value] of formData.entries()) {
              console.log(`[Document Upload] FormData entry: ${key} =`, value instanceof File ? `${value.name} (File)` : value);
            }
            
            uploadPromises.push(documentsAPI.uploadDocument(landId, formData));
          });
        });
        
        if (uploadPromises.length > 0) {
          await Promise.all(uploadPromises);
        }
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
      
      let errorMessage = 'Could not save draft. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Save is taking longer than expected. Please check your internet connection and try again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Failed to save draft',
        message: errorMessage,
        timestamp: new Date()
      });
      
      showErrorToast(errorMessage);
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
      // Parse contract duration from "20-years" format to number 20
      let contractTermYears = null;
      if (projectDetails.contractDuration) {
        const match = projectDetails.contractDuration.match(/^(\d+)-years?$/i);
        if (match) {
          contractTermYears = parseInt(match[1], 10);
        }
      }
      
      // Normalize energy_key to match backend enum values
      let energyKey = 'solar'; // default
      if (projectDetails.projectType) {
        const normalized = projectDetails.projectType.toLowerCase().trim();
        // Map common variations to enum values
        if (normalized === 'wind' || normalized === 'wind energy') {
          energyKey = 'wind';
        } else if (normalized === 'solar' || normalized === 'solar energy') {
          energyKey = 'solar';
        } else if (normalized === 'hydro' || normalized === 'hydroelectric' || normalized === 'hydroelectric energy') {
          energyKey = 'hydro';
        } else if (normalized === 'biomass' || normalized === 'biomass energy') {
          energyKey = 'biomass';
        } else if (normalized === 'geothermal' || normalized === 'geothermal energy') {
          energyKey = 'geothermal';
        } else {
          energyKey = normalized; // Use as-is if it matches enum
        }
      }
      
      // Helper function to parse numeric values - return null if empty/invalid
      const parseNumericOrNull = (value) => {
        // Handle null/undefined
        if (value === null || value === undefined) return null;
        
        // Convert to string and trim
        const trimmed = String(value).trim();
        
        // Empty string means not set
        if (trimmed === '') return null;
        
        // Parse the value
        const parsed = parseFloat(trimmed);
        
        // If NaN or explicitly "0" (not set), return null
        if (isNaN(parsed)) return null;
        
        // For capacity and price, 0 probably means not set, return null
        // But allow other numeric values
        if (parsed === 0) return null;
        
        // Return the parsed value
        return parsed;
      };
      
      const landData = {
        title: projectDetails.projectName || 'Untitled Project',
        location_text: projectDetails.location || null,
        coordinates: projectDetails.coordinates || { lat: 0, lng: 0 },
        area_acres: parseNumericOrNull(projectDetails.landArea),
        energy_key: energyKey || null,
        capacity_mw: parseNumericOrNull(projectDetails.capacity),
        price_per_mwh: parseNumericOrNull(projectDetails.pricePerMWh),
        timeline_text: projectDetails.timeline || null,
        land_type: projectDetails.landType || null,
        contract_term_years: contractTermYears,
        developer_name: projectDetails.partners || projectDetails.developerName || null
      };
      
      console.log('[Document Upload] Submitting land data:', landData);
      console.log('[Document Upload] Field values:', {
        capacity: projectDetails.capacity,
        capacity_mw: landData.capacity_mw,
        pricePerMWh: projectDetails.pricePerMWh,
        price_per_mwh: landData.price_per_mwh,
        timeline: projectDetails.timeline,
        timeline_text: landData.timeline_text,
        contractDuration: projectDetails.contractDuration,
        contract_term_years: landData.contract_term_years
      });
      
      let landId;
      if (isEditMode && editingProjectId) {
        // Update existing land
        console.log('[Document Upload] Updating existing land for submission:', editingProjectId);
        console.log('[Document Upload] Request payload:', JSON.stringify(landData, null, 2));
        const updatedLand = await landsAPI.updateLand(editingProjectId, landData);
        console.log('[Document Upload] Update response:', updatedLand);
        landId = editingProjectId;
      } else {
        // Create new land
        console.log('[Document Upload] Creating new land for submission');
        const createdLand = await landsAPI.createLand(landData);
        landId = createdLand.land_id;
      }
      
      // Step 2: Upload all documents with progress tracking
      const uploadPromises = [];
      // Filter out existing documents (those with isExisting flag) - only upload new File objects
      const filesToUpload = Object.entries(uploadedFiles).reduce((acc, [sectionId, files]) => {
        const newFiles = files.filter(file => file instanceof File && !file.isExisting);
        if (newFiles.length > 0) {
          acc[sectionId] = newFiles;
        }
        return acc;
      }, {});
      
      const totalFiles = Object.values(filesToUpload).flat().length;
      let uploadedCount = 0;
      
      Object.entries(filesToUpload).forEach(([sectionId, files]) => {
        files.forEach(file => {
          // Only upload if it's a real File object
          if (!(file instanceof File)) {
            console.warn('[Document Upload] Skipping non-File object:', file);
            return;
          }
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('document_type', sectionId);
          formData.append('is_draft', 'false');
          
          // Debug: Verify FormData contents
          console.log('[Document Upload] FormData contents:', {
            file: file instanceof File ? `${file.name} (${file.size} bytes)` : 'Not a File',
            document_type: sectionId,
            is_draft: 'false',
            landId: landId
          });
          
          // Verify FormData entries
          for (const [key, value] of formData.entries()) {
            console.log(`[Document Upload] FormData entry: ${key} =`, value instanceof File ? `${value.name} (File)` : value);
          }
          
          const uploadPromise = documentsAPI.uploadDocument(landId, formData)
            .then(result => {
              uploadedCount++;
              const progress = Math.round((uploadedCount / totalFiles) * 100);
              console.log(`Upload progress: ${progress}% (${uploadedCount}/${totalFiles})`);
              return result;
            });
          
          uploadPromises.push(uploadPromise);
        });
      });
      
      if (uploadPromises.length > 0) {
        console.log(`Starting upload of ${totalFiles} documents...`);
        await Promise.all(uploadPromises);
        console.log('All documents uploaded successfully');
      }
      
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
        navigate('/landowner/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting project:', error);
      setIsSaving(false);
      
      let errorMessage = 'Failed to submit project. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Upload is taking longer than expected. Please check your internet connection and try again.';
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      addNotification({
        id: Date.now(),
        type: 'error',
        title: 'Submission failed',
        message: errorMessage,
        timestamp: new Date()
      });
      
      showErrorToast(errorMessage);
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

  // Handle viewing document versions
  const handleViewDocumentVersions = (documentType) => {
    setSelectedDocumentType(documentType);
    setShowDocumentVersions(true);
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
        <div className="pt-16">
        
          <div className="max-w-9xl mx-auto px-4 lg:px-6 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading project data...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom breadcrumbs for document upload page
  const customBreadcrumbs = [
    { label: 'Home', path: '/', icon: 'Home' },
    { label: 'Landowner', path: '/landowner/dashboard', icon: 'User' },
    { label: 'Documents Upload', path: '/document-upload', icon: 'Upload', isLast: true }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="landowner" />
      <div className="pt-16">
      
        <div className="max-w-9xl mx-auto px-4 lg:px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          {isEditMode && (
            <div className="mb-4">
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
          )}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name={isEditMode ? "Edit" : "Upload"} size={24} color="white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground">
                {isEditMode ? "Edit Land Details" : "Document Upload"}
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
                  <p className="text-sm text-blue-900 font-medium">Editing Existing Land Details</p>
                  <p className="text-sm text-blue-700 mt-1">
                    You can update land details and add more documents. Existing documents will be preserved.
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
                onViewVersions={handleViewDocumentVersions}
                isEditMode={isEditMode}
                getRolesText={getRolesText}
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

      {/* Document Versions Modal */}
      {showDocumentVersions && editingProjectId && selectedDocumentType && (
        <DocumentVersions
          landId={editingProjectId}
          documentType={selectedDocumentType}
          onClose={() => {
            setShowDocumentVersions(false);
            setSelectedDocumentType(null);
          }}
        />
      )}
      </div>
    </div>
  );
};

export default DocumentUpload;