# Copyright (c) 2025, bluephoenix and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, time_diff_in_seconds
import uuid

class ChatCallSession(Document):
    def before_insert(self):
        """Generate unique session ID before insert"""
        if not self.session_id:
            self.session_id = str(uuid.uuid4())

    def on_update(self):
        """Calculate duration when call ends"""
        if self.call_status in ["Ended", "Failed", "Rejected"] and self.start_time and self.end_time:
            if not self.total_duration:
                self.total_duration = time_diff_in_seconds(self.end_time, self.start_time)

    def add_participant(self, user, joined_time=None):
        """Add a participant to the call"""
        if not joined_time:
            joined_time = now_datetime()

        # Check if participant already exists
        existing = False
        for participant in self.participants:
            if participant.user == user:
                existing = True
                break

        if not existing:
            self.append("participants", {
                "user": user,
                "joined_time": joined_time,
                "status": "Joined"
            })
            self.save(ignore_permissions=True)

    def remove_participant(self, user, left_time=None):
        """Remove a participant from the call"""
        if not left_time:
            left_time = now_datetime()

        for participant in self.participants:
            if participant.user == user:
                participant.status = "Left"
                participant.left_time = left_time

                # Calculate participant duration
                if participant.joined_time:
                    participant.duration = time_diff_in_seconds(left_time, participant.joined_time)

                break

        self.save(ignore_permissions=True)

    def update_call_status(self, status):
        """Update call status and set end time if call is ending"""
        self.call_status = status

        if status in ["Ended", "Failed", "Rejected"]:
            if not self.end_time:
                self.end_time = now_datetime()

        self.save(ignore_permissions=True)

    def get_active_participants(self):
        """Get list of currently active participants"""
        active = []
        for participant in self.participants:
            if participant.status == "Joined":
                active.append(participant.user)
        return active
