import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Footer from '../../components/ui/Footer';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { landsAPI } from '../../services/api';
import AdminProjectCard from './components/AdminProjectCard';
import DraftProjectModal from './components/DraftProjectModal';

const AdminProjects = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('submitted');
  const [submittedProjects, setSubmittedProjects] = useState([]);
  const [draftProjects, setDraftProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedDraftProject, setSelectedDraftProject] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, [activeTab]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch submitted projects (excludes drafts by default)
      const submitted = await landsAPI.getAdminProjects();
      setSubmittedProjects(submitted || []);

      // Fetch draft projects separately - get all lands with draft status from landowners
      try {
        const allLands = await landsAPI.getLands({ status: 'draft' });
        
        // Filter to only include projects from landowners (not other sources)
        // and ensure they have draft status
        const draftProjectsFromLandowners = (allLands || []).filter(project => {
          // Ensure it's a draft and has a landowner_id (comes from a landowner)
          return project.status === 'draft' && 
                 project.landowner_id && 
                 project.landowner_id !== null;
        });

        // Group by landowner_id and get only the most recently updated draft per landowner
        const draftsByLandowner = {};
        draftProjectsFromLandowners.forEach(project => {
          const landownerId = project.landowner_id;
          if (!draftsByLandowner[landownerId]) {
            draftsByLandowner[landownerId] = project;
          } else {
            // Compare updated_at dates to keep the most recent one
            const currentDate = new Date(project.updated_at || project.created_at || 0);
            const existingDate = new Date(draftsByLandowner[landownerId].updated_at || draftsByLandowner[landownerId].created_at || 0);
            if (currentDate > existingDate) {
              draftsByLandowner[landownerId] = project;
            }
          }
        });

        // Convert object to array of unique drafts (one per landowner)
        const uniqueDrafts = Object.values(draftsByLandowner);

        // Process draft projects to match the format expected by AdminProjectCard
        const processedDrafts = uniqueDrafts.map(project => ({
          id: project.land_id || project.id,
          land_id: project.land_id || project.id,
          title: project.title || project.name || 'Untitled Project',
          name: project.title || project.name || 'Untitled Project',
          location_text: project.location_text || project.location || 'Location not specified',
          location: project.location_text || project.location || 'Location not specified',
          energy_key: project.energy_key || project.energyType || project.type || '',
          energyType: project.energy_key || project.energyType || project.type || '',
          type: project.energy_key || project.energyType || project.type || '',
          capacity_mw: project.capacity_mw || project.capacity || null,
          capacity: project.capacity_mw || project.capacity || null,
          area_acres: project.area_acres || project.areaAcres || null,
          areaAcres: project.area_acres || project.areaAcres || null,
          land_type: project.land_type || project.landType || null,
          landType: project.land_type || project.landType || null,
          price_per_mwh: project.price_per_mwh || project.pricePerMWh || null,
          pricePerMWh: project.price_per_mwh || project.pricePerMWh || null,
          timeline_text: project.timeline_text || project.timeline || null,
          timeline: project.timeline_text || project.timeline || null,
          contract_term_years: project.contract_term_years || project.contractTerm || null,
          contractTerm: project.contract_term_years || project.contractTerm || null,
          developer_name: project.developer_name || project.developerName || project.partners || null,
          partners: project.developer_name || project.developerName || project.partners || null,
          description: project.description || project.admin_notes || null,
          admin_notes: project.description || project.admin_notes || null,
          status: 'draft',
          landowner_id: project.landowner_id,
          landownerName: project.landownerName || 
            `${project.first_name || ''} ${project.last_name || ''}`.trim() ||
            project.landowner_email ||
            'Unknown Owner',
          landowner_email: project.landowner_email,
          first_name: project.first_name,
          last_name: project.last_name,
          phone: project.phone || project.landownerPhone || null,
          address: project.address || null,
          created_at: project.created_at,
          updated_at: project.updated_at,
          has_site_image: project.has_site_image,
          image_url: project.image_url,
          image: project.image
        }));

        setDraftProjects(processedDrafts);
      } catch (draftErr) {
        console.error('[Admin Projects] Error fetching draft projects:', draftErr);
        // If getLands fails, try alternative approach
        try {
          // Try to get all lands without filter and filter on frontend
          const allLands = await landsAPI.getLands();
          const drafts = (allLands || []).filter(p => 
            p.status === 'draft' && p.landowner_id
          );
          
          // Group by landowner_id and get only the most recently updated draft per landowner
          const draftsByLandowner = {};
          drafts.forEach(project => {
            const landownerId = project.landowner_id;
            if (!draftsByLandowner[landownerId]) {
              draftsByLandowner[landownerId] = project;
            } else {
              // Compare updated_at dates to keep the most recent one
              const currentDate = new Date(project.updated_at || project.created_at || 0);
              const existingDate = new Date(draftsByLandowner[landownerId].updated_at || draftsByLandowner[landownerId].created_at || 0);
              if (currentDate > existingDate) {
                draftsByLandowner[landownerId] = project;
              }
            }
          });

          // Convert object to array of unique drafts (one per landowner)
          const uniqueDrafts = Object.values(draftsByLandowner);
          
          // Process as above
          const processedDrafts = uniqueDrafts.map(project => ({
            id: project.land_id || project.id,
            land_id: project.land_id || project.id,
            title: project.title || project.name || 'Untitled Project',
            name: project.title || project.name || 'Untitled Project',
            location_text: project.location_text || project.location || 'Location not specified',
            location: project.location_text || project.location || 'Location not specified',
            energy_key: project.energy_key || project.energyType || project.type || '',
            energyType: project.energy_key || project.energyType || project.type || '',
            type: project.energy_key || project.energyType || project.type || '',
            capacity_mw: project.capacity_mw || project.capacity || null,
            capacity: project.capacity_mw || project.capacity || null,
          area_acres: project.area_acres || project.areaAcres || null,
          areaAcres: project.area_acres || project.areaAcres || null,
          land_type: project.land_type || project.landType || null,
          landType: project.land_type || project.landType || null,
          status: 'draft',
          landowner_id: project.landowner_id,
            landownerName: project.landownerName || 
              `${project.first_name || ''} ${project.last_name || ''}`.trim() ||
              project.landowner_email ||
              'Unknown Owner',
            landowner_email: project.landowner_email,
            first_name: project.first_name,
            last_name: project.last_name,
            created_at: project.created_at,
            updated_at: project.updated_at,
            has_site_image: project.has_site_image,
            image_url: project.image_url,
            image: project.image
          }));
          
          setDraftProjects(processedDrafts);
        } catch (altErr) {
          console.error('[Admin Projects] Error with alternative draft fetch:', altErr);
          setDraftProjects([]);
        }
      }
    } catch (err) {
      console.error('[Admin Projects] Error fetching projects:', err);
      setError('Failed to load projects. Please try again.');
      setSubmittedProjects([]);
      setDraftProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProject = (project) => {
    if (project.status === 'draft' || activeTab === 'draft') {
      // Show draft details modal (no documents)
      setSelectedDraftProject(project);
      setShowDraftModal(true);
    } else {
      // Navigate to reviewers page for submitted projects
      navigate(`/admin/projects/${project.id || project.land_id}/reviewers`);
    }
  };

  const handleViewDetails = (project) => {
    // Show details modal (same as draft view - landowner info + project details, no documents)
    setSelectedDraftProject(project);
    setShowDraftModal(true);
  };

  const handlePublishProject = async (project) => {
    try {
      await landsAPI.updateLandVisibility(project.id || project.land_id, 'published');
      await fetchProjects();
    } catch (err) {
      console.error('[Admin Projects] Error publishing project:', err);
    }
  };

  const handleUnpublishProject = async (project) => {
    try {
      await landsAPI.updateLandVisibility(project.id || project.land_id, 'unpublished');
      await fetchProjects();
    } catch (err) {
      console.error('[Admin Projects] Error unpublishing project:', err);
    }
  };

  const currentProjects = activeTab === 'submitted' ? submittedProjects : draftProjects;

  return (
    <div className="min-h-screen bg-background">
      <Header userRole="admin" />
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      <main className={`pt-20 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="max-w-9xl mx-auto px-4 lg:px-6 py-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="font-heading font-bold text-2xl lg:text-3xl text-foreground mb-2">
              Projects
            </h1>
            <p className="text-muted-foreground">
              Manage and review all submitted projects and view draft projects
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-2 border-b border-border">
              <button
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'submitted'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('submitted')}
              >
                <div className="flex items-center space-x-2">
                  <Icon name="FileCheck" size={16} />
                  <span>Submitted Projects</span>
                  {submittedProjects.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === 'submitted'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {submittedProjects.length}
                    </span>
                  )}
                </div>
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'draft'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('draft')}
              >
                <div className="flex items-center space-x-2">
                  <Icon name="FileText" size={16} />
                  <span>Draft Projects</span>
                  {draftProjects.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === 'draft'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {draftProjects.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader" size={24} className="animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading projects...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-error/10 border border-error rounded-lg p-6 text-center">
              <Icon name="AlertCircle" size={48} className="mx-auto text-error mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="default" onClick={fetchProjects} iconName="RefreshCw">
                Retry
              </Button>
            </div>
          )}

          {/* Projects Grid */}
          {!loading && !error && (
            <>
              {currentProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentProjects.map((project) => (
                    <AdminProjectCard
                      key={project.id || project.land_id}
                      project={project}
                      isDraft={activeTab === 'draft'}
                      onView={handleViewProject}
                      onViewDetails={handleViewDetails}
                      onPublish={handlePublishProject}
                      onUnpublish={handleUnpublishProject}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <Icon
                    name="Inbox"
                    size={48}
                    className="mx-auto text-muted-foreground mb-4"
                  />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No {activeTab === 'submitted' ? 'Submitted' : 'Draft'} Projects
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'submitted'
                      ? 'No projects have been submitted yet.'
                      : 'No draft projects available.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />

      {/* Draft Project Details Modal */}
      {showDraftModal && selectedDraftProject && (
        <DraftProjectModal
          project={selectedDraftProject}
          onClose={() => {
            setShowDraftModal(false);
            setSelectedDraftProject(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminProjects;

