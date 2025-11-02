/**
 * Enhanced WebRTC Call Implementation with Browser Permissions
 * Fixes for: mic, camera, audio permissions
 * Supports: HTTP and HTTPS, Audio and Video calls
 * Version: 2.0
 */

// ============================================================================
// GLOBAL WEBRTC STATE (using var for true global scope)
// ============================================================================
var peerConnection = null;
var localStream = null;
var remoteStream = null;
var currentCall = null;
var dataChannel = null;

// WebRTC Configuration
const rtcConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
};

// ============================================================================
// BROWSER PERMISSION MANAGEMENT
// ============================================================================

/**
 * Check and request browser permissions for media devices
 * @param {string} callType - 'Audio' or 'Video'
 * @returns {Promise<boolean>} - Permission granted status
 */
async function check_and_request_media_permissions(callType) {
    console.log(`🎤 Checking ${callType} permissions...`);
    
    // Check if navigator.mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        frappe.show_alert({
            message: '❌ Your browser does not support media devices. Please use a modern browser.',
            indicator: 'red'
        }, 5);
        return false;
    }

    // Check if running on HTTPS or localhost (required for getUserMedia)
    const isSecureContext = window.isSecureContext || 
                           location.protocol === 'https:' || 
                           location.hostname === 'localhost' ||
                           location.hostname === '127.0.0.1';
    
    if (!isSecureContext) {
        console.warn('⚠️ Not in secure context, media devices may not work properly');
    }

    try {
        // Define constraints based on call type
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: callType === 'Video' ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } : false
        };

        // Request permissions
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Permission granted - stop the test stream
        stream.getTracks().forEach(track => track.stop());
        
        console.log('✅ Media permissions granted');
        
        frappe.show_alert({
            message: `✅ ${callType} permissions granted`,
            indicator: 'green'
        }, 2);
        
        return true;

    } catch (error) {
        console.error('❌ Media permission error:', error);
        
        // Handle specific permission errors
        let errorMessage = '❌ Media permission denied. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Please allow microphone' + (callType === 'Video' ? ' and camera' : '') + ' access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'No media devices found. Please connect a microphone' + (callType === 'Video' ? ' and camera.' : '.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Media device is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage += 'Camera/microphone settings are not supported by your device.';
        } else if (error.name === 'SecurityError') {
            errorMessage += 'Access denied due to security settings. Please use HTTPS.';
        } else {
            errorMessage += error.message;
        }
        
        frappe.show_alert({
            message: errorMessage,
            indicator: 'red'
        }, 7);
        
        return false;
    }
}

/**
 * Show permission help dialog
 */
function show_permission_help() {
    const help_dialog = new frappe.ui.Dialog({
        title: '🎤 Enable Media Permissions',
        fields: [
            {
                fieldtype: 'HTML',
                options: `
                    <div style="padding: 15px;">
                        <h4>How to enable microphone and camera:</h4>
                        <br>
                        <h5>Chrome/Edge:</h5>
                        <ol>
                            <li>Click the camera icon in the address bar</li>
                            <li>Select "Always allow" for microphone and camera</li>
                            <li>Click "Done" and refresh the page</li>
                        </ol>
                        <br>
                        <h5>Firefox:</h5>
                        <ol>
                            <li>Click the permissions icon (left of address bar)</li>
                            <li>Enable microphone and camera</li>
                            <li>Refresh the page</li>
                        </ol>
                        <br>
                        <h5>Safari:</h5>
                        <ol>
                            <li>Go to Safari → Preferences → Websites</li>
                            <li>Select Camera and Microphone</li>
                            <li>Set this website to "Allow"</li>
                        </ol>
                        <br>
                        <div class="alert alert-warning">
                            <strong>Note:</strong> HTTPS is required for media permissions to work properly.
                            If you're on HTTP, media features may not be available.
                        </div>
                    </div>
                `
            }
        ],
        primary_action_label: 'Got it',
        primary_action: () => help_dialog.hide()
    });
    
    help_dialog.show();
}

// ============================================================================
// WEBRTC CONNECTION SETUP
// ============================================================================

/**
 * Initialize WebRTC peer connection
 * @param {Object} callData - Call session data
 */
