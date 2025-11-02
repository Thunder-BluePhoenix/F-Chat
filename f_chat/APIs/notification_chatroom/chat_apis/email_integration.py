# f_chat/APIs/notification_chatroom/chat_apis/email_integration.py
import frappe
from frappe import _
from frappe.utils import now_datetime, get_url
import json

@frappe.whitelist()
def send_message_via_email(message_id, recipients=None, subject=None, additional_message=None):
    """
    Send a chat message via email

    Args:
        message_id (str): Chat Message ID to send via email
        recipients (list): List of email addresses (optional, defaults to room members)
        subject (str): Email subject (optional)
        additional_message (str): Additional message to include in email

    Returns:
        dict: Success response
    """
    try:
        current_user = frappe.session.user

        # Parse recipients if string
        if isinstance(recipients, str):
            recipients = json.loads(recipients) if recipients else []

        # Get message
        message = frappe.get_doc("Chat Message", message_id)

        # Verify user has permission
        room = frappe.get_doc("Chat Room", message.chat_room)
        permissions = room.get_member_permissions(current_user)

        if not permissions["is_member"]:
            frappe.throw("You are not a member of this chat room")

        # Get sender info
        sender_info = frappe.db.get_value(
            "User",
            message.sender,
            ["full_name", "email"],
            as_dict=True
        )

        # Get room members' emails if recipients not specified
        if not recipients:
            room_members = frappe.get_all(
                "Chat Room Member",
                filters={"parent": room.name},
                fields=["user"]
            )

            # Get member emails
            for member in room_members:
                member_email = frappe.db.get_value("User", member.user, "email")
                if member_email and member.user != current_user:
                    recipients.append(member_email)

        if not recipients:
            frappe.throw("No recipients found")

        # Prepare email subject
        if not subject:
            subject = f"Message from {sender_info.full_name} in {room.room_name}"

        # Get attachments
        attachments = []
        if message.file_attachments:
            for attachment in message.file_attachments:
                attachments.append({
                    "fname": attachment.file_name,
                    "furl": get_url() + attachment.file_url
                })

        # Prepare email content
        message_link = get_url() + f"/app/chat-message/{message.name}"

        email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Message from {sender_info.full_name}</h2>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #666; margin: 0;"><strong>Room:</strong> {room.room_name}</p>
                <p style="color: #666; margin: 5px 0 0 0;"><strong>Time:</strong> {message.timestamp}</p>
            </div>

            <div style="background-color: #fff; border-left: 4px solid #2490ef; padding: 15px; margin: 20px 0;">
                <p style="color: #333; margin: 0; white-space: pre-wrap;">{message.message_content or '[No text content]'}</p>
            </div>
        """

        if additional_message:
            email_content += f"""
            <div style="background-color: #fffbea; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #666; margin: 0;"><strong>Additional Message:</strong></p>
                <p style="color: #333; margin: 10px 0 0 0;">{additional_message}</p>
            </div>
            """

        if attachments:
            email_content += """
            <div style="margin: 20px 0;">
                <p style="color: #666;"><strong>Attachments:</strong></p>
                <ul style="color: #2490ef;">
            """
            for att in attachments:
                email_content += f'<li><a href="{att["furl"]}">{att["fname"]}</a></li>'
            email_content += """
                </ul>
            </div>
            """

        email_content += f"""
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 12px;">
                    <a href="{message_link}" style="color: #2490ef; text-decoration: none;">View in F-Chat</a>
                </p>
            </div>
        </div>
        """

        # Send email
        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=email_content,
            reference_doctype="Chat Message",
            reference_name=message.name,
            delayed=False
        )

        # Log activity
        frappe.get_doc({
            "doctype": "Comment",
            "comment_type": "Info",
            "reference_doctype": "Chat Message",
            "reference_name": message.name,
            "content": f"Message sent via email to {len(recipients)} recipient(s) by {current_user}"
        }).insert(ignore_permissions=True)

        return {
            "success": True,
            "message": f"Message sent to {len(recipients)} recipient(s)",
            "data": {
                "recipients_count": len(recipients)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in send_message_via_email: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def send_file_via_email(room_id, file_url, file_name, recipients=None, subject=None, message_content=None):
    """
    Send a file from chat via email

    Args:
        room_id (str): Chat Room ID
        file_url (str): File URL to send
        file_name (str): File name
        recipients (list): List of email addresses (optional, defaults to room members)
        subject (str): Email subject (optional)
        message_content (str): Message to include with file

    Returns:
        dict: Success response
    """
    try:
        current_user = frappe.session.user

        # Parse recipients if string
        if isinstance(recipients, str):
            recipients = json.loads(recipients) if recipients else []

        # Verify user has permission
        room = frappe.get_doc("Chat Room", room_id)
        permissions = room.get_member_permissions(current_user)

        if not permissions["is_member"]:
            frappe.throw("You are not a member of this chat room")

        # Get sender info
        sender_info = frappe.db.get_value(
            "User",
            current_user,
            ["full_name", "email"],
            as_dict=True
        )

        # Get room members' emails if recipients not specified
        if not recipients:
            room_members = frappe.get_all(
                "Chat Room Member",
                filters={"parent": room.name},
                fields=["user"]
            )

            # Get member emails
            for member in room_members:
                member_email = frappe.db.get_value("User", member.user, "email")
                if member_email and member.user != current_user:
                    recipients.append(member_email)

        if not recipients:
            frappe.throw("No recipients found")

        # Prepare email subject
        if not subject:
            subject = f"{sender_info.full_name} shared a file: {file_name}"

        # Prepare file attachment
        file_link = get_url() + file_url

        # Prepare email content
        email_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">File Shared by {sender_info.full_name}</h2>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #666; margin: 0;"><strong>Room:</strong> {room.room_name}</p>
                <p style="color: #666; margin: 5px 0 0 0;"><strong>Time:</strong> {now_datetime()}</p>
            </div>
        """

        if message_content:
            email_content += f"""
            <div style="background-color: #fff; border-left: 4px solid #2490ef; padding: 15px; margin: 20px 0;">
                <p style="color: #333; margin: 0; white-space: pre-wrap;">{message_content}</p>
            </div>
            """

        email_content += f"""
            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                <p style="color: #666; margin: 0 0 15px 0;"><strong>Shared File:</strong></p>
                <p style="color: #333; font-size: 18px; margin: 0 0 15px 0;">{file_name}</p>
                <a href="{file_link}" style="display: inline-block; background-color: #2490ef; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                    Download File
                </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 12px;">
                    This file was shared via F-Chat from the room "{room.room_name}"
                </p>
            </div>
        </div>
        """

        # Send email
        frappe.sendmail(
            recipients=recipients,
            subject=subject,
            message=email_content,
            reference_doctype="Chat Room",
            reference_name=room.name,
            delayed=False
        )

        return {
            "success": True,
            "message": f"File sent to {len(recipients)} recipient(s)",
            "data": {
                "recipients_count": len(recipients)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in send_file_via_email: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }

@frappe.whitelist()
def get_available_email_recipients(room_id):
    """
    Get list of available email recipients from a room

    Args:
        room_id (str): Chat Room ID

    Returns:
        dict: List of available recipients
    """
    try:
        current_user = frappe.session.user

        # Verify user has permission
        room = frappe.get_doc("Chat Room", room_id)
        permissions = room.get_member_permissions(current_user)

        if not permissions["is_member"]:
            frappe.throw("You are not a member of this chat room")

        # Get room members with emails
        room_members = frappe.get_all(
            "Chat Room Member",
            filters={"parent": room.name},
            fields=["user"]
        )

        recipients = []
        for member in room_members:
            user_info = frappe.db.get_value(
                "User",
                member.user,
                ["full_name", "email", "user_image"],
                as_dict=True
            )

            if user_info and user_info.email:
                recipients.append({
                    "user": member.user,
                    "full_name": user_info.full_name,
                    "email": user_info.email,
                    "user_image": user_info.user_image,
                    "is_current_user": member.user == current_user
                })

        return {
            "success": True,
            "data": {
                "recipients": recipients,
                "total_count": len(recipients)
            }
        }

    except Exception as e:
        frappe.log_error(f"Error in get_available_email_recipients: {str(e)}")
        return {
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": str(e)
            }
        }
