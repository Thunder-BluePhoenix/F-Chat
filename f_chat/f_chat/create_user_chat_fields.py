"""
Create custom chat fields on User doctype
Run this with: bench execute f_chat.f_chat.create_user_chat_fields.create_fields
"""

import frappe


def create_fields():
    """Create custom chat fields on User doctype"""
    try:
        print("\n" + "=" * 80)
        print("Creating User Custom Fields for Chat")
        print("=" * 80 + "\n")

        # 1. Create custom_chat_status field
        if not frappe.db.exists("Custom Field", {"dt": "User", "fieldname": "custom_chat_status"}):
            try:
                print("Creating custom_chat_status field...")
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
                frappe.db.commit()
                print("✓ Created custom_chat_status field")
            except Exception as e:
                print(f"✗ Error creating custom_chat_status: {str(e)}")
                frappe.log_error(f"Error creating custom_chat_status: {str(e)}")
        else:
            print("✓ custom_chat_status field already exists")

        # 2. Create custom_last_chat_activity field
        if not frappe.db.exists("Custom Field", {"dt": "User", "fieldname": "custom_last_chat_activity"}):
            try:
                print("Creating custom_last_chat_activity field...")
                custom_field = frappe.get_doc({
                    "doctype": "Custom Field",
                    "dt": "User",
                    "fieldname": "custom_last_chat_activity",
                    "label": "Last Chat Activity",
                    "fieldtype": "Datetime",
                    "insert_after": "custom_chat_status"
                })
                custom_field.insert(ignore_permissions=True)
                frappe.db.commit()
                print("✓ Created custom_last_chat_activity field")
            except Exception as e:
                print(f"✗ Error creating custom_last_chat_activity: {str(e)}")
                frappe.log_error(f"Error creating custom_last_chat_activity: {str(e)}")
        else:
            print("✓ custom_last_chat_activity field already exists")

        print("\n" + "=" * 80)
        print("Custom fields creation completed!")
        print("=" * 80 + "\n")

        return True

    except Exception as e:
        print(f"\n✗ Error in create_fields: {str(e)}")
        frappe.log_error(f"Error in create_fields: {str(e)}", "Create User Chat Fields")
        return False
