# Notification System Setup - Complete

## Changes Made

### 1. POST Endpoint for Creating Notifications
- **Route**: `POST /api/notifications`
- **Description**: Allows manual creation of notifications
- **Access**: Admin can create for any user, users can create for themselves
- **Request Body**:
  ```json
  {
    "user_id": "uuid-here",
    "type": "task_assigned",
    "title": "Notification Title",
    "message": "Notification message",
    "category": "task",
    "data": { "task_id": "...", "land_id": "..." }
  }
  ```

### 2. Improved Database Storage
- Enhanced `create_notification()` function with:
  - Table existence check
  - Better error handling
  - Debug logging
  - Proper JSONB casting for data field

### 3. Frontend Toast Notifications
- **NotificationBellButton**: Shows toast when new notifications arrive
- **NotificationPanel**: Shows toast when new notifications are detected
- Toast appears automatically when unread count increases

### 4. Enhanced Logging
- Added DEBUG print statements throughout notification creation flow
- Logs every step: create → insert → commit → success

## Testing Notifications

### 1. Test via API (POST endpoint):
```bash
curl -X POST "http://127.0.0.1:8000/api/notifications" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_UUID_HERE",
    "type": "test_notification",
    "title": "Test Notification",
    "message": "This is a test notification",
    "category": "system",
    "data": {}
  }'
```

### 2. Check Backend Logs:
When creating a task or assigning a subtask, you should see:
```
DEBUG: Task creation notification check - assigned_to=...
DEBUG: notify_task_assigned called: task_id=..., assigned_to=...
DEBUG: User ... exists, creating notification...
DEBUG: Notification created with ID ..., committing...
DEBUG: Notification ... committed successfully
```

### 3. Verify in Database:
```sql
SELECT * FROM notifications 
WHERE user_id = 'USER_UUID_HERE' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### Notifications Not Storing:
1. **Check if table exists**:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'notifications'
   );
   ```
   
2. **If table doesn't exist**, run:
   ```sql
   -- Run backend/database_notifications_setup.sql in pgAdmin
   ```

3. **Check backend logs** for DEBUG messages showing where it fails

4. **Verify user_id exists**:
   ```sql
   SELECT user_id, email FROM "user" WHERE user_id = 'USER_UUID';
   ```

### Toast Not Appearing:
- Check browser console for errors
- Verify `react-hot-toast` is installed
- Check that unread count is actually increasing (check network tab)

## Next Steps

1. **Assign a task** - Should create notification automatically
2. **Add a collaborator** - Should create notification automatically  
3. **Check notification bell** - Should show count and toast
4. **View notifications panel** - Should show all notifications

## API Endpoints Summary

- `GET /api/notifications` - Get notifications
- `POST /api/notifications` - Create notification (NEW)
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/{id}/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/{id}` - Delete notification

