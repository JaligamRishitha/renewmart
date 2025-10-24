/**
 * WebSocket service for real-time messaging
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.token = null;
    this.currentTaskId = null;
  }

  /**
   * Connect to WebSocket server
   * @param {string} token - JWT authentication token
   * @param {string} baseUrl - WebSocket server URL
   */
  async connect(token, baseUrl = 'ws://localhost:8000') {
    if (this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    this.token = token;
    const wsUrl = `${baseUrl}/ws?token=${encodeURIComponent(token)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.ws.onopen = (event) => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', event);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.emit('disconnected', event);
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };
  }

  /**
   * Handle incoming WebSocket messages
   * @param {Object} data - Message data
   */
  handleMessage(data) {
    console.log('Received message:', data);
    
    switch (data.type) {
      case 'connection_established':
        this.emit('connection_established', data);
        break;
      case 'new_message':
        this.emit('new_message', data.message);
        break;
      case 'message_sent':
        this.emit('message_sent', data);
        break;
      case 'joined_task':
        this.emit('joined_task', data);
        break;
      case 'left_task':
        this.emit('left_task', data);
        break;
      case 'messages_history':
        this.emit('messages_history', data);
        break;
      case 'error':
        this.emit('error', data);
        break;
      case 'pong':
        this.emit('pong', data);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  /**
   * Send a message through WebSocket
   * @param {Object} message - Message to send
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Send a text message to a task
   * @param {string} taskId - Task ID
   * @param {string} content - Message content
   * @param {string} recipientId - Optional recipient ID
   * @param {boolean} isUrgent - Whether message is urgent
   */
  sendMessage(taskId, content, recipientId = null, isUrgent = false) {
    return this.send({
      type: 'send_message',
      task_id: taskId,
      content: content,
      recipient_id: recipientId,
      is_urgent: isUrgent
    });
  }

  /**
   * Join a task's messaging
   * @param {string} taskId - Task ID
   */
  joinTask(taskId) {
    this.currentTaskId = taskId;
    return this.send({
      type: 'join_task',
      task_id: taskId
    });
  }

  /**
   * Leave a task's messaging
   * @param {string} taskId - Task ID
   */
  leaveTask(taskId) {
    this.currentTaskId = null;
    return this.send({
      type: 'leave_task',
      task_id: taskId
    });
  }

  /**
   * Get message history for a task
   * @param {string} taskId - Task ID
   * @param {number} limit - Number of messages to fetch
   * @param {number} offset - Offset for pagination
   */
  getMessages(taskId, limit = 50, offset = 0) {
    return this.send({
      type: 'get_messages',
      task_id: taskId,
      limit: limit,
      offset: offset
    });
  }

  /**
   * Mark a message as read
   * @param {string} messageId - Message ID
   */
  markAsRead(messageId) {
    return this.send({
      type: 'mark_read',
      message_id: messageId
    });
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    return this.send({
      type: 'ping'
    });
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Handle connection error
   */
  handleConnectionError() {
    this.isConnected = false;
    this.emit('error', { message: 'Connection failed' });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.isConnected = false;
    this.currentTaskId = null;
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get current task ID
   * @returns {string|null} Current task ID
   */
  getCurrentTaskId() {
    return this.currentTaskId;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
