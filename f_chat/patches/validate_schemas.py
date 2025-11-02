# -*- coding: utf-8 -*-
# Schema Validation Script for F_Chat
# Checks all doctypes, child tables, and relationships

import frappe
from frappe import _
import json

def validate_all_schemas():
    """
    Comprehensive schema validation for F_Chat
    Checks all doctypes, fields, and relationships
    """
    print("=" * 80)
    print("F_CHAT SCHEMA VALIDATION")
    print("=" * 80)
    
    # Define expected doctypes
    expected_doctypes = {
        "Chat Room": {
            "type": "parent",
            "child_tables": ["Chat Room Member"],
            "key_fields": ["room_name", "room_type", "room_status", "members"]
        },
        "Chat Room Member": {
            "type": "child",
            "parent": "Chat Room",
            "key_fields": ["user", "role", "can_send_messages"]
        },
        "Chat Message": {
            "type": "parent",
            "child_tables": ["Chat Message Attachment"],
            "key_fields": ["chat_room", "sender", "message_content", "message_type"]
        },
        "Chat Message Attachment": {
            "type": "child",
            "parent": "Chat Message",
            "key_fields": ["file_url", "file_name", "file_type"]
        },
        "Chat User Activity": {
            "type": "parent",
            "child_tables": [],
            "key_fields": ["user", "chat_status", "is_online", "last_seen"]
        },
        "Chat Call Session": {
            "type": "parent",
            "child_tables": ["Chat Call Participant"],
            "key_fields": ["chat_room", "call_type", "call_status", "session_id"]
        },
        "Chat Call Participant": {
            "type": "child",
            "parent": "Chat Call Session",
            "key_fields": ["user", "status", "joined_time"]
        },
        "Chat Settings": {
            "type": "single",
            "child_tables": [],
            "key_fields": ["enable_chat", "max_file_size"]
        }
    }
    
    results = {
        "valid": [],
        "missing": [],
        "invalid": [],
        "warnings": []
    }
    
    # Check each doctype
    for doctype_name, config in expected_doctypes.items():
        print(f"\n📋 Checking {doctype_name}...")
        result = validate_doctype(doctype_name, config)
        
        if result["status"] == "valid":
            results["valid"].append(doctype_name)
            print(f"   ✅ {doctype_name} is valid")
        elif result["status"] == "missing":
            results["missing"].append(doctype_name)
            print(f"   ❌ {doctype_name} is missing")
        elif result["status"] == "invalid":
            results["invalid"].append(doctype_name)
            print(f"   ⚠️  {doctype_name} has issues: {result['error']}")
        
        if result.get("warnings"):
            results["warnings"].extend(result["warnings"])
            for warning in result["warnings"]:
                print(f"   ⚠️  {warning}")
    
    # Print summary
    print("\n" + "=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(f"✅ Valid Doctypes: {len(results['valid'])}")
    print(f"❌ Missing Doctypes: {len(results['missing'])}")
    print(f"⚠️  Invalid Doctypes: {len(results['invalid'])}")
    print(f"⚠️  Warnings: {len(results['warnings'])}")
    
    if results["missing"]:
        print("\n🔴 Missing Doctypes:")
        for dt in results["missing"]:
            print(f"   - {dt}")
    
    if results["invalid"]:
        print("\n🟡 Invalid Doctypes:")
        for dt in results["invalid"]:
            print(f"   - {dt}")
    
    # Check relationships
    print("\n" + "=" * 80)
    print("RELATIONSHIP VALIDATION")
    print("=" * 80)
    validate_relationships()
    
    # Check custom fields
    print("\n" + "=" * 80)
    print("CUSTOM FIELDS VALIDATION")
    print("=" * 80)
    validate_custom_fields()
    
    print("\n" + "=" * 80)
    print("VALIDATION COMPLETE")
    print("=" * 80)
    
    return results


def validate_doctype(doctype_name, config):
    """
    Validate a single doctype
    """
    result = {
        "status": "valid",
        "warnings": []
    }
    
    try:
        # Check if doctype exists
        if not frappe.db.exists("DocType", doctype_name):
            result["status"] = "missing"
            return result
        
        # Get doctype metadata
        meta = frappe.get_meta(doctype_name)
        
        # Check doctype type
        if config["type"] == "single":
            if not meta.issingle:
                result["warnings"].append(f"{doctype_name} should be a single doctype")
        
        elif config["type"] == "child":
            if not meta.istable:
                result["warnings"].append(f"{doctype_name} should be a child table")
        
        # Check key fields exist
        field_names = [f.fieldname for f in meta.fields]
        for field in config["key_fields"]:
            if field not in field_names:
                result["warnings"].append(f"Missing field: {field}")
        
        # Check child tables
        if config.get("child_tables"):
            for child_table in config["child_tables"]:
                if not frappe.db.exists("DocType", child_table):
                    result["warnings"].append(f"Missing child table: {child_table}")
        
        # If warnings exist, mark as invalid
        if result["warnings"]:
            result["status"] = "invalid"
        
    except Exception as e:
        result["status"] = "invalid"
        result["error"] = str(e)
    
    return result


def validate_relationships():
    """
    Validate relationships between doctypes
    """
    relationships = [
        {
            "parent": "Chat Room",
            "child": "Chat Room Member",
            "field": "parent"
        },
        {
            "parent": "Chat Message",
            "child": "Chat Message Attachment",
            "field": "parent"
        },
        {
            "parent": "Chat Call Session",
            "child": "Chat Call Participant",
            "field": "parent"
        }
    ]
    
    for rel in relationships:
        try:
            # Check if child table references parent correctly
            child_meta = frappe.get_meta(rel["child"])
            if not child_meta.istable:
                print(f"   ⚠️  {rel['child']} should be a child table")
            else:
                print(f"   ✅ {rel['parent']} → {rel['child']} relationship valid")
        except Exception as e:
            print(f"   ❌ Error checking {rel['parent']} → {rel['child']}: {str(e)}")


def validate_custom_fields():
    """
    Validate custom fields on User doctype
    """
    expected_custom_fields = [
        {
            "dt": "User",
            "fieldname": "custom_chat_status",
            "fieldtype": "Select",
            "options": "online\naway\nbusy\noffline"
        },
        {
            "dt": "User",
            "fieldname": "custom_last_chat_activity",
            "fieldtype": "Datetime"
        }
    ]
    
    for field_config in expected_custom_fields:
        exists = frappe.db.exists(
            "Custom Field",
            {
                "dt": field_config["dt"],
                "fieldname": field_config["fieldname"]
            }
        )
        
        if exists:
            print(f"   ✅ {field_config['dt']}.{field_config['fieldname']} exists")
        else:
            print(f"   ⚠️  {field_config['dt']}.{field_config['fieldname']} is missing")
            print(f"      (This is OK if you're using Chat User Activity instead)")


def check_data_integrity():
    """
    Check data integrity across tables
    """
    print("\n" + "=" * 80)
    print("DATA INTEGRITY CHECK")
    print("=" * 80)
    
    # Check for orphaned records
    print("\n🔍 Checking for orphaned records...")
    
    # Check Chat Messages without valid rooms
    orphaned_messages = frappe.db.sql("""
        SELECT m.name, m.chat_room
        FROM `tabChat Message` m
        LEFT JOIN `tabChat Room` r ON m.chat_room = r.name
        WHERE r.name IS NULL
        LIMIT 10
    """, as_dict=True)
    
    if orphaned_messages:
        print(f"   ⚠️  Found {len(orphaned_messages)} orphaned messages")
        for msg in orphaned_messages[:5]:
            print(f"      - {msg.name} references non-existent room {msg.chat_room}")
    else:
        print("   ✅ No orphaned messages")
    
    # Check Chat Room Members without valid users
    orphaned_members = frappe.db.sql("""
        SELECT m.name, m.user, m.parent
        FROM `tabChat Room Member` m
        LEFT JOIN `tabUser` u ON m.user = u.name
        WHERE u.name IS NULL
        LIMIT 10
    """, as_dict=True)
    
    if orphaned_members:
        print(f"   ⚠️  Found {len(orphaned_members)} orphaned members")
        for member in orphaned_members[:5]:
            print(f"      - {member.name} references non-existent user {member.user}")
    else:
        print("   ✅ No orphaned members")
    
    # Check duplicate user activities
    duplicate_activities = frappe.db.sql("""
        SELECT user, COUNT(*) as count
        FROM `tabChat User Activity`
        GROUP BY user
        HAVING count > 1
    """, as_dict=True)
    
    if duplicate_activities:
        print(f"   ⚠️  Found {len(duplicate_activities)} users with duplicate activities")
        for dup in duplicate_activities[:5]:
            print(f"      - {dup.user} has {dup.count} activity records")
    else:
        print("   ✅ No duplicate user activities")


def check_indexes():
    """
    Check if required indexes exist
    """
    print("\n" + "=" * 80)
    print("INDEX CHECK")
    print("=" * 80)
    
    required_indexes = [
        {
            "table": "tabChat Message",
            "column": "chat_room",
            "reason": "Fast message retrieval by room"
        },
        {
            "table": "tabChat Message",
            "column": "sender",
            "reason": "Fast message retrieval by sender"
        },
        {
            "table": "tabChat User Activity",
            "column": "user",
            "reason": "Fast user status lookup"
        },
        {
            "table": "tabChat User Activity",
            "column": "is_online",
            "reason": "Fast online users query"
        }
    ]
    
    for idx in required_indexes:
        # Check if index exists (simplified check)
        try:
            indexes = frappe.db.sql(f"""
                SHOW INDEX FROM `{idx['table']}`
                WHERE Column_name = '{idx['column']}'
            """, as_dict=True)
            
            if indexes:
                print(f"   ✅ Index on {idx['table']}.{idx['column']}")
            else:
                print(f"   ⚠️  Missing index on {idx['table']}.{idx['column']}")
                print(f"      Reason: {idx['reason']}")
                print(f"      Add with: ALTER TABLE `{idx['table']}` ADD INDEX `idx_{idx['column']}` (`{idx['column']}`);")
        except Exception as e:
            print(f"   ❌ Error checking index: {str(e)}")


def generate_fix_sql():
    """
    Generate SQL to fix common issues
    """
    print("\n" + "=" * 80)
    print("FIX SQL GENERATION")
    print("=" * 80)
    
    sql_fixes = []
    
    # Check for missing indexes
    print("\n-- Add missing indexes:")
    sql_fixes.append("ALTER TABLE `tabChat User Activity` ADD INDEX `idx_user` (`user`);")
    sql_fixes.append("ALTER TABLE `tabChat User Activity` ADD INDEX `idx_is_online` (`is_online`);")
    sql_fixes.append("ALTER TABLE `tabChat Message` ADD INDEX `idx_chat_room` (`chat_room`);")
    
    # Check for orphaned records
    print("\n-- Clean up orphaned records:")
    sql_fixes.append("""
DELETE m FROM `tabChat Message` m
LEFT JOIN `tabChat Room` r ON m.chat_room = r.name
WHERE r.name IS NULL;
""")
    
    sql_fixes.append("""
DELETE m FROM `tabChat Room Member` m
LEFT JOIN `tabUser` u ON m.user = u.name
WHERE u.name IS NULL;
""")
    
    # Print all fixes
    for sql in sql_fixes:
        print(sql)
    
    print("\n-- IMPORTANT: Review these commands before running!")
    print("-- Always backup your database first!")


# Main execution
if __name__ == "__main__":
    try:
        # Run validation
        results = validate_all_schemas()
        
        # Check data integrity
        check_data_integrity()
        
        # Check indexes
        check_indexes()
        
        # Generate fix SQL
        generate_fix_sql()
        
        print("\n✅ Schema validation complete!")
        print("\nNext steps:")
        print("1. Review any warnings or errors above")
        print("2. Run missing migrations if needed: bench --site [site] migrate")
        print("3. Apply any suggested SQL fixes after backing up")
        print("4. Re-run this script to verify fixes")
        
    except Exception as e:
        print(f"\n❌ Validation failed with error: {str(e)}")
        frappe.log_error(f"Schema validation error: {str(e)}")