import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import websocketService from '../../../services/websocketService';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

const AdminMessaging = ({ 
  currentUser,
  onMessageSent = () => {},
  onMessageReceived = () => {}
}) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [conversations, setConversations] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef(null);
  const { user, token } = useAuth();

  useEffect(() => {
    if (token) {
      loadProjects();
      connectWebSocket();
    }
  }, [token]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await api.get('/lands/admin/projects');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadParticipants = async (projectId) => {
    try {
      setLoadingParticipants(true);
      const response = await api.get(`/messaging/project/${projectId}/participants`);
      setParticipants(response.data);
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
      setConversations(prev => ({
        ...prev,
        [participantId]: response.data
      }));
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      await websocketService.connect(token);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsConnected(false);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setSelectedParticipant(null);
    setParticipants([]);
    if (project) {
      loadParticipants(project.land_id);
    }
  };

  const handleParticipantSelect = (participant) => {
    setSelectedParticipant(participant);
    
    // Load conversation if not already loaded
    if (!conversations[participant.user_id]) {
      loadConversation(participant.user_id);
    }
    
    // Clear unread count for this participant
    setParticipants(prev => prev.map(p => 
      p.user_id === participant.user_id ? { ...p, unreadCount: 0 } : p
    ));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedParticipant || !isConnected) return;

    const message = {
      message_id: `msg-${Date.now()}`,
      sender_id: user?.user_id,
      sender_name: user?.first_name || 'You',
      content: newMessage.trim(),
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

    // Send via WebSocket
    websocketService.sendMessage(
      `chat-${selectedParticipant.user_id}`,
      newMessage.trim(),
      selectedParticipant.user_id,
      isUrgent
    );

    setNewMessage('');
    setIsUrgent(false);
    onMessageSent(message);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
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
    <div className="flex h-full bg-background">
      {/* Project Selection Sidebar */}
      <div className="w-1/4 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Icon name="FolderOpen" size={20} className="text-primary" />
            Projects
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Select a project to view team members
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingProjects ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Loading projects...</span>
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.land_id}
                onClick={() => handleProjectSelect(project)}
                className={`w-full p-4 text-left border-b border-border hover:bg-muted transition-colors ${
                  selectedProject?.land_id === project.land_id ? 'bg-primary/10 border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    <Icon name="FolderOpen" size={20} className="text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {project.title || 'Untitled Project'}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {project.land_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {project.status || 'Unknown'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Participants Sidebar */}
      <div className="w-1/3 border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Icon name="Users" size={20} className="text-primary" />
            {selectedProject ? 'Team Members' : 'Select Project'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProject ? 'Select a team member to start chatting' : 'Choose a project first'}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {!selectedProject ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <div className="text-center">
                <Icon name="FolderOpen" size={48} className="mx-auto mb-2 opacity-50" />
                <p>Select a project to view team members</p>
              </div>
            </div>
          ) : loadingParticipants ? (
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
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                        {participant.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                        participant.status === 'online' ? 'bg-green-500' : 
                        participant.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground truncate">
                          {participant.name}
                        </h4>
                        {participant.unreadCount > 0 && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            {participant.unreadCount}
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
                        <span className={`text-xs ${getStatusColor(participant.status)}`}>
                          {participant.status}
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
      <div className="flex-1 flex flex-col">
        {selectedParticipant ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
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
                      <span className={`text-sm ${getStatusColor(selectedParticipant.status)}`}>
                        {selectedParticipant.status}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            <div className="border-t border-border p-4">
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
              <h3 className="text-lg font-medium mb-2">
                {selectedProject ? 'Select a team member' : 'Select a project'}
              </h3>
              <p>
                {selectedProject 
                  ? 'Choose someone from the team to start chatting' 
                  : 'Choose a project to view its team members'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessaging;
