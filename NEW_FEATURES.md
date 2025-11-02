# F-Chat New Features Documentation

This document describes the new features added to the F-Chat application.

## Table of Contents
1. [Voice Messages](#voice-messages)
2. [Email Integration](#email-integration)
3. [Broadcast Messaging](#broadcast-messaging)
4. [Real-time Audio/Video Calls](#real-time-audiovideo-calls)
5. [Enhanced File Support](#enhanced-file-support)

---

## Voice Messages

### Overview
Users can now send voice messages in chat rooms. Voice messages are treated as a special message type with audio file attachments.

### Features
- Record and send voice messages
- Audio file upload support (mp3, wav, ogg, webm, etc.)
- Voice message playback in chat
- Voice message duration tracking

### Message Type
- New message type: `Voice` added to Chat Message doctype

### API Usage
```python
# Upload voice file
response = frappe.call({
    'method': 'f_chat.upload_chat_file',
    'args': {
        'room_id': 'CR-0001'
    },
    'files': voice_file  # Audio file
})

# Send voice message
frappe.call({
    'method': 'f_chat.send_message',
    'args': {
        'room_id': 'CR-0001',
        'message_content': 'Voice message',
        'message_type': 'Voice',
        'attachments': [response.data.files[0]]
    }
})
```

### Technical Details
- Supported audio formats: `audio/*` MIME types
- File upload API automatically detects audio files via `is_audio` flag
- Maximum file size: 25MB (configurable in Chat Settings)

---

## Email Integration

### Overview
Send chat messages and files via email directly from the chat interface. This feature allows sharing messages with room members or external recipients via email.

### Features

#### 1. Send Message via Email
Send existing chat messages to recipients via email with formatted HTML templates.

**API Endpoint:** `f_chat.send_message_via_email`

**Parameters:**
- `message_id` (str): Chat Message ID to send
- `recipients` (list, optional): Email addresses (defaults to room members)
- `subject` (str, optional): Email subject
- `additional_message` (str, optional): Additional context to include

**Example:**
```python
frappe.call({
    'method': 'f_chat.send_message_via_email',
    'args': {
        'message_id': 'MSG-0001',
        'recipients': ['user1@example.com', 'user2@example.com'],
        'subject': 'Important Message from Project Chat',
        'additional_message': 'Please review this message urgently.'
    }
})
```

**Email Template Features:**
- Professional HTML formatting
- Message content with sender info
- Room context (room name, timestamp)
- File attachments included
- Direct link back to F-Chat
- Additional message support

#### 2. Send File via Email
Share files from chat directly via email.

**API Endpoint:** `f_chat.send_file_via_email`

**Parameters:**
- `room_id` (str): Chat Room ID
- `file_url` (str): File URL to send
- `file_name` (str): File name
- `recipients` (list, optional): Email addresses
- `subject` (str, optional): Email subject
- `message_content` (str, optional): Message to include with file

**Example:**
```python
frappe.call({
    'method': 'f_chat.send_file_via_email',
    'args': {
        'room_id': 'CR-0001',
        'file_url': '/private/files/document.pdf',
        'file_name': 'Project_Proposal.pdf',
        'message_content': 'Here is the updated project proposal.'
    }
})
```

#### 3. Get Available Recipients
Get list of room members with email addresses.

**API Endpoint:** `f_chat.get_available_email_recipients`

**Example:**
```python
frappe.call({
    'method': 'f_chat.get_available_email_recipients',
    'args': {
        'room_id': 'CR-0001'
    }
})
```

**Returns:**
```json
{
    "success": true,
    "data": {
        "recipients": [
            {
                "user": "user1@example.com",
                "full_name": "John Doe",
                "email": "user1@example.com",
                "user_image": "/files/user1.jpg",
                "is_current_user": false
            }
        ],
        "total_count": 5
    }
}
```

### Use Cases
- Share important messages with external stakeholders
- Email meeting notes to attendees
- Send files to users who don't have chat access
- Archive important conversations via email
- Forward urgent messages to management

---

## Broadcast Messaging

### Overview
Send a single message to multiple chat rooms simultaneously. Perfect for announcements, company-wide notifications, or team updates.

### Features
- Send messages to multiple rooms at once
- Attach files to broadcast messages
- View broadcast history
- Get list of available rooms for broadcasting
- Track successful and failed broadcasts

### APIs

#### 1. Send Broadcast Message
**API Endpoint:** `f_chat.send_broadcast_message`

**Parameters:**
- `room_ids` (list): List of Chat Room IDs
- `message_content` (str): Message content
- `message_type` (str, optional): Default "Broadcast"
- `attachments` (list, optional): File attachments

**Example:**
```python
frappe.call({
    'method': 'f_chat.send_broadcast_message',
    'args': {
        'room_ids': ['CR-0001', 'CR-0002', 'CR-0003'],
        'message_content': 'System maintenance scheduled for tonight at 10 PM.',
        'attachments': [
            {
                'file_name': 'maintenance_schedule.pdf',
                'file_url': '/files/schedule.pdf',
                'file_type': 'application/pdf',
                'file_size': 102400
            }
        ]
    }
})
```

**Response:**
```json
{
    "success": true,
    "message": "Broadcast sent to 3 out of 3 rooms",
    "data": {
        "successful_broadcasts": [
            {
                "room_id": "CR-0001",
                "room_name": "General",
                "message_id": "MSG-0123",
                "timestamp": "2025-01-15 14:30:00"
            }
        ],
        "failed_broadcasts": [],
        "success_count": 3,
        "failure_count": 0
    }
}
```

#### 2. Get Broadcast Rooms
Get list of rooms where user can send broadcasts.

**API Endpoint:** `f_chat.get_broadcast_rooms`

**Parameters:**
- `search` (str, optional): Search term for room names

**Example:**
```python
frappe.call({
    'method': 'f_chat.get_broadcast_rooms',
    'args': {
        'search': 'project'
    }
})
```

#### 3. Get Broadcast History
View history of broadcast messages sent by the current user.

**API Endpoint:** `f_chat.get_broadcast_history`

**Parameters:**
- `page` (int, optional): Page number (default: 1)
- `page_size` (int, optional): Records per page (default: 20)

**Example:**
```python
frappe.call({
    'method': 'f_chat.get_broadcast_history',
    'args': {
        'page': 1,
        'page_size': 20
    }
})
```

### Message Type
- New message type: `Broadcast` added to Chat Message doctype

### Permissions
- Users can only broadcast to rooms where they are members
- Muted users cannot send broadcasts
- Broadcast permissions follow standard room permissions

### Use Cases
- Company-wide announcements
- Emergency notifications
- Policy updates
- Event reminders
- System maintenance notifications
- Multi-team coordination

---

## Real-time Audio/Video Calls

### Overview
Complete WebRTC-based audio and video calling system for direct and group calls within chat rooms.

### Features
- **Audio Calls**: Voice-only calls with low bandwidth usage
- **Video Calls**: Full video calling with screen sharing support
- **Group Calls**: Multiple participants in a single call
- **Call Management**: Initiate, join, leave, reject calls
- **Call History**: Complete call logs with duration tracking
- **Real-time Signaling**: WebRTC signaling via WebSocket
- **Participant Management**: Track who's in the call
- **Call Status**: Real-time call status updates

### New Doctypes

#### Chat Call Session
Stores call session information.

**Fields:**
- `chat_room`: Link to Chat Room
- `call_type`: Audio/Video
- `call_status`: Initiated/Ringing/Connected/Ended/Failed/Rejected/Missed
- `initiated_by`: User who started the call
- `start_time`: Call start timestamp
- `end_time`: Call end timestamp
- `participants`: Table of participants
- `session_id`: Unique WebRTC session ID
- `ice_servers_config`: ICE servers configuration (JSON)
- `total_duration`: Call duration in seconds
- `recording_url`: Recording URL (if recorded)
- `is_recorded`: Recording flag

#### Chat Call Participant
Tracks individual participants in a call (child table).

**Fields:**
- `user`: User ID
- `status`: Invited/Ringing/Joined/Left/Rejected
- `joined_time`: When user joined
- `left_time`: When user left
- `duration`: Participant's call duration

### APIs

#### 1. Initiate Call
Start a new call in a room.

**API Endpoint:** `f_chat.initiate_call`

**Parameters:**
- `room_id` (str): Chat Room ID
- `call_type` (str): "Audio" or "Video"
- `participants` (list, optional): User IDs to invite (defaults to all room members)

**Example:**
```python
response = frappe.call({
    'method': 'f_chat.initiate_call',
    'args': {
        'room_id': 'CR-0001',
        'call_type': 'Video',
        'participants': ['user1@example.com', 'user2@example.com']
    }
})
```

**Response:**
```json
{
    "success": true,
    "message": "Call initiated successfully",
    "data": {
        "call_session_id": "CALL-0001",
        "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "room_id": "CR-0001",
        "call_type": "Video",
        "ice_servers": [
            {"urls": "stun:stun.l.google.com:19302"}
        ],
        "participants": ["user1@example.com", "user2@example.com"]
    }
}
```

#### 2. Join Call
Join an ongoing call.

**API Endpoint:** `f_chat.join_call`

**Parameters:**
- `call_session_id` (str): Call Session ID

**Example:**
```python
frappe.call({
    'method': 'f_chat.join_call',
    'args': {
        'call_session_id': 'CALL-0001'
    }
})
```

#### 3. Leave Call
Leave an ongoing call.

**API Endpoint:** `f_chat.leave_call`

**Parameters:**
- `call_session_id` (str): Call Session ID

**Example:**
```python
frappe.call({
    'method': 'f_chat.leave_call',
    'args': {
        'call_session_id': 'CALL-0001'
    }
})
```

#### 4. Reject Call
Reject a call invitation.

**API Endpoint:** `f_chat.reject_call`

**Parameters:**
- `call_session_id` (str): Call Session ID

**Example:**
```python
frappe.call({
    'method': 'f_chat.reject_call',
    'args': {
        'call_session_id': 'CALL-0001'
    }
})
```

#### 5. Send WebRTC Signal
Send WebRTC signaling data (offer, answer, ICE candidates).

**API Endpoint:** `f_chat.send_webrtc_signal`

**Parameters:**
- `call_session_id` (str): Call Session ID
- `signal_type` (str): "offer", "answer", or "ice-candidate"
- `signal_data` (dict): Signal data (SDP or ICE candidate)
- `target_user` (str, optional): Target user (broadcasts to all if not specified)

**Example:**
```python
# Send offer
frappe.call({
    'method': 'f_chat.send_webrtc_signal',
    'args': {
        'call_session_id': 'CALL-0001',
        'signal_type': 'offer',
        'signal_data': {
            'type': 'offer',
            'sdp': '...'
        },
        'target_user': 'user2@example.com'
    }
})

# Send ICE candidate
frappe.call({
    'method': 'f_chat.send_webrtc_signal',
    'args': {
        'call_session_id': 'CALL-0001',
        'signal_type': 'ice-candidate',
        'signal_data': {
            'candidate': '...',
            'sdpMLineIndex': 0,
            'sdpMid': 'audio'
        }
    }
})
```

#### 6. Get Active Call
Check if there's an active call in a room.

**API Endpoint:** `f_chat.get_active_call`

**Parameters:**
- `room_id` (str): Chat Room ID

**Example:**
```python
frappe.call({
    'method': 'f_chat.get_active_call',
    'args': {
        'room_id': 'CR-0001'
    }
})
```

**Response:**
```json
{
    "success": true,
    "data": {
        "has_active_call": true,
        "call": {
            "call_session_id": "CALL-0001",
            "session_id": "a1b2c3d4...",
            "call_type": "Video",
            "call_status": "Connected",
            "initiated_by": "user1@example.com",
            "start_time": "2025-01-15 14:30:00",
            "participants": [
                {
                    "user": "user1@example.com",
                    "full_name": "John Doe",
                    "status": "Joined",
                    "joined_time": "2025-01-15 14:30:00"
                }
            ],
            "ice_servers": [...],
            "is_participant": true
        }
    }
}
```

#### 7. Get Call History
Get call history for a room or all rooms.

**API Endpoint:** `f_chat.get_call_history`

**Parameters:**
- `room_id` (str, optional): Chat Room ID (gets all if not specified)
- `page` (int, optional): Page number
- `page_size` (int, optional): Records per page

**Example:**
```python
frappe.call({
    'method': 'f_chat.get_call_history',
    'args': {
        'room_id': 'CR-0001',
        'page': 1,
        'page_size': 20
    }
})
```

### Real-time Events

The call system publishes the following real-time events:

#### call_initiated
Published when a call is initiated.

```javascript
frappe.realtime.on('call_initiated', (data) => {
    console.log('Call initiated:', data);
    // data: { call_session_id, session_id, room_id, call_type, initiated_by, participants, ice_servers }
});
```

#### call_participant_joined
Published when someone joins the call.

```javascript
frappe.realtime.on('call_participant_joined', (data) => {
    console.log('User joined:', data.user);
    // data: { call_session_id, session_id, user, room_id }
});
```

#### call_participant_left
Published when someone leaves the call.

```javascript
frappe.realtime.on('call_participant_left', (data) => {
    console.log('User left:', data.user);
    // data: { call_session_id, session_id, user, room_id, call_ended }
});
```

#### call_rejected
Published when someone rejects the call.

```javascript
frappe.realtime.on('call_rejected', (data) => {
    console.log('Call rejected by:', data.user);
    // data: { call_session_id, session_id, user, room_id }
});
```

#### webrtc_signal
Published for WebRTC signaling (offer, answer, ICE candidates).

```javascript
frappe.realtime.on('webrtc_signal', (data) => {
    if (data.to_user === frappe.session.user || !data.to_user) {
        // Handle signal
        console.log('Received signal:', data.signal_type);
        // data: { call_session_id, session_id, signal_type, signal_data, from_user, to_user, room_id }
    }
});
```

### WebRTC Implementation Guide

#### Basic Call Flow

1. **Initiator**:
   - Call `initiate_call()` API
   - Create RTCPeerConnection with ICE servers
   - Create offer
   - Send offer via `send_webrtc_signal()`
   - Listen for answer

2. **Receiver**:
   - Receive `call_initiated` event
   - Show incoming call UI
   - On accept, call `join_call()` API
   - Create RTCPeerConnection
   - Wait for offer signal
   - Create answer
   - Send answer via `send_webrtc_signal()`

3. **Both parties**:
   - Exchange ICE candidates via `send_webrtc_signal()`
   - Handle media streams
   - Display video/audio

#### Example WebRTC Setup

```javascript
// Create peer connection
const pc = new RTCPeerConnection({
    iceServers: ice_servers  // From initiate_call response
});

// Handle ICE candidates
pc.onicecandidate = (event) => {
    if (event.candidate) {
        frappe.call({
            method: 'f_chat.send_webrtc_signal',
            args: {
                call_session_id: call_session_id,
                signal_type: 'ice-candidate',
                signal_data: event.candidate
            }
        });
    }
};

// Handle remote stream
pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
};

// Add local stream
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        localVideo.srcObject = stream;
        stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
        });
    });
```

### Call Permissions
- Only room members can initiate calls
- Only one active call per room at a time
- Users can join calls in rooms they're members of
- Call history is visible to participants only

### Use Cases
- One-on-one video meetings
- Team standup calls
- Group discussions
- Remote collaboration
- Customer support calls
- Interview calls

---

## Enhanced File Support

### Overview
Extended file type support including audio and video files.

### Supported File Types
- **Images**: image/* (jpg, png, gif, etc.)
- **Documents**: PDF, DOC, DOCX, XLS, XLSX
- **Text files**: text/*
- **Audio files**: audio/* (mp3, wav, ogg, webm, m4a, etc.) **[NEW]**
- **Video files**: video/* (mp4, webm, avi, etc.) **[NEW]**

### File Size Limit
- Maximum: 25MB (configurable in Chat Settings)
- Can be adjusted per installation

### Audio File Detection
The file upload API now automatically detects audio files:

```python
{
    "file_name": "recording.mp3",
    "file_url": "/files/recording.mp3",
    "file_type": "audio/mpeg",
    "file_size": 1048576,
    "is_audio": true  # New flag
}
```

### Configuration
Update in Chat Settings or hooks.py:

```python
website_context = {
    "chat_enabled": True,
    "max_file_size": 26214400,  # 25MB
    "supported_file_types": [
        "image/*",
        "application/pdf",
        "text/*",
        ".doc", ".docx",
        ".xls", ".xlsx",
        "audio/*",  # NEW
        "video/*"   # NEW
    ]
}
```

---

## API Summary

### Email APIs
- `f_chat.send_message_via_email` - Send message via email
- `f_chat.send_file_via_email` - Send file via email
- `f_chat.get_available_email_recipients` - Get email recipients

### Broadcast APIs
- `f_chat.send_broadcast_message` - Send broadcast to multiple rooms
- `f_chat.get_broadcast_rooms` - Get rooms available for broadcast
- `f_chat.get_broadcast_history` - Get broadcast history

### Call Management APIs
- `f_chat.initiate_call` - Start a call
- `f_chat.join_call` - Join a call
- `f_chat.leave_call` - Leave a call
- `f_chat.reject_call` - Reject a call
- `f_chat.send_webrtc_signal` - Send WebRTC signaling data
- `f_chat.get_active_call` - Check for active call
- `f_chat.get_call_history` - Get call history

---

## Migration Notes

### Database Changes
1. Chat Message doctype: New message types added (Voice, Broadcast)
2. New doctypes: Chat Call Session, Chat Call Participant
3. No data migration required - changes are additive

### Deployment Steps
1. Pull latest code
2. Run `bench migrate` to create new doctypes
3. Clear cache: `bench clear-cache`
4. Restart bench: `bench restart`
5. Test new features in development first

### Backwards Compatibility
- All existing features remain unchanged
- Existing chat messages are not affected
- New message types are optional
- Team Master is still supported but optional

---

## Security Considerations

### Email Integration
- Only room members can send messages via email
- Email sending is logged in Comment doctype
- Recipients are validated against room membership
- Email templates use HTML escaping for safety

### Broadcast Messages
- Users must be room members to broadcast
- Muted users cannot broadcast
- Each room's permissions are checked individually
- Failed broadcasts are logged separately

### Call Security
- WebRTC connections are peer-to-peer (encrypted by default)
- Signaling goes through server (can be secured with SSL/TLS)
- Only room members can initiate/join calls
- Call sessions are isolated per room
- ICE servers should be configured with TURN servers for production

### Recommended Call Setup
For production deployments:
1. Use TURN servers (not just STUN)
2. Configure TURN authentication
3. Use SSL/TLS for signaling
4. Implement call recording policies
5. Set up call duration limits
6. Monitor bandwidth usage

---

## Support & Troubleshooting

### Common Issues

#### Email not sending
- Check Frappe email settings
- Verify SMTP configuration
- Check email queue: `bench doctor`

#### Calls not connecting
- Verify ICE servers configuration
- Check firewall settings for WebRTC ports
- Test with STUN servers first
- Use TURN servers for restrictive networks

#### Broadcast failing
- Verify room membership
- Check if user is muted
- Verify room status is Active

### Debug Mode
Enable debug logging in hooks.py:
```python
# Add to site_config.json
{
    "developer_mode": 1,
    "log_level": "DEBUG"
}
```

### Getting Help
- Check error logs: `bench logs`
- Review browser console for client-side issues
- Check Frappe error log doctype
- Enable WebRTC debug logging in browser

---

## Future Enhancements

### Planned Features
- Call recording and playback
- Screen sharing in video calls
- Call notifications with ringtones
- Call waiting and hold
- Conference call management
- Call analytics and reporting
- Voice message transcription
- Email templates customization
- Scheduled broadcasts
- Broadcast to all rooms option

---

## Credits

Developed by: bluephoenix
License: GPL-3.0
Version: 1.0.0
Date: January 2025
