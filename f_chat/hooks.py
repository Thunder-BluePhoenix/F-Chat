app_name = "f_chat"
app_title = "F Chat"
app_publisher = "bluephoenix"
app_description = "Frappe Chat Application"
app_email = "bluephoenix00995@gmail.com"
app_license = "gpl-3.0"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "f_chat",
# 		"logo": "/assets/f_chat/logo.png",
# 		"title": "F Chat",
# 		"route": "/f_chat",
# 		"has_permission": "f_chat.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------
app_include_css = [
    # "assets/f_chat/css/chat_styles.css",
    # "assets/f_chat/css/chat_enhanced.css"
    "assets/f_chat/css/nav_chat_style3.css"
]
# app_include_js = "/assets/f_chat/js/f_chat.js"
app_include_js = [
    # "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.js",
    # "assets/f_chat/js/chat_integratioonn.js",
    # "assets/f_chat/js/chat_realtimee.js"
    "assets/f_chat/js/webrtc_fixed_implementation14.js",  # WebRTC module - MUST load first
    "assets/f_chat/js/nav_chatf109.js",
    "assets/f_chat/js/chat_features_extended16.js",  # Extended features: email, voice, broadcast, calls

    # "assets/f_chat/js/nav_chat27.js",

    # "assets/f_chat/js/nav_chat_enhanced3.js"
]

# include js, css files in header of desk.html
# app_include_css = "/assets/f_chat/css/f_chat.css"
# app_include_js = "/assets/f_chat/js/f_chat.js"
website_context = {
    "chat_enabled": True,
    "max_file_size": 26214400,  # 25MB
    "supported_file_types": ["image/*", "application/pdf", "text/*", ".doc", ".docx", ".xls", ".xlsx", "audio/*", "video/*"]
}
# include js, css files in header of web template
# web_include_css = "/assets/f_chat/css/f_chat.css"
# web_include_js = "/assets/f_chat/js/f_chat.js"
websocket_events = {
    "chat_message": "f_chat.f_chat.doctype.chat_message.chat_message.handle_websocket_message",
    "chat_room_join": "f_chat.f_chat.doctype.chat_message.chat_message.handle_user_join_room",
    "chat_room_leave": "f_chat.f_chat.doctype.chat_message.chat_message.handle_user_leave_room",
    "typing_indicator": "f_chat.f_chat.doctype.chat_message.chat_message.handle_typing_indicator",
    "call_signal": "f_chat.APIs.notification_chatroom.chat_apis.call_management.send_webrtc_signal"
}
# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "f_chat/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "f_chat/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "f_chat.utils.jinja_methods",
# 	"filters": "f_chat.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "f_chat.install.before_install"
# after_install = "f_chat.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "f_chat.uninstall.before_uninstall"
# after_uninstall = "f_chat.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "f_chat.utils.before_app_install"
# after_app_install = "f_chat.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "f_chat.utils.before_app_uninstall"
# after_app_uninstall = "f_chat.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "f_chat.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }
doc_events = {
   
    "Chat Message": {
        "after_insert": "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.handle_new_message_notification",
        "before_save": "f_chat.f_chat.doctype.chat_message.chat_message.before_save_hook",
        "on_update": "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.handle_message_update_notification"
    },
    "Chat Room": {
        "after_insert": "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.handle_new_room_notification",
        "on_update": "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.handle_room_update_notification"
    },
    "Chat Room Member": {
        "after_insert": "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.handle_member_added_notification",
        "on_trash": "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.handle_member_removed_notification"
    },
    "User": {
        "on_update": "f_chat.f_chat.maintenance.update_user_chat_permissions"
    }
}
# Scheduled Tasks
# ---------------

