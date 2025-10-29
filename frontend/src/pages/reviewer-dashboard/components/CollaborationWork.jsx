import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { taskAPI, landsAPI } from '../../../services/api';

const CollaborationWork = () => {
  const navigate = useNavigate();
  const [assignedSubtasks, setAssignedSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState({});
  
  useEffect(() => {
    fetchAssignedSubtasks();
  }, []);

  const fetchAssignedSubtasks = async () => {
    try {
      setLoading(true);
      const subtasks = await taskAPI.getAssignedSubtasks();
      setAssignedSubtasks(subtasks || []);
      
      // Fetch project/land details for each unique land_id
      const landIds = [...new Set(subtasks.map(s => s.land_id).filter(Boolean))];
      const projectMap = {};
      
      for (const landId of landIds) {
        try {
          const land = await landsAPI.getLandById(landId);
          projectMap[landId] = {
            title: land.title,
            location: land.location_text
          };
        } catch (err) {
          console.error(`Error fetching land ${landId}:`, err);
          projectMap[landId] = { title: 'Unknown Project', location: '' };
        }
      }
      
      setProjects(projectMap);
    } catch (err) {
      console.error('Error fetching assigned subtasks:', err);
      setAssignedSubtasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId, subtaskId, newStatus) => {
    try {
      await taskAPI.updateSubtask(taskId, subtaskId, { status: newStatus });
      await fetchAssignedSubtasks();
    } catch (err) {
      console.error('Error updating subtask status:', err);
      alert('Failed to update status');
    }
  };

  const handleViewTask = (taskId, landId) => {
    navigate(`/document-review/${landId}`, {
      state: { taskId, landId }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'pending':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={32} className="animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading collaboration work...</span>
      </div>
    );
  }

  if (assignedSubtasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Icon name="CheckCircle2" size={64} className="text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Collaboration Work</h3>
        <p className="text-muted-foreground">
          You don't have any subtasks assigned to you from other reviewers yet.
        </p>
      </div>
    );
  }

  // Group subtasks by project/land
  const groupedByProject = assignedSubtasks.reduce((acc, subtask) => {
    const landId = subtask.land_id || subtask.task?.land_id;
    if (!landId) return acc;
    
    if (!acc[landId]) {
      acc[landId] = {
        project: projects[landId] || { title: 'Unknown Project', location: '' },
        subtasks: []
      };
    }
    
    acc[landId].subtasks.push(subtask);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Collaboration Work</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Subtasks assigned to you by other reviewers
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAssignedSubtasks}
        >
          <Icon name="RefreshCw" size={16} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedByProject).map(([landId, group]) => (
          <div key={landId} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {group.project.title}
                </h3>
                {group.project.location && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Icon name="MapPin" size={14} className="inline mr-1" />
                    {group.project.location}
                  </p>
                )}
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {group.subtasks.length} {group.subtasks.length === 1 ? 'Subtask' : 'Subtasks'}
              </span>
            </div>

            <div className="space-y-3">
              {group.subtasks.map((subtask) => (
                <div
                  key={subtask.subtask_id}
                  className="bg-muted/50 border border-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">
                        {subtask.title}
                      </h4>
                      {subtask.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {subtask.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Icon name="User" size={12} />
                          Assigned by: {subtask.creator?.first_name && subtask.creator?.last_name 
                            ? `${subtask.creator.first_name} ${subtask.creator.last_name}`
                            : subtask.created_by_name || 'Unknown'}
                        </span>
                        {subtask.task?.task_type && (
                          <span className="flex items-center gap-1">
                            <Icon name="Briefcase" size={12} />
                            Task: {subtask.task.task_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(subtask.status)}`}>
                      {subtask.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTask(subtask.task_id, landId)}
                      >
                        <Icon name="ExternalLink" size={14} />
                        View Task
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {subtask.status !== 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateStatus(subtask.task_id, subtask.subtask_id, 'pending')}
                        >
                          Mark Pending
                        </Button>
                      )}
                      {subtask.status !== 'in_progress' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateStatus(subtask.task_id, subtask.subtask_id, 'in_progress')}
                        >
                          Start Work
                        </Button>
                      )}
                      {subtask.status !== 'completed' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateStatus(subtask.task_id, subtask.subtask_id, 'completed')}
                        >
                          <Icon name="Check" size={14} />
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollaborationWork;

