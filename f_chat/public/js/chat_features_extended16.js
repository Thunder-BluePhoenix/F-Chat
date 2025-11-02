// F-Chat Extended Features - Email, Voice, Broadcast, Calls
// This file extends nav_chatf10.js with new features

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let isRecordingVoice = false;
let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = null;
let recordingTimer = null;

// Call state - Note: currentCall, peerConnection, localStream, remoteStream
// are declared in webrtc_fixed_implementation.js (loaded first)
// We'll access them as global variables
let incomingCallNotification = null;

// ============================================================================
// EMAIL INTEGRATION
// ============================================================================

function send_message_via_email(messageId, messageContent, messageSender) {
    frappe.prompt([
        {
            fieldname: 'recipients',
            fieldtype: 'Small Text',
            label: 'Recipients (comma-separated emails)',
            description: 'Leave empty to send to all room members',
            reqd: 0
        },
        {
            fieldname: 'subject',
            fieldtype: 'Data',
            label: 'Email Subject',
            description: 'Optional custom subject',
            reqd: 0
        },
        {
            fieldname: 'additional_message',
            fieldtype: 'Small Text',
            label: 'Additional Message',
            description: 'Optional context for email recipients',
            reqd: 0
        }
    ],
    (values) => {
        const recipients = values.recipients ? values.recipients.split(',').map(e => e.trim()).filter(e => e) : null;

        frappe.call({
            method: 'f_chat.send_message_via_email',
            args: {
                message_id: messageId,
                recipients: recipients ? JSON.stringify(recipients) : null,
                subject: values.subject || null,
                additional_message: values.additional_message || null
            },
            callback: function(response) {
                if (response.message && response.message.success) {
                    frappe.show_alert({
                        message: `✅ Email sent to ${response.message.data.recipients_count} recipient(s)`,
                        indicator: 'green'
                    }, 5);
                } else {
                    frappe.show_alert({
                        message: '❌ Failed to send email: ' + (response.message?.error?.message || 'Unknown error'),
                        indicator: 'red'
                    }, 5);
                }
            },
            error: function(err) {
                frappe.show_alert({
                    message: '❌ Error sending email: ' + err.message,
                    indicator: 'red'
                }, 5);
            }
        });
    },
    'Send Message via Email',
    'Send Email'
    );
}

function send_file_via_email(roomId, fileUrl, fileName) {
    frappe.prompt([
        {
            fieldname: 'recipients',
            fieldtype: 'Small Text',
            label: 'Recipients (comma-separated emails)',
            description: 'Leave empty to send to all room members',
            reqd: 0
        },
        {
            fieldname: 'subject',
            fieldtype: 'Data',
            label: 'Email Subject',
            description: 'Optional custom subject',
            reqd: 0
        },
        {
            fieldname: 'message_content',
            fieldtype: 'Small Text',
            label: 'Message',
            description: 'Message to include with the file',
            reqd: 0
        }
    ],
    (values) => {
        const recipients = values.recipients ? values.recipients.split(',').map(e => e.trim()).filter(e => e) : null;

        frappe.call({
            method: 'f_chat.send_file_via_email',
            args: {
                room_id: roomId,
                file_url: fileUrl,
                file_name: fileName,
                recipients: recipients ? JSON.stringify(recipients) : null,
                subject: values.subject || null,
                message_content: values.message_content || null
            },
            callback: function(response) {
                if (response.message && response.message.success) {
                    frappe.show_alert({
                        message: `✅ File sent to ${response.message.data.recipients_count} recipient(s)`,
                        indicator: 'green'
                    }, 5);
                } else {
                    frappe.show_alert({
                        message: '❌ Failed to send file: ' + (response.message?.error?.message || 'Unknown error'),
                        indicator: 'red'
                    }, 5);
                }
            },
            error: function(err) {
                frappe.show_alert({
                    message: '❌ Error sending file: ' + err.message,
                    indicator: 'red'
                }, 5);
            }
        });
    },
    'Send File via Email',
    'Send Email'
    );
}

// ============================================================================
// VOICE MESSAGE RECORDING
// ============================================================================

async function start_voice_recording() {
    try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            frappe.show_alert({
                message: '❌ Your browser does not support voice recording. Please use a modern browser with HTTPS.',
                indicator: 'red'
            }, 5);
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        recordingStartTime = Date.now();

        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            send_voice_message(audioBlob);

            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        isRecordingVoice = true;

        // Update UI
        update_voice_recording_ui(true);

        // Start timer
        start_recording_timer();

        frappe.show_alert({
            message: '🎤 Recording voice message...',
            indicator: 'blue'
        }, 2);

    } catch (error) {
        frappe.show_alert({
            message: '❌ Microphone access denied',
            indicator: 'red'
        }, 3);
        console.error('Error accessing microphone:', error);
    }
}

function stop_voice_recording() {
    if (mediaRecorder && isRecordingVoice) {
        mediaRecorder.stop();
        isRecordingVoice = false;
        update_voice_recording_ui(false);
        stop_recording_timer();
    }
}

function cancel_voice_recording() {
    if (mediaRecorder && isRecordingVoice) {
        mediaRecorder.stop();
        audioChunks = [];
        isRecordingVoice = false;
        update_voice_recording_ui(false);
        stop_recording_timer();

        frappe.show_alert({
            message: '❌ Recording cancelled',
            indicator: 'orange'
        }, 2);
    }
}

