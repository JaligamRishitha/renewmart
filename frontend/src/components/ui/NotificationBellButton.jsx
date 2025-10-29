import React, { useState, useEffect, useRef } from 'react';
import Icon from '../AppIcon';
import { notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const NotificationBellButton = ({ onOpen }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const previousCountRef = useRef(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      const newCount = response?.count || 0;
      
      // Show toast when new notifications arrive
      if (newCount > previousCountRef.current && previousCountRef.current > 0) {
        const newNotificationsCount = newCount - previousCountRef.current;
        toast.success(`You have ${newNotificationsCount} new notification${newNotificationsCount > 1 ? 's' : ''}!`, {
          duration: 4000,
          icon: '🔔',
        });
      }
      
      previousCountRef.current = newCount;
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount(); // Fetch on initial load
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onOpen}
      className="relative p-2 rounded-lg text-foreground hover:bg-muted hover:text-primary transition-smooth focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <Icon name="Bell" size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-foreground text-xs font-medium rounded-full flex items-center justify-center animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBellButton;

