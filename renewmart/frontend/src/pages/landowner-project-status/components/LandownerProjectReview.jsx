import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import { taskAPI, documentsAPI, landsAPI, usersAPI } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import websocketService from '../../../services/websocketService';
import api from '../../../services/api';

const LandownerProjectReview = () => {
  const { projectId } = useParams();
  const landId = projectId; // Use projectId as landId for consistency
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [project, setProject] = useState(location.state?.project || null);
  const [allTasks, setAllTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewers, setReviewers] = useState({});
  const [expandedRoles, setExpandedRoles] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  
  // Chat state
  const [chatParticipants, setChatParticipants] = useState([]);
  const [selectedChatParticipant, setSelectedChatParticipant] = useState(null);
  const [chatConversations, setChatConversations] = useState({});
  const [newChatMessage, setNewChatMessage] = useState('');
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [loadingChatParticipants, setLoadingChatParticipants] = useState(false);
  const [loadingChatConversations, setLoadingChatConversations] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const participantsListRef = useRef(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Review Progress', icon: 'LayoutGrid' },
    { id: 'reviewers', label: 'Reviewers & Tasks', icon: 'Users' },
    { id: 'documents', label: 'Documents Uploaded', icon: 'FileText' },
    { id: 'chat', label: 'Chat', icon: 'MessageCircle' }
  ];

  useEffect(() => {
    fetchProjectDetails();
  }, [landId]);

  // Initialize chat when component mounts or landId changes
  useEffect(() => {
    if (landId && user?.user_id) {
      loadChatParticipants();
      connectChatWebSocket();
    }
    
    return () => {
      if (isChatConnected) {
        websocketService.disconnect();
      }
    };
  }, [landId, user?.user_id]);

  // WebSocket event listeners for chat
  useEffect(() => {
    if (isChatConnected) {
      const handleNewMessage = (message) => {
        console.log('Received new chat message:', message);
        
        // Update unread count for the sender
        if (message.sender_id !== user?.user_id) {
          setChatParticipants(prev => prev.map(p => {
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
          setChatUnreadCount(prev => prev + 1);
        }
        
        // Add message to conversation if it's for the selected participant
        if (selectedChatParticipant && message.sender_id === selectedChatParticipant.user_id) {
          setChatConversations(prev => ({
            ...prev,
            [selectedChatParticipant.user_id]: [
              ...(prev[selectedChatParticipant.user_id] || []),
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
          scrollToBottom();
        }
      };

      websocketService.on('new_message', handleNewMessage);
      
      return () => {
        websocketService.off('new_message', handleNewMessage);
      };
    }
  }, [isChatConnected, selectedChatParticipant, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatConversations, selectedChatParticipant]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tasks for this land - try with include_subtasks first, fallback if it fails
      let tasksResponse;
      try {
        tasksResponse = await taskAPI.getTasks({ 
          land_id: landId,
          include_subtasks: true 
        });
        console.log('All tasks for project (with subtasks):', tasksResponse);
      } catch (err) {
        // Fallback to fetching without include_subtasks if backend doesn't support it
        console.warn('Failed to fetch tasks with subtasks, falling back:', err);
        tasksResponse = await taskAPI.getTasks({ 
          land_id: landId
        });
        console.log('All tasks for project (without subtasks):', tasksResponse);
      }

      // Fetch subtasks for each task if not already included in response
      const tasksWithSubtasks = await Promise.all(
        tasksResponse.map(async (task) => {
          // If subtasks are already included in the response (even if empty), use them
          // But ensure we copy the array to avoid reference issues
          if (task.subtasks !== undefined && Array.isArray(task.subtasks)) {
            return {
              ...task,
              subtasks: [...task.subtasks] // Copy array to avoid reference sharing
            };
          }
          // Otherwise, fetch subtasks separately
          try {
            const subtasks = await taskAPI.getSubtasks(task.task_id);
            return { ...task, subtasks: subtasks || [] };
          } catch (err) {
            console.error(`Failed to fetch subtasks for task ${task.task_id}:`, err);
            return { ...task, subtasks: [] };
          }
        })
      );

      setAllTasks(tasksWithSubtasks);

      // Build reviewer data from task response - use assigned_to_name from API
      // This avoids permission issues (403) when trying to fetch users individually
      const reviewerData = {};
      tasksWithSubtasks.forEach((task) => {
        if (task.assigned_to) {
          const userId = String(task.assigned_to);
          if (!reviewerData[userId]) {
            // Parse name from assigned_to_name if available
            const assignedToName = task.assigned_to_name || '';
            const nameParts = assignedToName.trim().split(' ');
            reviewerData[userId] = {
              user_id: userId,
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || '',
              email: task.assigned_to_email || null,
              full_name: assignedToName || null
            };
          }
        }
      });

      // Also add reviewers from documents (uploaded_by) - we'll fetch documents later
      // But for now, we'll handle this in the documents tab display
      
      console.log('Reviewer data object:', reviewerData);
      setReviewers(reviewerData);

      // Fetch only reviewer-uploaded documents (task documents)
      const reviewerDocuments = [];
      for (const task of tasksWithSubtasks) {
        try {
          const taskDocs = await documentsAPI.getTaskDocuments(task.task_id);
          if (taskDocs && taskDocs.length > 0) {
            reviewerDocuments.push(...taskDocs);
            
            // Add document uploaders to reviewer data if not already present
            taskDocs.forEach((doc) => {
              if (doc.uploaded_by) {
                const uploaderId = String(doc.uploaded_by);
                if (!reviewerData[uploaderId]) {
                  // Try to get name from task if uploader is the task assignee
                  if (task.assigned_to && String(task.assigned_to) === uploaderId && task.assigned_to_name) {
                    const nameParts = task.assigned_to_name.trim().split(' ');
                    reviewerData[uploaderId] = {
                      user_id: uploaderId,
                      first_name: nameParts[0] || '',
                      last_name: nameParts.slice(1).join(' ') || '',
                      email: null,
                      full_name: task.assigned_to_name || null
                    };
                  } else {
                    // Add placeholder - name will be "Unknown Reviewer" but at least we track the user
                    reviewerData[uploaderId] = {
                      user_id: uploaderId,
                      first_name: '',
                      last_name: '',
                      email: null,
                      full_name: null
                    };
                  }
                }
              }
            });
          }
        } catch (err) {
          console.error(`Failed to fetch documents for task ${task.task_id}:`, err);
        }
      }
      
      // Update reviewers with any new uploaders we found
      setReviewers(reviewerData);
      setDocuments(reviewerDocuments);

      // If project data not in location state, fetch land details
      if (!project) {
        const landResponse = await landsAPI.getLand(landId);
        setProject({
          land_id: landId,
          title: landResponse.title || 'Untitled Project',
          ...landResponse
        });
      }

    } catch (err) {
      console.error('Failed to fetch project details:', err);
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getRoleLabel = (role) => {
    if (!role) return null;
    
    const roleLabels = {
      're_sales_advisor': 'RE Sales Advisor',
      're_analyst': 'RE Analyst',
      're_governance_lead': 'RE Governance Lead',
      'sales_advisor': 'RE Sales Advisor',
      'analyst': 'RE Analyst',
      'governance_lead': 'RE Governance Lead'
    };
    
    // Check if it's already a mapped label
    if (Object.values(roleLabels).includes(role)) {
      return role;
    }
    
    // Check if it matches a key
    const normalizedRole = String(role).toLowerCase();
    return roleLabels[normalizedRole] || roleLabels[role] || role;
  };

  const inferRoleFromTask = (task) => {
    // Try to infer role from task title, description, or type
    const searchText = `${task.title || ''} ${task.task_type || ''} ${task.description || ''}`.toLowerCase();
    
    if (searchText.includes('sales') || searchText.includes('market') || searchText.includes('advisor')) {
      return 'RE Sales Advisor';
    }
    if (searchText.includes('analyst') || searchText.includes('analyze') || searchText.includes('technical') || searchText.includes('financial')) {
      return 'RE Analyst';
    }
    if (searchText.includes('governance') || searchText.includes('compliance') || searchText.includes('regulatory') || searchText.includes('legal')) {
      return 'RE Governance Lead';
    }
    
    return null;
  };

  const getProgressPercentage = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter(st => st.status === 'completed').length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Failed to download document');
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const blob = await documentsAPI.downloadDocument(doc.document_id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to view document:', err);
      alert('Failed to view document');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  // Chat functions
  const loadChatParticipants = async () => {
    try {
      setLoadingChatParticipants(true);
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
      
      setChatParticipants(participantsWithUnread);
      
      // Update total unread count
      const totalUnread = participantsWithUnread.reduce((sum, p) => sum + (p.unreadCount || 0), 0);
      setChatUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading chat participants:', error);
    } finally {
      setLoadingChatParticipants(false);
    }
  };

  const loadChatConversation = async (participantId) => {
    try {
      setLoadingChatConversations(true);
      const response = await api.get(`/messaging/conversations/${participantId}`);
      const formattedMessages = response.data.map(msg => ({
        message_id: msg.message_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name || 'Unknown',
        content: msg.content,
        created_at: msg.created_at,
        is_read: msg.is_read,
        is_urgent: msg.is_urgent
      }));
      
      setChatConversations(prev => ({
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
          
          // Update unread count in participants list
          setChatParticipants(prev => prev.map(p => {
            if (p.user_id === participantId) {
              const newCount = Math.max(0, (p.unreadCount || 0) - unreadMessageIds.length);
              return { ...p, unreadCount: newCount };
            }
            return p;
          }));
          
          // Update total unread count
          setChatUnreadCount(prev => Math.max(0, prev - unreadMessageIds.length));
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    } catch (error) {
      console.error('Error loading chat conversation:', error);
      setChatConversations(prev => ({
        ...prev,
        [participantId]: []
      }));
    } finally {
      setLoadingChatConversations(false);
    }
  };

  const connectChatWebSocket = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await websocketService.connect(token);
        setIsChatConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setIsChatConnected(false);
    }
  };

  const handleChatParticipantSelect = (participant) => {
    setSelectedChatParticipant(participant);
    
    // Load conversation if not already loaded
    if (!chatConversations[participant.user_id]) {
      loadChatConversation(participant.user_id);
    } else {
      // Still mark messages as read even if conversation is already loaded
      const conversation = chatConversations[participant.user_id] || [];
      const unreadMessageIds = conversation
        .filter(msg => !msg.is_read && msg.sender_id !== user?.user_id)
        .map(msg => msg.message_id);
      
      if (unreadMessageIds.length > 0) {
        api.post('/messaging/messages/mark-read', {
          message_ids: unreadMessageIds
        }).then(() => {
          setChatParticipants(prev => prev.map(p => {
            if (p.user_id === participant.user_id) {
              return { ...p, unreadCount: 0 };
            }
            return p;
          }));
          setChatUnreadCount(prev => Math.max(0, prev - unreadMessageIds.length));
        }).catch(err => console.error('Error marking messages as read:', err));
      } else {
        // Clear unread count for this participant
        setChatParticipants(prev => prev.map(p => 
          p.user_id === participant.user_id ? { ...p, unreadCount: 0 } : p
        ));
      }
    }
  };

  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || !selectedChatParticipant || !isChatConnected) return;

    const messageContent = newChatMessage.trim();
    const recipientId = selectedChatParticipant.user_id;

    try {
      setIsSendingMessage(true);
      
      // Send message via REST API for persistence
      const response = await api.post('/messaging/messages/send-simple', {
        task_id: landId,
        content: messageContent,
        recipient_id: recipientId,
        is_urgent: false,
        message_type: 'text'
      });

      if (response.data) {
        const message = {
          message_id: response.data.message_id,
          sender_id: user?.user_id,
          sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'You',
          content: messageContent,
          created_at: new Date().toISOString(),
          is_read: true,
          is_urgent: false
        };

        // Add message to conversation
        setChatConversations(prev => ({
          ...prev,
          [selectedChatParticipant.user_id]: [
            ...(prev[selectedChatParticipant.user_id] || []),
            message
          ]
        }));

        // Also send via WebSocket for real-time updates
        if (isChatConnected) {
          websocketService.sendMessage(
            landId,
            messageContent,
            recipientId,
            false
          );
        }

        setNewChatMessage('');
        
        // Update participant's last message info
        setChatParticipants(prev => prev.map(p => {
          if (p.user_id === selectedChatParticipant.user_id) {
            return {
              ...p,
              lastMessageTime: message.created_at,
              lastMessage: message.content
            };
          }
          return p;
        }));
        
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleChatKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const formatChatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const formatRoleName = (role) => {
    if (!role) return '';
    return role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <Icon name="ArrowLeft" size={20} />
            Back to Project Status
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {project?.title || 'Project Review Status'}
              </h1>
              
            </div>
            <button
              onClick={fetchProjectDetails}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon name="RefreshCw" size={18} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-border mt-6 -mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab - Review Progress */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Project Summary */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="Info" size={24} />
                Project Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-background rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="Users" size={20} className="text-primary" />
                    <span className="font-medium text-foreground">Reviewers</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{allTasks.length}</p>
                  <p className="text-sm text-muted-foreground">Assigned reviewers</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="FileText" size={20} className="text-primary" />
                    <span className="font-medium text-foreground">Documents</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">Uploaded documents</p>
                </div>
                <div className="bg-background rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon name="CheckCircle" size={20} className="text-primary" />
                    <span className="font-medium text-foreground">Progress</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {allTasks.length > 0 ? Math.round(allTasks.reduce((acc, task) => acc + getProgressPercentage(task), 0) / allTasks.length) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Overall completion</p>
                </div>
              </div>
            </div>

            {/* Review Progress by Role */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Icon name="TrendingUp" size={24} />
                Review Progress by Role
              </h2>
              
              {allTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No reviewers assigned to this project yet</p>
                </div>
              ) : (() => {
                // Group tasks by role
                const tasksByRole = {};
                allTasks.forEach((task) => {
                  const reviewerKey = task.assigned_to ? String(task.assigned_to) : null;
                  const reviewer = reviewerKey ? reviewers[reviewerKey] : null;
                  
                  // Try multiple possible fields for role
                  let taskRole = task.assigned_role || task.role || task.role_key || task.reviewer_role;
                  
                  // If no role in task, try to infer from task content
                  if (!taskRole) {
                    taskRole = inferRoleFromTask(task);
                  }
                  
                  const roleLabel = getRoleLabel(taskRole) || 'Unknown Role';
                  
                  if (!tasksByRole[roleLabel]) {
                    tasksByRole[roleLabel] = [];
                  }
                  
                  // Ensure subtasks are properly isolated for each task to avoid reference issues
                  const taskWithIsolatedSubtasks = {
                    ...task,
                    subtasks: task.subtasks && Array.isArray(task.subtasks) ? [...task.subtasks] : [],
                    roleLabel,
                    reviewerKey,
                    reviewer
                  };
                  tasksByRole[roleLabel].push(taskWithIsolatedSubtasks);
                });

                // Calculate stats for each role
                const roleStats = Object.keys(tasksByRole).map(role => {
                  const tasks = tasksByRole[role];
                  const totalProgress = tasks.reduce((sum, t) => sum + getProgressPercentage(t), 0);
                  const avgProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;
                  const completedCount = tasks.filter(t => t.status === 'completed').length;
                  
                  return {
                    role,
                    tasks,
                    taskCount: tasks.length,
                    avgProgress,
                    completedCount
                  };
                });

                return (
                  <div className="space-y-4">
                    {roleStats.map(({ role, tasks, taskCount, avgProgress, completedCount }) => (
                      <div key={role} className="bg-background border border-border rounded-lg overflow-hidden">
                        {/* Role Accordion Header */}
                        <button
                          onClick={() => setExpandedRoles(prev => ({
                            ...prev,
                            [role]: !prev[role]
                          }))}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Icon name="Users" size={20} className="text-primary" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-foreground">{role}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  {taskCount} task{taskCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {avgProgress}% avg progress
                                </span>
                                {completedCount > 0 && (
                                  <>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-sm text-green-600 font-medium">
                                      {completedCount} completed
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Icon 
                              name={expandedRoles[role] ? "ChevronUp" : "ChevronDown"} 
                              size={20} 
                              className="text-muted-foreground" 
                            />
                          </div>
                        </button>

                        {/* Role Accordion Content */}
                        {expandedRoles[role] && (
                          <div className="border-t border-border p-4 space-y-3">
                            {tasks.map((task) => {
                              const progress = getProgressPercentage(task);
                              const reviewer = task.reviewer;
                              
                              // Determine reviewer display name - use full_name, then first_name + last_name, then assigned_to_name
                              let reviewerName = 'Unknown Reviewer';
                              if (reviewer?.full_name) {
                                reviewerName = reviewer.full_name;
                              } else if (reviewer?.first_name || reviewer?.last_name) {
                                reviewerName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim();
                              } else if (task.assigned_to_name) {
                                reviewerName = task.assigned_to_name;
                              }
                              
                              return (
                                <div key={task.task_id} className="bg-card rounded-lg p-4 border border-border">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Icon name="User" size={20} className="text-primary" />
                                      </div>
                                      <div>
                                        <h3 className="font-medium text-foreground">
                                          {reviewerName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                          {task.task_type || task.title || 'Task'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                                        {task.status?.replace('_', ' ')}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Progress</span>
                                      <span className="font-medium text-foreground">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>{task.subtasks?.filter(st => st.status === 'completed').length || 0} completed</span>
                                      <span>{task.subtasks?.length || 0} total subtasks</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Reviewers Tab */}
        {activeTab === 'reviewers' && (() => {
          // Group tasks by role
          const tasksByRole = {};
          allTasks.forEach((task) => {
            // Normalize assigned_to to string for lookup
            const reviewerKey = task.assigned_to ? String(task.assigned_to) : null;
            const reviewer = reviewerKey ? reviewers[reviewerKey] : null;
            
            // Try multiple possible fields for role
            let taskRole = task.assigned_role || task.role || task.role_key || task.reviewer_role;
            
            // If no role in task, try to infer from task content
            if (!taskRole) {
              taskRole = inferRoleFromTask(task);
            }
            
            const roleLabel = getRoleLabel(taskRole) || 'Unknown Role';
            
            if (!tasksByRole[roleLabel]) {
              tasksByRole[roleLabel] = [];
            }
            
            // Ensure subtasks are properly isolated for each task to avoid reference issues
            const taskWithIsolatedSubtasks = {
              ...task,
              subtasks: task.subtasks && Array.isArray(task.subtasks) ? [...task.subtasks] : [],
              roleLabel,
              reviewerKey,
              reviewer
            };
            tasksByRole[roleLabel].push(taskWithIsolatedSubtasks);
          });

          // Calculate stats for each role
          const roleStats = Object.keys(tasksByRole).map(role => {
            const tasks = tasksByRole[role];
            const totalProgress = tasks.reduce((sum, t) => sum + getProgressPercentage(t), 0);
            const avgProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;
            const completedCount = tasks.filter(t => t.status === 'completed').length;
            
            return {
              role,
              tasks,
              taskCount: tasks.length,
              avgProgress,
              completedCount
            };
          });

          const toggleRoleAccordion = (role) => {
            setExpandedRoles(prev => ({
              ...prev,
              [role]: !prev[role]
            }));
          };

          const toggleTaskAccordion = (taskId) => {
            setExpandedTasks(prev => ({
              ...prev,
              [taskId]: !prev[taskId]
            }));
          };

          return (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Icon name="Users" size={24} />
                  Reviewers & Their Tasks ({allTasks.length})
                </h2>
                
                {allTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="Inbox" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No reviewers assigned to this project</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roleStats.map(({ role, tasks, taskCount, avgProgress, completedCount }) => (
                      <div key={role} className="bg-background border border-border rounded-lg overflow-hidden">
                        {/* Role Accordion Header */}
                        <button
                          onClick={() => toggleRoleAccordion(role)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Icon name="Users" size={20} className="text-primary" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg font-semibold text-foreground">{role}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-muted-foreground">
                                  {taskCount} task{taskCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-sm text-muted-foreground">•</span>
                                <span className="text-sm text-muted-foreground">
                                  {avgProgress}% avg progress
                                </span>
                                {completedCount > 0 && (
                                  <>
                                    <span className="text-sm text-muted-foreground">•</span>
                                    <span className="text-sm text-green-600 font-medium">
                                      {completedCount} completed
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Icon 
                              name={expandedRoles[role] ? "ChevronUp" : "ChevronDown"} 
                              size={20} 
                              className="text-muted-foreground" 
                            />
                          </div>
                        </button>

                        {/* Role Accordion Content */}
                        {expandedRoles[role] && (
                          <div className="border-t border-border p-4 space-y-3">
                            {tasks.map((task) => {
                              const progress = getProgressPercentage(task);
                              const reviewer = task.reviewer;
                              
                              // Determine reviewer display name - use full_name, then first_name + last_name, then assigned_to_name
                              let reviewerName = 'Unknown Reviewer';
                              if (reviewer?.full_name) {
                                reviewerName = reviewer.full_name;
                              } else if (reviewer?.first_name || reviewer?.last_name) {
                                reviewerName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim();
                              } else if (task.assigned_to_name) {
                                reviewerName = task.assigned_to_name;
                              } else if (reviewer?.email) {
                                reviewerName = reviewer.email;
                              }

                              return (
                                <div key={task.task_id} className="bg-card border border-border rounded-lg overflow-hidden">
                                  {/* Task Accordion Header */}
                                  <button
                                    onClick={() => toggleTaskAccordion(task.task_id)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Icon name="ClipboardList" size={16} className="text-primary" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-medium text-foreground truncate">
                                            {task.task_type || task.title || 'Task'}
                                          </h4>
                                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                            {task.status?.replace('_', ' ')}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                          <span>Assigned to: {reviewerName}</span>
                                          <span>•</span>
                                          <span>{progress}% complete</span>
                                          {task.subtasks && task.subtasks.length > 0 && (
                                            <>
                                              <span>•</span>
                                              <span>{task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length} subtasks</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Icon 
                                      name={expandedTasks[task.task_id] ? "ChevronUp" : "ChevronDown"} 
                                      size={18} 
                                      className="text-muted-foreground ml-3 flex-shrink-0" 
                                    />
                                  </button>

                                  {/* Task Accordion Content */}
                                  {expandedTasks[task.task_id] && (
                                    <div className="border-t border-border p-4 space-y-4">
                                      {task.description && (
                                        <div>
                                          <h5 className="font-medium text-foreground mb-2">Task Description</h5>
                                          <p className="text-sm text-muted-foreground">{task.description}</p>
                                        </div>
                                      )}
                                      
                                      {/* Progress Bar */}
                                      <div>
                                        <div className="flex justify-between text-sm mb-2">
                                          <span className="text-muted-foreground">Progress</span>
                                          <span className="font-medium text-foreground">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                          <div 
                                            className="bg-primary h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                      </div>
                                      
                                      {/* Subtasks */}
                                      {task.subtasks && task.subtasks.length > 0 && (
                                        <div>
                                          <h5 className="font-medium text-foreground mb-3">
                                            Subtasks ({task.subtasks.length})
                                          </h5>
                                          <div className="space-y-2">
                                            {task.subtasks.map((subtask, index) => (
                                              <div key={subtask.subtask_id || index} className="flex items-center gap-3 p-2 bg-background rounded border border-border">
                                                <Icon 
                                                  name={subtask.status === 'completed' ? 'CheckCircle' : 'Circle'} 
                                                  size={16} 
                                                  className={subtask.status === 'completed' ? 'text-green-500' : 'text-muted-foreground'} 
                                                />
                                                <div className="flex-1">
                                                  <span className={`text-sm ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                    {subtask.title}
                                                  </span>
                                                  {subtask.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5">{subtask.description}</p>
                                                  )}
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(subtask.status)}`}>
                                                  {subtask.status}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Task Metadata */}
                                      <div className="flex justify-between items-center pt-3 border-t border-border text-sm text-muted-foreground">
                                        <span>Assigned: {new Date(task.created_at).toLocaleDateString()}</span>
                                        {task.due_date && (
                                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Documents Tab */}
        {activeTab === 'documents' && (() => {
          // Create task lookup map
          const taskMap = {};
          allTasks.forEach((task) => {
            if (task.task_id) {
              taskMap[String(task.task_id)] = task;
            }
          });

          // Create subtask lookup map from allTasks
          const subtaskMap = {};
          allTasks.forEach((task) => {
            if (task.subtasks && Array.isArray(task.subtasks)) {
              task.subtasks.forEach((subtask) => {
                if (subtask.subtask_id) {
                  subtaskMap[String(subtask.subtask_id)] = {
                    ...subtask,
                    task: task, // Keep reference to parent task for context
                    reviewerKey: task.assigned_to ? String(task.assigned_to) : null
                  };
                }
              });
            }
          });

          // Group documents by role and subtask
          const documentsByRole = {};
          
          documents.forEach((doc) => {
            // Try to find task from task_id if subtask_id is missing
            let task = null;
            let subtask = null;
            let subtaskKey = null;
            
            if (doc.subtask_id) {
              subtaskKey = String(doc.subtask_id);
              subtask = subtaskMap[subtaskKey] || null;
              task = subtask?.task || null;
              
              // If subtask not found in map but we have task_id, search in task's subtasks
              if (!subtask && doc.task_id) {
                task = taskMap[String(doc.task_id)] || null;
                if (task && task.subtasks && Array.isArray(task.subtasks)) {
                  subtask = task.subtasks.find(st => String(st.subtask_id) === subtaskKey) || null;
                  if (subtask) {
                    // Update subtaskMap for future lookups
                    subtaskMap[subtaskKey] = {
                      ...subtask,
                      task: task,
                      reviewerKey: task.assigned_to ? String(task.assigned_to) : null
                    };
                  }
                }
              }
            }
            
            // If no subtask found yet, try to get task from task_id
            if (!task && doc.task_id) {
              task = taskMap[String(doc.task_id)] || null;
            }
            
            // Determine role from task
            let taskRole = task?.assigned_role || task?.role || task?.role_key || task?.reviewer_role;
            if (!taskRole && task) {
              taskRole = inferRoleFromTask(task);
            }
            
            // If still no role, try to infer from document metadata or find task by uploaded_by
            if (!taskRole && doc.uploaded_by) {
              // Try to find reviewer and get their role
              const docReviewer = Object.values(reviewers).find(r => r.user_id === doc.uploaded_by);
              if (docReviewer && docReviewer.roles && docReviewer.roles.length > 0) {
                taskRole = docReviewer.roles[0];
              }
            }
            
            const roleLabel = getRoleLabel(taskRole) || 'Unknown Role';
            
            // Initialize role if not exists
            if (!documentsByRole[roleLabel]) {
              documentsByRole[roleLabel] = {};
            }
            
            // Initialize subtask group if not exists
            // Try multiple sources for subtask name
            let subtaskName = 'General Documents';
            if (subtask?.title) {
              subtaskName = subtask.title;
            } else if (doc.subtask_id && task) {
              // If we have subtask_id but couldn't find the subtask, try searching one more time
              if (task.subtasks && Array.isArray(task.subtasks)) {
                const foundSubtask = task.subtasks.find(st => String(st.subtask_id) === String(doc.subtask_id));
                if (foundSubtask?.title) {
                  subtaskName = foundSubtask.title;
                } else {
                  // Fallback: show document type or task info
                  subtaskName = doc.document_type ? `${doc.document_type.replace(/-|_/g, ' ')} Documents` : `${task.task_type || task.title || 'Task'} Documents`;
                }
              } else {
                subtaskName = doc.document_type ? `${doc.document_type.replace(/-|_/g, ' ')} Documents` : `${task.task_type || task.title || 'Task'} Documents`;
              }
            } else if (task) {
              subtaskName = `${task.task_type || task.title || 'Task'} Documents`;
            }
            
            const subtaskId = subtaskKey || (doc.task_id ? `task-${doc.task_id}` : 'general');
            
            // Debug logging
            if (doc.subtask_id && !subtask) {
              console.warn('Document has subtask_id but subtask not found:', {
                document_id: doc.document_id,
                subtask_id: doc.subtask_id,
                task_id: doc.task_id,
                task: task ? task.task_id : null
              });
            }
            
            if (!documentsByRole[roleLabel][subtaskId]) {
              documentsByRole[roleLabel][subtaskId] = {
                subtaskId,
                subtaskName,
                subtask: subtask || null,
                task: task || null,
                documents: []
              };
            }
            
            documentsByRole[roleLabel][subtaskId].documents.push(doc);
          });

          // Calculate stats for each role
          const roleStats = Object.keys(documentsByRole).map(role => {
            const subtaskGroups = Object.values(documentsByRole[role]);
            const totalDocs = subtaskGroups.reduce((sum, group) => sum + group.documents.length, 0);
            
            return {
              role,
              subtaskGroups,
              documentCount: totalDocs
            };
          });

          const toggleRoleAccordion = (role) => {
            setExpandedRoles(prev => ({
              ...prev,
              [role]: !prev[role]
            }));
          };

          const toggleSubtaskAccordion = (subtaskKey) => {
            setExpandedSubtasks(prev => ({
              ...prev,
              [subtaskKey]: !prev[subtaskKey]
            }));
          };

          return (
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Icon name="FileText" size={24} />
                    Reviewer Documents
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Documents grouped by role and subtask - View and download available
                  </p>
                </div>
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg">
                  <span className="text-2xl font-bold">{documents.length}</span>
                  <span className="text-sm ml-2">Documents</span>
                </div>
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Icon name="FileX" size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No task documents uploaded by reviewers</p>
                  <p className="text-sm mt-2">Reviewers haven't uploaded any documents yet during their review process</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roleStats.map(({ role, subtaskGroups, documentCount }) => (
                    <div key={role} className="bg-background border border-border rounded-lg overflow-hidden">
                      {/* Role Accordion Header */}
                      <button
                        onClick={() => toggleRoleAccordion(role)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Icon name="Users" size={20} className="text-primary" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold text-foreground">{role}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {documentCount} document{documentCount !== 1 ? 's' : ''}
                              </span>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">
                                {subtaskGroups.length} subtask{subtaskGroups.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Icon 
                            name={expandedRoles[role] ? "ChevronUp" : "ChevronDown"} 
                            size={20} 
                            className="text-muted-foreground" 
                          />
                        </div>
                      </button>

                      {/* Role Accordion Content */}
                      {expandedRoles[role] && (
                        <div className="border-t border-border p-4 space-y-3">
                          {subtaskGroups.map(({ subtaskId, subtaskName, subtask, task, documents: subtaskDocs }) => {
                            // Get reviewer info - prefer task assignee, fallback to document uploader
                            const reviewerKey = task?.assigned_to ? String(task.assigned_to) : null;
                            const reviewer = reviewerKey ? reviewers[reviewerKey] : null;
                            
                            // Determine reviewer display name - try multiple sources
                            let reviewerName = 'Unknown Reviewer';
                            if (reviewer?.full_name) {
                              reviewerName = reviewer.full_name;
                            } else if (reviewer?.first_name || reviewer?.last_name) {
                              reviewerName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim();
                            } else if (task?.assigned_to_name) {
                              reviewerName = task.assigned_to_name;
                            } else if (subtaskDocs.length > 0) {
                              // Fallback to first document's uploader if task assignee not available
                              const firstDocUploader = subtaskDocs[0]?.uploaded_by;
                              if (firstDocUploader) {
                                const docUploader = reviewers[String(firstDocUploader)];
                                if (docUploader?.full_name) {
                                  reviewerName = docUploader.full_name;
                                } else if (docUploader?.first_name || docUploader?.last_name) {
                                  reviewerName = `${docUploader.first_name || ''} ${docUploader.last_name || ''}`.trim();
                                }
                              }
                            }

                            return (
                              <div key={subtaskId} className="bg-card border border-border rounded-lg overflow-hidden">
                                {/* Subtask Accordion Header */}
                                <button
                                  onClick={() => toggleSubtaskAccordion(subtaskId)}
                                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                      <Icon name="FileText" size={16} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground truncate mb-1">
                                        {subtaskName}
                                      </h4>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span>{subtaskDocs.length} document{subtaskDocs.length !== 1 ? 's' : ''}</span>
                                        <span>•</span>
                                        <span>Uploaded by: {reviewerName}</span>
                                        {subtask?.status && (
                                          <>
                                            <span>•</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subtask.status)}`}>
                                              {subtask.status}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Icon 
                                    name={expandedSubtasks[subtaskId] ? "ChevronUp" : "ChevronDown"} 
                                    size={18} 
                                    className="text-muted-foreground ml-3 flex-shrink-0" 
                                  />
                                </button>

                                {/* Subtask Accordion Content */}
                                {expandedSubtasks[subtaskId] && (
                                  <div className="border-t border-border p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {subtaskDocs.map((doc) => {
                                        // Find the reviewer who uploaded this document
                                        const docReviewer = Object.values(reviewers).find(r => r.user_id === doc.uploaded_by);
                                        // Determine reviewer display name
                                        let docReviewerName = 'Unknown Reviewer';
                                        if (docReviewer?.full_name) {
                                          docReviewerName = docReviewer.full_name;
                                        } else if (docReviewer?.first_name || docReviewer?.last_name) {
                                          docReviewerName = `${docReviewer.first_name || ''} ${docReviewer.last_name || ''}`.trim();
                                        }
                                        
                                        return (
                                          <div
                                            key={doc.document_id}
                                            className="bg-background border border-border rounded-lg p-4 hover:shadow-md transition-all"
                                          >
                                            <div className="flex items-start gap-3 mb-3">
                                              <div className="flex-shrink-0">
                                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                                  <Icon 
                                                    name={doc.mime_type?.includes('pdf') ? 'FileText' : doc.mime_type?.includes('image') ? 'Image' : 'File'} 
                                                    size={24} 
                                                    className="text-primary" 
                                                  />
                                                </div>
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <h5 className="font-medium text-foreground text-sm mb-1 truncate" title={doc.file_name}>
                                                  {doc.file_name || 'Unnamed Document'}
                                                </h5>
                                                <div className="space-y-1">
                                                  <p className="text-xs text-muted-foreground">
                                                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded">
                                                      {doc.document_type?.replace(/-|_/g, ' ').toUpperCase() || 'DOCUMENT'}
                                                    </span>
                                                  </p>
                                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Icon name="User" size={12} />
                                                    Uploaded by: {docReviewerName}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Icon name="HardDrive" size={12} />
                                                    {formatFileSize(doc.file_size)}
                                                  </p>
                                                  {doc.created_at && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                      <Icon name="Calendar" size={12} />
                                                      {new Date(doc.created_at).toLocaleDateString()}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Action Buttons */}
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                                              <button
                                                onClick={() => handleViewDocument(doc)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-md text-xs font-medium transition-colors"
                                              >
                                                <Icon name="Eye" size={14} />
                                                View
                                              </button>
                                              <button
                                                onClick={() => handleDownloadDocument(doc)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted-foreground/20 text-foreground rounded-md text-xs font-medium transition-colors"
                                              >
                                                <Icon name="Download" size={14} />
                                                Download
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex h-[calc(100vh-300px)] bg-card border border-border rounded-lg overflow-hidden">
            {/* Participants Sidebar */}
            <div className="w-1/3 border-r border-border bg-background relative flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Icon name="Users" size={20} className="text-primary" />
                    Project Members
                    {chatUnreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {chatUnreadCount}
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a team member to start chatting
                </p>
              </div>
              
              <div 
                ref={participantsListRef}
                className="flex-1 overflow-y-auto relative"
                onScroll={(e) => {
                  const element = e.target;
                  // Show scroll to top button if scrolled down more than 100px
                  setShowScrollToTop(element.scrollTop > 100);
                }}
              >
                {loadingChatParticipants ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Loading participants...</span>
                  </div>
                ) : chatParticipants.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <div className="text-center">
                      <Icon name="Users" size={48} className="mx-auto mb-2 opacity-50" />
                      <p>No team members found</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {chatParticipants.map((participant) => {
                    const isSelected = selectedChatParticipant?.user_id === participant.user_id;
                    const lastMessage = participant.lastMessage;
                    
                    return (
                      <button
                        key={participant.user_id}
                        onClick={() => handleChatParticipantSelect(participant)}
                        className={`w-full p-4 text-left border-b border-border hover:bg-muted transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary">
                              {participant.avatar || participant.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                              participant.status === 'online' ? 'bg-green-500' : 
                              participant.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`font-medium truncate ${participant.unreadCount > 0 ? 'font-semibold' : ''}`}>
                                {participant.name}
                              </h4>
                              {participant.unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {participant.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {formatRoleName(participant.role)}
                            </p>
                            {lastMessage && (
                              <p className="text-xs text-muted-foreground truncate mt-1">
                                {lastMessage.length > 40 ? `${lastMessage.substring(0, 40)}...` : lastMessage}
                              </p>
                            )}
                            {participant.lastMessageTime && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatChatTimestamp(participant.lastMessageTime)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  </>
                )}
              </div>
              
              {/* Scroll to Top Button - Fixed at bottom of sidebar */}
              {showScrollToTop && (
                <button
                  onClick={() => {
                    if (participantsListRef.current) {
                      participantsListRef.current.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  className="absolute bottom-4 right-4 w-10 h-10 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center z-10"
                  title="Scroll to top"
                >
                  <Icon name="ChevronUp" size={20} />
                </button>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
              {!selectedChatParticipant ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Icon name="MessageCircle" size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Select a team member to start chatting</p>
                    <p className="text-sm mt-2">Choose someone from the list to view your conversation</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-border bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-medium text-primary">
                          {selectedChatParticipant.avatar || selectedChatParticipant.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{selectedChatParticipant.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatRoleName(selectedChatParticipant.role)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingChatConversations ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      (chatConversations[selectedChatParticipant.user_id] || []).map((message) => {
                        const isOwnMessage = message.sender_id === user?.user_id;
                        
                        return (
                          <div
                            key={message.message_id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                              {!isOwnMessage && (
                                <p className="text-xs text-muted-foreground mb-1 px-2">
                                  {message.sender_name}
                                </p>
                              )}
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  isOwnMessage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <div className="flex items-center justify-end gap-2 mt-1">
                                  {message.is_urgent && (
                                    <Icon name="AlertTriangle" size={12} className="text-warning" />
                                  )}
                                  <span className={`text-xs ${
                                    isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                  }`}>
                                    {formatChatTimestamp(message.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-border bg-card">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={newChatMessage}
                        onChange={(e) => setNewChatMessage(e.target.value)}
                        onKeyPress={handleChatKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 min-h-[60px] max-h-[120px] px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={2}
                      />
                      <button
                        onClick={handleSendChatMessage}
                        disabled={!newChatMessage.trim() || isSendingMessage || !isChatConnected}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        {isSendingMessage ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Icon name="Send" size={18} />
                            <span>Send</span>
                          </>
                        )}
                      </button>
                    </div>
                    {!isChatConnected && (
                      <p className="text-xs text-warning mt-2 flex items-center gap-1">
                        <Icon name="AlertCircle" size={12} />
                        Not connected. Messages may not be delivered in real-time.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandownerProjectReview;
