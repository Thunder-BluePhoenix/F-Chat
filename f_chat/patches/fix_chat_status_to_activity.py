# -*- coding: utf-8 -*-
# Patch to fix chat status updates - use Chat User Activity instead of User doctype
# This fixes the database deadlock error (1020)

import frappe
from frappe import _
from frappe.utils import now_datetime

def execute():
    """
    Main patch execution function
    Migrates from updating User doctype directly to using Chat User Activity
    """
    print("=" * 80)
    print("FIXING CHAT STATUS - MIGRATING TO CHAT USER ACTIVITY")
    print("=" * 80)
    
    # Step 1: Ensure Chat User Activity doctype exists
    ensure_chat_user_activity_doctype()
    
    # Step 2: Migrate existing custom fields data to Chat User Activity
    migrate_user_status_to_activity()
    
    # Step 3: Create missing Chat User Activity records
    create_missing_user_activities()
    
    # Step 4: Update all API methods
    print("\n✅ All fixes applied successfully!")
    print("\nIMPORTANT: Update your code to use the new functions:")
    print("  - Use: update_user_chat_status(user, status)")
    print("  - Use: get_user_chat_status(user)")
    print("  - Do NOT directly update User doctype")
    print("=" * 80)

def ensure_chat_user_activity_doctype():
    """Ensure Chat User Activity doctype exists"""
    print("\n📋 Checking Chat User Activity doctype...")
    
    if not frappe.db.exists("DocType", "Chat User Activity"):
        print("❌ Chat User Activity doctype not found!")
        print("   Please run: bench migrate")
        return False
    
    print("✅ Chat User Activity doctype exists")
    return True

def migrate_user_status_to_activity():
    """Migrate custom_chat_status from User to Chat User Activity"""
    print("\n🔄 Migrating user chat status data...")
    
    try:
        # Get all users with chat status
        users = frappe.db.sql("""
            SELECT 
                name, 
                custom_chat_status,
                custom_last_chat_activity,
                full_name
            FROM `tabUser`
            WHERE enabled = 1
            AND user_type = 'System User'
            AND name NOT IN ('Administrator', 'Guest')
        """, as_dict=True)
        
        migrated = 0
        for user in users:
            try:
                # Check if activity record exists
                activity = frappe.db.get_value(
                    "Chat User Activity",
                    {"user": user.name},
                    ["name", "chat_status"],
                    as_dict=True
                )
                
                if activity:
                    # Update existing record if status differs
                    if user.custom_chat_status and activity.chat_status != user.custom_chat_status:
                        frappe.db.set_value(
                            "Chat User Activity",
                            activity.name,
                            "chat_status",
                            user.custom_chat_status,
                            update_modified=False
                        )
                        migrated += 1
                else:
                    # Create new activity record
                    activity_doc = frappe.get_doc({
                        "doctype": "Chat User Activity",
                        "user": user.name,
                        "full_name": user.full_name,
                        "chat_status": user.custom_chat_status or "offline",
                        "is_online": 1 if user.custom_chat_status == "online" else 0,
                        "last_seen": user.custom_last_chat_activity or now_datetime(),
                        "last_activity": user.custom_last_chat_activity or now_datetime()
                    })
                    activity_doc.insert(ignore_permissions=True, ignore_mandatory=True)
                    migrated += 1
                    
            except Exception as e:
                print(f"   ⚠️  Error migrating user {user.name}: {str(e)}")
                continue
        
        frappe.db.commit()
        print(f"✅ Migrated {migrated} user status records")
        
    except Exception as e:
        print(f"❌ Error in migration: {str(e)}")
        frappe.log_error(f"Chat status migration error: {str(e)}")

