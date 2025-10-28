import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import DocumentStatusIndicator from '../../components/DocumentStatusIndicator';
import { documentsAPI, landsAPI } from '../../services/api';

const DocumentVersionManagement = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [documentSummary, setDocumentSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await landsAPI.getAllLands();
      setProjects(response);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentSummary = async (projectId) => {
    try {
      const response = await documentsAPI.getDocumentStatusSummary(projectId);
      setDocumentSummary(response);
    } catch (err) {
      console.error('Failed to load document summary:', err);
      setError('Failed to load document summary');
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    loadDocumentSummary(project.land_id);
  };

  const handleAction = async (action, documentId, reason = null) => {
    try {
      setActionLoading(prev => ({ ...prev, [documentId]: true }));
      
      switch (action) {
        case 'lock':
          await documentsAPI.lockDocumentForReview(documentId, reason);
          break;
        case 'unlock':
          await documentsAPI.unlockDocument(documentId, reason);
          break;
        case 'archive':
          await documentsAPI.archiveDocumentVersion(documentId, reason);
          break;
        default:
          throw new Error('Unknown action');
      }
      
      // Reload document summary
      if (selectedProject) {
        await loadDocumentSummary(selectedProject.land_id);
      }
    } catch (err) {
      console.error(`Failed to ${action} document:`, err);
      setError(`Failed to ${action} document`);
    } finally {
      setActionLoading(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const getStatusCounts = (summary) => {
    const counts = {
      total: 0,
      active: 0,
      under_review: 0,
      archived: 0
    };
    
    summary.forEach(doc => {
      counts.total += doc.total_versions;
      counts.active += doc.active_versions;
      counts.under_review += doc.under_review_versions;
      counts.archived += doc.archived_versions;
    });
    
    return counts;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="administrator" />
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading document management...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="administrator" />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="FileText" size={24} color="white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-2xl text-foreground">
                Document Version Management
              </h1>
              <p className="font-body text-lg text-muted-foreground">
                Manage document versions and review status
              </p>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Icon name="AlertCircle" size={20} className="text-red-600" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project Selection */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
                Select Project
              </h3>
              <div className="space-y-2">
                {projects.map((project) => (
                  <button
                    key={project.land_id}
                    onClick={() => handleProjectSelect(project)}
                    className={`w-full text-left p-3 rounded-lg transition-smooth ${
                      selectedProject?.land_id === project.land_id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted border border-border'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon 
                        name="MapPin" 
                        size={20} 
                        className={selectedProject?.land_id === project.land_id ? 'text-primary-foreground' : 'text-primary'} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {project.title}
                        </p>
                        <p className="text-xs opacity-75 mt-1">
                          {project.location_text}
                        </p>
                        <p className="text-xs opacity-75">
                          Status: {project.status}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Summary */}
          <div className="lg:col-span-2">
            {selectedProject ? (
              <div className="space-y-6">
                {/* Project Info */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-heading font-semibold text-lg text-foreground">
                        {selectedProject.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {selectedProject.location_text}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Project Status</p>
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                        {selectedProject.status}
                      </span>
                    </div>
                  </div>

                  {/* Overall Statistics */}
                  {documentSummary.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(() => {
                        const counts = getStatusCounts(documentSummary);
                        return (
                          <>
                            <div className="text-center p-3 bg-muted rounded-lg">
                              <p className="text-2xl font-bold text-foreground">{counts.total}</p>
                              <p className="text-sm text-muted-foreground">Total Versions</p>
                            </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-2xl font-bold text-green-600">{counts.active}</p>
                              <p className="text-sm text-muted-foreground">Active</p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                              <p className="text-2xl font-bold text-yellow-600">{counts.under_review}</p>
                              <p className="text-sm text-muted-foreground">Under Review</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-2xl font-bold text-gray-600">{counts.archived}</p>
                              <p className="text-sm text-muted-foreground">Archived</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Document Types */}
                {documentSummary.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-heading font-semibold text-lg text-foreground">
                      Document Types
                    </h4>
                    {documentSummary.map((doc) => (
                      <div key={doc.document_type} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-foreground capitalize">
                              {doc.document_type.replace('_', ' ')}
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {doc.total_versions} versions • Latest: v{doc.max_version}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {doc.active_versions} Active
                            </span>
                            {doc.under_review_versions > 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                {doc.under_review_versions} Under Review
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Last updated: {new Date(doc.last_updated).toLocaleDateString()}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            iconName="Eye"
                            iconPosition="left"
                          >
                            View Versions
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No Documents Found</h3>
                    <p className="text-muted-foreground">
                      This project doesn't have any documents uploaded yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <Icon name="FileText" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg text-foreground mb-2">
                  Select a Project
                </h3>
                <p className="text-muted-foreground">
                  Choose a project from the left sidebar to view and manage its document versions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVersionManagement;
