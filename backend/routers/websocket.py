from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.responses import HTMLResponse
import json
import logging
from websocket_service import handle_websocket_connection, manager
from auth import get_current_user_websocket

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """WebSocket endpoint for real-time messaging"""
    await handle_websocket_connection(websocket, token)


@router.get("/ws/test")
async def websocket_test_page():
    """Test page for WebSocket functionality"""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>WebSocket Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            #messages { border: 1px solid #ccc; height: 300px; overflow-y: auto; padding: 10px; }
            #messageInput { width: 70%; }
            #sendButton { width: 25%; }
            .message { margin: 5px 0; padding: 5px; border-radius: 3px; }
            .sent { background-color: #e3f2fd; text-align: right; }
            .received { background-color: #f5f5f5; }
            .system { background-color: #fff3e0; font-style: italic; }
        </style>
    </head>
    <body>
        <h1>WebSocket Messaging Test</h1>
        <div>
            <input type="text" id="tokenInput" placeholder="Enter JWT token" style="width: 100%; margin-bottom: 10px;">
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()">Disconnect</button>
        </div>
        <div>
            <input type="text" id="taskIdInput" placeholder="Task ID" style="width: 30%; margin-right: 10px;">
            <button onclick="joinTask()">Join Task</button>
            <button onclick="leaveTask()">Leave Task</button>
        </div>
        <div id="messages"></div>
        <div>
            <input type="text" id="messageInput" placeholder="Type your message..." style="width: 70%;">
            <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
        
        <script>
            let ws = null;
            let currentTaskId = null;
            
            function connect() {
                const token = document.getElementById('tokenInput').value;
                if (!token) {
                    alert('Please enter a JWT token');
                    return;
                }
                
                ws = new WebSocket(`ws://localhost:8000/ws?token=${encodeURIComponent(token)}`);
                
                ws.onopen = function(event) {
                    addMessage('Connected to WebSocket', 'system');
                };
                
                ws.onmessage = function(event) {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                };
                
                ws.onclose = function(event) {
                    addMessage('Disconnected from WebSocket', 'system');
                };
                
                ws.onerror = function(error) {
                    addMessage('WebSocket error: ' + error, 'system');
                };
            }
            
            function disconnect() {
                if (ws) {
                    ws.close();
                    ws = null;
                }
            }
            
            function joinTask() {
                const taskId = document.getElementById('taskIdInput').value;
                if (!taskId) {
                    alert('Please enter a task ID');
                    return;
                }
                
                currentTaskId = taskId;
                sendWebSocketMessage({
                    type: 'join_task',
                    task_id: taskId
                });
            }
            
            function leaveTask() {
                if (currentTaskId) {
                    sendWebSocketMessage({
                        type: 'leave_task',
                        task_id: currentTaskId
                    });
                    currentTaskId = null;
                }
            }
            
            function sendMessage() {
                const messageInput = document.getElementById('messageInput');
                const content = messageInput.value.trim();
                
                if (!content) {
                    alert('Please enter a message');
                    return;
                }
                
                if (!currentTaskId) {
                    alert('Please join a task first');
                    return;
                }
                
                sendWebSocketMessage({
                    type: 'send_message',
                    task_id: currentTaskId,
                    content: content
                });
                
                messageInput.value = '';
            }
            
            function sendWebSocketMessage(message) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                } else {
                    alert('WebSocket is not connected');
                }
            }
            
            function handleMessage(data) {
                switch(data.type) {
                    case 'connection_established':
                        addMessage('Connection established: ' + data.message, 'system');
                        break;
                    case 'new_message':
                        addMessage(`${data.message.sender_name}: ${data.message.content}`, 'received');
                        break;
                    case 'message_sent':
                        addMessage('Message sent successfully', 'system');
                        break;
                    case 'joined_task':
                        addMessage(`Joined task: ${data.task_id}`, 'system');
                        break;
                    case 'left_task':
                        addMessage(`Left task: ${data.task_id}`, 'system');
                        break;
                    case 'messages_history':
                        addMessage(`Received ${data.messages.length} messages`, 'system');
                        data.messages.forEach(msg => {
                            addMessage(`${msg.sender_name}: ${msg.content}`, 'received');
                        });
                        break;
                    case 'error':
                        addMessage('Error: ' + data.message, 'system');
                        break;
                    default:
                        addMessage('Unknown message type: ' + data.type, 'system');
                }
            }
            
            function addMessage(text, type) {
                const messagesDiv = document.getElementById('messages');
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${type}`;
                messageDiv.textContent = text;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
            
            // Allow sending message with Enter key
            document.getElementById('messageInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)