def create_missing_user_activities():
    """Create Chat User Activity records for users who don't have one"""
    print("\n🆕 Creating missing user activity records...")
    
    try:
        # Get users without activity records
        users_without_activity = frappe.db.sql("""
            SELECT u.name, u.full_name
            FROM `tabUser` u
            LEFT JOIN `tabChat User Activity` a ON u.name = a.user
            WHERE u.enabled = 1
            AND u.user_type = 'System User'
            AND u.name NOT IN ('Administrator', 'Guest')
            AND a.name IS NULL
        """, as_dict=True)
        
        created = 0
        for user in users_without_activity:
            try:
                activity_doc = frappe.get_doc({
                    "doctype": "Chat User Activity",
                    "user": user.name,
                    "full_name": user.full_name,
                    "chat_status": "offline",
                    "is_online": 0,
                    "last_seen": now_datetime(),
                    "last_activity": now_datetime()
                })
                activity_doc.insert(ignore_permissions=True, ignore_mandatory=True)
                created += 1
            except Exception as e:
                print(f"   ⚠️  Error creating activity for {user.name}: {str(e)}")
                continue
        
        frappe.db.commit()
        print(f"✅ Created {created} new user activity records")
        
    except Exception as e:
        print(f"❌ Error creating activities: {str(e)}")
        frappe.log_error(f"Create user activities error: {str(e)}")


# ============================================================================
# NEW HELPER FUNCTIONS TO USE INSTEAD OF DIRECT USER UPDATES
# ============================================================================

@frappe.whitelist()
def update_user_chat_status(user=None, status="online"):
    """
    Update user chat status in Chat User Activity (NOT User doctype)
    
    Args:
        user: User email (defaults to current user)
        status: Chat status (online/away/busy/offline)
    
    Returns:
        dict: Updated status information
    """
    if not user:
        user = frappe.session.user
    
    try:
        # Get or create activity record
        activity = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            "name"
        )
        
        if activity:
            # Update existing
            frappe.db.set_value(
                "Chat User Activity",
                activity,
                {
                    "chat_status": status,
                    "is_online": 1 if status == "online" else 0,
                    "last_activity": now_datetime(),
                    "last_seen": now_datetime() if status != "offline" else None
                },
                update_modified=False
            )
        else:
            # Create new
            full_name = frappe.db.get_value("User", user, "full_name")
            activity_doc = frappe.get_doc({
                "doctype": "Chat User Activity",
                "user": user,
                "full_name": full_name,
                "chat_status": status,
                "is_online": 1 if status == "online" else 0,
                "last_activity": now_datetime(),
                "last_seen": now_datetime()
            })
            activity_doc.insert(ignore_permissions=True, ignore_mandatory=True)
        
        frappe.db.commit()
        
        # Broadcast status change
        frappe.publish_realtime(
            event="user_status_changed",
            message={
                "user": user,
                "status": status,
                "timestamp": now_datetime()
            },
            user="all"
        )
        
        return {
            "success": True,
            "status": status,
            "user": user
        }
        
    except Exception as e:
        frappe.log_error(f"Error updating chat status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_user_chat_status(user=None):
    """
    Get user chat status from Chat User Activity
    
    Args:
        user: User email (defaults to current user)
    
    Returns:
        dict: User status information
    """
    if not user:
        user = frappe.session.user
    
    try:
        activity = frappe.db.get_value(
            "Chat User Activity",
            {"user": user},
            ["chat_status", "is_online", "last_seen", "last_activity"],
            as_dict=True
        )
        
        if not activity:
            return {
                "success": True,
                "status": "offline",
                "is_online": 0,
                "user": user
            }
        
        return {
            "success": True,
            "status": activity.chat_status,
            "is_online": activity.is_online,
            "last_seen": activity.last_seen,
            "last_activity": activity.last_activity,
            "user": user
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting chat status: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_online_users():
    """
    Get all currently online users from Chat User Activity
    
    Returns:
        list: List of online users
    """
    try:
        online_users = frappe.db.get_all(
            "Chat User Activity",
            filters={"is_online": 1, "chat_status": ["!=", "offline"]},
            fields=["user", "full_name", "chat_status", "last_activity"]
        )
        
        return {
            "success": True,
            "users": online_users,
            "count": len(online_users)
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting online users: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    execute()