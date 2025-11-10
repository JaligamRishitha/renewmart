import React from 'react';
import Icon from '../../components/AppIcon';

const ProjectCard = ({
  project,
  onViewProject,
  reviewerRole
}) => {
  // Calculate completion percentage based on subtasks if available (more accurate)
  // Otherwise fall back to task-level stats
  let completionPercentage = 0;
  
  if (project.stats.subtasks && project.stats.subtasks.total > 0) {
    // Use subtask-based calculation (more accurate)
    completionPercentage = Math.round(
      (project.stats.subtasks.completed / project.stats.subtasks.total) * 100
    );
  } else if (project.stats.total > 0) {
    // Fallback to task-based calculation
    completionPercentage = Math.round((project.stats.completed / project.stats.total) * 100);
  }
  
  // Ensure percentage is between 0 and 100
  completionPercentage = Math.max(0, Math.min(100, completionPercentage));

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
      {/* Project Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="Folder" size={24} className="text-primary" />
              <h3 className="text-xl font-semibold text-foreground">
                {project.title}
              </h3>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => onViewProject(project)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              title="View project details"
            >
              <Icon name="Eye" size={18} />
              View Details
            </button>
            <div className="text-2xl font-bold text-primary mt-2">
              {completionPercentage}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-background rounded-lg">
            <div className="text-2xl font-bold text-foreground">{project.stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Tasks</div>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <div className="text-2xl font-bold text-orange-500">{project.stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <div className="text-2xl font-bold text-blue-500">{project.stats.in_progress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <div className="text-2xl font-bold text-green-500">{project.stats.completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
