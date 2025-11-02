# Copyright (c) 2025, bluephoenix and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, time_diff_in_seconds

class ChatUserActivity(Document):
    def before_save(self):
        """Update full name before saving"""
        if self.user:
            user_full_name = frappe.db.get_value("User", self.user, "full_name")
            if user_full_name:
                self.full_name = user_full_name

    def validate(self):
        """Validate data"""
        # Update is_online based on chat_status
        if self.chat_status == "online":
            self.is_online = 1
        else:
            self.is_online = 0


@frappe.whitelist()
def get_or_create_user_activity(user=None):
    """
    Get or create user activity record

    Args:
        user (str): User ID (defaults to current user)

    Returns:
        dict: User activity data
    """
    if not user:
        user = frappe.session.user

    # Check if exists
    activity = frappe.db.get_value(
        "Chat User Activity",
        {"user": user},
        "*",
        as_dict=True
    )

    if not activity:
        # Create new activity record
        try:
            user_full_name = frappe.db.get_value("User", user, "full_name")

            activity_doc = frappe.get_doc({
                "doctype": "Chat User Activity",
                "user": user,
                "full_name": user_full_name,
                "chat_status": "online",
                "is_online": 1,
                "last_seen": now_datetime(),
                "last_activity": now_datetime(),
                "unread_count": 0
            })
            activity_doc.insert(ignore_permissions=True)

            activity = activity_doc.as_dict()

        except Exception as e:
            frappe.log_error(f"Error creating user activity for {user}: {str(e)}")
            return None

    return activity


@frappe.whitelist()
def update_user_activity_status(user=None, status="online", active_room=None):
    """
    Update user activity status

    Args:
        user (str): User ID
        status (str): online, away, busy, offline
        active_room (str): Current active chat room

    Returns:
        dict: Success response
    """
    try:
        if not user:
            user = frappe.session.user

        current_time = now_datetime()

        # Get or create activity record
        activity_name = frappe.db.get_value("Chat User Activity", {"user": user})

        if not activity_name:
            # Create new record
            get_or_create_user_activity(user)
            activity_name = frappe.db.get_value("Chat User Activity", {"user": user})

        if activity_name:
            # Use direct SQL update to avoid locking issues
            frappe.db.sql("""
                UPDATE `tabChat User Activity`
                SET
                    chat_status = %(status)s,
                    is_online = %(is_online)s,
                    last_seen = %(last_seen)s,
                    last_activity = %(last_activity)s,
                    active_room = %(active_room)s,
                    modified = %(modified)s
                WHERE name = %(name)s
            """, {
                "status": status,
                "is_online": 1 if status == "online" else 0,
                "last_seen": current_time,
                "last_activity": current_time,
                "active_room": active_room,
                "modified": current_time,
                "name": activity_name
            })

            frappe.db.commit()

            # Broadcast status change
            frappe.publish_realtime(
                event="user_status_changed",
                message={
                    "user": user,
                    "status": status,
                    "is_online": 1 if status == "online" else 0,
                    "timestamp": str(current_time)
                },
                room="chat_global"
            )

            return {
                "success": True,
                "status": status,
                "timestamp": str(current_time)
            }

        return {"success": False, "error": "Could not update activity"}

    except Exception as e:
        frappe.log_error(f"Error updating user activity: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_user_activity_status(user=None):
    """
    Get user activity status

    Args:
        user (str): User ID

    Returns:
        dict: User activity data
    """
    try:
        if not user:
            user = frappe.session.user

        activity = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            ["chat_status", "is_online", "last_seen", "last_activity", "active_room", "unread_count"],
            as_dict=True
        )

        if not activity:
            # Create and return default
            get_or_create_user_activity(user)
            activity = {
                "chat_status": "online",
                "is_online": 1,
                "last_seen": str(now_datetime()),
                "last_activity": str(now_datetime()),
                "unread_count": 0
            }

        return {
            "success": True,
            "data": activity
        }

    except Exception as e:
        frappe.log_error(f"Error getting user activity: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def update_user_activities_bulk():
    """
    Cron job to update all user activities and set offline users
    """
    try:
        from frappe.utils import add_to_date

        current_time = now_datetime()
        offline_threshold = add_to_date(current_time, minutes=-5)

        # Update users to offline who haven't been active
        frappe.db.sql("""
            UPDATE `tabChat User Activity`
            SET
                chat_status = 'offline',
                is_online = 0
            WHERE last_activity < %(threshold)s
            AND chat_status != 'offline'
        """, {"threshold": offline_threshold})

        frappe.db.commit()

        return {"success": True}

    except Exception as e:
        frappe.log_error(f"Error in bulk update user activities: {str(e)}")
        return {"success": False, "error": str(e)}
