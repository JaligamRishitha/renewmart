import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { notificationsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const NotificationPanel = ({ isOpen, onClose, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds when panel is open
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && isOpen) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getNotifications({ unread_only: false });
      const newNotifications = response || [];
      
      // Check for new unread notifications and show toast
      const currentUnreadCount = newNotifications.filter(n => !n.read)?.length || 0;
      if (currentUnreadCount > unreadCount && unreadCount > 0) {
        const newCount = currentUnreadCount - unreadCount;
        toast.success(`You have ${newCount} new notification${newCount > 1 ? 's' : ''}!`, {
          duration: 4000,
          icon: '🔔',
        });
      }
      
      setNotifications(newNotifications);
      setUnreadCount(currentUnreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      const notification = notifications.find(n => n.notification_id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
      case 'task_created':
        return 'CheckSquare';
      case 'project_submitted':
      case 'project_uploaded':
        return 'FolderPlus';
      case 'document_uploaded':
      case 'document_version':
        return 'FileText';
      case 'document_approved':
      case 'document_rejected':
        return 'FileCheck';
      case 'subtask_assigned':
        return 'ListChecks';
      case 'review_assigned':
        return 'UserCheck';
      default:
        return 'Bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'task_assigned':
      case 'task_created':
        return 'text-blue-500';
      case 'project_submitted':
      case 'project_uploaded':
        return 'text-green-500';
      case 'document_uploaded':
      case 'document_version':
        return 'text-purple-500';
      case 'document_approved':
        return 'text-success';
      case 'document_rejected':
        return 'text-error';
      case 'subtask_assigned':
        return 'text-orange-500';
      case 'review_assigned':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'Just now';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Just now';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Just now';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.notification_id);
    }
    
    // Navigate based on notification type and category
    if (notification.data) {
      const { land_id, task_id, document_id, subtask_id } = notification.data;
      
      // Task assignment notifications
      if (notification.type === 'task_assigned' || notification.category === 'task') {
        if (land_id) {
          // Navigate to reviewer dashboard project page
          if (currentUser?.roles?.some(role => ['re_analyst', 're_sales_advisor', 're_governance_lead'].includes(role))) {
            navigate(`/reviewer/dashboard/project/${land_id}`);
            onClose(); // Close notification panel
            return;
          }
          // Admin can view project
          else if (currentUser?.roles?.includes('administrator')) {
            navigate(`/admin/projects/${land_id}/reviewers`);
            onClose();
            return;
          }
        }
      }
      
      // Subtask assignment (collaboration) notifications
      if (notification.type === 'subtask_assigned' || notification.category === 'collaboration') {
        if (land_id && task_id) {
          // Navigate to reviewer dashboard project page
          if (currentUser?.roles?.some(role => ['re_analyst', 're_sales_advisor', 're_governance_lead'].includes(role))) {
            navigate(`/reviewer/dashboard/project/${land_id}`);
            onClose();
            return;
          }
        }
      }
      
      // Project-related notifications
      if (notification.category === 'project' && land_id) {
        if (currentUser?.roles?.includes('administrator')) {
          navigate(`/admin/projects/${land_id}/reviewers`);
          onClose();
          return;
        } else if (currentUser?.roles?.includes('landowner')) {
          navigate(`/landowner/projects/${land_id}`);
          onClose();
          return;
        }
      }
      
      // Document notifications
      if (notification.category === 'document' && land_id) {
        if (document_id) {
          // Navigate to document review page if reviewer
          if (currentUser?.roles?.some(role => ['re_analyst', 're_sales_advisor', 're_governance_lead'].includes(role))) {
            navigate(`/reviewer/dashboard/project/${land_id}`);
            onClose();
            return;
          }
        }
      }
      
      // Fallback: If we have land_id but no specific handler
      if (land_id && currentUser?.roles?.includes('landowner')) {
        navigate(`/landowner/projects/${land_id}`);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-out Panel */}
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-card border-l border-border shadow-elevation-3 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <div className="flex items-center space-x-3">
            <Icon name="Bell" size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-smooth"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            >
              <Icon name="X" size={18} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="h-[calc(100vh-80px)] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Icon name="Bell" size={48} className="text-muted-foreground opacity-50 mb-4" />
              <p className="text-sm font-medium text-foreground mb-1">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You're all caught up! We'll notify you when something important happens.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative px-6 py-4 border-b border-border cursor-pointer transition-colors ${
                    !notification.read 
                      ? 'bg-primary/5 hover:bg-primary/10' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 mt-0.5 ${getNotificationColor(notification.type)}`}>
                      <Icon name={getNotificationIcon(notification.type)} size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-foreground mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.created_at)}
                            </span>
                            {notification.category && (
                              <span className="text-xs text-primary font-medium capitalize px-2 py-0.5 bg-primary/10 rounded">
                                {notification.category}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.notification_id);
                          }}
                          className="ml-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth flex-shrink-0"
                        >
                          <Icon name="X" size={14} />
                        </button>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-6 py-3 border-t border-border bg-muted/30">
            <button 
              onClick={() => {
                // Navigate to full notifications page if needed
                onClose();
              }}
              className="w-full text-sm text-primary hover:text-primary/80 font-medium transition-smooth text-center"
            >
              View all notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationPanel;