scheduler_events = {
    # "all": [
    #     "f_chat.cron_jobs.sent_asa_form_link.sent_asa_form_link"
    # ],
    "daily": [
        "f_chat.f_chat.maintenance.cleanup_old_messages",
        "f_chat.f_chat.maintenance.update_room_statistics",
        "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.cleanup_user_status_cache"
        
    ],
    "cron": {
        # "0 0 * * *": [
        #     "f_chat.vendor_onboarding.doctype.vendor_onboarding.vendor_onboarding.handle_expirations"
        # ],
        # "*/1 * * * *": [
        #     "f_chat.APIs.req_for_quotation.rfq_reminder.block_quotation_link",
        #     "f_chat.APIs.sap.send_sap_error_email.uncheck_sap_error_email",
        #     "f_chat.APIs.req_for_quotation.rfq_reminder.quotation_count_reminder_mail"
        # ],
        "*/5 * * * *": [
            "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.cleanup_stale_users"
        ],
        "0 2 * * *": [  # Run at 2 AM daily
            "f_chat.f_chat.maintenance.cleanup_deleted_files"
        ],
        
        "*/15 * * * *": [  # Every 15 minutes
            "f_chat.f_chat.maintenance.update_user_online_status"      
        ],
        "*/1 * * * *": [  # Every minute - for real-time status updates
            "f_chat.APIs.notification_chatroom.chat_apis.realtime_enhanced.update_user_activity_status", 
        ]
    }    
	# "hourly": [
	# 	"f_chat.tasks.hourly"
	# ],
	# "weekly": [
	# 	"f_chat.tasks.weekly"
	# ],
	# "monthly": [
	# 	"f_chat.tasks.monthly"
	# ],
}
# Testing
# -------