async function setup_webrtc_connection(callData) {
    console.log('🔗 Setting up WebRTC connection...', callData);
    
    try {
        // Check permissions first
        const hasPermission = await check_and_request_media_permissions(callData.call_type);
        if (!hasPermission) {
            show_permission_help();
            return;
        }

        // Clean up any existing connection
        cleanup_webrtc_connection();

        // Create peer connection
        peerConnection = new RTCPeerConnection(rtcConfiguration);
        console.log('✅ RTCPeerConnection created');

        // Setup ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 Sending ICE candidate');
                send_ice_candidate(callData.call_session_id, event.candidate);
            }
        };

        // Setup remote stream handling
        peerConnection.ontrack = (event) => {
            console.log('📹 Received remote track:', event.track.kind);
            
            if (!remoteStream) {
                remoteStream = new MediaStream();
            }
            
            remoteStream.addTrack(event.track);
            
            // Update remote video/audio elements
            const remoteVideo = document.getElementById('remote-video');
            const remoteAudio = document.getElementById('remote-audio');
            
            if (event.track.kind === 'video' && remoteVideo) {
                remoteVideo.srcObject = remoteStream;
            } else if (event.track.kind === 'audio' && remoteAudio) {
                remoteAudio.srcObject = remoteStream;
            }
        };

        // Setup connection state monitoring
        peerConnection.onconnectionstatechange = () => {
            console.log('🔌 Connection state:', peerConnection.connectionState);
            update_call_status_indicator(peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'disconnected' || 
                peerConnection.connectionState === 'failed') {
                handle_connection_failure();
            }
        };

        // Setup ICE connection state monitoring
        peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
        };

        // Create data channel for chat
        dataChannel = peerConnection.createDataChannel('chat');
        setup_data_channel();

        // Get local media stream
        await setup_local_media(callData.call_type);

        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log(`➕ Added ${track.kind} track to connection`);
        });

        // If initiator, create offer
        if (callData.initiated_by === frappe.session.user) {
            await create_and_send_offer(callData.call_session_id);
        }

        // Setup WebRTC signal listeners
        setup_webrtc_listeners(callData.call_session_id);

    } catch (error) {
        console.error('❌ Error setting up WebRTC:', error);
        frappe.show_alert({
            message: '❌ Failed to setup call: ' + error.message,
            indicator: 'red'
        }, 5);
        cleanup_webrtc_connection();
    }
}

/**
 * Setup local media stream (audio/video)
 * @param {string} callType - 'Audio' or 'Video'
 */
async function setup_local_media(callType) {
    console.log(`🎥 Setting up local ${callType} stream...`);
    
    const constraints = {
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        },
        video: callType === 'Video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
        } : false
    };

    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Local stream obtained');

        // Display local video if video call
        if (callType === 'Video') {
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = localStream;
                localVideo.muted = true; // Mute local video to prevent feedback
            }
        }

        return localStream;

    } catch (error) {
        console.error('❌ Error getting local media:', error);
        throw error;
    }
}

/**
 * Create and send WebRTC offer
 * @param {string} callSessionId - Call session ID
 */
async function create_and_send_offer(callSessionId) {
    try {
        console.log('📤 Creating offer...');
        const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        
        await peerConnection.setLocalDescription(offer);
        console.log('✅ Local description set');

        // Send offer via signaling
        await frappe.call({
            method: 'f_chat.send_webrtc_signal',
            args: {
                call_session_id: callSessionId,
                signal_type: 'offer',
                signal_data: JSON.stringify(offer)
            }
        });
        
        console.log('✅ Offer sent');

    } catch (error) {
        console.error('❌ Error creating offer:', error);
        throw error;
    }
}

/**
 * Send ICE candidate
 * @param {string} callSessionId - Call session ID
 * @param {RTCIceCandidate} candidate - ICE candidate
 */
function send_ice_candidate(callSessionId, candidate) {
    frappe.call({
        method: 'f_chat.send_webrtc_signal',
        args: {
            call_session_id: callSessionId,
            signal_type: 'ice-candidate',
            signal_data: JSON.stringify({
                candidate: candidate.candidate,
                sdpMLineIndex: candidate.sdpMLineIndex,
                sdpMid: candidate.sdpMid
            })
        }
    });
}

/**
 * Setup WebRTC signal listeners
 * @param {string} callSessionId - Call session ID
 */
