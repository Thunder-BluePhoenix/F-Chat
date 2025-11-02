#!/bin/bash

# F_Chat Fix Installation Script
# Automates the deployment of all fixes

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running in bench directory
check_bench_directory() {
    if [ ! -d "apps" ] || [ ! -d "sites" ]; then
        print_error "This script must be run from your frappe-bench directory!"
        print_info "Example: cd ~/frappe-bench && bash install_fixes.sh"
        exit 1
    fi
    print_success "Running in bench directory"
}

# Get site name
get_site_name() {
    print_header "Site Selection"
    
    # List available sites
    echo "Available sites:"
    ls sites/ | grep -v "common_site_config.json" | grep -v "assets" | nl
    
    echo ""
    read -p "Enter site name: " SITE_NAME
    
    if [ ! -d "sites/$SITE_NAME" ]; then
        print_error "Site '$SITE_NAME' not found!"
        exit 1
    fi
    
    print_success "Selected site: $SITE_NAME"
}

# Get fixes directory
get_fixes_directory() {
    print_header "Fixes Location"
    
    read -p "Enter path to downloaded fixes directory: " FIXES_DIR
    
    if [ ! -d "$FIXES_DIR" ]; then
        print_error "Directory not found: $FIXES_DIR"
        exit 1
    fi
    
    # Check if required files exist
    required_files=(
        "fix_chat_status_to_activity.py"
        "realtime_events_fixed.py"
        "webrtc_fixed_implementation.js"
        "call_ui_complete.html"
        "validate_schemas.py"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$FIXES_DIR/$file" ]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    
    print_success "All required files found"
}

# Backup database
backup_database() {
    print_header "Database Backup"
    
    read -p "Create database backup before proceeding? (yes/no): " backup_answer
    
    if [ "$backup_answer" = "yes" ] || [ "$backup_answer" = "y" ]; then
        print_info "Creating backup..."
        bench --site "$SITE_NAME" backup
        print_success "Backup created"
    else
        print_warning "Skipping backup (not recommended!)"
    fi
}

# Copy files
copy_files() {
    print_header "Copying Files"
    
    # Create target directories if they don't exist
    mkdir -p "apps/f_chat/f_chat/patches"
    mkdir -p "apps/f_chat/f_chat/APIs/notification_chatroom/chat_apis"
    mkdir -p "apps/f_chat/f_chat/public/js"
    mkdir -p "apps/f_chat/f_chat/public/html"
    
    # Copy files
    print_info "Copying migration patch..."
    cp "$FIXES_DIR/fix_chat_status_to_activity.py" "apps/f_chat/f_chat/patches/"
    print_success "Copied fix_chat_status_to_activity.py"
    
    print_info "Copying fixed API..."
    cp "$FIXES_DIR/realtime_events_fixed.py" "apps/f_chat/f_chat/APIs/notification_chatroom/chat_apis/"
    print_success "Copied realtime_events_fixed.py"
    
    print_info "Copying WebRTC implementation..."
    cp "$FIXES_DIR/webrtc_fixed_implementation.js" "apps/f_chat/f_chat/public/js/"
    print_success "Copied webrtc_fixed_implementation.js"
    
    print_info "Copying call UI..."
    cp "$FIXES_DIR/call_ui_complete.html" "apps/f_chat/f_chat/public/html/"
    print_success "Copied call_ui_complete.html"
    
    print_info "Copying schema validator..."
    cp "$FIXES_DIR/validate_schemas.py" "apps/f_chat/f_chat/patches/"
    print_success "Copied validate_schemas.py"
    
    print_success "All files copied successfully"
}

# Update hooks.py
update_hooks() {
    print_header "Updating hooks.py"
    
    HOOKS_FILE="apps/f_chat/f_chat/hooks.py"
    
    if [ ! -f "$HOOKS_FILE" ]; then
        print_error "hooks.py not found!"
        exit 1
    fi
    
    print_warning "Please manually update hooks.py with the following:"
    echo ""
    echo "Add to override_whitelisted_methods:"
    echo "----------------------------------------"
    cat << 'EOF'
override_whitelisted_methods = {
    "f_chat.update_user_status": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.update_user_status",
    "f_chat.get_user_status": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.get_user_status",
    "f_chat.get_online_users": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.get_online_users",
    "f_chat.heartbeat": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.heartbeat",
}
EOF
    echo ""
    echo "Add to scheduler_events:"
    echo "------------------------"
    cat << 'EOF'
scheduler_events = {
    "cron": {
        "*/5 * * * *": [
            "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.cleanup_stale_users"
        ]
    }
}
EOF
    echo ""
    read -p "Press Enter when you've updated hooks.py..."
}

# Run migration
run_migration() {
    print_header "Running Migration"
    
    print_info "Starting migration patch..."
    
    # Create temporary Python script
    cat > /tmp/run_migration.py << EOF
import frappe
from f_chat.patches.fix_chat_status_to_activity import execute

frappe.init(site='$SITE_NAME')
frappe.connect()

print("\\n" + "="*80)
print("RUNNING MIGRATION")
print("="*80)

try:
    execute()
    frappe.db.commit()
    print("\\n✅ Migration completed successfully!")
except Exception as e:
    print(f"\\n❌ Migration failed: {str(e)}")
    frappe.db.rollback()
    raise
finally:
    frappe.destroy()
EOF
    
    # Run migration
    bench --site "$SITE_NAME" console < /tmp/run_migration.py
    
    # Clean up
    rm /tmp/run_migration.py
    
    print_success "Migration completed"
}

# Validate schemas
validate_schemas() {
    print_header "Schema Validation"
    
    read -p "Run schema validation? (yes/no): " validate_answer
    
    if [ "$validate_answer" = "yes" ] || [ "$validate_answer" = "y" ]; then
        print_info "Running validation..."
        
        cat > /tmp/validate.py << EOF
import frappe
from f_chat.patches.validate_schemas import validate_all_schemas, check_data_integrity

frappe.init(site='$SITE_NAME')
frappe.connect()

try:
    validate_all_schemas()
    check_data_integrity()
except Exception as e:
    print(f"Validation error: {str(e)}")
finally:
    frappe.destroy()
EOF
        
        bench --site "$SITE_NAME" console < /tmp/validate.py
        rm /tmp/validate.py
        
        print_success "Validation completed"
    else
        print_info "Skipping validation"
    fi
}

# Clear cache and restart
clear_and_restart() {
    print_header "Clear Cache & Restart"
    
    print_info "Clearing cache..."
    bench --site "$SITE_NAME" clear-cache
    print_success "Cache cleared"
    
    print_info "Building assets..."
    bench build --app f_chat
    print_success "Assets built"
    
    print_info "Restarting services..."
    bench restart
    print_success "Services restarted"
}

# Final verification
final_verification() {
    print_header "Final Verification"
    
    echo ""
    echo "Please verify the following:"
    echo ""
    echo "1. Database verification:"
    echo "   bench --site $SITE_NAME mariadb"
    echo "   SELECT COUNT(*) FROM \`tabChat User Activity\`;"
    echo ""
    echo "2. Check error logs:"
    echo "   bench --site $SITE_NAME logs"
    echo ""
    echo "3. Test in browser:"
    echo "   - Login to chat"
    echo "   - Try initiating a call"
    echo "   - Check browser console (F12)"
    echo "   - Look for: ChatWebRTC object"
    echo ""
    
    print_success "Installation completed!"
}

# Main installation flow
main() {
    print_header "F_Chat Fix Installation"
    echo ""
    print_warning "This script will install all F_Chat fixes"
    print_warning "Make sure you have:"
    print_info "  - Downloaded all fix files"
    print_info "  - Backup of your database (recommended)"
    print_info "  - Tested in a development environment first"
    echo ""
    
    read -p "Continue with installation? (yes/no): " continue_answer
    
    if [ "$continue_answer" != "yes" ] && [ "$continue_answer" != "y" ]; then
        print_info "Installation cancelled"
        exit 0
    fi
    
    # Run installation steps
    check_bench_directory
    get_site_name
    get_fixes_directory
    backup_database
    copy_files
    update_hooks
    run_migration
    validate_schemas
    clear_and_restart
    final_verification
    
    echo ""
    print_header "Installation Complete! 🎉"
    echo ""
    print_info "Next steps:"
    echo "  1. Read deployment_guide.md for configuration"
    echo "  2. Test all functionality"
    echo "  3. Monitor logs for 24 hours"
    echo ""
    print_success "Happy chatting! 🚀"
}

# Run main function
main