function start_recording_timer() {
    const timerDisplay = document.querySelector('#voice-recording-timer');
    if (!timerDisplay) return;

    recordingTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function stop_recording_timer() {
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

function update_voice_recording_ui(recording) {
    const inputArea = document.querySelector('.enhanced-message-input-area');
    if (!inputArea) return;

    const messageInput = document.querySelector('#enhanced-message-input');
    const sendBtn = document.querySelector('#enhanced-send-btn');
    const voiceBtn = document.querySelector('#voice-record-btn');
    const attachBtn = document.querySelector('#attach-file-btn');

    if (recording) {
        // Don't hide the input area, show recording UI above it
        // Hide regular input
        if (messageInput) messageInput.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'none';
        if (attachBtn) attachBtn.style.display = 'none';

        // Show recording UI ABOVE the input area
        let recordingUI = document.querySelector('#voice-recording-ui');
        if (!recordingUI) {
            recordingUI = document.createElement('div');
            recordingUI.id = 'voice-recording-ui';
            recordingUI.className = 'voice-recording-ui';
            recordingUI.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div class="recording-pulse"></div>
                    <span>Recording...</span>
                    <span id="voice-recording-timer" style="font-weight: 600; color: #dc3545;">0:00</span>
                </div>
                <button onclick="cancel_voice_recording()" class="voice-cancel-btn" title="Cancel">
                    <i class="fa fa-times"></i>
                </button>
                <button onclick="stop_voice_recording()" class="voice-stop-btn" title="Send">
                    <i class="fa fa-check"></i>
                </button>
            `;
            // Insert BEFORE the input area (above it)
            inputArea.parentElement.insertBefore(recordingUI, inputArea);
        }
        recordingUI.style.display = 'flex';

    } else {
        // Show regular input
        if (messageInput) messageInput.style.display = 'block';
        if (sendBtn) sendBtn.style.display = 'flex';
        if (attachBtn) attachBtn.style.display = 'flex';

        // Hide recording UI
        const recordingUI = document.querySelector('#voice-recording-ui');
        if (recordingUI) {
            recordingUI.style.display = 'none';
        }
    }
}

function send_voice_message(audioBlob) {
    if (!currentOpenRoom) return;

    frappe.show_alert({
        message: '⬆️ Uploading voice message...',
        indicator: 'blue'
    }, 3);

    // Create FormData for file upload
    const formData = new FormData();
    const filename = `voice_${Date.now()}.webm`;
    formData.append('file', audioBlob, filename);
    formData.append('room_id', currentOpenRoom);

    // Upload using XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/method/f_chat.upload_chat_file?room_id=' + currentOpenRoom);
    xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);

    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.message && response.message.success) {
                    const fileInfo = response.message.data.files[0];

                    // Send message with voice attachment
                    frappe.call({
                        method: 'f_chat.send_message',
                        args: {
                            room_id: currentOpenRoom,
                            message_content: '🎤 Voice message',
                            message_type: 'Voice',
                            attachments: JSON.stringify([fileInfo])
                        },
                        callback: function(msgResponse) {
                            if (msgResponse.message && msgResponse.message.success) {
                                frappe.show_alert({
                                    message: '✅ Voice message sent',
                                    indicator: 'green'
                                }, 2);

                                setTimeout(() => {
                                    if (typeof load_enhanced_room_messages === 'function') {
                                        load_enhanced_room_messages(currentOpenRoom);
                                    }
                                }, 500);
                            }
                        }
                    });
                } else {
                    frappe.show_alert({
                        message: '❌ Failed to upload voice message',
                        indicator: 'red'
                    }, 3);
                }
            } catch (e) {
                console.error('Error parsing upload response:', e);
                frappe.show_alert({
                    message: '❌ Error uploading voice message',
                    indicator: 'red'
                }, 3);
            }
        } else {
            frappe.show_alert({
                message: '❌ Upload failed',
                indicator: 'red'
            }, 3);
        }
    };

    xhr.onerror = function() {
        frappe.show_alert({
            message: '❌ Error uploading voice message',
            indicator: 'red'
        }, 3);
    };

    xhr.send(formData);
}

// ============================================================================
// FILE SHARING
// ============================================================================

function open_file_picker() {
    if (!currentOpenRoom) {
        frappe.msgprint('Please open a room first');
        return;
    }

    // Create file input element
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,audio/*,video/*';

    fileInput.onchange = function(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        upload_files_to_chat(files);
    };

    fileInput.click();
}

function upload_files_to_chat(files) {
    if (!currentOpenRoom) return;

    frappe.show_alert({
        message: `⬆️ Uploading ${files.length} file(s)...`,
        indicator: 'blue'
    }, 3);

    // Create FormData
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }

    // Upload using XMLHttpRequest
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/method/f_chat.upload_chat_file?room_id=' + currentOpenRoom);
    xhr.setRequestHeader('X-Frappe-CSRF-Token', frappe.csrf_token);

    xhr.onload = function() {
        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.message && response.message.success) {
                    const uploadedFiles = response.message.data.files;

                    // Determine message type based on first file
                    let messageType = 'File';
                    if (uploadedFiles.length > 0) {
                        if (uploadedFiles[0].file_type && uploadedFiles[0].file_type.startsWith('image/')) {
                            messageType = 'Image';
                        } else if (uploadedFiles[0].is_audio) {
                            messageType = 'Voice';
                        }
                    }

                    // Create message content
                    let messageContent = '';
                    if (messageType === 'Image') {
                        messageContent = `📷 ${uploadedFiles.length} image(s)`;
                    } else if (messageType === 'Voice') {
                        messageContent = `🎤 Audio file`;
                    } else {
                        messageContent = `📎 ${uploadedFiles.length} file(s)`;
                    }

                    // Send message with attachments
                    frappe.call({
                        method: 'f_chat.send_message',
                        args: {
                            room_id: currentOpenRoom,
                            message_content: messageContent,
                            message_type: messageType,
                            attachments: JSON.stringify(uploadedFiles)
                        },
                        callback: function(msgResponse) {
                            if (msgResponse.message && msgResponse.message.success) {
                                frappe.show_alert({
                                    message: '✅ File(s) sent successfully',
                                    indicator: 'green'
                                }, 2);

                                setTimeout(() => {
                                    if (typeof load_enhanced_room_messages === 'function') {
                                        load_enhanced_room_messages(currentOpenRoom);
                                    }
                                }, 500);
                            }
                        }
                    });
                } else {
                    frappe.show_alert({
                        message: '❌ Failed to upload files',
                        indicator: 'red'
                    }, 3);
                }
            } catch (e) {
                console.error('Error parsing upload response:', e);
                frappe.show_alert({
                    message: '❌ Error uploading files',
                    indicator: 'red'
                }, 3);
            }
        } else {
            frappe.show_alert({
                message: '❌ Upload failed',
                indicator: 'red'
            }, 3);
        }
    };

    xhr.onerror = function() {
        frappe.show_alert({
            message: '❌ Error uploading files',
            indicator: 'red'
        }, 3);
    };

    xhr.send(formData);
}

// ============================================================================
// BROADCAST MESSAGING
// ============================================================================

function show_broadcast_modal() {
    // Get available rooms for broadcasting
    frappe.call({
        method: 'f_chat.get_broadcast_rooms',
        callback: function(response) {
            if (response.message && response.message.success) {
                const rooms = response.message.data.rooms;

                const dialog = new frappe.ui.Dialog({
                    title: '📢 Broadcast Message',
                    fields: [
                        {
                            fieldname: 'selected_rooms',
                            fieldtype: 'MultiSelectPills',
                            label: 'Select Rooms',
                            options: rooms.map(r => r.room_name),
                            reqd: 1
                        },
                        {
                            fieldname: 'message_content',
                            fieldtype: 'Text',
                            label: 'Message',
                            reqd: 1
                        }
                    ],
                    primary_action_label: 'Broadcast',
                    primary_action: function(values) {
                        // Get room IDs from selected names
                        const selectedRoomIds = rooms
                            .filter(r => values.selected_rooms.includes(r.room_name))
                            .map(r => r.room_id);

                        if (selectedRoomIds.length === 0) {
                            frappe.msgprint('Please select at least one room');
                            return;
                        }

                        dialog.disable_primary_action();

                        frappe.call({
                            method: 'f_chat.send_broadcast_message',
                            args: {
                                room_ids: JSON.stringify(selectedRoomIds),
                                message_content: values.message_content,
                                message_type: 'Broadcast'
                            },
                            callback: function(broadcastResponse) {
                                if (broadcastResponse.message && broadcastResponse.message.success) {
                                    const data = broadcastResponse.message.data;
                                    frappe.show_alert({
                                        message: `✅ Broadcast sent to ${data.success_count} room(s)`,
                                        indicator: 'green'
                                    }, 5);

                                    if (data.failure_count > 0) {
                                        frappe.msgprint({
                                            title: 'Broadcast Results',
                                            message: `Successfully sent to ${data.success_count} rooms.<br>Failed: ${data.failure_count} rooms.`,
                                            indicator: 'orange'
                                        });
                                    }

                                    dialog.hide();
                                } else {
                                    frappe.show_alert({
                                        message: '❌ Broadcast failed',
                                        indicator: 'red'
                                    }, 3);
                                    dialog.enable_primary_action();
                                }
                            },
                            error: function() {
                                frappe.show_alert({
                                    message: '❌ Error sending broadcast',
                                    indicator: 'red'
                                }, 3);
                                dialog.enable_primary_action();
                            }
                        });
                    }
                });

                dialog.show();

            } else {
                frappe.msgprint('Unable to load rooms for broadcasting');
            }
        }
    });
}

// ============================================================================
// CALL FUNCTIONALITY
// ============================================================================

function check_and_show_active_call(roomId) {
    frappe.call({
        method: 'f_chat.get_active_call',
        args: { room_id: roomId },
        callback: function(response) {
            if (response.message && response.message.success) {
                const data = response.message.data;
                if (data.has_active_call) {
                    show_active_call_indicator(data.call);
                } else {
                    hide_active_call_indicator();
                }
            }
        }
    });
}

function show_active_call_indicator(callData) {
    const header = document.querySelector('.enhanced-message-header');
    if (!header) return;

    let indicator = document.querySelector('#active-call-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'active-call-indicator';
        indicator.className = 'active-call-indicator';

        const actions = header.querySelector('.room-actions');
        if (actions) {
            actions.insertBefore(indicator, actions.firstChild);
        }
    }

    const isParticipant = callData.is_participant;
    const callType = callData.call_type;
    const icon = callType === 'Video' ? '📹' : '📞';

    indicator.innerHTML = `
        <div class="call-indicator-badge">
            <span>${icon}</span>
            <span>${callType} Call in Progress</span>
        </div>
        ${isParticipant ? `
            <button onclick="leave_current_call()" class="call-action-btn-small danger">
                Leave Call
            </button>
        ` : `
            <button onclick="join_current_call('${callData.call_session_id}')" class="call-action-btn-small success">
                Join Call
            </button>
        `}
    `;

    indicator.style.display = 'flex';
}

function hide_active_call_indicator() {
    const indicator = document.querySelector('#active-call-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function initiate_call(callType) {
    if (!currentOpenRoom) {
        frappe.msgprint('Please open a room first');
        return;
    }

    frappe.confirm(
        `Start ${callType} call in this room?`,
        function() {
            frappe.show_alert({
                message: '📞 Initiating call...',
                indicator: 'blue'
            }, 2);

            // Show call UI from call_ui_complete.html
            show_call_ui(callType);
            update_call_status_indicator('Initiating...', 'blue');

            frappe.call({
                method: 'f_chat.initiate_call',
                args: {
                    room_id: currentOpenRoom,
                    call_type: callType
                },
                callback: function(response) {
                    if (response.message && response.message.success) {
                        currentCall = response.message.data;

                        // Update status to Ringing
                        update_call_status_indicator('Ringing...', 'blue');

                        // Use ChatWebRTC module from webrtc_fixed_implementation.js
                        if (typeof ChatWebRTC !== 'undefined' && ChatWebRTC.setup_webrtc_connection) {
                            ChatWebRTC.setup_webrtc_connection(currentCall);
                        } else {
                            console.error('❌ ChatWebRTC module not loaded!');
                            frappe.show_alert({
                                message: 'WebRTC module not loaded. Please refresh the page.',
                                indicator: 'red'
                            }, 5);
                            hide_call_ui();
                        }

                        // Check for active call
                        check_and_show_active_call(currentOpenRoom);

                    } else {
                        frappe.show_alert({
                            message: '❌ Failed to initiate call: ' + (response.message?.error?.message || 'Unknown error'),
                            indicator: 'red'
                        }, 5);
                        hide_call_ui();
                    }
                },
                error: function(err) {
                    frappe.show_alert({
                        message: '❌ Error initiating call: ' + err.message,
                        indicator: 'red'
                    }, 5);
                    hide_call_ui();
                }
            });
        }
    );
}

function join_current_call(callSessionId) {
    frappe.call({
        method: 'f_chat.join_call',
        args: { call_session_id: callSessionId },
        callback: function(response) {
            if (response.message && response.message.success) {
                currentCall = response.message.data;
                frappe.show_alert({
                    message: '✅ Joined call',
                    indicator: 'green'
                }, 2);

                // Show call UI
                show_call_ui(currentCall.call_type);

                // Use ChatWebRTC module from webrtc_fixed_implementation.js
                if (typeof ChatWebRTC !== 'undefined' && ChatWebRTC.setup_webrtc_connection) {
                    ChatWebRTC.setup_webrtc_connection(currentCall);
                } else {
                    console.error('❌ ChatWebRTC module not loaded!');
                    frappe.show_alert({
                        message: 'WebRTC module not loaded. Please refresh the page.',
                        indicator: 'red'
                    }, 5);
                    hide_call_ui();
                }

                // Update indicator
                check_and_show_active_call(currentOpenRoom);

            } else {
                frappe.show_alert({
                    message: '❌ Failed to join call',
                    indicator: 'red'
                }, 3);
            }
        }
    });
}

function leave_current_call() {
    if (!currentCall) return;

    frappe.call({
        method: 'f_chat.leave_call',
        args: { call_session_id: currentCall.call_session_id },
        callback: function(response) {
            if (response.message && response.message.success) {
                frappe.show_alert({
                    message: '✅ Left call',
                    indicator: 'green'
                }, 2);

                // Cleanup WebRTC using ChatWebRTC module
                if (typeof ChatWebRTC !== 'undefined' && ChatWebRTC.cleanup_webrtc_connection) {
                    ChatWebRTC.cleanup_webrtc_connection();
                } else {
                    // Fallback to local cleanup
                    cleanup_webrtc_connection();
                }

                // Hide call UI
                hide_call_ui();

                // Update indicator
                if (response.message.data.call_ended) {
                    hide_active_call_indicator();
                } else {
                    check_and_show_active_call(currentOpenRoom);
                }

                currentCall = null;
            }
        }
    });
}

function show_call_ui(callType) {
    // Create call UI overlay
    let callUI = document.querySelector('#call-ui-overlay');
    if (!callUI) {
        callUI = document.createElement('div');
        callUI.id = 'call-ui-overlay';
        callUI.className = 'call-ui-overlay';
        document.body.appendChild(callUI);
    }

    const icon = callType === 'Video' ? '📹' : '📞';

    callUI.innerHTML = `
        <div class="call-ui-container">
            <div class="call-ui-header">
                <h3>${icon} ${callType} Call</h3>
                <button onclick="minimize_call_ui()" class="call-ui-minimize">−</button>
            </div>
            <div class="call-ui-body">
                ${callType === 'Video' ? `
                    <div class="video-container">
                        <video id="remote-video" autoplay playsinline></video>
                        <video id="local-video" autoplay playsinline muted></video>
                        <div class="video-status-overlay" id="video-status-overlay">
                            <div class="status-message">Initiating...</div>
                        </div>
                    </div>
                ` : `
                    <div class="audio-call-display">
                        <div class="audio-call-icon">📞</div>
                        <div class="audio-call-status" id="audio-call-status">Initiating...</div>
                    </div>
                `}
                <div class="call-controls">
                    <button onclick="toggle_mute()" id="mute-btn" class="call-control-btn">
                        <i class="fa fa-microphone"></i>
                    </button>
                    ${callType === 'Video' ? `
                        <button onclick="toggle_video()" id="video-btn" class="call-control-btn">
                            <i class="fa fa-video-camera"></i>
                        </button>
                    ` : ''}
                    <button onclick="leave_current_call()" class="call-control-btn danger">
                        <i class="fa fa-phone" style="transform: rotate(135deg);"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    callUI.style.display = 'flex';
}

function hide_call_ui() {
    const callUI = document.querySelector('#call-ui-overlay');
    if (callUI) {
        callUI.style.display = 'none';
    }
}

function minimize_call_ui() {
    const callUI = document.querySelector('#call-ui-overlay');
    if (callUI) {
        callUI.classList.toggle('minimized');
    }
}

function toggle_mute() {
    // Use ChatWebRTC module if available
    if (typeof ChatWebRTC !== 'undefined' && ChatWebRTC.toggle_microphone) {
        ChatWebRTC.toggle_microphone();
    } else {
        // Fallback to local implementation
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const muteBtn = document.querySelector('#mute-btn');
                if (muteBtn) {
                    muteBtn.classList.toggle('muted');
                    muteBtn.querySelector('i').className = audioTrack.enabled ? 'fa fa-microphone' : 'fa fa-microphone-slash';
                }
            }
        }
    }
}

function toggle_video() {
    // Use ChatWebRTC module if available
    if (typeof ChatWebRTC !== 'undefined' && ChatWebRTC.toggle_camera) {
        ChatWebRTC.toggle_camera();
    } else {
        // Fallback to local implementation
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const videoBtn = document.querySelector('#video-btn');
                if (videoBtn) {
                    videoBtn.classList.toggle('off');
                    videoBtn.querySelector('i').className = videoTrack.enabled ? 'fa fa-video-camera' : 'fa fa-ban';
                }
            }
        }
    }
}

