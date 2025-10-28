import React from 'react';
import Icon from '../../../components/AppIcon';

const TaskCard = ({ task, reviewer, isMyTask, onView, getStatusColor, getRoleLabel, showReviewer = false }) => {
  const completedSubtasks = task.subtasks?.filter(s => s.status === 'completed').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  return (
    <div className={`border rounded-lg p-4 transition-colors ${
      isMyTask ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-foreground">
              {task.task_type?.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
              {task.status?.toUpperCase()}
            </span>
            {isMyTask && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-500">
                MY TASK
              </span>
            )}
          </div>

          {showReviewer && reviewer && (
            <p className="text-sm text-muted-foreground mb-2">
              Reviewer: {reviewer.first_name} {reviewer.last_name} ({getRoleLabel(reviewer.roles?.[0])})
            </p>
          )}

          <p className="text-sm text-muted-foreground mb-2">
            {task.description || 'No description'}
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {task.due_date && (
              <span className="flex items-center gap-1">
                <Icon name="Calendar" size={14} />
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
            {totalSubtasks > 0 && (
              <span className="flex items-center gap-1">
                <Icon name="List" size={14} />
                {completedSubtasks}/{totalSubtasks} Subtasks
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onView(task)}
          className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm flex items-center gap-2"
        >
          <Icon name="Eye" size={16} />
          View
        </button>
      </div>

      {/* Subtask Progress Bar */}
      {totalSubtasks > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Subtask Progress</span>
            <span>{Math.round((completedSubtasks / totalSubtasks) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;