# before_tests = "f_chat.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "f_chat.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "f_chat.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]
override_whitelisted_methods = {

    # Core Chat Room APIs (from APIs/notification_chatroom/chat_apis/)
    "f_chat.get_user_chat_rooms": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.get_user_chat_rooms",
    "f_chat.create_chat_room": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.create_chat_room",
    "f_chat.get_chat_messages": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.get_chat_messages",
    "f_chat.send_message": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.send_message",
    "f_chat.add_reaction": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.add_reaction",
    "f_chat.edit_message": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.edit_message",
    "f_chat.delete_message": "f_chat.APIs.notification_chatroom.chat_apis.chat_api.delete_message",
    
    # Room Management APIs
    "f_chat.get_room_details": "f_chat.APIs.notification_chatroom.chat_apis.room_management.get_room_details",
    "f_chat.add_room_member": "f_chat.APIs.notification_chatroom.chat_apis.room_management.add_room_member",
    "f_chat.remove_room_member": "f_chat.APIs.notification_chatroom.chat_apis.room_management.remove_room_member",
    "f_chat.update_member_role": "f_chat.APIs.notification_chatroom.chat_apis.room_management.update_member_role",
    "f_chat.mute_unmute_member": "f_chat.APIs.notification_chatroom.chat_apis.room_management.mute_unmute_member",
    "f_chat.update_room_settings": "f_chat.APIs.notification_chatroom.chat_apis.room_management.update_room_settings",
    "f_chat.archive_room": "f_chat.APIs.notification_chatroom.chat_apis.room_management.archive_room",
    "f_chat.search_users_for_room": "f_chat.APIs.notification_chatroom.chat_apis.room_management.search_users_for_room",
    "f_chat.get_team_chat_rooms": "f_chat.APIs.notification_chatroom.chat_apis.room_management.get_team_chat_rooms",
    "f_chat.join_team_room": "f_chat.APIs.notification_chatroom.chat_apis.room_management.join_team_room",
    
    # File Upload APIs
    "f_chat.upload_chat_file": "f_chat.APIs.notification_chatroom.chat_apis.file_upload.upload_chat_file",
    "f_chat.get_chat_file_preview": "f_chat.APIs.notification_chatroom.chat_apis.file_upload.get_chat_file_preview",
    
    # Real-time Event APIs
    "f_chat.join_chat_room": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events.join_chat_room",
    "f_chat.leave_chat_room": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events.leave_chat_room",
    "f_chat.send_typing_indicator": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events.send_typing_indicator",
    # "f_chat.get_online_users": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events.get_online_users",
    
    # Search and Analytics APIs
    "f_chat.search_messages": "f_chat.APIs.notification_chatroom.chat_apis.search_analytics.search_messages",
    "f_chat.get_chat_analytics": "f_chat.APIs.notification_chatroom.chat_apis.search_analytics.get_chat_analytics",
    "f_chat.get_global_chat_search": "f_chat.APIs.notification_chatroom.chat_apis.search_analytics.get_global_chat_search",
    "f_chat.export_chat_messages": "f_chat.APIs.notification_chatroom.chat_apis.search_analytics.export_chat_messages",
    
    # Maintenance APIs (from f_chat/maintenance.py)
    "f_chat.manual_cleanup_room": "f_chat.f_chat.maintenance.manual_cleanup_room",
    "f_chat.get_room_storage_usage": "f_chat.f_chat.maintenance.get_room_storage_usage",
    "f_chat.get_chat_system_stats": "f_chat.f_chat.maintenance.get_chat_system_stats",
    "f_chat.optimize_chat_database": "f_chat.f_chat.maintenance.optimize_chat_database",
    
    # Chat Utility APIs (from f_chat DocType controllers)
    "f_chat.get_user_chat_status": "f_chat.f_chat.doctype.chat_message.chat_message.get_user_chat_status",
    "f_chat.mark_room_as_read": "f_chat.f_chat.doctype.chat_message.chat_message.mark_room_as_read",
    "f_chat.get_recent_chat_activity": "f_chat.f_chat.doctype.chat_message.chat_message.get_recent_chat_activity",
    "f_chat.search_users_for_chat_room": "f_chat.APIs.notification_chatroom.chat_apis.user_search.search_users_for_chat_room",
    "f_chat.add_member_to_room": "f_chat.APIs.notification_chatroom.chat_apis.user_search.add_member_to_room", 
    "f_chat.add_multiple_members_to_room": "f_chat.APIs.notification_chatroom.chat_apis.user_search.add_multiple_members_to_room",
    "f_chat.check_room_permissions": "f_chat.APIs.notification_chatroom.chat_apis.room_management.check_room_permissions",
    "f_chat.get_user_room_role": "f_chat.APIs.notification_chatroom.chat_apis.room_management.get_user_room_role",

    # Email Integration APIs
    "f_chat.send_message_via_email": "f_chat.APIs.notification_chatroom.chat_apis.email_integration.send_message_via_email",
    "f_chat.send_file_via_email": "f_chat.APIs.notification_chatroom.chat_apis.email_integration.send_file_via_email",
    "f_chat.get_available_email_recipients": "f_chat.APIs.notification_chatroom.chat_apis.email_integration.get_available_email_recipients",

    # Broadcast APIs
    "f_chat.send_broadcast_message": "f_chat.APIs.notification_chatroom.chat_apis.broadcast.send_broadcast_message",
    "f_chat.get_broadcast_rooms": "f_chat.APIs.notification_chatroom.chat_apis.broadcast.get_broadcast_rooms",
    "f_chat.get_broadcast_history": "f_chat.APIs.notification_chatroom.chat_apis.broadcast.get_broadcast_history",

    # Call Management APIs
    "f_chat.initiate_call": "f_chat.APIs.notification_chatroom.chat_apis.call_management.initiate_call",
    "f_chat.join_call": "f_chat.APIs.notification_chatroom.chat_apis.call_management.join_call",
    "f_chat.leave_call": "f_chat.APIs.notification_chatroom.chat_apis.call_management.leave_call",
    "f_chat.reject_call": "f_chat.APIs.notification_chatroom.chat_apis.call_management.reject_call",
    "f_chat.send_webrtc_signal": "f_chat.APIs.notification_chatroom.chat_apis.call_management.send_webrtc_signal",
    "f_chat.get_active_call": "f_chat.APIs.notification_chatroom.chat_apis.call_management.get_active_call",
    "f_chat.get_call_history": "f_chat.APIs.notification_chatroom.chat_apis.call_management.get_call_history",

    "f_chat.update_user_status": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.update_user_status",
    "f_chat.get_user_status": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.get_user_status",
    "f_chat.get_online_users": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.get_online_users",
    "f_chat.heartbeat": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.heartbeat",
    "f_chat.user_typing": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.user_typing",
    "f_chat.join_room": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.join_room",
    "f_chat.leave_room": "f_chat.APIs.notification_chatroom.chat_apis.realtime_events_fixed.leave_room",

}
# Request Events
# ----------------
# before_request = ["f_chat.utils.before_request"]
# after_request = ["f_chat.utils.after_request"]

# Job Events
# ----------
# before_job = ["f_chat.utils.before_job"]
# after_job = ["f_chat.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"f_chat.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

