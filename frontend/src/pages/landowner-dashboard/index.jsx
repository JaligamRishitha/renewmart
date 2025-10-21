import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
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
    activeProjects: 0,
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
    let filtered = [...projects];

    // Apply search filter
    if (filters?.search) {
      filtered = filtered?.filter(project =>
        project?.name?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        project?.location?.toLowerCase()?.includes(filters?.search?.toLowerCase()) ||
        project?.id?.toLowerCase()?.includes(filters?.search?.toLowerCase())
      );
    }

    // Apply project type filter
    if (filters?.projectType !== 'all') {
      filtered = filtered?.filter(project => project?.type === filters?.projectType);
    }

    // Apply status filter
    if (filters?.status !== 'all') {
      filtered = filtered?.filter(project => project?.status === filters?.status);
    }

    // Apply timeline filter
    if (filters?.timeline !== 'all') {
      filtered = filtered?.filter(project => project?.timeline === filters?.timeline);
    }

    // Apply sorting
    filtered?.sort((a, b) => {
      switch (filters?.sortBy) {
        case 'name':
          return a?.name?.localeCompare(b?.name);
        case 'location':
          return a?.location?.localeCompare(b?.location);
        case 'capacity':
          return b?.capacity - a?.capacity;
        case 'updated':
        default:
          return new Date(b.lastUpdated) - new Date(a.lastUpdated);
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

  const handleEditProject = (project) => {
    navigate('/document-upload', { state: { projectId: project?.id, mode: 'edit' } });
  };

  const handleViewProject = (project) => {
    setSelectedProject(project);
  };

  const handleViewDocuments = (project) => {
    setSelectedProjectForDocuments(project);
  };

  const handleContinueDraft = (project) => {
    navigate('/document-upload', { state: { projectId: project?.id, mode: 'continue' } });
  };

  const handleSubmitForReview = async (project) => {
    try {
      // Call API to submit for admin review
      await landsAPI.submitForReview(project.id);
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'success',
          title: 'Submitted for Review',
          message: `${project?.name} has been submitted for admin review. You'll be notified once reviewed.`,
          timestamp: new Date(),
        }
      ]);
      
      // Update project status locally
      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, status: 'submitted', lastUpdated: new Date().toISOString(), description: 'Submitted - Awaiting admin review' }
          : p
      ));
      
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
      await landsAPI.deleteLand(projectToDelete.id);
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'success',
          title: 'Draft Deleted',
          message: `${projectToDelete?.name} has been deleted from server successfully.`,
          timestamp: new Date(),
        }
      ]);
      
      // Remove project from local state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      
      // Close confirmation dialog
      setShowDeleteConfirm(false);
      setProjectToDelete(null);
      
    } catch (err) {
      console.error('Error deleting project from server:', err);
      
      // Remove from local state anyway (local deletion)
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      
      setNotifications(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'warning',
          title: 'Deleted Locally',
          message: `${projectToDelete?.name} was removed from your view. Server deletion failed: ${err.response?.data?.detail || 'Connection error'}. The draft may still exist on the server.`,
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
        <WorkflowBreadcrumbs />
        <main className="pt-4 pb-20">
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
      <WorkflowBreadcrumbs />
      <main className="pt-4 pb-20">
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
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
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
                Upload Land Details
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
          onClose={() => setSelectedProject(null)}
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
                  Are you sure you want to delete <strong>"{projectToDelete?.name}"</strong>?
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
    </div>
  );
};

export default LandownerDashboard;