// ============================================================================
// CALL STATUS INDICATORS
// ============================================================================

function update_call_status_indicator(status, color) {
    // Update audio call status
    const audioStatus = document.querySelector('#audio-call-status');
    if (audioStatus) {
        audioStatus.textContent = status;
        audioStatus.style.color = color === 'green' ? '#28a745' : color === 'blue' ? '#007bff' : color === 'orange' ? '#fd7e14' : '#dc3545';
    }

    // Update video status overlay (if exists)
    const videoStatus = document.querySelector('#video-status-overlay .status-message');
    if (videoStatus) {
        videoStatus.textContent = status;
        videoStatus.style.color = color === 'green' ? '#28a745' : color === 'blue' ? '#007bff' : color === 'orange' ? '#fd7e14' : '#dc3545';

        // Hide overlay if connected
        const overlay = document.querySelector('#video-status-overlay');
        if (overlay && status.toLowerCase().includes('connected')) {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.style.display = 'none', 300);
        } else if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
        }
    }

    // Show toast notification for important status changes
    if (status.toLowerCase().includes('connected')) {
        frappe.show_alert({
            message: `✅ ${status}`,
            indicator: 'green'
        }, 2);
    } else if (status.toLowerCase().includes('ringing')) {
        frappe.show_alert({
            message: `📞 ${status}`,
            indicator: 'blue'
        }, 2);
    }
}

