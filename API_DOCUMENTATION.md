# F_CHAT API DOCUMENTATION

**Date:** 2025-11-03
**Status:** All APIs Verified ✅

---

## 📋 **Table of Contents**

1. [Call Management APIs](#call-management-apis)
2. [Email Integration APIs](#email-integration-apis)
3. [File Upload APIs](#file-upload-apis)
4. [Messaging APIs](#messaging-apis)
5. [Broadcast APIs](#broadcast-apis)
6. [API Usage Examples](#api-usage-examples)

---

## 🎯 **Call Management APIs**

**File:** [call_management.py](f_chat/APIs/notification_chatroom/chat_apis/call_management.py)

### 1. `initiate_call`

Initiate a call in a chat room.

**Method:** `f_chat.initiate_call`

**Parameters:**
- `room_id` (str, required): Chat Room ID
- `call_type` (str, optional): Type of call - "Audio" or "Video" (default: "Audio")
- `participants` (list, optional): List of user IDs to invite (invites all room members if not specified)

**Returns:**
```json
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "call_session_id": "CALL-SESSION-0001",
    "session_id": "uuid-string",
    "room_id": "ROOM-0001",
    "call_type": "Audio",
    "ice_servers": [...],
    "participants": ["user1@example.com", "user2@example.com"]
  }
}
```

**Realtime Event:** Broadcasts `call_initiated` to room members

---

### 2. `join_call`

Join an ongoing call.

**Method:** `f_chat.join_call`

**Parameters:**
- `call_session_id` (str, required): Call Session ID

**Returns:**
```json
{
  "success": true,
  "message": "Joined call successfully",
  "data": {
    "call_session_id": "CALL-SESSION-0001",
    "session_id": "uuid-string",
    "call_type": "Audio",
    "ice_servers": [...],
    "active_participants": [...]
  }
}
```

**Realtime Event:** Broadcasts `call_participant_joined` to room members

---

### 3. `leave_call`

Leave an ongoing call.

**Method:** `f_chat.leave_call`

**Parameters:**
- `call_session_id` (str, required): Call Session ID

**Returns:**
```json
{
  "success": true,
  "message": "Left call successfully",
  "data": {
    "call_ended": false
  }
}
```

**Realtime Event:** Broadcasts `call_participant_left` to room members

**Note:** If all participants leave, the call status changes to "Ended" and a system message is created.

---

### 4. `reject_call`

Reject a call invitation.

**Method:** `f_chat.reject_call`

**Parameters:**
- `call_session_id` (str, required): Call Session ID

**Returns:**
```json
{
  "success": true,
  "message": "Call rejected"
}
```

**Realtime Event:** Broadcasts `call_rejected` to room members

---

### 5. `send_webrtc_signal`

Send WebRTC signaling data (offer, answer, ICE candidate).

**Method:** `f_chat.send_webrtc_signal`

**Parameters:**
- `call_session_id` (str, required): Call Session ID
- `signal_type` (str, required): Type of signal - "offer", "answer", or "ice-candidate"
- `signal_data` (dict/str, required): Signal data (JSON string or dict)
- `target_user` (str, optional): Target user for the signal (broadcasts to all if not specified)

**Returns:**
```json
{
  "success": true,
  "message": "Signal sent successfully"
}
```

**Realtime Event:** Broadcasts `webrtc_signal` to room members

---

### 6. `get_active_call`

Get active call in a room if any.

**Method:** `f_chat.get_active_call`

**Parameters:**
- `room_id` (str, required): Chat Room ID

**Returns:**
```json
{
  "success": true,
  "data": {
    "has_active_call": true,
    "call": {
      "call_session_id": "CALL-SESSION-0001",
      "session_id": "uuid-string",
      "call_type": "Audio",
      "call_status": "Connected",
      "initiated_by": "user@example.com",
      "start_time": "2025-11-03 10:00:00",
      "participants": [...],
      "ice_servers": [...],
      "is_participant": true
    }
  }
}
```

---

### 7. `get_call_history`

Get call history for a room or all rooms.

**Method:** `f_chat.get_call_history`

**Parameters:**
- `room_id` (str, optional): Chat Room ID (gets all if not specified)
- `page` (int, optional): Page number (default: 1)
- `page_size` (int, optional): Records per page (default: 20, max: 100)

**Returns:**
```json
{
  "success": true,
  "data": {
    "call_sessions": [...],
    "pagination": {
      "total_count": 50,
      "page": 1,
      "page_size": 20,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## 📧 **Email Integration APIs**

**File:** [email_integration.py](f_chat/APIs/notification_chatroom/chat_apis/email_integration.py)

### 1. `send_message_via_email`

Send a chat message via email to recipients.

**Method:** `f_chat.send_message_via_email`

**Parameters:**
- `message_id` (str, required): Chat Message ID
- `recipients` (str, optional): JSON string array of email addresses (sends to all room members if not specified)
- `subject` (str, optional): Custom email subject
- `additional_message` (str, optional): Additional context for email recipients

**Returns:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "recipients_count": 5,
    "recipients": ["user1@example.com", "user2@example.com"]
  }
}
```

---

### 2. `send_file_via_email`

Send a chat file via email to recipients.

**Method:** `f_chat.send_file_via_email`

**Parameters:**
- `room_id` (str, required): Chat Room ID
- `file_url` (str, required): URL of the file to send
- `file_name` (str, required): Name of the file
- `recipients` (str, optional): JSON string array of email addresses (sends to all room members if not specified)
- `subject` (str, optional): Custom email subject
- `message_content` (str, optional): Message to include with the file

**Returns:**
```json
{
  "success": true,
  "message": "File sent via email successfully",
  "data": {
    "recipients_count": 5,
    "recipients": ["user1@example.com", "user2@example.com"]
  }
}
```

---

## 📎 **File Upload APIs**

**File:** [file_upload.py](f_chat/APIs/notification_chatroom/chat_apis/file_upload.py)

### 1. `upload_chat_file`

Upload files to a chat room.

**Method:** `f_chat.upload_chat_file`

**Parameters:**
- `room_id` (str, required): Chat Room ID
- Files are uploaded via FormData as 'file' parameter (supports multiple files)

**Returns:**
```json
{
  "success": true,
  "message": "Files uploaded successfully",
  "data": {
    "files": [
      {
        "file_name": "document.pdf",
        "file_url": "/files/document.pdf",
        "file_size": 1024,
        "file_type": "application/pdf",
        "is_private": 0
      }
    ]
  }
}
```

**Usage:**
```javascript
const formData = new FormData();
formData.append('file', fileBlob, 'filename.ext');

const xhr = new XMLHttpRequest();
xhr.open('POST', '/api/method/f_chat.upload_chat_file?room_id=' + roomId);
xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);
xhr.send(formData);
```

---

## 💬 **Messaging APIs**

**File:** [chat_api.py](f_chat/APIs/notification_chatroom/chat_apis/chat_api.py)

### 1. `send_message`

Send a message to a chat room.

**Method:** `f_chat.send_message`

**Parameters:**
- `room_id` (str, required): Chat Room ID
- `message_content` (str, required): Message content
- `message_type` (str, optional): Type of message - "Text", "Voice", "Image", "File", "System", "Broadcast" (default: "Text")
- `reply_to` (str, optional): Message ID being replied to
- `attachments` (str, optional): JSON string array of attachment objects

**Returns:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message_id": "MSG-0001",
    "room_id": "ROOM-0001",
    "sender": "user@example.com",
    "message_content": "Hello",
    "message_type": "Text",
    "timestamp": "2025-11-03 10:00:00"
  }
}
```

**Realtime Event:** Broadcasts message to room members

---

## 📢 **Broadcast APIs**

**File:** [broadcast.py](f_chat/APIs/notification_chatroom/chat_apis/broadcast.py)

### 1. `send_broadcast_message`

Send a broadcast message to multiple rooms.

**Method:** `f_chat.send_broadcast_message`

**Parameters:**
- `room_ids` (str, required): JSON string array of Chat Room IDs
- `message_content` (str, required): Message content
- `message_type` (str, optional): Type of message (default: "Broadcast")
- `attachments` (str, optional): JSON string array of attachment objects

**Returns:**
```json
{
  "success": true,
  "message": "Broadcast sent successfully",
  "data": {
    "success_count": 5,
    "failure_count": 0,
    "total_rooms": 5,
    "results": [...]
  }
}
```

---

### 2. `get_broadcast_rooms`

Get available rooms for broadcasting (rooms where user is member/admin).

**Method:** `f_chat.get_broadcast_rooms`

**Parameters:**
- `search` (str, optional): Search term for filtering rooms

**Returns:**
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "room_id": "ROOM-0001",
        "room_name": "General Discussion",
        "room_type": "Group",
        "member_count": 10,
        "is_admin": true
      }
    ]
  }
}
```

---

## 🚀 **API Usage Examples**

### Example 1: Initiating an Audio Call

```javascript
frappe.call({
    method: 'f_chat.initiate_call',
    args: {
        room_id: 'ROOM-0001',
        call_type: 'Audio'
    },
    callback: function(response) {
        if (response.message && response.message.success) {
            const callData = response.message.data;
            console.log('Call initiated:', callData.call_session_id);

            // Setup WebRTC connection
            ChatWebRTC.setup_webrtc_connection(callData);
        }
    }
});
```

---

### Example 2: Joining a Call

```javascript
frappe.call({
    method: 'f_chat.join_call',
    args: {
        call_session_id: 'CALL-SESSION-0001'
    },
    callback: function(response) {
        if (response.message && response.message.success) {
            const callData = response.message.data;
            ChatWebRTC.setup_webrtc_connection(callData);
        }
    }
});
```

---

### Example 3: Sending a Broadcast Message

```javascript
frappe.call({
    method: 'f_chat.send_broadcast_message',
    args: {
        room_ids: JSON.stringify(['ROOM-0001', 'ROOM-0002', 'ROOM-0003']),
        message_content: 'Important announcement!',
        message_type: 'Broadcast'
    },
    callback: function(response) {
        if (response.message && response.message.success) {
            const data = response.message.data;
            console.log(`Broadcast sent to ${data.success_count} rooms`);
        }
    }
});
```

---

### Example 4: Uploading and Sending a File

```javascript
// Step 1: Upload file
const formData = new FormData();
formData.append('file', fileBlob, 'document.pdf');

const xhr = new XMLHttpRequest();
xhr.open('POST', '/api/method/f_chat.upload_chat_file?room_id=ROOM-0001');
xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);

xhr.onload = function() {
    if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        if (response.message && response.message.success) {
            const uploadedFiles = response.message.data.files;

            // Step 2: Send message with attachment
            frappe.call({
                method: 'f_chat.send_message',
                args: {
                    room_id: 'ROOM-0001',
                    message_content: '📎 Document attached',
                    message_type: 'File',
                    attachments: JSON.stringify(uploadedFiles)
                }
            });
        }
    }
};

xhr.send(formData);
```

---

### Example 5: Voice Recording and Sending

```javascript
// Start recording
await start_voice_recording();

// When user clicks send (not cancel)
stop_voice_recording(true);  // send = true

// Recording stopped event handler will:
// 1. Create audio blob
// 2. Upload via upload_chat_file
// 3. Send message with Voice type
```

---

## 🔄 **Realtime Events**

### Call-Related Events

| Event | Data | Description |
|-------|------|-------------|
| `call_initiated` | `{call_session_id, room_id, call_type, initiated_by, participants, ice_servers}` | Broadcast when call is initiated |
| `call_participant_joined` | `{call_session_id, user, room_id}` | Broadcast when participant joins |
| `call_participant_left` | `{call_session_id, user, room_id, call_ended}` | Broadcast when participant leaves |
| `call_rejected` | `{call_session_id, user, room_id}` | Broadcast when call is rejected |
| `webrtc_signal` | `{call_session_id, signal_type, signal_data, from_user, to_user}` | WebRTC signaling data |

### Listening to Events

```javascript
// Listen for incoming calls
frappe.realtime.on('call_initiated', (data) => {
    if (data.initiated_by !== frappe.session.user) {
        show_incoming_call_dialog(data);
    }
});

// Listen for WebRTC signals
frappe.realtime.on('webrtc_signal', async (data) => {
    if (data.to_user === frappe.session.user) {
        await handleWebRTCSignal(data);
    }
});
```

---

## ✅ **API Verification Summary**

All required APIs have been verified and are present in the codebase:

### Call Management (7 APIs)
- ✅ `initiate_call`
- ✅ `join_call`
- ✅ `leave_call`
- ✅ `reject_call`
- ✅ `send_webrtc_signal`
- ✅ `get_active_call`
- ✅ `get_call_history`

### Email Integration (2 APIs)
- ✅ `send_message_via_email`
- ✅ `send_file_via_email`

### File Upload (1 API)
- ✅ `upload_chat_file`

### Messaging (1 API)
- ✅ `send_message`

### Broadcast (2 APIs)
- ✅ `send_broadcast_message`
- ✅ `get_broadcast_rooms`

**Total: 13 APIs - All Verified ✅**

---

## 🛡️ **Error Handling**

All APIs follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `PERMISSION_DENIED`: User lacks required permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input parameters
- `INTERNAL_ERROR`: Server-side error

---

## 📝 **Notes**

1. **Authentication**: All APIs require the user to be authenticated via Frappe session
2. **Permissions**: Most APIs verify user permissions before execution
3. **Realtime**: Call-related APIs heavily use Frappe's realtime/websocket functionality
4. **CSRF**: File upload APIs require CSRF token in headers
5. **JSON Serialization**: List/dict parameters should be JSON-encoded strings

---

**Last Updated:** 2025-11-03
**Verified By:** Claude AI Assistant
