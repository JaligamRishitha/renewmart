import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import websocketService from '../../../services/websocketService';
import { useAuth } from '../../../contexts/AuthContext';

const RealTimeMessaging = ({ 
  taskId,
  currentUser,
  onMessageSent = () => {},
  onMessageReceived = () => {}
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const messagesEndRef = useRef(null);
  const { user, token } = useAuth();

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket connection and message handling
  useEffect(() => {
    if (!token || !taskId) return;

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        await websocketService.connect(token);
        setIsConnected(true);
        
        // Join the task
        websocketService.joinTask(taskId);
        
        // Load message history
        websocketService.getMessages(taskId);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Set up event listeners
    const handleNewMessage = (message) => {
      setMessages(prev => [message, ...prev]);
      onMessageReceived(message);
    };

    const handleMessagesHistory = (data) => {
      setMessages(data.messages.reverse()); // Reverse to show oldest first
    };

    const handleConnectionStatus = (connected) => {
      setIsConnected(connected);
    };

    const handleError = (error) => {
      console.error('WebSocket error:', error);
    };

    // Add event listeners
    websocketService.on('new_message', handleNewMessage);
    websocketService.on('messages_history', handleMessagesHistory);
    websocketService.on('connected', () => handleConnectionStatus(true));
    websocketService.on('disconnected', () => handleConnectionStatus(false));
    websocketService.on('error', handleError);

    // Cleanup on unmount
    return () => {
      websocketService.off('new_message', handleNewMessage);
      websocketService.off('messages_history', handleMessagesHistory);
      websocketService.off('connected', () => handleConnectionStatus(true));
      websocketService.off('disconnected', () => handleConnectionStatus(false));
      websocketService.off('error', handleError);
      
      if (taskId) {
        websocketService.leaveTask(taskId);
      }
    };
  }, [token, taskId, onMessageReceived]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    const success = websocketService.sendMessage(
      taskId,
      newMessage.trim(),
      selectedRecipient || null,
      isUrgent
    );

    if (success) {
      setNewMessage('');
      setIsUrgent(false);
      onMessageSent({
        content: newMessage.trim(),
        isUrgent,
        recipient: selectedRecipient
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.ceil(diffMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case 'system':
        return 'Info';
      case 'urgent':
        return 'AlertTriangle';
      default:
        return 'MessageCircle';
    }
  };

  const getMessageTypeColor = (messageType, isUrgent) => {
    if (isUrgent) return 'text-red-600';
    switch (messageType) {
      case 'system':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Icon name="MessageSquare" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Real-time Messaging</h3>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {!isConnected && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => websocketService.connect(token)}
            >
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageCircle" size={48} className="mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.message_id}
              className={`flex items-start space-x-3 ${
                message.sender_id === user?.user_id ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center ${
                message.sender_id === user?.user_id ? 'bg-primary text-primary-foreground' : ''
              }`}>
                <span className="text-sm font-medium">
                  {message.sender_name?.charAt(0) || 'U'}
                </span>
              </div>
              
              <div className={`flex-1 max-w-xs ${
                message.sender_id === user?.user_id ? 'text-right' : ''
              }`}>
                <div className={`p-3 rounded-lg ${
                  message.sender_id === user?.user_id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon 
                      name={getMessageTypeIcon(message.message_type)} 
                      size={14} 
                      className={getMessageTypeColor(message.message_type, message.is_urgent)}
                    />
                    {message.is_urgent && (
                      <span className="text-xs font-medium text-red-600">URGENT</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {message.sender_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.created_at)}
                  </span>
                  {message.sender_id !== user?.user_id && !message.is_read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        <div className="space-y-3">
          {/* Recipient Selection */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-foreground">To:</label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="flex-1 px-3 py-1 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All participants</option>
              {/* Add recipient options here */}
            </select>
            <label className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded"
              />
              <span>Urgent</span>
            </label>
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected}
              className="flex-1 p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || !isConnected || isLoading}
              className="self-end"
            >
              <Icon name="Send" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMessaging;