// ============================================================================
// WEBRTC IMPLEMENTATION
// ============================================================================

async function setup_webrtc_connection(callData) {
    try {
        // Update call status indicator
        update_call_status_indicator('Connecting...', 'blue');

        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            // Fallback for older browsers or HTTP contexts
            if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {
                frappe.show_alert({
                    message: 'Please use a modern browser for better call quality',
                    indicator: 'orange'
                }, 3);
            } else {
                throw new Error('Your browser does not support audio/video calls. Please update your browser.');
            }
        }

        // Request user media with permission prompt
        const constraints = {
            audio: true,
            video: callData.call_type === 'Video'
        };

        update_call_status_indicator('Requesting permissions...', 'blue');

        try {
            localStream = await navigator.mediaDevices.getUserMedia(constraints);
            update_call_status_indicator('Connected', 'green');
        } catch (permissionError) {
            // Handle permission denied
            if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
                frappe.msgprint({
                    title: 'Permission Required',
                    indicator: 'red',
                    message: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🎤</div>
                            <h4>Microphone ${callData.call_type === 'Video' ? '& Camera' : ''} Permission Required</h4>
                            <p style="margin: 15px 0; color: #666;">
                                Please allow access to your ${callData.call_type === 'Video' ? 'microphone and camera' : 'microphone'} to join the call.
                            </p>
                            <p style="font-size: 12px; color: #888;">
                                Click the <strong>🔒 lock icon</strong> in your browser's address bar to manage permissions.
                            </p>
                        </div>
                    `
                });
                throw new Error('Permission denied');
            } else if (permissionError.name === 'NotFoundError') {
                frappe.msgprint({
                    title: 'Device Not Found',
                    indicator: 'red',
                    message: `
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🎤❌</div>
                            <h4>No ${callData.call_type === 'Video' ? 'Camera or ' : ''}Microphone Found</h4>
                            <p style="margin: 15px 0; color: #666;">
                                Please connect a ${callData.call_type === 'Video' ? 'camera and/or ' : ''}microphone to join the call.
                            </p>
                        </div>
                    `
                });
                throw new Error('Device not found');
            } else {
                throw permissionError;
            }
        }

        // Display local video if video call
        if (callData.call_type === 'Video') {
            const localVideo = document.querySelector('#local-video');
            if (localVideo) {
                localVideo.srcObject = localStream;
            }
        }

        // Create peer connection
        const configuration = {
            iceServers: callData.ice_servers || [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        peerConnection = new RTCPeerConnection(configuration);

        // Add local stream tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            if (!remoteStream) {
                remoteStream = new MediaStream();
                const remoteVideo = document.querySelector('#remote-video');
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                }
            }
            remoteStream.addTrack(event.track);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                frappe.call({
                    method: 'f_chat.send_webrtc_signal',
                    args: {
                        call_session_id: callData.call_session_id,
                        signal_type: 'ice-candidate',
                        signal_data: JSON.stringify(event.candidate)
                    }
                });
            }
        };

        // Create and send offer (if initiator)
        if (callData.initiated_by === frappe.session.user) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            frappe.call({
                method: 'f_chat.send_webrtc_signal',
                args: {
                    call_session_id: callData.call_session_id,
                    signal_type: 'offer',
                    signal_data: JSON.stringify(offer)
                }
            });
        }

        // Listen for WebRTC signals
        setup_webrtc_listeners(callData.call_session_id);

    } catch (error) {
        console.error('Error setting up WebRTC:', error);
        frappe.show_alert({
            message: '❌ Failed to setup call: ' + error.message,
            indicator: 'red'
        }, 5);

        leave_current_call();
    }
}

function setup_webrtc_listeners(callSessionId) {
    // Listen for WebRTC signals via realtime
    frappe.realtime.on('webrtc_signal', async (data) => {
        if (data.call_session_id !== callSessionId) return;
        if (data.from_user === frappe.session.user) return;

        try {
            const signalData = typeof data.signal_data === 'string'
                ? JSON.parse(data.signal_data)
                : data.signal_data;

            if (data.signal_type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                frappe.call({
                    method: 'f_chat.send_webrtc_signal',
                    args: {
                        call_session_id: callSessionId,
                        signal_type: 'answer',
                        signal_data: JSON.stringify(answer),
                        target_user: data.from_user
                    }
                });

            } else if (data.signal_type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));

            } else if (data.signal_type === 'ice-candidate') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
            }
        } catch (error) {
            console.error('Error handling WebRTC signal:', error);
        }
    });

    // Listen for call events
    frappe.realtime.on('call_participant_left', (data) => {
        if (data.call_session_id === callSessionId) {
            if (data.call_ended) {
                frappe.show_alert({
                    message: '📞 Call ended',
                    indicator: 'orange'
                }, 3);
                cleanup_webrtc_connection();
                hide_call_ui();
                hide_active_call_indicator();
                currentCall = null;
            }
        }
    });

    // Listen for participant joined
    frappe.realtime.on('call_participant_joined', (data) => {
        if (data.call_session_id === callSessionId) {
            frappe.show_alert({
                message: `${data.user} joined the call`,
                indicator: 'blue'
            }, 2);
        }
    });
}

function cleanup_webrtc_connection() {
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    // Clear remote stream
    remoteStream = null;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Add extended features styles
function add_extended_features_styles() {
    if (document.querySelector('#extended-features-styles')) return;

    const style = document.createElement('style');
    style.id = 'extended-features-styles';
    style.textContent = `
        /* Voice Recording UI */
        .voice-recording-ui {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: #fff3cd;
            border-radius: 8px;
            gap: 8px;
        }

        .recording-pulse {
            width: 12px;
            height: 12px;
            background: #dc3545;
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }

        .voice-cancel-btn, .voice-stop-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .voice-cancel-btn {
            background: #dc3545;
            color: white;
        }

        .voice-stop-btn {
            background: #28a745;
            color: white;
        }

        /* Call UI */
        .call-ui-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: none;
            align-items: center;
            justify-content: center;
        }

        .call-ui-container {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 10px 50px rgba(0,0,0,0.5);
        }

        .call-ui-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .call-ui-minimize {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            transition: background 0.2s;
        }

        .call-ui-minimize:hover {
            background: rgba(255,255,255,0.2);
        }

        .call-ui-body {
            padding: 20px;
        }

        .video-container {
            position: relative;
            width: 100%;
            height: 450px;
            background: #000;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
        }

        #remote-video {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        #local-video {
            position: absolute;
            bottom: 20px;
            right: 20px;
            width: 200px;
            height: 150px;
            border-radius: 8px;
            border: 2px solid white;
            object-fit: cover;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .audio-call-display {
            text-align: center;
            padding: 60px 20px;
        }

        .audio-call-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }

        .audio-call-status {
            font-size: 20px;
            color: #007bff;
            font-weight: 600;
            text-align: center;
            padding: 10px 20px;
            border-radius: 20px;
            background: rgba(0, 123, 255, 0.1);
            transition: all 0.3s ease;
        }

        /* Video Status Overlay */
        .video-status-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            transition: opacity 0.3s ease;
        }

        .video-status-overlay .status-message {
            font-size: 24px;
            color: #007bff;
            font-weight: 600;
            text-align: center;
            padding: 20px 30px;
            border-radius: 30px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }

        .call-controls {
            display: flex;
            justify-content: center;
            gap: 20px;
        }

        .call-control-btn {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background: #f8f9fa;
            color: #333;
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .call-control-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .call-control-btn.danger {
            background: #dc3545;
            color: white;
        }

        .call-control-btn.muted,
        .call-control-btn.off {
            background: #dc3545;
            color: white;
        }

        /* Active Call Indicator */
        .active-call-indicator {
            display: none;
            align-items: center;
            gap: 12px;
            padding: 8px 12px;
            background: rgba(40, 167, 69, 0.1);
            border-radius: 8px;
            margin-right: 12px;
        }

        .call-indicator-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-weight: 600;
            color: #28a745;
        }

        .call-action-btn-small {
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .call-action-btn-small.success {
            background: #28a745;
            color: white;
        }

        .call-action-btn-small.danger {
            background: #dc3545;
            color: white;
        }

        .call-action-btn-small:hover {
            transform: scale(1.05);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        /* Minimized call UI */
        .call-ui-overlay.minimized {
            align-items: flex-end;
            justify-content: flex-end;
        }

        .call-ui-overlay.minimized .call-ui-container {
            width: 300px;
            max-height: 200px;
            margin: 20px;
        }

        .call-ui-overlay.minimized .call-ui-body {
            display: none;
        }

        /* Incoming Call Dialog */
        .incoming-call-dialog {
            z-index: 99999 !important;
        }

        .incoming-call-dialog .modal-dialog {
            animation: pulse-scale 1s infinite;
            max-width: 90% !important;
            margin: 10% auto !important;
        }

        @keyframes pulse-scale {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        .incoming-call-dialog .modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 20px;
        }

        .incoming-call-dialog .modal-title {
            color: white !important;
            font-size: 20px !important;
        }

        .incoming-call-dialog .modal-body {
            padding: 0 !important;
        }

        .incoming-call-dialog .modal-footer {
            border-top: none;
            padding: 20px;
            display: flex;
            gap: 15px;
            justify-content: center;
        }

        .incoming-call-dialog .btn {
            min-width: 120px;
            font-size: 16px !important;
            padding: 12px 24px !important;
            border-radius: 8px;
            font-weight: 600 !important;
            touch-action: manipulation;
        }

        .incoming-call-dialog .btn-primary {
            background: #28a745 !important;
            border-color: #28a745 !important;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
        }

        .incoming-call-dialog .btn-primary:hover,
        .incoming-call-dialog .btn-primary:active {
            background: #218838 !important;
            border-color: #1e7e34 !important;
            transform: scale(1.05);
        }

        .incoming-call-dialog .btn-secondary {
            background: #dc3545 !important;
            border-color: #dc3545 !important;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
        }

        .incoming-call-dialog .btn-secondary:hover,
        .incoming-call-dialog .btn-secondary:active {
            background: #c82333 !important;
            border-color: #bd2130 !important;
            transform: scale(1.05);
        }

        /* Mobile Optimizations */
        @media (max-width: 768px) {
            .incoming-call-dialog .modal-dialog {
                max-width: 95% !important;
                margin: 5% auto !important;
            }

            .incoming-call-dialog .btn {
                min-width: 100px;
                font-size: 15px !important;
                padding: 14px 20px !important;
            }

            .incoming-call-dialog .modal-footer {
                flex-direction: column;
                gap: 10px;
            }

            .incoming-call-dialog .btn {
                width: 100%;
            }
        }
    `;

    document.head.appendChild(style);
}

// ============================================================================
// INCOMING CALL UI
// ============================================================================

function show_incoming_call_dialog(callData) {
    const callType = callData.call_type || 'Audio';
    const icon = callType === 'Video' ? '📹' : '📞';
    const initiatorName = callData.initiated_by;

    // Log for debugging
    console.log('Showing incoming call dialog:', callData);

    // Check if browser supports calls
    const isSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;

    // Create incoming call dialog
    const dialog = new frappe.ui.Dialog({
        title: `${icon} Incoming ${callType} Call`,
        indicator: 'blue',
        size: 'small',
        static: true,  // Prevent dismissal by clicking outside
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'call_info',
                options: `
                    <div style="text-align: center; padding: 30px 20px;">
                        <div style="font-size: 64px; margin-bottom: 15px; animation: pulse 1.5s infinite;">${icon}</div>
                        <h3 style="margin: 15px 0; font-size: 22px;">${initiatorName}</h3>
                        <p style="color: #888; font-size: 16px; margin: 10px 0;">is calling you...</p>
                        <p style="margin-top: 15px; font-size: 14px; color: #666; font-weight: 500;">
                            ${callType} Call
                        </p>
                        ${!isSupported ? `
                            <div style="margin-top: 20px; padding: 12px; background: #fff3cd; border-radius: 8px; font-size: 13px; color: #856404;">
                                ⚠️ Your browser may not support video/audio calls. Please use a modern browser.
                            </div>
                        ` : ''}
                    </div>
                `
            }
        ],
        primary_action_label: '✅ Answer',
        primary_action: function() {
            // Answer the call
            console.log('Answering call:', callData.call_session_id);
            dialog.hide();
            join_current_call(callData.call_session_id);
        },
        secondary_action_label: '❌ Reject',
        secondary_action: function() {
            // Reject the call
            console.log('Rejecting call:', callData.call_session_id);
            dialog.hide();
            frappe.call({
                method: 'f_chat.reject_call',
                args: {
                    call_session_id: callData.call_session_id
                },
                callback: function(response) {
                    if (response.message && response.message.success) {
                        frappe.show_alert({
                            message: '📞 Call rejected',
                            indicator: 'orange'
                        }, 2);
                    }
                }
            });
        }
    });

    // Show dialog
    dialog.show();

    // Force visibility and proper styling
    setTimeout(() => {
        dialog.$wrapper.addClass('incoming-call-dialog');
        dialog.$wrapper.css({
            'z-index': '99999',
            'display': 'block'
        });
        dialog.$wrapper.find('.modal-dialog').css({
            'margin': '10% auto',
            'max-width': '500px'
        });

        // Make buttons more visible on mobile
        dialog.$wrapper.find('.btn-primary').css({
            'font-size': '16px',
            'padding': '12px 24px',
            'min-width': '120px'
        });
        dialog.$wrapper.find('.btn-secondary').css({
            'font-size': '16px',
            'padding': '12px 24px',
            'min-width': '120px'
        });
    }, 100);

    // Store dialog reference to close it if call is ended/cancelled
    if (!window.incomingCallDialogs) {
        window.incomingCallDialogs = {};
    }
    window.incomingCallDialogs[callData.call_session_id] = dialog;

    // Auto-dismiss after 30 seconds if no action taken
    setTimeout(() => {
        if (dialog && dialog.is_visible) {
            dialog.hide();
            frappe.show_alert({
                message: '📞 Missed call from ' + initiatorName,
                indicator: 'orange'
            }, 5);
        }
    }, 30000);
}

// ============================================================================
// GLOBAL REALTIME EVENT LISTENERS FOR CALLS
// ============================================================================

function setup_global_call_listeners() {
    // Listen for incoming call notifications
    frappe.realtime.on('call_initiated', (data) => {
        // Don't show notification to the initiator
        if (data.initiated_by === frappe.session.user) return;

        // Show incoming call dialog with Answer/Reject buttons
        show_incoming_call_dialog(data);

        // Update active call indicator if user is in the room
        if (currentOpenRoom === data.room_id) {
            check_and_show_active_call(data.room_id);
        }

        // Play notification sound (optional)
        try {
            const audio = new Audio('/assets/frappe/sounds/notification.mp3');
            audio.play().catch(e => console.log('Could not play notification sound:', e));
        } catch (e) {
            console.log('Notification sound not available');
        }
    });

    // Listen for call rejection
    frappe.realtime.on('call_rejected', (data) => {
        if (currentCall && data.call_session_id === currentCall.call_session_id) {
            frappe.show_alert({
                message: `${data.user} rejected the call`,
                indicator: 'orange'
            }, 3);
        }
    });

    // Listen for call ended/cancelled - close incoming call dialog
    frappe.realtime.on('call_participant_left', (data) => {
        // Close incoming call dialog if it exists
        if (window.incomingCallDialogs && window.incomingCallDialogs[data.call_session_id]) {
            const dialog = window.incomingCallDialogs[data.call_session_id];
            if (dialog && dialog.is_visible) {
                dialog.hide();
            }
            delete window.incomingCallDialogs[data.call_session_id];

            if (data.call_ended) {
                frappe.show_alert({
                    message: '📞 Call ended',
                    indicator: 'orange'
                }, 2);
            }
        }
    });
}

// Load call UI HTML template
function load_call_ui_template() {
    // Check if already loaded
    if (document.getElementById('call-ui-container')) {
        console.log('✅ Call UI already loaded');
        return;
    }

    // Fetch and inject call UI HTML
    fetch('/assets/f_chat/html/call_ui_complete.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load call UI template');
            }
            return response.text();
        })
        .then(html => {
            // Inject HTML into page
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            document.body.appendChild(tempDiv);
            console.log('✅ Call UI template loaded');
        })
        .catch(err => {
            console.error('❌ Error loading call UI template:', err);
        });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        add_extended_features_styles();
        load_call_ui_template();  // Load call UI template
        // Setup call listeners when frappe is ready
        if (typeof frappe !== 'undefined' && frappe.realtime) {
            setup_global_call_listeners();
        }
    });
} else {
    add_extended_features_styles();
    load_call_ui_template();  // Load call UI template
    // Setup call listeners when frappe is ready
    if (typeof frappe !== 'undefined' && frappe.realtime) {
        setup_global_call_listeners();
    }
}

// ============================================================================
// EXPORT FUNCTIONS GLOBALLY (for onclick handlers)
// ============================================================================
window.initiate_call = initiate_call;
window.join_current_call = join_current_call;
window.leave_current_call = leave_current_call;
window.show_broadcast_modal = show_broadcast_modal;
window.start_voice_recording = start_voice_recording;
window.stop_voice_recording = stop_voice_recording;
window.open_file_picker = open_file_picker;
window.send_message_via_email = send_message_via_email;

console.log('✅ F-Chat Extended Features loaded');
