"""
Patch to fix chat errors:
1. Ensure Chat_Files folder exists
2. Ensure custom_chat_status and custom_last_chat_activity fields exist on User doctype
3. Add any missing fields to Chat Message Attachment

Created: 2025-11-01
"""

import frappe
from frappe import _
from frappe.utils import now_datetime


def execute():
    """Execute the patch"""
    frappe.logger().info("=" * 80)
    frappe.logger().info("Running patch: fix_chat_errors_v2")
    frappe.logger().info("=" * 80)

    try:
        # 1. Ensure Chat_Files folder exists
        create_chat_files_folder()

        # 2. Ensure User custom fields exist
        create_user_custom_fields()

        # 3. Verify Chat Message Attachment doctype fields
        verify_chat_message_attachment_fields()

        frappe.logger().info("✓ Patch fix_chat_errors_v2 completed successfully")

    except Exception as e:
        frappe.log_error(f"Error in patch fix_chat_errors_v2: {str(e)}", "Patch Error")
        frappe.logger().error(f"✗ Patch failed: {str(e)}")
        raise


def create_chat_files_folder():
    """Create Chat_Files folder if it doesn't exist"""
    try:
        folder_name = "Home/Chat_Files"

        # Check if folder exists
        if frappe.db.exists("File", {"file_name": folder_name, "is_folder": 1}):
            frappe.logger().info("  ✓ Chat_Files folder already exists")
            return

        # Check if just the folder name exists (without Home/ prefix)
        if frappe.db.exists("File", {"file_name": "Chat_Files", "is_folder": 1}):
            frappe.logger().info("  ✓ Chat_Files folder already exists")
            return

        # Create the folder
        folder = frappe.get_doc({
            "doctype": "File",
            "file_name": "Chat_Files",
            "is_folder": 1,
            "folder": "Home"
        })
        folder.insert(ignore_permissions=True)
        frappe.db.commit()

        frappe.logger().info("  ✓ Created Chat_Files folder")

    except Exception as e:
        frappe.logger().warning(f"  ⚠ Could not create Chat_Files folder: {str(e)}")
        # Don't fail the patch if folder creation fails


def create_user_custom_fields():
    """Create custom fields on User doctype if they don't exist"""
    try:
        # 1. Create custom_chat_status field
        if not frappe.db.exists("Custom Field", {"dt": "User", "fieldname": "custom_chat_status"}):
            try:
                custom_field = frappe.get_doc({
                    "doctype": "Custom Field",
                    "dt": "User",
                    "fieldname": "custom_chat_status",
                    "label": "Chat Status",
                    "fieldtype": "Select",
                    "options": "online\naway\nbusy\noffline",
                    "default": "offline",
                    "insert_after": "user_image"
                })
                custom_field.insert(ignore_permissions=True)
                frappe.logger().info("  ✓ Created custom_chat_status field for User")
            except Exception as e:
                frappe.logger().warning(f"  ⚠ Could not create custom_chat_status field: {str(e)}")
        else:
            frappe.logger().info("  ✓ custom_chat_status field already exists")

        # 2. Create custom_last_chat_activity field
        if not frappe.db.exists("Custom Field", {"dt": "User", "fieldname": "custom_last_chat_activity"}):
            try:
                custom_field = frappe.get_doc({
                    "doctype": "Custom Field",
                    "dt": "User",
                    "fieldname": "custom_last_chat_activity",
                    "label": "Last Chat Activity",
                    "fieldtype": "Datetime",
                    "insert_after": "custom_chat_status"
                })
                custom_field.insert(ignore_permissions=True)
                frappe.logger().info("  ✓ Created custom_last_chat_activity field for User")
            except Exception as e:
                frappe.logger().warning(f"  ⚠ Could not create custom_last_chat_activity field: {str(e)}")
        else:
            frappe.logger().info("  ✓ custom_last_chat_activity field already exists")

        frappe.db.commit()

    except Exception as e:
        frappe.logger().warning(f"  ⚠ Error creating custom fields: {str(e)}")


def verify_chat_message_attachment_fields():
    """Verify Chat Message Attachment doctype has all required fields"""
    try:
        # Check if doctype exists
        if not frappe.db.exists("DocType", "Chat Message Attachment"):
            frappe.logger().warning("  ⚠ Chat Message Attachment doctype not found")
            return

        doc = frappe.get_doc("DocType", "Chat Message Attachment")

        # Required fields
        required_fields = [
            {"fieldname": "file_name", "fieldtype": "Data", "label": "File Name"},
            {"fieldname": "file_url", "fieldtype": "Data", "label": "File URL"},
            {"fieldname": "file_size", "fieldtype": "Int", "label": "File Size (bytes)"},
            {"fieldname": "file_type", "fieldtype": "Data", "label": "File Type"},
            {"fieldname": "uploaded_timestamp", "fieldtype": "Datetime", "label": "Uploaded Timestamp", "default": "now"}
        ]

        existing_fields = {f.fieldname for f in doc.fields}
        missing_fields = []

        for field in required_fields:
            if field["fieldname"] not in existing_fields:
                missing_fields.append(field)

        if missing_fields:
            frappe.logger().info(f"  ⚠ Chat Message Attachment missing {len(missing_fields)} fields")
            for field in missing_fields:
                frappe.logger().info(f"    - Missing field: {field['fieldname']}")
        else:
            frappe.logger().info("  ✓ Chat Message Attachment has all required fields")

    except Exception as e:
        frappe.logger().warning(f"  ⚠ Could not verify Chat Message Attachment fields: {str(e)}")
