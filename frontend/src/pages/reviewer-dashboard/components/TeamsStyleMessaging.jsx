import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import websocketService from '../../../services/websocketService';
import { useAuth } from '../../../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import api from '../../../services/api';
import { taskAPI } from '../../../services/api';
import { toast } from 'react-hot-toast';

const TeamsStyleMessaging = ({ 
  currentUser,
  onMessageSent = () => {},
  onMessageReceived = () => {},
  landId: landIdProp = null // Accept landId as prop, fallback to useParams
}) => {
  const { landId: landIdFromParams } = useParams();
  const landId = landIdProp || landIdFromParams; // Use prop if provided, otherwise use params
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [conversations, setConversations] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [taskId, setTaskId] = useState(null);
  const messagesEndRef = useRef(null);
  const { user, token } = useAuth();

  // Get task_id for the land
  useEffect(() => {
    const fetchTaskId = async () => {
      if (!landId) return;
      try {
        const tasks = await taskAPI.getTasks({ land_id: landId });
        if (tasks && tasks.length > 0) {
          setTaskId(tasks[0].task_id);
        } else {
          // If no task, use landId as fallback (some backends may support this)
          setTaskId(landId);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Fallback to landId
        setTaskId(landId);
      }
    };
    fetchTaskId();
  }, [landId]);

  useEffect(() => {
    if (landId && token && taskId) {
      loadParticipants();
      connectWebSocket();
    }
  }, [landId, token, taskId]);

  // Add WebSocket event listeners
  useEffect(() => {
    if (isConnected) {
      const handleNewMessage = (message) => {
        console.log('Received new message:', message);
        
        // Update unread count for the sender (only if chat is NOT currently open)
        if (message.sender_id !== user?.user_id && message.sender_id !== selectedParticipant?.user_id) {
          setParticipants(prev => prev.map(p => {
            if (p.user_id === message.sender_id) {
              return {
                ...p,
                unreadCount: (p.unreadCount || 0) + 1,
                lastMessageTime: message.created_at,
                lastMessage: message.content
              };
            }
            return p;
          }));
          
          // Notify parent component about new message for unread count badge
          onMessageReceived(message);
        }
        
        // If the message is for the currently open chat, add it to conversation without incrementing count
        if (selectedParticipant && message.sender_id === selectedParticipant.user_id) {
          setConversations(prev => ({
            ...prev,
            [selectedParticipant.user_id]: [
              ...(prev[selectedParticipant.user_id] || []),
              {
                message_id: message.message_id,
                sender_id: message.sender_id,
                sender_name: message.sender_name,
                content: message.content,
                created_at: message.created_at,
                is_read: true,
                is_urgent: message.is_urgent
              }
            ]
          }));
        }
        
        onMessageReceived(message);
      };

      websocketService.on('new_message', handleNewMessage);
      
      return () => {
        websocketService.off('new_message', handleNewMessage);
      };
    }
  }, [isConnected, selectedParticipant, onMessageReceived]);


  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const response = await api.get(`/messaging/project/${landId}/participants`);
      const participantsList = response.data || [];
      
      // Load unread counts and last messages for each participant
      const participantsWithUnread = await Promise.all(
        participantsList.map(async (participant) => {
          try {
            // Get conversation summary with unread count
            const convResponse = await api.get(`/messaging/conversations/${participant.user_id}`);
            const messages = convResponse.data || [];
            
            // Calculate unread count
            const unreadCount = messages.filter(msg => 
              !msg.is_read && msg.sender_id !== user?.user_id
            ).length;
            
            // Get last message
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            return {
              ...participant,
              unreadCount: unreadCount || 0,
              lastMessageTime: lastMessage?.created_at || null,
              lastMessage: lastMessage?.content || null
            };
          } catch (error) {
            console.error(`Error loading conversation for ${participant.user_id}:`, error);
            return {
              ...participant,
              unreadCount: 0,
              lastMessageTime: null,
              lastMessage: null
            };
          }
        })
      );
      
      // Sort by last message time (most recent first), then by unread count
      participantsWithUnread.sort((a, b) => {
        // Chats with unread messages first
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        
        // Then by last message time (most recent first)
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        
        // Finally by name
        return a.name.localeCompare(b.name);
      });
      
      // Clear unread count for currently selected participant
      const updatedParticipants = participantsWithUnread.map(p => {
        if (selectedParticipant && p.user_id === selectedParticipant.user_id) {
          return { ...p, unreadCount: 0 };
        }
        return p;
      });
      
      setParticipants(updatedParticipants);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const loadConversation = async (participantId) => {
    try {
      setLoadingConversations(true);
      const response = await api.get(`/messaging/conversations/${participantId}`);
      
      // Format messages for display
      const formattedMessages = response.data.map(msg => ({
        message_id: msg.message_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name || 'Unknown',
        content: msg.content,
        created_at: msg.created_at,
        is_read: msg.is_read,
        is_urgent: msg.is_urgent
      }));
      
      setConversations(prev => ({
        ...prev,
        [participantId]: formattedMessages
      }));
      
      // Mark messages as read
      const unreadMessageIds = formattedMessages
        .filter(msg => !msg.is_read && msg.sender_id !== user?.user_id)
        .map(msg => msg.message_id);
      
      if (unreadMessageIds.length > 0) {
        try {
          await api.post('/messaging/messages/mark-read', {
            message_ids: unreadMessageIds
          });
          
          // Update unread count in participants list (should already be 0 from handleParticipantSelect, but keep for safety)
          setParticipants(prev => prev.map(p => {
            if (p.user_id === participantId) {
              return { ...p, unreadCount: 0 };
            }
            return p;
          }));
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Set empty array if conversation loading fails
      setConversations(prev => ({
        ...prev,
        [participantId]: []
      }));
    } finally {
      setLoadingConversations(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      if (!token) return;
      
      // Get WebSocket URL from environment or construct from API base URL
      const apiBaseUrl = api.defaults.baseURL || '/api';
      let wsBaseUrl;
      
      if (apiBaseUrl.startsWith('/')) {
        // Relative URL - construct from current origin
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsBaseUrl = `${protocol}//${host}`;
      } else {
        // Absolute URL
        wsBaseUrl = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      }
      
      await websocketService.connect(token, wsBaseUrl);
      setIsConnected(true);
      
      // Join the task/land for real-time messaging
      if (taskId) {
        websocketService.joinTask(taskId);
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
    }
  };

  const handleParticipantSelect = async (participant) => {
    setSelectedParticipant(participant);
    
    // Immediately clear unread count for this participant in UI
    setParticipants(prev => prev.map(p => 
      p.user_id === participant.user_id ? { ...p, unreadCount: 0 } : p
    ));
    
    // Load conversation and mark all messages as read
    try {
      // First, load or reload the conversation to get all current messages
      const response = await api.get(`/messaging/conversations/${participant.user_id}`);
      const allMessages = response.data || [];
      
      // Format and store messages
      const formattedMessages = allMessages.map(msg => ({
        message_id: msg.message_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name || 'Unknown',
        content: msg.content,
        created_at: msg.created_at,
        is_read: msg.is_read,
        is_urgent: msg.is_urgent
      }));
      
      setConversations(prev => ({
        ...prev,
        [participant.user_id]: formattedMessages
      }));
      
      // Mark ALL unread messages from this sender as read using the conversation endpoint
      // This ensures we mark all messages, even ones not currently loaded
      try {
        const markResponse = await api.post(`/messaging/messages/mark-conversation-read/${participant.user_id}`);
        const markedCount = markResponse.data?.marked_count || 0;
        
        if (markedCount > 0) {
          console.log(`Marked ${markedCount} messages as read for ${participant.name}`);
          
          // Also mark specific loaded messages in case the endpoint missed any
          const unreadMessageIds = formattedMessages
            .filter(msg => !msg.is_read && msg.sender_id === participant.user_id && msg.sender_id !== user?.user_id)
            .map(msg => msg.message_id);
          
          if (unreadMessageIds.length > 0) {
            try {
              await api.post('/messaging/messages/mark-read', {
                message_ids: unreadMessageIds
              });
            } catch (error) {
              console.error('Error marking specific messages as read:', error);
            }
          }
          
          // Update local conversation state to reflect read status
          setConversations(prev => ({
            ...prev,
            [participant.user_id]: prev[participant.user_id]?.map(msg => 
              ({ ...msg, is_read: true })
            ) || []
          }));
          
          // Reload participants to update unread counts
          await loadParticipants();
        }
      } catch (error) {
        console.error('Error marking conversation as read, trying individual messages:', error);
        
        // Fallback: mark individual messages
        const unreadMessageIds = formattedMessages
          .filter(msg => !msg.is_read && msg.sender_id === participant.user_id && msg.sender_id !== user?.user_id)
          .map(msg => msg.message_id);
        
        if (unreadMessageIds.length > 0) {
          try {
            await api.post('/messaging/messages/mark-read', {
              message_ids: unreadMessageIds
            });
          } catch (err) {
            console.error('Error marking messages as read:', err);
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      // Still set empty array so UI doesn't break
      setConversations(prev => ({
        ...prev,
        [participant.user_id]: []
      }));
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedParticipant) return;

    const messageContent = newMessage.trim();
    const recipientId = selectedParticipant.user_id;

    // Show loading toast
    const loadingToast = toast.loading('Sending message...');

    try {
      console.log('Sending message via REST API:', {
        task_id: landId,
        content: messageContent,
        recipient_id: recipientId,
        is_urgent: isUrgent
      });

      // Send message via REST API for persistence (use taskId, fallback to landId)
      const response = await api.post('/messaging/messages/send-simple', {
        task_id: taskId || landId,
        content: messageContent,
        recipient_id: recipientId,
        is_urgent: isUrgent,
        message_type: 'text'
      });

      console.log('REST API response:', response.data);

      if (response.data) {
        const message = {
          message_id: response.data.message_id,
          sender_id: user?.user_id,
          sender_name: user?.first_name || 'You',
          content: messageContent,
          created_at: new Date().toISOString(),
          is_read: true,
          is_urgent: isUrgent
        };

        // Add message to conversation
        setConversations(prev => ({
          ...prev,
          [selectedParticipant.user_id]: [
            ...(prev[selectedParticipant.user_id] || []),
            message
          ]
        }));

        // Also send via WebSocket for real-time updates (optional)
        if (isConnected && taskId) {
          websocketService.sendMessage(
            taskId,
            messageContent,
            recipientId,
            isUrgent
          );
        }

        setNewMessage('');
        setIsUrgent(false);
        onMessageSent(message);
        
        // Success toast
        toast.dismiss(loadingToast);
        toast.success('Message sent successfully!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.dismiss(loadingToast);
      
      // Fallback: try WebSocket only if REST API fails
      if (isConnected) {
        toast.loading('Trying alternative method...');
        
        const message = {
          message_id: `msg-${Date.now()}`,
          sender_id: user?.user_id,
          sender_name: user?.first_name || 'You',
          content: messageContent,
          created_at: new Date().toISOString(),
          is_read: true,
          is_urgent: isUrgent
        };

        setConversations(prev => ({
          ...prev,
          [selectedParticipant.user_id]: [
            ...(prev[selectedParticipant.user_id] || []),
            message
          ]
        }));

        if (taskId) {
          websocketService.sendMessage(
            taskId,
            messageContent,
            recipientId,
            isUrgent
          );
        }

        setNewMessage('');
        setIsUrgent(false);
        onMessageSent(message);
        
        toast.dismiss();
        toast.success('Message sent successfully!');
      } else {
        toast.error('Failed to send message. Please check your connection.');
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, selectedParticipant]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return 'Circle';
      case 'away': return 'Clock';
      case 'offline': return 'Circle';
      default: return 'Circle';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getLastMessage = (participantId) => {
    const conversation = conversations[participantId];
    if (!conversation || conversation.length === 0) return null;
    return conversation[conversation.length - 1];
  };

  return (
    <div className="flex h-full bg-background min-h-0">
      {/* Participants Sidebar */}
      <div className="w-1/3 border-r border-border bg-card flex flex-col min-h-0">
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Icon name="Users" size={20} className="text-primary" />
              Project Team
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Select a team member to start chatting
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingParticipants ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading participants...</span>
            </div>
          ) : (
            participants.map((participant) => {
              const lastMessage = getLastMessage(participant.user_id);
              const isSelected = selectedParticipant?.user_id === participant.user_id;
            
            return (
              <button
                key={participant.user_id}
                onClick={() => handleParticipantSelect(participant)}
                className={`w-full p-4 text-left border-b border-border hover:bg-muted transition-colors ${
                  isSelected ? 'bg-primary/10 border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    {participant.avatar}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium truncate ${participant.unreadCount > 0 ? 'font-semibold' : ''}`}>
                        {participant.name}
                      </h4>
                      {participant.unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                          {participant.unreadCount > 99 ? '99+' : participant.unreadCount}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {participant.role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        participant.participation_type === 'landowner' ? 'bg-green-100 text-green-800' :
                        participant.participation_type === 'admin' ? 'bg-blue-100 text-blue-800' :
                        participant.participation_type === 'current_user' ? 'bg-purple-100 text-purple-800' :
                        participant.participation_type === 'directly_assigned' ? 'bg-orange-100 text-orange-800' :
                        participant.participation_type === 'role_based' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {participant.participation_type === 'landowner' ? 'Landowner' :
                         participant.participation_type === 'admin' ? 'Admin' :
                         participant.participation_type === 'current_user' ? 'You' :
                         participant.participation_type === 'directly_assigned' ? 'Assigned' :
                         participant.participation_type === 'role_based' ? 'Role-based' :
                         'Team Member'}
                      </span>
                    </div>
                    
                    {lastMessage && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {lastMessage.content}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {lastMessage ? formatTimestamp(lastMessage.created_at) : participant.last_seen}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedParticipant ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    {selectedParticipant.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {selectedParticipant.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedParticipant.role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedParticipant.participation_type === 'landowner' ? 'bg-green-100 text-green-800' :
                        selectedParticipant.participation_type === 'admin' ? 'bg-blue-100 text-blue-800' :
                        selectedParticipant.participation_type === 'current_user' ? 'bg-purple-100 text-purple-800' :
                        selectedParticipant.participation_type === 'directly_assigned' ? 'bg-orange-100 text-orange-800' :
                        selectedParticipant.participation_type === 'role_based' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedParticipant.participation_type === 'landowner' ? 'Landowner' :
                         selectedParticipant.participation_type === 'admin' ? 'Admin' :
                         selectedParticipant.participation_type === 'current_user' ? 'You' :
                         selectedParticipant.participation_type === 'directly_assigned' ? 'Assigned' :
                         selectedParticipant.participation_type === 'role_based' ? 'Role-based' :
                         'Team Member'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {loadingConversations ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>Loading conversation...</p>
                  </div>
                </div>
              ) : conversations[selectedParticipant.user_id]?.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <Icon name="MessageCircle" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                conversations[selectedParticipant.user_id]?.map((message) => (
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
                        {message.is_urgent && (
                          <div className="flex items-center gap-1 mb-2">
                            <Icon name="AlertTriangle" size={14} className="text-red-500" />
                            <span className="text-xs font-medium text-red-500">URGENT</span>
                          </div>
                        )}
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
            <div className="border-t border-border p-4 flex-shrink-0">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
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

                <div className="flex space-x-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isConnected ? `Type a message to ${selectedParticipant.name}...` : "Connecting..."}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageCircle" size={64} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a team member</h3>
              <p>Choose someone from the team to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamsStyleMessaging;
