# f_chat/APIs/notification_chatroom/chat_apis/broadcast.py
import frappe
from frappe import _
from frappe.utils import now_datetime
import json

@frappe.whitelist()
def send_broadcast_message(room_ids, message_content, message_type="Broadcast", attachments=None):
    """
    Send a broadcast message to multiple chat rooms

    Args:
        room_ids (list): List of Chat Room IDs
        message_content (str): Message content
        message_type (str): Type of message (default: Broadcast)
        attachments (list): File attachments (optional)

    Returns:
        dict: Success response with broadcast details
    """
    try:
        current_user = frappe.session.user

        # Parse room_ids if string
        if isinstance(room_ids, str):
            room_ids = json.loads(room_ids) if room_ids else []

        # Parse attachments if string
        if isinstance(attachments, str):
            attachments = json.loads(attachments) if attachments else []

        if not room_ids:
            frappe.throw("No rooms specified for broadcast")

        if not message_content:
            frappe.throw("Message content is required")

        successful_broadcasts = []
        failed_broadcasts = []

        for room_id in room_ids:
            try:
                # Verify user is member of the room
                room = frappe.get_doc("Chat Room", room_id)
                permissions = room.get_member_permissions(current_user)

                if not permissions["is_member"]:
                    failed_broadcasts.append({
                        "room_id": room_id,
                        "room_name": room.room_name,
                        "error": "Not a member of this room"
                    })
                    continue

                if permissions.get("is_muted"):
                    failed_broadcasts.append({
                        "room_id": room_id,
                        "room_name": room.room_name,
                        "error": "You are muted in this room"
                    })
                    continue

                # Create broadcast message
                message = frappe.new_doc("Chat Message")
                message.chat_room = room_id
                message.sender = current_user
                message.message_type = message_type
                message.message_content = message_content
                message.timestamp = now_datetime()

                # Add attachments
                if attachments:
                    for attachment in attachments:
                        message.append("file_attachments", {
                            "file_name": attachment.get("file_name"),
                            "file_url": attachment.get("file_url"),
                            "file_type": attachment.get("file_type"),
                            "file_size": attachment.get("file_size", 0),
                            "uploaded_timestamp": now_datetime()
                        })

                message.insert(ignore_permissions=True)

                successful_broadcasts.append({
                    "room_id": room_id,
                    "room_name": room.room_name,
                    "message_id": message.name,
                    "timestamp": str(message.timestamp)
                })

            except Exception as e:
                failed_broadcasts.append({
                    "room_id": room_id,
                    "error": str(e)
                })

        return {
            "success": True,
            "message": f"Broadcast sent to {len(successful_broadcasts)} out of {len(room_ids)} rooms",
            "data": {
                "successful_broadcasts": successful_broadcasts,
                "failed_broadcasts": failed_broadcasts,
                "total_rooms": len(room_ids),
                "success_count": len(successful_broadcasts),
                "failure_count": len(failed_broadcasts)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in send_broadcast_message: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def get_broadcast_rooms(search=None):
    """
    Get list of rooms where user can send broadcast messages

    Args:
        search (str): Search term for room names (optional)

    Returns:
        dict: List of available rooms for broadcasting
    """
    try:
        current_user = frappe.session.user

        # Build conditions
        conditions = ["crm.user = %(user)s", "cr.room_status = 'Active'"]
        values = {"user": current_user}

        if search:
            conditions.append("cr.room_name LIKE %(search)s")
            values["search"] = f"%{search}%"

        where_clause = " AND ".join(conditions)

        # Get rooms where user is a member
        query = f"""
            SELECT DISTINCT
                cr.name,
                cr.room_name,
                cr.room_type,
                cr.description,
                crm.role as user_role,
                crm.is_muted,
                (SELECT COUNT(*) FROM `tabChat Room Member` crm2 WHERE crm2.parent = cr.name) as member_count
            FROM `tabChat Room` cr
            INNER JOIN `tabChat Room Member` crm ON cr.name = crm.parent
            WHERE {where_clause}
            ORDER BY cr.room_name ASC
        """

        rooms = frappe.db.sql(query, values, as_dict=True)

        # Filter out rooms where user is muted
        available_rooms = []
        for room in rooms:
            if not room.is_muted:
                available_rooms.append({
                    "room_id": room.name,
                    "room_name": room.room_name,
                    "room_type": room.room_type,
                    "description": room.description,
                    "member_count": room.member_count,
                    "user_role": room.user_role
                })

        return {
            "success": True,
            "data": {
                "rooms": available_rooms,
                "total_count": len(available_rooms)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in get_broadcast_rooms: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def get_broadcast_history(page=1, page_size=20):
    """
    Get broadcast message history for current user

    Args:
        page (int): Page number
        page_size (int): Records per page

    Returns:
        dict: Broadcast history with pagination
    """
    try:
        current_user = frappe.session.user
        page = int(page) or 1
        page_size = min(int(page_size) or 20, 100)
        offset = (page - 1) * page_size

        # Get broadcast messages sent by user
        query = """
            SELECT
                cm.name,
                cm.chat_room,
                cr.room_name,
                cm.message_content,
                cm.message_type,
                cm.timestamp,
                (SELECT COUNT(*) FROM `tabChat Message Attachment` cma WHERE cma.parent = cm.name) as attachment_count
            FROM `tabChat Message` cm
            INNER JOIN `tabChat Room` cr ON cm.chat_room = cr.name
            WHERE cm.sender = %(user)s
            AND cm.message_type = 'Broadcast'
            AND cm.is_deleted = 0
            ORDER BY cm.timestamp DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """

        broadcasts = frappe.db.sql(
            query,
            {"user": current_user, "limit": page_size, "offset": offset},
            as_dict=True
        )

        # Format timestamps
        for broadcast in broadcasts:
            broadcast["timestamp"] = str(broadcast.timestamp)

        # Get total count
        total_count = frappe.db.count(
            "Chat Message",
            filters={
                "sender": current_user,
                "message_type": "Broadcast",
                "is_deleted": 0
            }
        )

        total_pages = (total_count + page_size - 1) // page_size

        return {
            "success": True,
            "data": {
                "broadcasts": broadcasts,
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
        frappe.log_error(f"Error in get_broadcast_history: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }
