import React, { useState, useEffect } from 'react';
import Icon from '../../components/AppIcon';
import { taskAPI } from '../../services/api';

const SubtaskManager = ({ taskId, initialSubtasks = [], onUpdate, taskTitle = '' }) => {
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [newSubtask, setNewSubtask] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const lastUpdateTimeRef = React.useRef(Date.now());

  useEffect(() => {
    setSubtasks(initialSubtasks);
  }, [initialSubtasks]);
  

  // Toast notification handler
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Group subtasks by section
  const groupedSubtasks = React.useMemo(() => {
    if (!subtasks || subtasks.length === 0) return [];

    const groups = {};
    subtasks.forEach(subtask => {
      // Parse section from description (format: "Section - Title")
      const descParts = subtask.description?.split(' - ') || [];
      const section = descParts[0] || 'General';
      
      if (!groups[section]) {
        groups[section] = {
          title: section,
          items: []
        };
      }
      groups[section].items.push(subtask);
    });

    return Object.values(groups);
  }, [subtasks]);

  const handleAddSubtask = async (sectionTitle) => {
    if (!newSubtask.title.trim()) {
      showToast('Please enter a subtask title', 'error');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Include section in description for proper categorization
      const description = sectionTitle 
        ? `${sectionTitle} - ${newSubtask.title}` 
        : (newSubtask.description || newSubtask.title);

      const subtaskData = {
        title: newSubtask.title,
        description: description,
        status: 'pending',
        order_index: subtasks.length
      };

      const created = await taskAPI.createSubtask(taskId, subtaskData);
      lastUpdateTimeRef.current = Date.now();
      setSubtasks(prevSubtasks => [...prevSubtasks, created]);
      setNewSubtask({ title: '', description: '' });
      setShowAddForm(false);
      setActiveSection(null);
      
      showToast('Subtask added successfully!', 'success');
      
      // Refresh parent after adding new subtask
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      console.error('Failed to create subtask:', err);
      showToast('Failed to create subtask. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubtask = async (subtaskId, updates) => {
    try {
      // Optimistically update UI first for smooth UX
      setSubtasks(prevSubtasks => prevSubtasks.map(s => 
        s.subtask_id === subtaskId 
          ? { ...s, ...updates, updated_at: new Date().toISOString() }
          : s
      ));

      // Then update backend
      const updated = await taskAPI.updateSubtask(taskId, subtaskId, updates);
      
      // Update with actual backend response using functional update
      setSubtasks(prevSubtasks => prevSubtasks.map(s => 
        s.subtask_id === subtaskId ? updated : s
      ));
      
      // Don't trigger full page refresh on every checkbox click - it causes blinking
      // Only refresh when explicitly needed (e.g., after submit)
      // if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update subtask:', err);
      showToast('Failed to update subtask. Please try again.', 'error');
      // Revert on error - refetch all subtasks
      try {
        const allSubtasks = await taskAPI.getSubtasks(taskId);
        setSubtasks(allSubtasks);
      } catch (refetchErr) {
        console.error('Failed to refetch subtasks:', refetchErr);
      }
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!confirm('Are you sure you want to delete this subtask?')) {
      return;
    }

    try {
      setLoading(true);
      await taskAPI.deleteSubtask(taskId, subtaskId);
      lastUpdateTimeRef.current = Date.now();
      setSubtasks(prevSubtasks => prevSubtasks.filter(s => s.subtask_id !== subtaskId));
      
      showToast('Subtask deleted successfully!', 'success');
      
      // Refresh parent after deletion
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      showToast('Failed to delete subtask. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubtaskStatus = async (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
    
    try {
      // Mark the time of this update to prevent parent from overwriting
      lastUpdateTimeRef.current = Date.now();
      
      // Only send status - backend will automatically handle completed_at
      await handleUpdateSubtask(subtask.subtask_id, { status: newStatus });
      
      // Automatically submit the status after toggling
      const result = await taskAPI.submitSubtasksStatus(taskId);
      showToast(`Status updated! ${result.completed_subtasks}/${result.total_subtasks} completed (${result.completion_percentage}%)`, 'success');
      
      // Don't trigger full page refresh - it causes blinking!
      // The optimistic update already shows the change immediately
      // Parent will see updates when modal is closed/reopened or page is refreshed
    } catch (error) {
      console.error('Error updating subtask status:', error);
      showToast('Failed to update subtask status. Please try again.', 'error');
    }
  };

  const completedCount = subtasks.filter(s => s.status === 'completed').length;
  const completionPercentage = subtasks.length > 0
    ? Math.round((completedCount / subtasks.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 transform ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white border-green-600' 
            : 'bg-red-500 text-white border-red-600'
        }`} style={{ animation: 'slideInRight 0.3s ease-out' }}>
          <Icon name={toast.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={20} />
          <span className="font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-2 hover:opacity-80 transition-opacity"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Header with Progress */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Icon name="List" size={20} className="text-primary" />
            Subtasks
          </h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completionPercentage}%</div>
            <div className="text-xs text-muted-foreground">
              {completedCount}/{subtasks.length} Complete
            </div>
          </div>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Add General Subtask Button (for items not in a specific section) */}
      {subtasks.length > 0 && !showAddForm && (
        <button
          onClick={() => {
            setShowAddForm(true);
            setActiveSection(null);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors border-2 border-dashed border-primary/30"
        >
          <Icon name="Plus" size={18} />
          Add General Subtask
        </button>
      )}

      {/* Add General Subtask Form */}
      {showAddForm && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">New General Subtask</h4>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={newSubtask.title}
                onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                placeholder="Enter subtask title..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubtask(null);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAddSubtask(null)}
                disabled={loading || !newSubtask.title.trim()}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Icon name="Check" size={16} />
                    Add Subtask
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewSubtask({ title: '', description: '' });
                  setError(null);
                }}
                disabled={loading}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtasks List - Grouped by Section */}
      <div className="space-y-4">
        {subtasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon name="ListX" size={48} className="mx-auto mb-2 opacity-50" />
            <p>No subtasks yet. Add one to get started!</p>
          </div>
        ) : (
          groupedSubtasks.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3 bg-muted/30 border border-border rounded-lg p-4">
              {/* Section Header with Add Button */}
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-foreground flex items-center space-x-2">
                  <Icon name="CheckSquare" size={18} className="text-primary" />
                  <span>{section.title}</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    ({section.items.filter(item => item.status === 'completed').length}/{section.items.length})
                  </span>
                </h4>
                
                {/* Add Subtask Button per Section */}
                <button
                  onClick={() => {
                    setActiveSection(section.title);
                    setShowAddForm(false);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title={`Add subtask to ${section.title}`}
                >
                  <Icon name="Plus" size={14} />
                  <span>Add</span>
                </button>
              </div>
              
              {/* Add Subtask Form - Show under specific section */}
              {activeSection === section.title && (
                <div className="bg-background border border-primary/30 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    placeholder={`Enter subtask for ${section.title}...`}
                    className="w-full p-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSubtask(section.title);
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAddSubtask(section.title)}
                      disabled={loading || !newSubtask.title.trim()}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 text-xs flex items-center justify-center gap-1"
                    >
                      <Icon name="Plus" size={14} />
                      Add to {section.title}
                    </button>
                    <button
                      onClick={() => {
                        setActiveSection(null);
                        setNewSubtask({ title: '', description: '' });
                      }}
                      className="px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              
              {/* Subtasks in this Section */}
              <div className="space-y-2">
                {section.items.map((subtask) => (
                  <div
                    key={subtask.subtask_id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary/50 transition-colors bg-background"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Tick Button */}
                      <button
                        onClick={() => toggleSubtaskStatus(subtask)}
                        disabled={loading}
                        className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                          subtask.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : 'border-border hover:border-primary'
                        }`}
                      >
                        {subtask.status === 'completed' && (
                          <Icon name="Check" size={20} className="text-white" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h5 className={`font-medium text-sm mb-1 ${
                          subtask.status === 'completed'
                            ? 'text-muted-foreground'
                            : 'text-foreground'
                        }`}>
                          {subtask.title}
                        </h5>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" size={12} />
                            {new Date(subtask.created_at).toLocaleDateString()}
                          </span>
                          {subtask.completed_at && (
                            <span className="flex items-center gap-1 text-green-500">
                              <Icon name="Check" size={12} />
                              {new Date(subtask.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge and Delete Button */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          subtask.status === 'completed'
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                            : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                        }`}
                      >
                        {subtask.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                      
                      <button
                        onClick={() => handleDeleteSubtask(subtask.subtask_id)}
                        disabled={loading}
                        className="flex-shrink-0 p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete subtask"
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SubtaskManager;

