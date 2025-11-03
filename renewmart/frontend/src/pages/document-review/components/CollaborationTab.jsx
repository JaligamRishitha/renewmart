import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { usersAPI, taskAPI } from '../../../services/api';

const CollaborationTab = ({ 
  currentTask, 
  subtasks = [], 
  currentUser,
  onSubtaskAssignment = () => {}
}) => {
  const [collaborators, setCollaborators] = useState([]);
  const [availableReviewers, setAvailableReviewers] = useState([]);
  const [selectedSubtask, setSelectedSubtask] = useState(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Fetch available reviewers to add as collaborators
  useEffect(() => {
    const fetchReviewers = async () => {
      if (!currentTask?.land_id) return;
      
      setLoadingReviewers(true);
      try {
        // Fetch all reviewers (RE Sales Advisor, RE Analyst, RE Governance Lead)
        const reviewerRoles = ['re_sales_advisor', 're_analyst', 're_governance_lead'];
        const allReviewers = [];
        
        for (const role of reviewerRoles) {
          try {
            const reviewers = await usersAPI.getUsers({ role, is_active: true });
            allReviewers.push(...reviewers);
          } catch (err) {
            console.error(`Error fetching ${role}:`, err);
          }
        }
        
        // Filter out current user and format for Select component
        const filtered = allReviewers
          .filter(reviewer => reviewer.user_id !== currentUser?.user_id)
          .map(reviewer => ({
            value: reviewer.user_id,
            label: `${reviewer.first_name} ${reviewer.last_name} (${reviewer.email})`,
            email: reviewer.email,
            name: `${reviewer.first_name} ${reviewer.last_name}`
          }));
        
        setAvailableReviewers(filtered);
      } catch (err) {
        console.error('Error fetching reviewers:', err);
      } finally {
        setLoadingReviewers(false);
      }
    };
    
    fetchReviewers();
  }, [currentTask?.land_id, currentUser?.user_id]);

  // Extract collaborators from subtasks (subtasks with assigned_to different from task assigned_to)
  useEffect(() => {
    if (!subtasks || subtasks.length === 0) {
      setCollaborators([]);
      return;
    }
    
    const collaboratorMap = new Map();
    
    subtasks.forEach(subtask => {
      if (subtask.assigned_to && 
          subtask.assigned_to !== currentTask?.assigned_to && 
          subtask.assigned_to !== currentUser?.user_id) {
        
        if (!collaboratorMap.has(subtask.assigned_to)) {
          collaboratorMap.set(subtask.assigned_to, {
            user_id: subtask.assigned_to,
            assigned_subtasks: []
          });
        }
        
        collaboratorMap.get(subtask.assigned_to).assigned_subtasks.push({
          subtask_id: subtask.subtask_id,
          title: subtask.title,
          description: subtask.description,
          status: subtask.status
        });
      }
    });
    
    // Fetch user details for each collaborator
    const fetchCollaboratorDetails = async () => {
      const collaboratorList = Array.from(collaboratorMap.values());
      
      for (const collab of collaboratorList) {
        try {
          const user = await usersAPI.getUserById(collab.user_id);
          collab.name = `${user.first_name} ${user.last_name}`;
          collab.email = user.email;
        } catch (err) {
          console.error(`Error fetching user ${collab.user_id}:`, err);
          collab.name = 'Unknown User';
          collab.email = '';
        }
      }
      
      setCollaborators(collaboratorList);
    };
    
    fetchCollaboratorDetails();
  }, [subtasks, currentTask?.assigned_to, currentUser?.user_id]);

  const handleAssignSubtask = async () => {
    if (!selectedSubtask || !selectedCollaborator) {
      return;
    }
    
    setAssigning(true);
    try {
      await taskAPI.updateSubtask(currentTask.task_id, selectedSubtask, {
        assigned_to: selectedCollaborator
      });
      
      // Refresh subtasks
      if (onSubtaskAssignment) {
        await onSubtaskAssignment();
      }
      
      // Reset selection
      setSelectedSubtask(null);
      setSelectedCollaborator('');
      
      alert('Subtask assigned successfully!');
    } catch (err) {
      console.error('Error assigning subtask:', err);
      alert('Failed to assign subtask. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (subtaskId) => {
    if (!confirm('Remove assignment from this collaborator?')) {
      return;
    }
    
    setAssigning(true);
    try {
      await taskAPI.updateSubtask(currentTask.task_id, subtaskId, {
        assigned_to: null
      });
      
      // Refresh subtasks
      if (onSubtaskAssignment) {
        await onSubtaskAssignment();
      }
      
      alert('Assignment removed successfully!');
    } catch (err) {
      console.error('Error removing assignment:', err);
      alert('Failed to remove assignment. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  if (!currentTask) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon name="Users" size={48} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No task selected</p>
        </div>
      </div>
    );
  }

  const unassignedSubtasks = subtasks.filter(s => !s.assigned_to || s.assigned_to === currentTask?.assigned_to);

  return (
    <div className="p-4 h-full overflow-y-auto space-y-6">
      {/* Assign Subtask Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Icon name="UserPlus" size={20} className="text-primary" />
          Assign Subtask to Collaborator
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Subtask
            </label>
            <Select
              options={[
                { value: '', label: 'Choose a subtask...' },
                ...unassignedSubtasks.map(subtask => ({
                  value: subtask.subtask_id,
                  label: `${subtask.title}${subtask.status !== 'completed' ? '' : ' (Completed)'}`
                }))
              ]}
              value={selectedSubtask || ''}
              onChange={(value) => setSelectedSubtask(value)}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Collaborator
            </label>
            {loadingReviewers ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="Loader2" size={16} className="animate-spin" />
                <span>Loading reviewers...</span>
              </div>
            ) : (
              <Select
                options={[
                  { value: '', label: 'Choose a collaborator...' },
                  ...availableReviewers.map(reviewer => ({
                    value: reviewer.value,
                    label: reviewer.label
                  }))
                ]}
                value={selectedCollaborator}
                onChange={(value) => setSelectedCollaborator(value)}
                className="w-full"
              />
            )}
          </div>
          
          <Button
            onClick={handleAssignSubtask}
            disabled={!selectedSubtask || !selectedCollaborator || assigning}
            className="w-full"
            loading={assigning}
          >
            <Icon name="Send" size={16} />
            Assign Subtask
          </Button>
        </div>
      </div>

      {/* Active Collaborators Section */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Icon name="Users" size={20} className="text-primary" />
          Active Collaborators ({collaborators.length})
        </h3>
        
        {collaborators.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="UserX" size={48} className="text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No collaborators assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assign subtasks to other reviewers to add them as collaborators
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {collaborators.map((collab) => (
              <div key={collab.user_id} className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon name="User" size={20} className="text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{collab.name}</h4>
                      <p className="text-xs text-muted-foreground">{collab.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Assigned Subtasks ({collab.assigned_subtasks.length})
                  </p>
                  <div className="space-y-2">
                    {collab.assigned_subtasks.map((subtask) => (
                      <div key={subtask.subtask_id} className="flex items-center justify-between bg-background rounded p-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{subtask.title}</p>
                          {subtask.description && (
                            <p className="text-xs text-muted-foreground mt-1">{subtask.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            subtask.status === 'completed' 
                              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                              : subtask.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                          }`}>
                            {subtask.status?.toUpperCase() || 'PENDING'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAssignment(subtask.subtask_id)}
                            disabled={assigning}
                            className="text-error hover:text-error"
                          >
                            <Icon name="X" size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Subtasks Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Icon name="ListChecks" size={20} className="text-primary" />
          Subtask Summary
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{subtasks.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{unassignedSubtasks.length}</p>
            <p className="text-xs text-muted-foreground">Unassigned</p>
          </div>
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <p className="text-2xl font-semibold text-foreground">{collaborators.length}</p>
            <p className="text-xs text-muted-foreground">Collaborators</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaborationTab;