function setup_webrtc_listeners(callSessionId) {
    console.log('👂 Setting up WebRTC signal listeners...');
    
    frappe.realtime.on('webrtc_signal', async (data) => {
        if (data.call_session_id !== callSessionId) return;
        if (data.from_user === frappe.session.user) return;

        console.log('📨 Received WebRTC signal:', data.signal_type);

        try {
            const signalData = typeof data.signal_data === 'string'
                ? JSON.parse(data.signal_data)
                : data.signal_data;

            if (data.signal_type === 'offer') {
                // Received offer - create answer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                await frappe.call({
                    method: 'f_chat.send_webrtc_signal',
                    args: {
                        call_session_id: callSessionId,
                        signal_type: 'answer',
                        signal_data: JSON.stringify(answer),
                        target_user: data.from_user
                    }
                });
                
                console.log('✅ Answer sent');

            } else if (data.signal_type === 'answer') {
                // Received answer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                console.log('✅ Remote description set (answer)');

            } else if (data.signal_type === 'ice-candidate') {
                // Received ICE candidate
                await peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
                console.log('✅ ICE candidate added');
            }

        } catch (error) {
            console.error('❌ Error handling WebRTC signal:', error);
        }
    });
}

/**
 * Setup data channel for in-call chat
 */
function setup_data_channel() {
    if (!dataChannel) return;

    dataChannel.onopen = () => {
        console.log('💬 Data channel opened');
    };

    dataChannel.onmessage = (event) => {
        console.log('📩 Received data channel message:', event.data);
        // Handle in-call messages here
    };

    dataChannel.onclose = () => {
        console.log('❌ Data channel closed');
    };
}

// ============================================================================
// CALL CONTROL FUNCTIONS
// ============================================================================

/**
 * Toggle microphone mute
 */
function toggle_microphone() {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const status = audioTrack.enabled ? 'unmuted' : 'muted';
        console.log(`🎤 Microphone ${status}`);
        
        update_mute_button(audioTrack.enabled);
        
        frappe.show_alert({
            message: `🎤 Microphone ${status}`,
            indicator: audioTrack.enabled ? 'green' : 'orange'
        }, 2);
    }
}

/**
 * Toggle camera
 */
function toggle_camera() {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const status = videoTrack.enabled ? 'on' : 'off';
        console.log(`📹 Camera ${status}`);
        
        update_camera_button(videoTrack.enabled);
        
        frappe.show_alert({
            message: `📹 Camera ${status}`,
            indicator: videoTrack.enabled ? 'green' : 'orange'
        }, 2);
    }
}

/**
 * Leave/End call
 */
async function leave_call() {
    console.log('📞 leave_call() called');
    console.log('  - Current call:', currentCall);

    if (!currentCall) {
        console.warn('⚠️ No active call to leave');
        return;
    }

    console.log('  - Leaving call session:', currentCall.call_session_id);

    try {
        const response = await frappe.call({
            method: 'f_chat.leave_call',
            args: {
                call_session_id: currentCall.call_session_id
            }
        });

        console.log('✅ Leave call API response:', response);

        frappe.show_alert({
            message: '👋 Left call',
            indicator: 'orange'
        }, 2);

    } catch (error) {
        console.error('❌ Error leaving call:', error);
    } finally {
        console.log('🧹 Cleaning up WebRTC connection');
        cleanup_webrtc_connection();
        console.log('🙈 Hiding call UI');
        hide_call_ui();
        console.log('✅ Leave call complete');
    }
}

/**
 * Handle connection failure
 */
function handle_connection_failure() {
    frappe.show_alert({
        message: '❌ Call connection failed. Please try again.',
        indicator: 'red'
    }, 5);
    
    // Auto cleanup after 3 seconds
    setTimeout(() => {
        if (peerConnection && 
            (peerConnection.connectionState === 'failed' || 
             peerConnection.connectionState === 'disconnected')) {
            leave_call();
        }
    }, 3000);
}

/**
 * Cleanup WebRTC connection and streams
 */
function cleanup_webrtc_connection() {
    console.log('🧹 Cleaning up WebRTC resources...');
    
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            console.log(`⏹️ Stopped ${track.kind} track`);
        });
        localStream = null;
    }
    
    // Stop remote stream
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    // Close data channel
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    currentCall = null;
    console.log('✅ Cleanup complete');
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

