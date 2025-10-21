import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import { taskAPI, documentsAPI } from '../../services/api';
import ProjectCard from './ProjectCard';

// Role-specific document types from Workflow.txt
const ROLE_DOCUMENTS = {
  're_sales_advisor': [
    'land-valuation',
    'ownership-documents',
    'sale-contract',
    'land_valuation',
    'ownership_documents',
    'sale_contract'
  ],
  're_analyst': [
    'topographical-survey',
    'grid-connectivity',
    'financial-model',
    'topographical_survey',
    'grid_connectivity',
    'financial_model'
  ],
  're_governance_lead': [
    'zoning-approval',
    'environmental-assessment',
    'government-noc',
    'zoning_approval',
    'environmental_assessment',
    'government_noc'
  ]
};

const ROLE_TITLES = {
  're_sales_advisor': 'RE Sales Advisor',
  're_analyst': 'RE Analyst',
  're_governance_lead': 'RE Governance Lead'
};

const ROLE_DESCRIPTIONS = {
  're_sales_advisor': 'Market evaluation and investor alignment',
  're_analyst': 'Technical and financial feasibility analysis',
  're_governance_lead': 'Compliance, regulatory, and local authority validation'
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'delayed', label: 'Delayed', color: 'orange' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' }
];

const ReviewerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get user's reviewer role
  const reviewerRole = user?.roles?.find(role => 
    ['re_sales_advisor', 're_analyst', 're_governance_lead'].includes(role)
  );

  console.log('👤 Current User:', user);
  console.log('🎭 User Roles:', user?.roles);
  console.log('✅ Reviewer Role:', reviewerRole);

  useEffect(() => {
    console.log('🔄 useEffect triggered, reviewerRole:', reviewerRole);
    if (reviewerRole) {
      fetchDashboardData();
    }
  }, [reviewerRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks assigned to me
      console.log('🔍 Fetching tasks assigned to reviewer...');
      const tasksResponse = await taskAPI.getTasksAssignedToMe();
      console.log('📦 Tasks Response:', tasksResponse);

      // Group tasks by project (land)
      const projectMap = new Map();

      for (const task of tasksResponse || []) {
        if (task.land_id) {
          if (!projectMap.has(task.land_id)) {
            projectMap.set(task.land_id, {
              land_id: task.land_id,
              title: task.land_title || 'Untitled Project',
              tasks: [],
              documents: [],
              stats: {
                total: 0,
                pending: 0,
                in_progress: 0,
                completed: 0
              }
            });
          }

          const project = projectMap.get(task.land_id);
          project.tasks.push(task);
          project.stats.total++;
          
          // Update stats
          if (task.status === 'pending') project.stats.pending++;
          else if (task.status === 'in_progress') project.stats.in_progress++;
          else if (task.status === 'completed') project.stats.completed++;

          // Fetch documents for this land (filtered by role)
          try {
            const docsResponse = await documentsAPI.getDocuments(task.land_id);
            const filteredDocs = (docsResponse || []).filter(doc => 
              ROLE_DOCUMENTS[reviewerRole]?.includes(doc.document_type?.toLowerCase())
            );
            
            // Avoid duplicates
            const existingDocIds = new Set(project.documents.map(d => d.document_id));
            filteredDocs.forEach(doc => {
              if (!existingDocIds.has(doc.document_id)) {
                project.documents.push({ ...doc, task_id: task.task_id });
              }
            });
          } catch (err) {
            console.error(`Failed to fetch documents for land ${task.land_id}:`, err);
          }

          // Fetch subtasks for this task
          try {
            const subtasks = await taskAPI.getSubtasks(task.task_id);
            task.subtasks = subtasks || [];
          } catch (err) {
            console.error(`Failed to fetch subtasks for task ${task.task_id}:`, err);
            task.subtasks = [];
          }
        }
      }

      const projectsArray = Array.from(projectMap.values());
      console.log('📊 Projects organized:', projectsArray);
      setProjects(projectsArray);

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (project) => {
    navigate(`/reviewer-dashboard/project/${project.land_id}`, { state: { project } });
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/login');
    }
  };

  if (!reviewerRole) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have reviewer permissions to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.stats.total, 0);
  const totalInProgress = projects.reduce((sum, p) => sum + p.stats.in_progress, 0);
  const totalCompleted = projects.reduce((sum, p) => sum + p.stats.completed, 0);
  const totalDocuments = projects.reduce((sum, p) => sum + p.documents.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {ROLE_TITLES[reviewerRole]} Dashboard
              </h1>
              <p className="text-muted-foreground">
                {ROLE_DESCRIPTIONS[reviewerRole]}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* User Info */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <Icon name="User" size={18} className="text-muted-foreground" />
                <span className="text-sm text-foreground font-medium">
                  {user?.first_name || user?.email?.split('@')[0]}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchDashboardData}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                title="Refresh Dashboard"
              >
                <Icon name="RefreshCw" size={18} />
                Refresh
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                title="Logout"
              >
                <Icon name="LogOut" size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="FolderOpen" size={24} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {projects.length}
            </div>
            <div className="text-sm text-muted-foreground">Assigned Projects</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="Clipboard" size={24} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalTasks}
            </div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="Clock" size={24} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalInProgress}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Icon name="FileText" size={24} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">
              {totalDocuments}
            </div>
            <div className="text-sm text-muted-foreground">Documents to Review</div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Icon name="Briefcase" size={28} />
            My Assigned Projects ({projects.length})
          </h2>

          {projects.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No projects assigned yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.land_id}
                  project={project}
                  onViewProject={handleViewProject}
                  reviewerRole={reviewerRole}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerDashboard;
