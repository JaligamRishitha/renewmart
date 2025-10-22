import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { landsAPI, taskAPI, usersAPI } from '../../services/api';

const LandownerProjectStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all landowner projects
      const projectsResponse = await landsAPI.getDashboardProjects();
      setProjects(projectsResponse || []);
    } catch (err) {
      console.error('[Landowner Project Status] Error fetching projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (project) => {
    // Navigate to project review page showing all reviewer roles
    navigate(`/landowner/project-review/${project.id}`, { 
      state: { project } 
    });
  };

  const handleEditProject = (project) => {
    navigate('/document-upload', { state: { projectId: project?.id, mode: 'edit' } });
  };

  const handleContinueDraft = (project) => {
    navigate('/document-upload', { state: { projectId: project?.id, mode: 'continue' } });
  };

  const handleSubmitForReview = async (project) => {
    try {
      await landsAPI.submitForReview(project.id);
      // Refresh data
      await fetchProjects();
    } catch (err) {
      console.error('Error submitting project:', err);
      setError('Failed to submit project for review.');
    }
  };

  const handleDeleteProject = async (project) => {
    try {
      await landsAPI.deleteLand(project.id);
      // Refresh data
      await fetchProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userRole="landowner" notifications={{ dashboard: 0, projects: 0 }} />
        <WorkflowBreadcrumbs />
        <main className="pt-4 pb-20">
          <div className="max-w-9xl mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading project status...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="landowner" notifications={{ dashboard: 0, projects: 0 }} />
      <WorkflowBreadcrumbs />
      
      <main className="pt-4 pb-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/landowner/dashboard')}
                  iconName="ArrowLeft"
                  iconSize={16}
                >
                  Back to Dashboard
                </Button>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                My Projects
              </h1>
              <p className="text-muted-foreground">
                View and manage your uploaded land projects
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => navigate('/document-upload')}
              iconName="Plus"
              iconPosition="left"
            >
              New Project
            </Button>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Projects Grid */}
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="bg-card border border-border rounded-lg shadow-elevation-1 overflow-hidden">
                  {/* Project Header */}
                  <div className="p-6 border-b border-border">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {project.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {project.location}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Icon name="MapPin" size={14} className="mr-1" />
                            {project.type}
                          </span>
                          <span className="flex items-center">
                            <Icon name="Zap" size={14} className="mr-1" />
                            {project.capacity} MW
                          </span>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        project.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                        project.status === 'approved' ? 'bg-green-100 text-green-800' :
                        project.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status?.replace('_', ' ') || 'Draft'}
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="p-6">
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Project ID</span>
                        <span className="font-mono text-foreground">{project.id}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-foreground">
                          {new Date(project.created_at || project.date_created).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleViewProject(project)}
                        iconName="Eye"
                        iconPosition="left"
                        className="w-full"
                      >
                        View Review Status
                      </Button>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProject(project)}
                          iconName="Edit"
                          className="flex-1"
                        >
                          Edit
                        </Button>
                        
                        {project.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleContinueDraft(project)}
                            iconName="Play"
                            className="flex-1"
                          >
                            Continue
                          </Button>
                        )}
                        
                        {project.status === 'draft' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSubmitForReview(project)}
                            iconName="Send"
                            className="flex-1"
                          >
                            Submit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Icon name="FolderOpen" size={64} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by uploading your first land project
              </p>
              <Button
                variant="default"
                onClick={() => navigate('/document-upload')}
                iconName="Plus"
                iconPosition="left"
              >
                Upload Land Details
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LandownerProjectStatus;

