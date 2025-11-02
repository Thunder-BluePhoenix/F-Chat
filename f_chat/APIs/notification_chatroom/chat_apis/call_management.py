# f_chat/APIs/notification_chatroom/chat_apis/call_management.py
import frappe
from frappe import _
from frappe.utils import now_datetime, time_diff_in_seconds
import json
import uuid

@frappe.whitelist()
def initiate_call(room_id, call_type="Audio", participants=None):
    """
    Initiate a call in a chat room

    Args:
        room_id (str): Chat Room ID
        call_type (str): Type of call (Audio/Video)
        participants (list): List of user IDs to invite (optional)

    Returns:
        dict: Call session details
    """
    try:
        current_user = frappe.session.user

        # Parse participants if string
        if isinstance(participants, str):
            participants = json.loads(participants) if participants else []

        # Verify user is member of the room
        room = frappe.get_doc("Chat Room", room_id)
        permissions = room.get_member_permissions(current_user)

        if not permissions["is_member"]:
            frappe.throw("You are not a member of this chat room")

        # Check if there's already an active call
        active_calls = frappe.get_all(
            "Chat Call Session",
            filters={
                "chat_room": room_id,
                "call_status": ["in", ["Initiated", "Ringing", "Connected"]]
            },
            limit=1
        )

        if active_calls:
            frappe.throw("There is already an active call in this room")

        # Create call session
        call_session = frappe.new_doc("Chat Call Session")
        call_session.chat_room = room_id
        call_session.call_type = call_type
        call_session.call_status = "Initiated"
        call_session.initiated_by = current_user
        call_session.start_time = now_datetime()
        call_session.session_id = str(uuid.uuid4())

        # Set ICE servers configuration (can be customized)
        ice_servers = [
            {"urls": "stun:stun.l.google.com:19302"},
            {"urls": "stun:stun1.l.google.com:19302"}
        ]
        call_session.ice_servers_config = json.dumps(ice_servers)

        # Add initiator as first participant
        call_session.append("participants", {
            "user": current_user,
            "status": "Joined",
            "joined_time": now_datetime()
        })

        # Add invited participants or all room members
        if not participants:
            # Invite all room members
            room_members = frappe.get_all(
                "Chat Room Member",
                filters={"parent": room_id},
                fields=["user"]
            )
            participants = [m.user for m in room_members if m.user != current_user]

        for user_id in participants:
            if user_id != current_user:
                call_session.append("participants", {
                    "user": user_id,
                    "status": "Invited",
                    "joined_time": None
                })

        call_session.insert(ignore_permissions=True)

        # Update status to Ringing after insertion
        call_session.call_status = "Ringing"
        call_session.save(ignore_permissions=True)

        # Create system message in chat
        system_message = frappe.new_doc("Chat Message")
        system_message.chat_room = room_id
        system_message.sender = current_user
        system_message.message_type = "System"
        system_message.message_content = f"{call_type} call initiated"
        system_message.timestamp = now_datetime()
        system_message.insert(ignore_permissions=True)

        # Broadcast call initiation to room members
        frappe.publish_realtime(
            event="call_initiated",
            message={
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "room_id": room_id,
                "call_type": call_type,
                "initiated_by": current_user,
                "participants": participants,
                "ice_servers": ice_servers
            },
            room=f"chat_room_{room_id}"
        )

        return {
            "success": True,
            "message": "Call initiated successfully",
            "data": {
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "room_id": room_id,
                "call_type": call_type,
                "ice_servers": ice_servers,
                "participants": participants
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in initiate_call: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def join_call(call_session_id):
    """
    Join an ongoing call

    Args:
        call_session_id (str): Call Session ID

    Returns:
        dict: Success response
    """
    try:
        current_user = frappe.session.user

        # Get call session
        call_session = frappe.get_doc("Chat Call Session", call_session_id)

        # Verify user is member of the room
        room = frappe.get_doc("Chat Room", call_session.chat_room)
        permissions = room.get_member_permissions(current_user)

        if not permissions["is_member"]:
            frappe.throw("You are not a member of this chat room")

        # Check if call is still active
        if call_session.call_status not in ["Initiated", "Ringing", "Connected"]:
            frappe.throw("This call is no longer active")

        # Update participant status
        participant_found = False
        for participant in call_session.participants:
            if participant.user == current_user:
                participant.status = "Joined"
                participant.joined_time = now_datetime()
                participant_found = True
                break

        # If not in participant list, add them
        if not participant_found:
            call_session.append("participants", {
                "user": current_user,
                "status": "Joined",
                "joined_time": now_datetime()
            })

        # Update call status to Connected if it was Initiated
        if call_session.call_status == "Initiated":
            call_session.call_status = "Connected"

        call_session.save(ignore_permissions=True)

        # Broadcast participant joined
        frappe.publish_realtime(
            event="call_participant_joined",
            message={
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "user": current_user,
                "room_id": call_session.chat_room
            },
            room=f"chat_room_{call_session.chat_room}"
        )

        # Get ICE servers
        ice_servers = json.loads(call_session.ice_servers_config) if call_session.ice_servers_config else []

        return {
            "success": True,
            "message": "Joined call successfully",
            "data": {
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "call_type": call_session.call_type,
                "ice_servers": ice_servers,
                "active_participants": call_session.get_active_participants()
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in join_call: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def leave_call(call_session_id):
    """
    Leave an ongoing call

    Args:
        call_session_id (str): Call Session ID

    Returns:
        dict: Success response
    """
    try:
        current_user = frappe.session.user

        # Get call session
        call_session = frappe.get_doc("Chat Call Session", call_session_id)

        # Update participant status
        for participant in call_session.participants:
            if participant.user == current_user:
                participant.status = "Left"
                participant.left_time = now_datetime()

                # Calculate duration
                if participant.joined_time:
                    participant.duration = time_diff_in_seconds(
                        now_datetime(),
                        participant.joined_time
                    )
                break

        # Check if all participants have left
        all_left = True
        for participant in call_session.participants:
            if participant.status == "Joined":
                all_left = False
                break

        # If all left or only initiator remains, end the call
        if all_left:
            call_session.call_status = "Ended"
            call_session.end_time = now_datetime()

        call_session.save(ignore_permissions=True)

        # Broadcast participant left
        frappe.publish_realtime(
            event="call_participant_left",
            message={
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "user": current_user,
                "room_id": call_session.chat_room,
                "call_ended": call_session.call_status == "Ended"
            },
            room=f"chat_room_{call_session.chat_room}"
        )

        # If call ended, create system message
        if call_session.call_status == "Ended":
            system_message = frappe.new_doc("Chat Message")
            system_message.chat_room = call_session.chat_room
            system_message.sender = current_user
            system_message.message_type = "System"
            system_message.message_content = f"Call ended (Duration: {call_session.total_duration}s)"
            system_message.timestamp = now_datetime()
            system_message.insert(ignore_permissions=True)

        return {
            "success": True,
            "message": "Left call successfully",
            "data": {
                "call_ended": call_session.call_status == "Ended"
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in leave_call: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def reject_call(call_session_id):
    """
    Reject a call invitation

    Args:
        call_session_id (str): Call Session ID

    Returns:
        dict: Success response
    """
    try:
        current_user = frappe.session.user

        # Get call session
        call_session = frappe.get_doc("Chat Call Session", call_session_id)

        # Update participant status
        for participant in call_session.participants:
            if participant.user == current_user:
                participant.status = "Rejected"
                break

        call_session.save(ignore_permissions=True)

        # Broadcast rejection
        frappe.publish_realtime(
            event="call_rejected",
            message={
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "user": current_user,
                "room_id": call_session.chat_room
            },
            room=f"chat_room_{call_session.chat_room}"
        )

        return {
            "success": True,
            "message": "Call rejected"
        }

    except Exception as e:
        frappe.log_error(f"Error in reject_call: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def send_webrtc_signal(call_session_id, signal_type, signal_data, target_user=None):
    """
    Send WebRTC signaling data (offer, answer, ICE candidate)

    Args:
        call_session_id (str): Call Session ID
        signal_type (str): Type of signal (offer, answer, ice-candidate)
        signal_data (dict): Signal data
        target_user (str): Target user for the signal (optional, broadcasts to all if not specified)

    Returns:
        dict: Success response
    """
    try:
        current_user = frappe.session.user

        # Parse signal_data if string
        if isinstance(signal_data, str):
            signal_data = json.loads(signal_data)

        # Get call session
        call_session = frappe.get_doc("Chat Call Session", call_session_id)

        # Verify user is part of the call
        is_participant = False
        for participant in call_session.participants:
            if participant.user == current_user:
                is_participant = True
                break

        if not is_participant:
            frappe.throw("You are not a participant in this call")

        # Broadcast signal
        frappe.publish_realtime(
            event="webrtc_signal",
            message={
                "call_session_id": call_session.name,
                "session_id": call_session.session_id,
                "signal_type": signal_type,
                "signal_data": signal_data,
                "from_user": current_user,
                "to_user": target_user,
                "room_id": call_session.chat_room
            },
            room=f"chat_room_{call_session.chat_room}",
            after_commit=True
        )

        return {
            "success": True,
            "message": "Signal sent successfully"
        }

    except Exception as e:
        frappe.log_error(f"Error in send_webrtc_signal: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def get_active_call(room_id):
    """
    Get active call in a room if any

    Args:
        room_id (str): Chat Room ID

    Returns:
        dict: Active call details or null
    """
    try:
        current_user = frappe.session.user

        # Verify user is member of the room
        room = frappe.get_doc("Chat Room", room_id)
        permissions = room.get_member_permissions(current_user)

        if not permissions["is_member"]:
            frappe.throw("You are not a member of this chat room")

        # Get active call
        active_calls = frappe.get_all(
            "Chat Call Session",
            filters={
                "chat_room": room_id,
                "call_status": ["in", ["Initiated", "Ringing", "Connected"]]
            },
            fields=["name", "session_id", "call_type", "call_status", "initiated_by", "start_time"],
            order_by="start_time desc",
            limit=1
        )

        if not active_calls:
            return {
                "success": True,
                "data": {
                    "has_active_call": False,
                    "call": None
                }
            }

        active_call = active_calls[0]

        # Get call session details
        call_session = frappe.get_doc("Chat Call Session", active_call.name)

        # Get participants
        participants = []
        for participant in call_session.participants:
            user_info = frappe.db.get_value(
                "User",
                participant.user,
                ["full_name", "user_image"],
                as_dict=True
            )

            participants.append({
                "user": participant.user,
                "full_name": user_info.full_name if user_info else participant.user,
                "user_image": user_info.user_image if user_info else None,
                "status": participant.status,
                "joined_time": str(participant.joined_time) if participant.joined_time else None
            })

        # Get ICE servers
        ice_servers = json.loads(call_session.ice_servers_config) if call_session.ice_servers_config else []

        return {
            "success": True,
            "data": {
                "has_active_call": True,
                "call": {
                    "call_session_id": call_session.name,
                    "session_id": call_session.session_id,
                    "call_type": call_session.call_type,
                    "call_status": call_session.call_status,
                    "initiated_by": call_session.initiated_by,
                    "start_time": str(call_session.start_time),
                    "participants": participants,
                    "ice_servers": ice_servers,
                    "is_participant": current_user in [p.user for p in call_session.participants]
                }
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in get_active_call: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def get_call_history(room_id=None, page=1, page_size=20):
    """
    Get call history for a room or all rooms

    Args:
        room_id (str): Chat Room ID (optional, gets all if not specified)
        page (int): Page number
        page_size (int): Records per page

    Returns:
        dict: Call history with pagination
    """
    try:
        current_user = frappe.session.user
        page = int(page) or 1
        page_size = min(int(page_size) or 20, 100)
        offset = (page - 1) * page_size

        # Build filters
        filters = {}
        if room_id:
            # Verify user is member of the room
            room = frappe.get_doc("Chat Room", room_id)
            permissions = room.get_member_permissions(current_user)

            if not permissions["is_member"]:
                frappe.throw("You are not a member of this chat room")

            filters["chat_room"] = room_id

        # Get call sessions
        query = """
            SELECT
                cs.name,
                cs.session_id,
                cs.chat_room,
                cr.room_name,
                cs.call_type,
                cs.call_status,
                cs.initiated_by,
                cs.start_time,
                cs.end_time,
                cs.total_duration,
                (SELECT COUNT(*) FROM `tabChat Call Participant` ccp WHERE ccp.parent = cs.name) as participant_count
            FROM `tabChat Call Session` cs
            INNER JOIN `tabChat Room` cr ON cs.chat_room = cr.name
            INNER JOIN `tabChat Call Participant` ccp ON cs.name = ccp.parent
            WHERE ccp.user = %(user)s
        """

        values = {"user": current_user}

        if room_id:
            query += " AND cs.chat_room = %(room_id)s"
            values["room_id"] = room_id

        query += """
            ORDER BY cs.start_time DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """

        values.update({"limit": page_size, "offset": offset})

        call_sessions = frappe.db.sql(query, values, as_dict=True)

        # Format timestamps
        for session in call_sessions:
            session["start_time"] = str(session.start_time)
            if session.end_time:
                session["end_time"] = str(session.end_time)

            # Get initiator info
            initiator_info = frappe.db.get_value(
                "User",
                session.initiated_by,
                ["full_name"],
                as_dict=True
            )
            session["initiated_by_name"] = initiator_info.full_name if initiator_info else session.initiated_by

        # Get total count
        count_query = """
            SELECT COUNT(DISTINCT cs.name) as total
            FROM `tabChat Call Session` cs
            INNER JOIN `tabChat Call Participant` ccp ON cs.name = ccp.parent
            WHERE ccp.user = %(user)s
        """

        if room_id:
            count_query += " AND cs.chat_room = %(room_id)s"

        total_count = frappe.db.sql(count_query, values, as_dict=True)[0].total
        total_pages = (total_count + page_size - 1) // page_size

        return {
            "success": True,
            "data": {
                "call_sessions": call_sessions,
                "pagination": {
                    "total_count": total_count,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1
                }
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in get_call_history: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }
