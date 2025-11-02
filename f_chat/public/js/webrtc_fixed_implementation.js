/**
 * Enhanced WebRTC Call Implementation with Browser Permissions
 * Fixes for: mic, camera, audio permissions
 * Supports: HTTP and HTTPS, Audio and Video calls
 * Version: 2.0
 */

// ============================================================================
// GLOBAL WEBRTC STATE
// ============================================================================
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let currentCall = null;
let dataChannel = null;

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
    if (!currentCall) return;
    
    try {
        await frappe.call({
            method: 'f_chat.leave_call',
            args: {
                call_session_id: currentCall.call_session_id
            }
        });
        
        frappe.show_alert({
            message: '👋 Left call',
            indicator: 'orange'
        }, 2);
        
    } catch (error) {
        console.error('Error leaving call:', error);
    } finally {
        cleanup_webrtc_connection();
        hide_call_ui();
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
    const callUI = document.getElementById('call-ui-container');
    if (callUI) {
        callUI.style.display = 'none';
    }
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
    cleanup_webrtc_connection
};

console.log('✅ WebRTC module loaded');