function update_call_status_indicator(status) {
    const indicator = document.getElementById('call-status-indicator');
    if (!indicator) return;
    
    const statusText = {
        'new': 'Initializing...',
        'checking': 'Connecting...',
        'connected': 'Connected',
        'completed': 'Connected',
        'disconnected': 'Disconnected',
        'failed': 'Connection Failed',
        'closed': 'Call Ended'
    };
    
    indicator.textContent = statusText[status] || status;
    indicator.className = `call-status-${status}`;
}

function update_mute_button(isEnabled) {
    const button = document.getElementById('mute-button');
    if (button) {
        button.innerHTML = isEnabled ? '🎤 Mute' : '🔇 Unmute';
        button.classList.toggle('muted', !isEnabled);
    }
}

function update_camera_button(isEnabled) {
    const button = document.getElementById('camera-button');
    if (button) {
        button.innerHTML = isEnabled ? '📹 Camera' : '📹 Off';
        button.classList.toggle('camera-off', !isEnabled);
    }
}

function hide_call_ui() {
    // Hide call UI from call_ui_complete.html
    const callUI = document.getElementById('call-ui-container');
    if (callUI) {
        callUI.classList.remove('active');
    }

    // Also hide call UI from chat_features (if using custom UI)
    const customCallUI = document.querySelector('#call-ui-overlay');
    if (customCallUI) {
        customCallUI.style.display = 'none';
    }

    // Also trigger chat_features leave_current_call if it exists
    if (typeof window.leave_current_call === 'function') {
        // Don't call it if we're already in the process of leaving
        // Just ensure the UI is hidden
    }
}

// ============================================================================
// INCOMING CALL HANDLING
// ============================================================================

/**
 * Handle incoming call - Show accept/reject popup
 * @param {Object} data - Call data {caller, call_type, call_session_id, room_id}
 */
