import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';
import WorkflowBreadcrumbs from '../../components/ui/WorkflowBreadcrumbs';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import ProjectTable from '../landowner-dashboard/components/ProjectTable';
import LandownerReviewPanel from './components/LandownerReviewPanel';
import { landsAPI, taskAPI, usersAPI } from '../../services/api';

const LandownerProjectStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [location.state?.projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all landowner projects
      const projectsResponse = await landsAPI.getDashboardProjects();
      setProjects(projectsResponse || []);

      // If a specific project is selected, fetch its tasks
      const projectId = location.state?.projectId;
      if (projectId) {
        const project = projectsResponse.find(p => p.id === projectId);
        setSelectedProject(project);
        await fetchProjectTasks(projectId);
      } else if (projectsResponse && projectsResponse.length > 0) {
        // Select first project by default
        const firstProject = projectsResponse[0];
        setSelectedProject(firstProject);
        await fetchProjectTasks(firstProject.id);
      }
    } catch (err) {
      console.error('[Landowner Project Status] Error fetching data:', err);
      setError('Failed to load project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (landId) => {
    try {
      console.log('[Landowner Project Status] Fetching tasks for land:', landId);
      
      // Fetch all tasks for this land
      const tasksResponse = await taskAPI.getTasks({ land_id: landId });
      console.log('[Landowner Project Status] Tasks:', tasksResponse);

      // Enrich tasks with reviewer details and subtasks
      const enrichedTasks = await Promise.all(
        (tasksResponse || []).map(async (task) => {
          let reviewerName = 'Unassigned';
          
          // Fetch reviewer details if assigned
          if (task.assigned_to) {
            try {
              const reviewer = await usersAPI.getUserById(task.assigned_to);
              reviewerName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || reviewer.email;
            } catch (err) {
              console.error('Failed to fetch reviewer:', err);
            }
          }

          // Fetch subtasks
          let subtasks = [];
          try {
            subtasks = await taskAPI.getSubtasks(task.task_id);
          } catch (err) {
            console.error('Failed to fetch subtasks:', err);
          }

          return {
            ...task,
            reviewer_name: reviewerName,
            subtasks: subtasks || []
          };
        })
      );

      setTasks(enrichedTasks);
    } catch (err) {
      console.error('[Landowner Project Status] Error fetching tasks:', err);
      setTasks([]);
    }
  };

  const handleProjectSelect = async (project) => {
    setSelectedProject(project);
    await fetchProjectTasks(project.id);
  };

  const handleEditProject = (project) => {
    navigate('/document-upload', { state: { projectId: project?.id, mode: 'edit' } });
  };

  const handleViewProject = (project) => {
    handleProjectSelect(project);
  };

  const handleContinueDraft = (project) => {
    navigate('/document-upload', { state: { projectId: project?.id, mode: 'continue' } });
  };

  const handleSubmitForReview = async (project) => {
    try {
      await landsAPI.submitForReview(project.id);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Error submitting project:', err);
      setError('Failed to submit project for review.');
    }
  };

  const handleDeleteProject = async (project) => {
    try {
      await landsAPI.deleteLand(project.id);
      // Refresh data
      await fetchData();
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
        <div className="max-w-9xl mx-auto px-4 lg:px-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/landowner-dashboard')}
                  iconName="ArrowLeft"
                  iconSize={16}
                >
                  Back to Dashboard
                </Button>
              </div>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
                Project Status & Verification
              </h1>
              <p className="text-muted-foreground font-body">
                Track your land verification progress and review status
              </p>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Main Layout: 60% Projects Table + 40% Review Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Left Section: Project Table (60%) */}
            <div className="xl:col-span-3 space-y-6">
              <div className="bg-card border border-border rounded-lg shadow-elevation-1 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-heading font-semibold text-xl text-foreground">
                      Your Projects
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {projects.length} {projects.length === 1 ? 'project' : 'projects'} submitted
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate('/document-upload')}
                    iconName="Plus"
                    iconPosition="left"
                  >
                    New Project
                  </Button>
                </div>

                {projects.length > 0 ? (
                  <ProjectTable
                    projects={projects}
                    onEdit={handleEditProject}
                    onView={handleViewProject}
                    onContinueDraft={handleContinueDraft}
                    onSubmitForReview={handleSubmitForReview}
                    onDelete={handleDeleteProject}
                  />
                ) : (
                  <div className="py-12 text-center">
                    <Icon name="FolderOpen" size={64} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">No Projects Yet</p>
                    <p className="text-sm text-muted-foreground mb-6">
                      Start by uploading your first land details
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

              {/* Selected Project Info */}
              {selectedProject && (
                <div className="bg-card border border-border rounded-lg shadow-elevation-1 p-6">
                  <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
                    Project Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Project Name</p>
                      <p className="text-base font-medium text-foreground mt-1">
                        {selectedProject.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="text-base font-medium text-foreground mt-1">
                        {selectedProject.location}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Project Type</p>
                      <p className="text-base font-medium text-foreground mt-1 capitalize">
                        {selectedProject.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="text-base font-medium text-foreground mt-1">
                        {selectedProject.capacity} MW
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Project ID</p>
                        <p className="text-sm font-mono text-foreground mt-1">
                          {selectedProject.id}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProject(selectedProject)}
                          iconName="Edit"
                          iconPosition="left"
                        >
                          Edit Project
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section: Review Panel (40%) */}
            <div className="xl:col-span-2">
              <div className="xl:sticky xl:top-6">
                <LandownerReviewPanel 
                  tasks={tasks} 
                  projectData={selectedProject}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandownerProjectStatus;

