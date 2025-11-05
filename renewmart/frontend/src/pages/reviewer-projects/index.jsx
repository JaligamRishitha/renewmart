import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../../components/AppIcon';
import Header from '../../components/ui/Header';
import { taskAPI, documentsAPI, landsAPI } from '../../services/api';
import ProjectCard from '../reviewer-dashboard/ProjectCard';

// Default role-specific document types (fallback)
const DEFAULT_ROLE_DOCUMENTS = {
  're_sales_advisor': [
    'land-valuation',
    'sale-contracts',
    'topographical-surveys',
    'grid-connectivity'
  ],
  're_analyst': [
    'financial-models'
  ],
  're_governance_lead': [
    'land-valuation',
    'ownership-documents',
    'zoning-approvals',
    'environmental-impact',
    'government-nocs'
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

const ReviewerProjects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Store project-specific mappings: { land_id: { role_key: [docTypes] } }
  const [projectMappings, setProjectMappings] = useState({});

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
      fetchProjectsData();
    }
  }, [reviewerRole]);

  const fetchProjectsData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching tasks assigned to reviewer...');
      // Fetch tasks assigned to me (same as reviewer dashboard)
      const tasksResponse = await taskAPI.getTasksAssignedToMe();
      console.log('📦 Tasks Response:', tasksResponse);

      // Group tasks by project (land)
      const projectMap = new Map();
      const landIds = new Set();

      // First pass: collect all land IDs
      for (const task of tasksResponse || []) {
        if (task.land_id) {
          landIds.add(task.land_id);
        }
      }

      // Fetch all project mappings in parallel
      const mappingsCache = {};
      await Promise.all(
        Array.from(landIds).map(async (landId) => {
          try {
            const mappings = await landsAPI.getProjectDocumentRoleMappings(landId);
            // Convert from {docType: [roleKeys]} to {roleKey: [docTypes]}
            // ALWAYS use project_mappings if it exists, never fall back to default_mappings
            const roleToDocTypes = {};
            if (mappings.project_mappings && Object.keys(mappings.project_mappings).length > 0) {
              // Use project_mappings (prioritize over default_mappings)
              Object.keys(mappings.project_mappings).forEach(docType => {
                mappings.project_mappings[docType].forEach(roleKey => {
                  if (!roleToDocTypes[roleKey]) {
                    roleToDocTypes[roleKey] = [];
                  }
                  roleToDocTypes[roleKey].push(docType);
                });
              });
              console.log(`[ReviewerProjects] Using project_mappings for land ${landId} (not default_mappings)`);
            } else {
              // Only use defaults if project_mappings doesn't exist or is empty
              console.log(`[ReviewerProjects] No project_mappings found for land ${landId}, using default_mappings`);
              // Convert default_mappings if available
              if (mappings.default_mappings) {
                Object.keys(mappings.default_mappings).forEach(docType => {
                  mappings.default_mappings[docType].forEach(roleKey => {
                    if (!roleToDocTypes[roleKey]) {
                      roleToDocTypes[roleKey] = [];
                    }
                    roleToDocTypes[roleKey].push(docType);
                  });
                });
              }
            }
            mappingsCache[landId] = Object.keys(roleToDocTypes).length > 0 ? roleToDocTypes : {};
            // Also update state for future use
            setProjectMappings(prev => ({
              ...prev,
              [landId]: roleToDocTypes
            }));
          } catch (err) {
            console.error(`Failed to fetch project mappings for land ${landId}:`, err);
            mappingsCache[landId] = {}; // Use defaults
            setProjectMappings(prev => ({
              ...prev,
              [landId]: {}
            }));
          }
        })
      );

      // Second pass: process tasks and documents
      for (const task of tasksResponse || []) {
        if (task.land_id) {
          if (!projectMap.has(task.land_id)) {
            projectMap.set(task.land_id, {
              land_id: task.land_id,
              title: task.land_title || 'Untitled Project',
              location: task.land_location || 'Location not specified',
              status: task.land_status || 'pending',
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
            // Use project mappings if available, otherwise use defaults
            const currentMapping = mappingsCache[task.land_id] || {};
            const allowedTypes = currentMapping[reviewerRole] || DEFAULT_ROLE_DOCUMENTS[reviewerRole] || [];
            
            const filteredDocs = (docsResponse || []).filter(doc => 
              allowedTypes.includes(doc.document_type)
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
        }
      }

      const projectsArray = Array.from(projectMap.values());
      console.log('📊 Projects organized:', projectsArray);
      setProjects(projectsArray);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (project) => {
    navigate(`/reviewer/dashboard/project/${project.land_id}`, { state: { project } });
  };

  if (!reviewerRole) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading projects...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 p-6">
          <div className="max-w-4xl mx-auto text-center">
            <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchProjectsData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Projects Header */}
      <div className="pt-16">
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {ROLE_TITLES[reviewerRole]} Projects
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Projects Grid - Rectangle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Icon name="FolderOpen" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Found</h3>
              <p className="text-muted-foreground">
                No projects are currently assigned to your role.
              </p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.land_id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleViewProject(project)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {project.location}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'published' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <Icon name="ChevronRight" size={20} className="text-muted-foreground flex-shrink-0" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">{project.stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{project.stats.in_progress}</div>
                    <div className="text-xs text-muted-foreground">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{project.stats.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                </div>

                {/* Documents Count */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Icon name="FileText" size={16} />
                    {project.documents.length} documents
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="Users" size={16} />
                    {project.tasks.length} tasks
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewerProjects;