function handle_incoming_call(data) {
    console.log('📞 handle_incoming_call() called with data:', data);

    const caller = data.initiated_by_full_name || data.initiated_by || data.caller;
    const callType = data.call_type || "Audio";
    const callSessionId = data.call_session_id;

    console.log('  - Caller:', caller);
    console.log('  - Call type:', callType);
    console.log('  - Call session ID:', callSessionId);

    // Prevent multiple popups for same call
    const existingPopup = document.getElementById(`incoming-call-popup-${callSessionId}`);
    if (existingPopup) {
        console.log('⚠️ Popup already showing for this call (ID:', callSessionId, ')');
        return;
    }
    console.log('✅ No existing popup, creating new one');

    // Create popup
    const popup = document.createElement("div");
    popup.id = `incoming-call-popup-${callSessionId}`;
    popup.className = "incoming-call-popup";
    popup.innerHTML = `
        <div class="incoming-call-content">
            <div class="incoming-call-icon">📞</div>
            <div class="incoming-call-info">
                <div class="incoming-call-title">Incoming ${callType} Call</div>
                <div class="incoming-call-caller">${caller}</div>
            </div>
            <div class="incoming-call-actions">
                <button id="accept-call-btn-${callSessionId}" class="call-btn call-btn-accept">
                    ✓ Accept
                </button>
                <button id="reject-call-btn-${callSessionId}" class="call-btn call-btn-reject">
                    ✗ Reject
                </button>
            </div>
        </div>
    `;

    // Add styles if not already added
    if (!document.getElementById('incoming-call-styles')) {
        const style = document.createElement('style');
        style.id = 'incoming-call-styles';
        style.textContent = `
            .incoming-call-popup {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                padding: 20px;
                z-index: 99999;
                min-width: 300px;
                animation: slideInRight 0.3s ease;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .incoming-call-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
            }

            .incoming-call-icon {
                font-size: 48px;
                animation: pulse 1.5s infinite;
            }

            .incoming-call-info {
                text-align: center;
            }

            .incoming-call-title {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
            }

            .incoming-call-caller {
                font-size: 14px;
                color: #666;
            }

            .incoming-call-actions {
                display: flex;
                gap: 10px;
                width: 100%;
            }

            .call-btn {
                flex: 1;
                padding: 12px 20px !important;
                border: none !important;
                border-radius: 8px !important;
                font-size: 16px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: all 0.2s !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }

            .call-btn-accept {
                background: #28a745 !important;
                color: white !important;
            }

            .call-btn-accept:hover {
                background: #218838 !important;
                transform: scale(1.05) !important;
            }

            .call-btn-accept:active {
                transform: scale(0.95) !important;
            }

            .call-btn-reject {
                background: #dc3545 !important;
                color: white !important;
            }

            .call-btn-reject:hover {
                background: #c82333 !important;
                transform: scale(1.05) !important;
            }

            .call-btn-reject:active {
                transform: scale(0.95) !important;
            }

            @media (max-width: 768px) {
                .incoming-call-popup {
                    bottom: 10px;
                    right: 10px;
                    left: 10px;
                    min-width: unset;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(popup);
    console.log('✅ Popup appended to body');

    // Get button elements
    const acceptBtn = document.getElementById(`accept-call-btn-${callSessionId}`);
    const rejectBtn = document.getElementById(`reject-call-btn-${callSessionId}`);

    console.log('  - Accept button element:', acceptBtn);
    console.log('  - Reject button element:', rejectBtn);

    if (!acceptBtn || !rejectBtn) {
        console.error('❌ ERROR: Buttons not found in DOM!');
        console.log('  - Popup HTML:', popup.innerHTML);
        return;
    }

    console.log('✅ Buttons found, attaching event handlers');

    // Accept button handler
    acceptBtn.onclick = () => {
        console.log('✅ Accept button clicked');
        popup.remove();
        accept_incoming_call(data);
    };

    // Reject button handler
    rejectBtn.onclick = () => {
        console.log('❌ Reject button clicked');
        popup.remove();
        reject_incoming_call(data);
    };

    console.log('✅ Event handlers attached successfully');

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (document.getElementById(`incoming-call-popup-${callSessionId}`)) {
            popup.remove();
            console.log('⏱️ Incoming call timed out');
            frappe.show_alert({
                message: `📞 Missed call from ${caller}`,
                indicator: 'orange'
            }, 5);
        }
    }, 30000);

    // Play notification sound
    try {
        const audio = new Audio('/assets/frappe/sounds/notification.mp3');
        audio.play().catch(e => console.log('Could not play notification sound'));
    } catch (e) {
        console.log('Notification sound not available');
    }
}

/**
 * Accept incoming call
 * @param {Object} data - Call data
 */
async function accept_incoming_call(data) {
    try {
        console.log('📞 Accepting call...', data);

        // Check permissions first
        const hasPermission = await check_and_request_media_permissions(data.call_type);
        if (!hasPermission) {
            frappe.show_alert({
                message: '❌ Media permissions denied',
                indicator: 'red'
            }, 5);
            return;
        }

        // Join the call via API
        const response = await frappe.call({
            method: 'f_chat.join_call',
            args: { call_session_id: data.call_session_id }
        });

        if (response.message && response.message.success) {
            currentCall = response.message.data;

            frappe.show_alert({
                message: '✅ Joining call...',
                indicator: 'green'
            }, 2);

            // Setup WebRTC connection
            await setup_webrtc_connection(currentCall);

            // Show call UI
            show_call_ui(data.call_type);

        } else {
            throw new Error(response.message?.error?.message || 'Failed to join call');
        }

    } catch (error) {
        console.error('❌ Error accepting call:', error);
        frappe.show_alert({
            message: '❌ Failed to join call: ' + error.message,
            indicator: 'red'
        }, 5);
    }
}

/**
 * Reject incoming call
 * @param {Object} data - Call data
 */
function reject_incoming_call(data) {
    frappe.call({
        method: 'f_chat.reject_call',
        args: { call_session_id: data.call_session_id },
        callback: function(response) {
            if (response.message && response.message.success) {
                frappe.show_alert({
                    message: '📞 Call rejected',
                    indicator: 'orange'
                }, 2);
            }
        },
        error: function(err) {
            console.error('Error rejecting call:', err);
        }
    });
}

/**
 * Show call UI
 * @param {string} callType - 'Audio' or 'Video'
 */
function show_call_ui(callType) {
    console.log('🎬 show_call_ui() called with type:', callType);

    const callUI = document.getElementById('call-ui-container');
    console.log('  - Call UI container element:', callUI);

    if (!callUI) {
        console.error('❌ ERROR: call-ui-container not found in DOM!');
        console.log('  - Make sure call_ui_complete.html template is loaded');
        return;
    }

    console.log('✅ Call UI container found, making it active');
    callUI.classList.add('active');

    // Check if End Call button exists
    const endCallBtn = document.getElementById('end-call-button');
    console.log('  - End call button:', endCallBtn);
    if (endCallBtn) {
        console.log('  - End call button onclick:', endCallBtn.getAttribute('onclick'));
    } else {
        console.error('❌ ERROR: End call button not found!');
    }

    // Update UI based on call type
    const typeBadge = document.getElementById('call-type-badge');
    if (typeBadge) {
        typeBadge.textContent = `${callType} Call`;
        console.log('✅ Call type badge updated');
    }

    // Show/hide video elements
    const audioOnlyUI = document.getElementById('audio-only-ui');
    const cameraButton = document.getElementById('camera-button');
    const localVideo = document.getElementById('local-video');
    const remoteVideo = document.getElementById('remote-video');

    console.log('  - Audio-only UI:', audioOnlyUI);
    console.log('  - Camera button:', cameraButton);
    console.log('  - Local video:', localVideo);
    console.log('  - Remote video:', remoteVideo);

    if (callType === 'Video') {
        console.log('📹 Setting up Video call UI');
        if (audioOnlyUI) audioOnlyUI.style.display = 'none';
        if (cameraButton) cameraButton.style.display = 'flex';
        if (localVideo) localVideo.style.display = 'block';
        if (remoteVideo) remoteVideo.style.display = 'block';
    } else {
        console.log('🎤 Setting up Audio call UI');
        if (audioOnlyUI) audioOnlyUI.style.display = 'flex';
        if (cameraButton) cameraButton.style.display = 'none';
        if (localVideo) localVideo.style.display = 'none';
        if (remoteVideo) remoteVideo.style.display = 'none';
    }

    // Start call duration timer
    if (typeof start_call_duration_timer === 'function') {
        start_call_duration_timer();
        console.log('⏱️ Call duration timer started');
    } else {
        console.warn('⚠️ start_call_duration_timer function not found');
    }

    console.log('✅ show_call_ui() complete');
}

/**
 * Setup incoming call listener
 */
function setup_incoming_call_listener() {
    // Listen for incoming call events via Frappe realtime
    frappe.realtime.on('call_initiated', (data) => {
        console.log('🔔 call_initiated event received:', data);
        console.log('  - Initiated by:', data.initiated_by);
        console.log('  - Current user:', frappe.session.user);
        console.log('  - Participants:', data.participants);
        console.log('  - Call type:', data.call_type);
        console.log('  - Call session ID:', data.call_session_id);

        // Don't show popup to the caller
        if (data.initiated_by === frappe.session.user) {
            console.log('👤 This is my own call, skipping popup');
            return;
        }

        // Check if user is in the participants list
        if (data.participants && Array.isArray(data.participants)) {
            const isParticipant = data.participants.includes(frappe.session.user);
            console.log('  - Am I in participants?', isParticipant);

            if (isParticipant) {
                console.log('✅ I am a participant, showing incoming call popup');
                handle_incoming_call(data);
            } else {
                console.log('⚠️ I am NOT a participant, not showing popup');
            }
        } else {
            // If no participants list, show to all users in the room
            console.log('⚠️ No participants list, showing to all');
            handle_incoming_call(data);
        }
    });

    console.log('👂 Incoming call listener setup successfully');
}

// Auto-setup listener when module loads
if (typeof frappe !== 'undefined' && frappe.realtime) {
    setup_incoming_call_listener();
} else {
    // Wait for frappe to be ready
    document.addEventListener('frappe:ready', () => {
        setup_incoming_call_listener();
    });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

// Make functions globally available
window.ChatWebRTC = {
    check_and_request_media_permissions,
    show_permission_help,
    setup_webrtc_connection,
    toggle_microphone,
    toggle_camera,
    leave_call,
    cleanup_webrtc_connection,
    // New exports
    handle_incoming_call,
    accept_incoming_call,
    reject_incoming_call,
    show_call_ui,
    setup_incoming_call_listener
};

console.log('✅ WebRTC module loaded with incoming call support');