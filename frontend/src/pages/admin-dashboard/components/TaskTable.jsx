import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import StatusBadge from './StatusBadge';
import TaskEditModal from './TaskEditModal';

const TaskTable = ({ tasks, onBulkAction, selectedTasks, onTaskSelect, onAssignReviewer, onTaskUpdate }) => {
  const [sortField, setSortField] = useState('startDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const navigate = useNavigate();

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = [...tasks]?.sort((a, b) => {
    let aValue = a?.[sortField];
    let bValue = b?.[sortField];

    if (sortField === 'startDate' || sortField === 'endDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (endDate, status) => {
    return new Date(endDate) < new Date() && status !== 'Completed';
  };

  const handleViewDocuments = (task) => {
    // Navigate with land_id and task_id to document review
    navigate(`/document-review/${task.landId}`, { state: { landId: task.landId, taskId: task.taskId } });
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskUpdate = async (taskId, updateData, isPlaceholder, landId) => {
    if (onTaskUpdate) {
      await onTaskUpdate(taskId, updateData, isPlaceholder, landId);
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <Icon name="ArrowUpDown" size={14} className="text-muted-foreground" />;
    return <Icon name={sortDirection === 'asc' ? "ArrowUp" : "ArrowDown"} size={14} className="text-foreground" />;
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-elevation-1 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedTasks?.length === tasks?.length && tasks?.length > 0}
                  onChange={(e) => {
                    if (e?.target?.checked) {
                      onTaskSelect(tasks?.map(task => task?.id));
                    } else {
                      onTaskSelect([]);
                    }
                  }}
                  className="rounded border-border focus:ring-2 focus:ring-ring"
                />
              </th>
              <th 
                className="text-left px-4 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort('projectName')}
              >
                <div className="flex items-center space-x-2">
                  <span>Project Name</span>
                  <SortIcon field="projectName" />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort('landownerName')}
              >
                <div className="flex items-center space-x-2">
                  <span>Landowner</span>
                  <SortIcon field="landownerName" />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort('projectType')}
              >
                <div className="flex items-center space-x-2">
                  <span>Project Type</span>
                  <SortIcon field="projectType" />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort('assignedReviewer')}
              >
                <div className="flex items-center space-x-2">
                  <span>Assigned Reviewer</span>
                  <SortIcon field="assignedReviewer" />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort('startDate')}
              >
                <div className="flex items-center space-x-2">
                  <span>Start Date</span>
                  <SortIcon field="startDate" />
                </div>
              </th>
              <th 
                className="text-left px-4 py-3 font-body font-medium text-sm text-foreground cursor-pointer hover:bg-muted/70 transition-smooth"
                onClick={() => handleSort('endDate')}
              >
                <div className="flex items-center space-x-2">
                  <span>End Date</span>
                  <SortIcon field="endDate" />
                </div>
              </th>
              <th className="text-left px-4 py-3 font-body font-medium text-sm text-foreground">Status</th>
              <th className="text-left px-4 py-3 font-body font-medium text-sm text-foreground">Priority</th>
              <th className="text-center px-4 py-3 font-body font-medium text-sm text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTasks?.map((task) => (
              <tr 
                key={task?.id} 
                className={`hover:bg-muted/30 transition-smooth ${isOverdue(task?.endDate, task?.status) ? 'bg-error/5' : ''}`}
              >
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTasks?.includes(task?.id)}
                    onChange={(e) => {
                      if (e?.target?.checked) {
                        onTaskSelect([...selectedTasks, task?.id]);
                      } else {
                        onTaskSelect(selectedTasks?.filter(id => id !== task?.id));
                      }
                    }}
                    className="rounded border-border focus:ring-2 focus:ring-ring"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon name="Folder" size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-body font-medium text-sm text-foreground">{task?.projectName}</p>
                        {task?.investorInterestCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            <Icon name="Users" size={12} className="mr-1" />
                            {task.investorInterestCount}
                          </span>
                        )}
                      </div>
                      <p className="font-body text-xs text-muted-foreground">{task?.location}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Icon name="User" size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-body font-medium text-sm text-foreground">{task?.landownerName}</p>
                      <p className="font-body text-xs text-muted-foreground">{task?.landownerEmail || 'No email'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Icon name={task?.projectIcon} size={16} className="text-primary" />
                    <span className="font-body text-sm text-foreground">{task?.projectType}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="font-body text-sm text-foreground font-medium">{task?.assignedReviewer}</p>
                    <p className="font-body text-xs text-muted-foreground">{task?.reviewerRole}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="font-body text-sm text-foreground">{formatDate(task?.startDate)}</p>
                </td>
                <td className="px-4 py-4">
                  {task?.endDate ? (
                    <>
                      <p className={`font-body text-sm ${isOverdue(task?.endDate, task?.status) ? 'text-error font-medium' : 'text-foreground'}`}>
                        {formatDate(task?.endDate)}
                      </p>
                      {isOverdue(task?.endDate, task?.status) && (
                        <p className="font-body text-xs text-error">Overdue</p>
                      )}
                    </>
                  ) : (
                    <p className="font-body text-sm text-muted-foreground">Not Assigned</p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={task?.status} />
                </td>
                <td className="px-4 py-4">
                  {task?.priority ? (
                    <StatusBadge status={task?.priority} />
                  ) : (
                    <p className="font-body text-sm text-muted-foreground">Not Assigned</p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-center space-x-2">
                  <Button
    variant={task?.assignedReviewer === "Unassigned" ? "default" : "outline"}
    size="sm"
    onClick={() => onAssignReviewer && onAssignReviewer(task)}
    iconName="UserPlus"
    iconSize={16}
    title="Assign"
  />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTask(task)}
                      iconName="Edit"
                      iconSize={16}
                      title="Edit Task"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDocuments(task)}
                      iconName="Eye"
                      iconSize={16}
                      title="View Task"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-border">
        {sortedTasks?.map((task) => (
          <div key={task?.id} className={`p-4 ${isOverdue(task?.endDate, task?.status) ? 'bg-error/5' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedTasks?.includes(task?.id)}
                  onChange={(e) => {
                    if (e?.target?.checked) {
                      onTaskSelect([...selectedTasks, task?.id]);
                    } else {
                      onTaskSelect(selectedTasks?.filter(id => id !== task?.id));
                    }
                  }}
                  className="rounded border-border focus:ring-2 focus:ring-ring"
                />
                <div>
                  <p className="font-body font-bold text-sm text-foreground">{task?.projectName}</p>
                  <p className="font-body text-xs text-muted-foreground">{task?.landownerName}</p>
                  <p className="font-body text-xs text-muted-foreground">{task?.location}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <StatusBadge status={task?.status} size="sm" />
                {task?.priority ? (
                  <StatusBadge status={task?.priority} size="sm" />
                ) : (
                  <span className="font-body text-xs text-muted-foreground">No Priority</span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Project Type</p>
                <div className="flex items-center space-x-2">
                  <Icon name={task?.projectIcon} size={14} className="text-primary" />
                  <span className="font-body text-sm text-foreground">{task?.projectType}</span>
                </div>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Reviewer</p>
                <p className="font-body text-sm text-foreground">{task?.assignedReviewer}</p>
                <p className="font-body text-xs text-muted-foreground">{task?.reviewerRole}</p>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="font-body text-sm text-foreground">{formatDate(task?.startDate)}</p>
              </div>
              <div>
                <p className="font-body text-xs text-muted-foreground mb-1">End Date</p>
                {task?.endDate ? (
                  <p className={`font-body text-sm ${isOverdue(task?.endDate, task?.status) ? 'text-error font-medium' : 'text-foreground'}`}>
                    {formatDate(task?.endDate)}
                  </p>
                ) : (
                  <p className="font-body text-sm text-muted-foreground">Not Assigned</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              {isOverdue(task?.endDate, task?.status) && (
                <span className="font-body text-xs text-error font-medium">Overdue</span>
              )}
              <div className="flex items-center space-x-2 ml-auto">
                {task?.assignedReviewer === "Unassigned" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onAssignReviewer && onAssignReviewer(task)}
                    iconName="Plus"
                    iconSize={16}
                    title="Assign Reviewer"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditTask(task)}
                  iconName="Edit"
                  iconSize={16}
                  title="Edit Task"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDocuments(task)}
                  iconName="Eye"
                  iconSize={16}
                  title="View Task"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      <TaskEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
};

export default TaskTable;