import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import NotificationIndicator from '../../components/ui/NotificationIndicator';
import QuickActions from '../../components/ui/QuickActions';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import ProjectSummaryCards from './components/ProjectSummaryCards';
import ProjectFilters from './components/ProjectFilters';
import ProjectTable from './components/ProjectTable';
import EmptyState from './components/EmptyState';
import ProjectDetailModal from './components/ProjectDetailModal';
import DocumentsModal from './components/DocumentsModal';
import { landsAPI } from '../../services/api';

const LandownerDashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalLandArea: 0,
    draftProjects: 0,
    completedSubmissions: 0,
    estimatedRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    projectType: 'all',
    status: 'all',
    timeline: 'all',
    sortBy: 'updated'
  });
  const [notifications, setNotifications] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectForDocuments, setSelectedProjectForDocuments] = useState(null);
  const [selectedProjectInitialTab, setSelectedProjectInitialTab] = useState('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch summary and projects in parallel
        const [summaryResponse, projectsResponse] = await Promise.all([
          landsAPI.getDashboardSummary(),
          landsAPI.getDashboardProjects()
        ]);
        
        setSummaryData(summaryResponse);
        setProjects(projectsResponse);
        
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        setNotifications([
          {
            id: Date.now(),
            type: 'error',
            title: 'Error Loading Data',
            message: err.message || 'Failed to load dashboard data. Please try refreshing the page.',
            timestamp: new Date()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Backend already returns only the latest updated project per land_id
    // So we can use projects directly without additional deduplication
    let filtered = [...projects];

    // Apply search filter
    if (filters?.search) {
      filtered = filtered?.filter(project =>
        project?.title?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        project?.location_text?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        project?.land_id?.toLowerCase()?.includes(filters?.search?.toLowerCase())
      );
    }

    // Apply project type filter
    if (filters?.projectType !== 'all') {
      filtered = filtered?.filter(project => project?.energy_key === filters?.projectType);
    }

    // Apply status filter
    if (filters?.status !== 'all') {
      filtered = filtered?.filter(project => project?.status === filters?.status);
    }

    // Apply timeline filter
    if (filters?.timeline !== 'all') {
      filtered = filtered?.filter(project => project?.timeline_text === filters?.timeline);
    }

    // Apply sorting
    filtered?.sort((a, b) => {
      switch (filters?.sortBy) {
        case 'name':
          return a?.title?.localeCompare(b?.title);
        case 'location':
          return a?.location_text?.localeCompare(b?.location_text);
        case 'capacity':
          return (b?.capacity_mw || 0) - (a?.capacity_mw || 0);
        case 'updated':
        default:
          return new Date(b?.updated_at || 0) - new Date(a?.updated_at || 0);
      }
    });

    setFilteredProjects(filtered);
  }, [projects, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = (searchTerm) => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      projectType: 'all',
      status: 'all',
      timeline: 'all',
      sortBy: 'updated'
    });
  };

  const handleEditProject = async (project) => {
    try {
      // Fetch full project details to ensure all fields are available
      const fullProject = await landsAPI.getLandById(project?.land_id);
      navigate('/document-upload', { 
        state: { 
          projectId: project?.land_id, 
          mode: 'edit',
          projectData: fullProject // Pass full project data for auto-population
        } 
      });
    } catch (err) {
      console.error('Error fetching project details:', err);
      // Fallback to basic navigation
      navigate('/document-upload', { state: { projectId: project?.land_id, mode: 'edit' } });
    }
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
    setSelectedProjectInitialTab('details');
  };

  const handleViewInterest = (project) => {
    setSelectedProject(project);
    setSelectedProjectInitialTab('interests');
  };

  const handleViewDocuments = (project) => {
    setSelectedProjectForDocuments(project);
  };

  const handleContinueDraft = (project) => {
    navigate('/document-upload', { state: { projectId: project?.land_id, mode: 'continue' } });
  };

  const handleSubmitForReview = async (project) => {
    try {
      // Call API to submit for admin review
      await landsAPI.submitForReview(project.land_id);
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'success',
          title: 'Submitted for Review',
          message: `${project?.title} has been submitted for admin review. You'll be notified once reviewed.`,
          timestamp: new Date(),
        }
      ]);
      
      // Refresh projects from API to get the latest status
      try {
        const [summaryResponse, projectsResponse] = await Promise.all([
          landsAPI.getDashboardSummary(),
          landsAPI.getDashboardProjects()
        ]);
        setSummaryData(summaryResponse);
        setProjects(projectsResponse);
      } catch (refreshErr) {
        console.error('Error refreshing projects after submission:', refreshErr);
        // Fallback: Update project status locally
        setProjects(prev => prev.map(p => 
          p.land_id === project.land_id 
            ? { ...p, status: 'under_review', updated_at: new Date().toISOString(), description: 'Admin reviewing - sections assigned to reviewers' }
            : p
        ));
      }
      
    } catch (err) {
      console.error('Error submitting project for review:', err);
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'error',
          title: 'Submission Failed',
          message: err.response?.data?.detail || 'Failed to submit project for review. Please try again.',
          timestamp: new Date(),
        }
      ]);
    }
  };

  const handleDeleteProject = (project) => {
    setProjectToDelete(project);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      // Call API to delete land
      await landsAPI.deleteLand(projectToDelete.land_id);
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'success',
          title: 'Draft Deleted',
          message: `${projectToDelete?.title} has been deleted from server successfully.`,
          timestamp: new Date(),
        }
      ]);
      
      // Remove project from local state
      setProjects(prev => prev.filter(p => p.land_id !== projectToDelete.land_id));
      
      // Close confirmation dialog
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
      
    } catch (err) {
      console.error('Error deleting project from server:', err);
      
      // Remove from local state anyway (local deletion)
      setProjects(prev => prev.filter(p => p.land_id !== projectToDelete.land_id));
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'warning',
          title: 'Deleted Locally',
          message: `${projectToDelete?.title} was removed from your view. Server deletion failed: ${err.response?.data?.detail || 'Connection error'}. The draft may still exist on the server.`,
          timestamp: new Date(),
        }
      ]);
      
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProjectToDelete(null);
  };

  const handleActionComplete = (action) => {
    switch (action) {
      case 'save-draft':
        // Handle save draft action
        console.log('Saving draft...');
        break;
      default:
        break;
    }
  };

  const hasActiveFilters = filters?.search || 
    filters?.projectType !== 'all' || 
    filters?.status !== 'all' || 
    filters?.timeline !== 'all';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          userRole="landowner" 
          notifications={{
            dashboard: 0,
            projects: 0
          }} 
        />
        <div className="pt-16">
          <WorkflowBreadcrumbs />
          <main className="pb-20">
            <div className="max-w-9xl mx-auto px-4 lg:px-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole="landowner" 
        notifications={{
          dashboard: notifications?.length,
          projects: 2
        }} 
      />
      <div className="pt-16">
        
        <main className="pb-20">
          <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          )}
          
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground mb-2 mt-2">
                Landowner Dashboard
              </h1>
              <p className="text-muted-foreground font-body">
                Upload land details, save as drafts, and submit for admin review
              </p>
              <div className="mt-2 flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="Info" size={14} />
                <span>Drafts are visible to admins in view-only mode until submitted</span>
              </div>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <Button
                variant="default"
                size="lg"
                onClick={() => navigate('/document-upload')}
                iconName="Plus"
                iconPosition="left"
              >
                New Land Details
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <ProjectSummaryCards summaryData={summaryData} />

          {/* Filters */}
          <ProjectFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
          />

          {/* Projects Table or Empty State */}
          {filteredProjects?.length > 0 ? (
            <ProjectTable
              projects={filteredProjects}
              onEdit={handleEditProject}
              onView={handleViewProject}
              onViewInterest={handleViewInterest}
              onViewDocuments={handleViewDocuments}
              onContinueDraft={handleContinueDraft}
              onSubmitForReview={handleSubmitForReview}
              onDelete={handleDeleteProject}
            />
          ) : (
            <EmptyState
              hasFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
            />
          )}
        </div>
      </main>
      </div>
      {/* Notifications */}
      <NotificationIndicator
        notifications={notifications}
        position="top-right"
        maxVisible={3}
        autoHide={true}
        hideDelay={8000}
      />
      {/* Quick Actions */}
      <QuickActions
        userRole="landowner"
        currentContext="dashboard"
        onActionComplete={handleActionComplete}
        position="bottom-right"
      />

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            setSelectedProjectInitialTab('details');
          }}
          initialTab={selectedProjectInitialTab}
        />
      )}

      {/* Documents Modal */}
      {selectedProjectForDocuments && (
        <DocumentsModal
          project={selectedProjectForDocuments}
          onClose={() => setSelectedProjectForDocuments(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Icon name="AlertTriangle" size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    Delete Draft Project
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Remove from your dashboard
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 mb-2">
                  Are you sure you want to delete <strong>"{projectToDelete?.title}"</strong>?
                </p>
                <p className="text-xs text-red-700">
                  This will attempt to remove the project from the server. If the server deletion fails, 
                  it will be removed from your view only.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={cancelDelete}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  fullWidth
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  iconName="Trash2"
                  iconPosition="left"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandownerDashboard;