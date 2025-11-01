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

// Call state
let currentCall = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
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
        // Hide regular input
        if (messageInput) messageInput.style.display = 'none';
        if (sendBtn) sendBtn.style.display = 'none';
        if (attachBtn) attachBtn.style.display = 'none';

        // Show recording UI
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
            inputArea.appendChild(recordingUI);
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

    // Upload audio file
    const formData = new FormData();
    const filename = `voice_${Date.now()}.webm`;
    formData.append('file', audioBlob, filename);

    frappe.call({
        method: 'f_chat.upload_chat_file',
        args: {
            room_id: currentOpenRoom
        },
        type: 'POST',
        files: { file: audioBlob },
        callback: function(response) {
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
        },
        error: function() {
            frappe.show_alert({
                message: '❌ Error uploading voice message',
                indicator: 'red'
            }, 3);
        }
    });
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

            frappe.call({
                method: 'f_chat.initiate_call',
                args: {
                    room_id: currentOpenRoom,
                    call_type: callType
                },
                callback: function(response) {
                    if (response.message && response.message.success) {
                        currentCall = response.message.data;
                        frappe.show_alert({
                            message: '✅ Call initiated successfully',
                            indicator: 'green'
                        }, 3);

                        // Setup WebRTC
                        setup_webrtc_connection(currentCall);

                        // Show call UI
                        show_call_ui(callType);

                        // Check for active call
                        check_and_show_active_call(currentOpenRoom);

                    } else {
                        frappe.show_alert({
                            message: '❌ Failed to initiate call: ' + (response.message?.error?.message || 'Unknown error'),
                            indicator: 'red'
                        }, 5);
                    }
                },
                error: function(err) {
                    frappe.show_alert({
                        message: '❌ Error initiating call: ' + err.message,
                        indicator: 'red'
                    }, 5);
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

                // Setup WebRTC
                setup_webrtc_connection(currentCall);

                // Show call UI
                show_call_ui(currentCall.call_type);

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

                // Cleanup WebRTC
                cleanup_webrtc_connection();

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
                    </div>
                ` : `
                    <div class="audio-call-display">
                        <div class="audio-call-icon">📞</div>
                        <div class="audio-call-status">Connected</div>
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

function toggle_video() {
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

// ============================================================================
// WEBRTC IMPLEMENTATION
// ============================================================================

async function setup_webrtc_connection(callData) {
    try {
        // Get user media
        const constraints = {
            audio: true,
            video: callData.call_type === 'Video'
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);

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
        }

        .audio-call-status {
            font-size: 24px;
            font-weight: 600;
            color: #28a745;
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
    `;

    document.head.appendChild(style);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        add_extended_features_styles();
    });
} else {
    add_extended_features_styles();
}

console.log('✅ F-Chat Extended Features loaded');
