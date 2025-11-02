# -*- coding: utf-8 -*-
# f_chat/APIs/notification_chatroom/chat_apis/realtime_events_fixed.py
# Fixed realtime events - Uses Chat User Activity instead of User doctype

import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime
from datetime import timedelta
import json

# ============================================================================
# USER STATUS MANAGEMENT (FIXED - Uses Chat User Activity)
# ============================================================================

@frappe.whitelist()
def update_user_status(status="online"):
    """
    Update user online/offline status using Chat User Activity
    
    Args:
        status (str): online, away, busy, offline
        
    Returns:
        dict: Success response
    """
    try:
        user = frappe.session.user
        
        # Get or create Chat User Activity record
        activity_name = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            "name"
        )
        
        if activity_name:
            # Update existing record using db.set_value to avoid locking issues
            frappe.db.set_value(
                "Chat User Activity",
                activity_name,
                {
                    "chat_status": status,
                    "is_online": 1 if status == "online" else 0,
                    "last_activity": now_datetime(),
                    "last_seen": now_datetime() if status != "offline" else None
                },
                update_modified=False  # Don't update modified to reduce conflicts
            )
        else:
            # Create new record
            user_full_name = frappe.db.get_value("User", user, "full_name")
            activity_doc = frappe.get_doc({
                "doctype": "Chat User Activity",
                "user": user,
                "full_name": user_full_name,
                "chat_status": status,
                "is_online": 1 if status == "online" else 0,
                "last_activity": now_datetime(),
                "last_seen": now_datetime()
            })
            activity_doc.insert(ignore_permissions=True, ignore_mandatory=True)
        
        frappe.db.commit()
        
        # Broadcast status change to all users
        frappe.publish_realtime(
            event="user_status_changed",
            message={
                "user": user,
                "status": status,
                "timestamp": str(now_datetime())
            },
            user="all"  # Broadcast to all connected users
        )
        
        return {
            "success": True,
            "status": status,
            "user": user
        }
        
    except Exception as e:
        frappe.log_error(f"Error updating user status: {str(e)}", "User Status Update Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_user_status(user=None):
    """
    Get user online/offline status from Chat User Activity
    
    Args:
        user (str): User email (optional, defaults to current user)
        
    Returns:
        dict: User status information
    """
    try:
        if not user:
            user = frappe.session.user
        
        activity = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            ["chat_status", "is_online", "last_seen", "last_activity", "full_name"],
            as_dict=True
        )
        
        if not activity:
            # Return default offline status if no activity record
            return {
                "success": True,
                "user": user,
                "status": "offline",
                "is_online": 0,
                "last_seen": None,
                "last_activity": None
            }
        
        return {
            "success": True,
            "user": user,
            "status": activity.chat_status,
            "is_online": activity.is_online,
            "last_seen": activity.last_seen,
            "last_activity": activity.last_activity,
            "full_name": activity.full_name
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting user status: {str(e)}", "Get User Status Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_online_users():
    """
    Get list of all currently online users from Chat User Activity
    
    Returns:
        dict: List of online users
    """
    try:
        online_users = frappe.db.get_all(
            "Chat User Activity",
            filters={
                "is_online": 1,
                "chat_status": ["!=", "offline"]
            },
            fields=["user", "full_name", "chat_status", "last_activity"],
            order_by="last_activity desc"
        )
        
        return {
            "success": True,
            "users": online_users,
            "count": len(online_users)
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting online users: {str(e)}", "Get Online Users Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def heartbeat():
    """
    Client heartbeat to keep user status active
    Updates last_activity timestamp to show user is still active
    
    Returns:
        dict: Success response
    """
    try:
        user = frappe.session.user
        
        # Only update last_activity timestamp
        frappe.db.sql("""
            UPDATE `tabChat User Activity`
            SET last_activity = %s
            WHERE user = %s
        """, (now_datetime(), user))
        
        frappe.db.commit()
        
        return {
            "success": True,
            "timestamp": str(now_datetime())
        }
        
    except Exception as e:
        # Don't log errors for heartbeat to avoid spam
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# TYPING INDICATORS (FIXED - Uses Chat User Activity)
# ============================================================================

@frappe.whitelist()
def user_typing(room_id, is_typing=True):
    """
    Broadcast typing indicator for a user in a room
    
    Args:
        room_id (str): Chat Room ID
        is_typing (bool): Whether user is typing or stopped typing
        
    Returns:
        dict: Success response
    """
    try:
        user = frappe.session.user
        
        # Update Chat User Activity with typing status
        activity_name = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            "name"
        )
        
        if activity_name:
            if is_typing:
                # Set typing_in_room when user starts typing
                frappe.db.set_value(
                    "Chat User Activity",
                    activity_name,
                    "typing_in_room",
                    room_id,
                    update_modified=False
                )
            else:
                # Clear typing_in_room when user stops typing
                frappe.db.set_value(
                    "Chat User Activity",
                    activity_name,
                    "typing_in_room",
                    None,
                    update_modified=False
                )
            
            frappe.db.commit()
        
        # Broadcast typing indicator to room
        frappe.publish_realtime(
            event="user_typing",
            message={
                "user": user,
                "room_id": room_id,
                "is_typing": is_typing,
                "timestamp": str(now_datetime())
            },
            room=f"chat_room_{room_id}"
        )
        
        return {
            "success": True,
            "is_typing": is_typing
        }
        
    except Exception as e:
        frappe.log_error(f"Error in user_typing: {str(e)}", "Typing Indicator Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_typing_users(room_id):
    """
    Get list of users currently typing in a room
    
    Args:
        room_id (str): Chat Room ID
        
    Returns:
        dict: List of typing users
    """
    try:
        typing_users = frappe.db.get_all(
            "Chat User Activity",
            filters={"typing_in_room": room_id},
            fields=["user", "full_name"]
        )
        
        return {
            "success": True,
            "users": typing_users,
            "count": len(typing_users)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# USER PRESENCE TRACKING
# ============================================================================

@frappe.whitelist()
def join_room(room_id):
    """
    Mark user as active in a specific room
    
    Args:
        room_id (str): Chat Room ID
        
    Returns:
        dict: Success response
    """
    try:
        user = frappe.session.user
        
        # Verify user is member of room
        is_member = frappe.db.exists(
            "Chat Room Member",
            {"parent": room_id, "user": user}
        )
        
        if not is_member:
            return {
                "success": False,
                "error": "You are not a member of this room"
            }
        
        # Update active room in Chat User Activity
        activity_name = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            "name"
        )
        
        if activity_name:
            frappe.db.set_value(
                "Chat User Activity",
                activity_name,
                {
                    "active_room": room_id,
                    "last_activity": now_datetime()
                },
                update_modified=False
            )
            frappe.db.commit()
        
        # Subscribe to room's realtime events
        frappe.publish_realtime(
            event="user_joined_room",
            message={
                "user": user,
                "room_id": room_id,
                "timestamp": str(now_datetime())
            },
            room=f"chat_room_{room_id}"
        )
        
        return {
            "success": True,
            "room_id": room_id
        }
        
    except Exception as e:
        frappe.log_error(f"Error joining room: {str(e)}", "Join Room Error")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def leave_room(room_id):
    """
    Mark user as leaving a room
    
    Args:
        room_id (str): Chat Room ID
        
    Returns:
        dict: Success response
    """
    try:
        user = frappe.session.user
        
        # Clear active room in Chat User Activity
        activity_name = frappe.db.get_value(
            "Chat User Activity",
            {"user": user, "active_room": room_id},
            "name"
        )
        
        if activity_name:
            frappe.db.set_value(
                "Chat User Activity",
                activity_name,
                {
                    "active_room": None,
                    "typing_in_room": None,  # Also clear typing status
                    "last_activity": now_datetime()
                },
                update_modified=False
            )
            frappe.db.commit()
        
        # Broadcast user left
        frappe.publish_realtime(
            event="user_left_room",
            message={
                "user": user,
                "room_id": room_id,
                "timestamp": str(now_datetime())
            },
            room=f"chat_room_{room_id}"
        )
        
        return {
            "success": True,
            "room_id": room_id
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_room_active_users(room_id):
    """
    Get list of users currently active in a room
    
    Args:
        room_id (str): Chat Room ID
        
    Returns:
        dict: List of active users
    """
    try:
        active_users = frappe.db.get_all(
            "Chat User Activity",
            filters={
                "active_room": room_id,
                "is_online": 1
            },
            fields=["user", "full_name", "chat_status"]
        )
        
        return {
            "success": True,
            "users": active_users,
            "count": len(active_users)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================================================
# CLEANUP AND MAINTENANCE
# ============================================================================

def cleanup_stale_users():
    """
    Background job to mark users as offline if they haven't sent heartbeat
    Run this as a scheduled job every 5-10 minutes
    """
    try:
        # Mark users as offline if no activity in last 10 minutes
        stale_threshold = get_datetime() - timedelta(minutes=10)
        
        frappe.db.sql("""
            UPDATE `tabChat User Activity`
            SET chat_status = 'offline',
                is_online = 0,
                active_room = NULL,
                typing_in_room = NULL
            WHERE last_activity < %s
            AND is_online = 1
        """, (stale_threshold,))
        
        frappe.db.commit()
        
    except Exception as e:
        frappe.log_error(f"Error in cleanup_stale_users: {str(e)}", "Cleanup Stale Users Error")


# ============================================================================
# INTEGRATION WITH HOOKS
# ============================================================================

# Add these to your hooks.py:
"""
scheduler_events = {
    "cron": {
        "*/5 * * * *": [
            "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.cleanup_stale_users"
        ]
    }
}

# Add to override_whitelisted_methods in hooks.py:
override_whitelisted_methods = {
    "f_chat.update_user_status": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.update_user_status",
    "f_chat.get_user_status": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.get_user_status",
    "f_chat.get_online_users": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.get_online_users",
    "f_chat.heartbeat": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.heartbeat",
    "f_chat.user_typing": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.user_typing",
    "f_chat.join_room": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.join_room",
    "f_chat.leave_room": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.leave_room",
}
"""