# F_CHAT WEBRTC - DEBUGGING GUIDE

**Date:** 2025-11-03
**Updated Files:** webrtc_fixed_implementation17.js, chat_features_extended19.js
**Issues Fixed:** Accept/Reject button visibility, Call end functionality, Added comprehensive debug logs

---

## 🐛 **Issues Reported**

### Issue 1: Accept/Reject Buttons Not Visible
**Symptom:** When receiving an incoming call, the accept/reject buttons don't appear or are not clickable

### Issue 2: Call Initiator Unable to End Call
**Symptom:** The user who starts the call cannot use the End Call button to disconnect

### Issue 3: Need Debug Logs
**Requested:** Console logs to track the call flow and identify bugs

---

## ✅ **Fixes Applied**

### Fix 1: Enhanced Console Logging

**File:** [webrtc_fixed_implementation17.js](f_chat/public/js/webrtc_fixed_implementation17.js)

Added comprehensive console logs throughout the call flow:

#### A. Incoming Call Listener (Lines ~925-959)
```javascript
frappe.realtime.on('call_initiated', (data) => {
    console.log('🔔 call_initiated event received:', data);
    console.log('  - Initiated by:', data.initiated_by);
    console.log('  - Current user:', frappe.session.user);
    console.log('  - Participants:', data.participants);
    console.log('  - Call type:', data.call_type);
    console.log('  - Call session ID:', data.call_session_id);

    // ... decision logic with logs
});
```

#### B. Handle Incoming Call (Lines ~630-810)
```javascript
function handle_incoming_call(data) {
    console.log('📞 handle_incoming_call() called with data:', data);
    console.log('  - Caller:', caller);
    console.log('  - Call type:', callType);
    console.log('  - Call session ID:', callSessionId);

    // Checks for existing popup
    // Creates popup with detailed logging
    // Verifies buttons exist before attaching handlers

    console.log('  - Accept button element:', acceptBtn);
    console.log('  - Reject button element:', rejectBtn);

    if (!acceptBtn || !rejectBtn) {
        console.error('❌ ERROR: Buttons not found in DOM!');
        return;
    }
}
```

#### C. Leave Call (Lines ~484-519)
```javascript
async function leave_call() {
    console.log('📞 leave_call() called');
    console.log('  - Current call:', currentCall);

    if (!currentCall) {
        console.warn('⚠️ No active call to leave');
        return;
    }

    console.log('  - Leaving call session:', currentCall.call_session_id);
    // ... API call with logging
    console.log('✅ Leave call API response:', response);
    // ... cleanup with logging
}
```

#### D. Show Call UI (Lines ~922-987)
```javascript
function show_call_ui(callType) {
    console.log('🎬 show_call_ui() called with type:', callType);

    const callUI = document.getElementById('call-ui-container');
    console.log('  - Call UI container element:', callUI);

    if (!callUI) {
        console.error('❌ ERROR: call-ui-container not found in DOM!');
        return;
    }

    // Check if End Call button exists
    const endCallBtn = document.getElementById('end-call-button');
    console.log('  - End call button:', endCallBtn);
    console.log('  - End call button onclick:', endCallBtn.getAttribute('onclick'));
}
```

---

### Fix 2: Improved Button Visibility

**File:** [webrtc_fixed_implementation17.js](f_chat/public/js/webrtc_fixed_implementation17.js#L747-788)

Enhanced CSS for incoming call popup buttons with `!important` flags to override any conflicting styles:

```css
.call-btn {
    flex: 1;
    padding: 12px 20px !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
}

.call-btn-accept {
    background: #28a745 !important;
    color: white !important;
}

.call-btn-reject {
    background: #dc3545 !important;
    color: white !important;
}
```

**What This Does:**
- Forces buttons to be visible even if other CSS tries to hide them
- Ensures proper sizing and spacing
- Makes buttons clickable with `pointer-events: auto`
- Adds active state for better UX feedback

---

## 🔍 **How to Debug**

### Step 1: Check Module Loading

Open browser console (F12) and verify:

```javascript
// 1. Check if WebRTC module loaded
console.log(typeof ChatWebRTC);
// Should return: "object"

// 2. Check if leave_call is available
console.log(typeof ChatWebRTC.leave_call);
// Should return: "function"

// 3. Check if incoming call handler is available
console.log(typeof ChatWebRTC.handle_incoming_call);
// Should return: "function"
```

You should see these startup messages:
```
✅ WebRTC module loaded with incoming call support
👂 Incoming call listener setup successfully
```

---

### Step 2: Test Incoming Call Flow

**User A initiates a call, User B should receive it**

**Expected Console Logs on User B's Browser:**

```
🔔 call_initiated event received: {initiated_by: "userA@example.com", ...}
  - Initiated by: userA@example.com
  - Current user: userB@example.com
  - Participants: ["userB@example.com", "userA@example.com"]
  - Call type: Audio
  - Call session ID: CALL-SESSION-0001
  - Am I in participants? true
✅ I am a participant, showing incoming call popup
📞 handle_incoming_call() called with data: {...}
  - Caller: userA@example.com
  - Call type: Audio
  - Call session ID: CALL-SESSION-0001
✅ No existing popup, creating new one
✅ Popup appended to body
  - Accept button element: <button id="accept-call-btn-CALL-SESSION-0001" ...>
  - Reject button element: <button id="reject-call-btn-CALL-SESSION-0001" ...>
✅ Buttons found, attaching event handlers
✅ Event handlers attached successfully
```

**If You Don't See This:**

1. **No `call_initiated` event:**
   - Check if Frappe realtime is connected: `frappe.realtime.socket.connected`
   - Check if User B is actually in the participants list
   - Verify the call API is broadcasting the event

2. **Popup created but buttons not found:**
   - Check console for `❌ ERROR: Buttons not found in DOM!`
   - Inspect the popup HTML in the log
   - Check for JavaScript errors that prevent DOM creation

3. **Event not triggering:**
   - Check if the listener is set up: Look for `👂 Incoming call listener setup successfully`
   - Verify User B is logged in: `console.log(frappe.session.user)`

---

### Step 3: Test Accept Button

**When User B clicks Accept:**

**Expected Console Logs:**

```
✅ Accept button clicked
📞 Accepting call...
  - hasPermission check
✅ Joining call...
✅ Call accepted, setting up WebRTC connection
🎬 show_call_ui() called with type: Audio
  - Call UI container element: <div id="call-ui-container">
✅ Call UI container found, making it active
  - End call button: <button id="end-call-button" ...>
  - End call button onclick: "ChatWebRTC.leave_call()"
✅ Call type badge updated
🎤 Setting up Audio call UI
⏱️ Call duration timer started
✅ show_call_ui() complete
```

**If End Call Button Is Not Visible:**

Check these in console:
```javascript
// 1. Check if call UI container exists
document.getElementById('call-ui-container')
// Should return: <div> element

// 2. Check if it has 'active' class
document.getElementById('call-ui-container').classList.contains('active')
// Should return: true

// 3. Check if End Call button exists
document.getElementById('end-call-button')
// Should return: <button> element

// 4. Check onclick attribute
document.getElementById('end-call-button').getAttribute('onclick')
// Should return: "ChatWebRTC.leave_call()"

// 5. Manually test leave_call
ChatWebRTC.leave_call()
// Should trigger the leave call flow
```

---

### Step 4: Test End Call Functionality

**When Either User Clicks End Call:**

**Expected Console Logs:**

```
📞 leave_call() called
  - Current call: {call_session_id: "CALL-SESSION-0001", ...}
  - Leaving call session: CALL-SESSION-0001
✅ Leave call API response: {message: {success: true, ...}}
👋 Left call (alert shown)
🧹 Cleaning up WebRTC connection
🙈 Hiding call UI
✅ Leave call complete
```

**If Nothing Happens When Clicking End Call:**

1. **Button Not Triggering:**
   ```javascript
   // Check if button has onclick handler
   const btn = document.getElementById('end-call-button');
   console.log('Button:', btn);
   console.log('Onclick:', btn.onclick);
   console.log('Onclick attribute:', btn.getAttribute('onclick'));

   // Try clicking manually
   btn.click();
   ```

2. **ChatWebRTC.leave_call Not Defined:**
   ```javascript
   // Check if function exists
   console.log(typeof ChatWebRTC.leave_call);
   // Should be "function"

   // Check all exports
   console.log(Object.keys(ChatWebRTC));
   // Should include: ['leave_call', 'setup_webrtc_connection', ...]
   ```

3. **currentCall is null:**
   ```javascript
   // Check current call state
   console.log('Current call:', currentCall);
   // Should have call data, not null

   // If null, the call wasn't properly set up
   // Go back and check the accept/join flow
   ```

---

## 🔧 **Common Issues & Solutions**

### Issue: Buttons Not Clickable

**Symptoms:**
- Buttons appear but don't respond to clicks
- No console logs when clicking

**Solutions:**

1. **Check z-index:**
   ```javascript
   const btn = document.querySelector('.call-btn-accept');
   console.log(window.getComputedStyle(btn).zIndex);
   // Should be a positive number or 'auto'
   ```

2. **Check pointer-events:**
   ```javascript
   const btn = document.querySelector('.call-btn-accept');
   console.log(window.getComputedStyle(btn).pointerEvents);
   // Should be 'auto' or 'inherit', NOT 'none'
   ```

3. **Check if element is covered:**
   ```javascript
   const btn = document.querySelector('.call-btn-accept');
   const rect = btn.getBoundingClientRect();
   const elementAtPoint = document.elementFromPoint(
       rect.left + rect.width/2,
       rect.top + rect.height/2
   );
   console.log('Element at button position:', elementAtPoint);
   // Should be the button itself or its child
   ```

---

### Issue: Call UI Template Not Loading

**Symptoms:**
- `call-ui-container not found in DOM!` error in console
- End Call button never appears

**Solutions:**

1. **Check if template HTML is loaded:**
   ```javascript
   // Look for the template loading function
   // In chat_features_extended19.js
   console.log(typeof load_call_ui_template);

   // Check if it was called
   // Should see "✅ Call UI template loaded" in console
   ```

2. **Manually check for container:**
   ```javascript
   console.log(document.getElementById('call-ui-container'));
   // Should return <div> element, not null
   ```

3. **Load template manually if needed:**
   ```javascript
   fetch('/assets/f_chat/html/call_ui_complete.html')
       .then(r => r.text())
       .then(html => {
           const div = document.createElement('div');
           div.innerHTML = html;
           document.body.appendChild(div);
           console.log('Template loaded manually');
       });
   ```

---

### Issue: "Not a participant" Even Though User Is

**Symptoms:**
- Console shows: `⚠️ I am NOT a participant, not showing popup`
- But user should be included in the call

**Solutions:**

1. **Check participants array format:**
   ```javascript
   // In call_initiated event handler
   console.log('Participants type:', typeof data.participants);
   console.log('Is array?', Array.isArray(data.participants));
   console.log('Participants:', data.participants);
   console.log('Current user:', frappe.session.user);
   console.log('Includes?', data.participants.includes(frappe.session.user));
   ```

2. **Check user email format:**
   Sometimes the API returns different formats (with/without domain)
   ```javascript
   // Check exact match
   console.log('User:', frappe.session.user);
   console.log('Participants:', data.participants);

   // Try case-insensitive match
   const isParticipant = data.participants.some(p =>
       p.toLowerCase() === frappe.session.user.toLowerCase()
   );
   ```

---

## 📋 **Testing Checklist**

### Pre-Test Setup
- [ ] Build assets: `bench build --app f_chat`
- [ ] Clear cache: `bench --site YOUR-SITE clear-cache`
- [ ] Restart: `bench start`
- [ ] Hard refresh browsers: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R`
- [ ] Open console (F12) on BOTH users' browsers

### Test 1: Module Loading
- [ ] User A console shows: `✅ WebRTC module loaded with incoming call support`
- [ ] User B console shows: `✅ WebRTC module loaded with incoming call support`
- [ ] `typeof ChatWebRTC` returns `"object"` on both
- [ ] `typeof ChatWebRTC.leave_call` returns `"function"` on both

### Test 2: Incoming Call Notification
- [ ] User A initiates audio call
- [ ] User B console shows: `🔔 call_initiated event received`
- [ ] User B console shows: `✅ I am a participant, showing incoming call popup`
- [ ] User B console shows: `📞 handle_incoming_call() called`
- [ ] User B sees popup in bottom-right corner
- [ ] Accept button is GREEN and visible
- [ ] Reject button is RED and visible
- [ ] Both buttons have proper hover effects

### Test 3: Accepting Call
- [ ] User B clicks Accept button
- [ ] User B console shows: `✅ Accept button clicked`
- [ ] User B console shows: `✅ Joining call...`
- [ ] User B console shows: `🎬 show_call_ui() called`
- [ ] User B console shows: `✅ Call UI container found`
- [ ] User B console shows: `  - End call button: <button>` (not null)
- [ ] Call UI appears for User B
- [ ] Audio connection established

### Test 4: End Call (User B)
- [ ] User B clicks End Call button
- [ ] User B console shows: `📞 leave_call() called`
- [ ] User B console shows: `  - Current call: {...}` (not null)
- [ ] User B console shows: `✅ Leave call API response`
- [ ] User B console shows: `✅ Leave call complete`
- [ ] Call UI disappears for User B
- [ ] User A sees "User left call" notification

### Test 5: End Call (User A - Initiator)
- [ ] User A initiates audio call
- [ ] User B accepts
- [ ] Both users in active call
- [ ] User A clicks End Call button
- [ ] User A console shows: `📞 leave_call() called`
- [ ] User A console shows: `  - Current call: {...}` (not null)
- [ ] User A console shows: `✅ Leave call complete`
- [ ] Call UI disappears for User A
- [ ] User B sees "Call ended" notification

### Test 6: Reject Call
- [ ] User A initiates call
- [ ] User B sees incoming popup
- [ ] User B clicks Reject button
- [ ] User B console shows: `❌ Reject button clicked`
- [ ] Popup disappears
- [ ] User A sees "Call rejected" notification

---

## 🚀 **Quick Deploy Commands**

```bash
# Navigate to bench directory
cd /Users/bluephoenix/frappe-bench/exp-bench

# Build assets
bench build --app f_chat

# Clear cache
bench --site YOUR-SITE-NAME clear-cache

# Restart bench
bench start
```

**In Each Browser:**
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Open console (F12) to see debug logs

---

## 📊 **Debug Log Legend**

| Icon | Meaning |
|------|---------|
| 🔔 | Realtime event received |
| 📞 | Call-related action |
| ✅ | Success/Found |
| ❌ | Error/Not found |
| ⚠️ | Warning |
| 🎬 | UI action |
| 🧹 | Cleanup |
| 🙈 | Hide UI |
| 👂 | Listener setup |
| 👤 | User info |
| ⏱️ | Timer |
| 🎤 | Audio |
| 📹 | Video |

---

## 📝 **Files Modified**

| File | Lines Changed | Purpose |
|------|---------------|---------|
| webrtc_fixed_implementation17.js | 630-810, 484-519, 922-987, 925-959, 747-788 | Added debug logs, enhanced button CSS |

---

## 💡 **Tips for Debugging**

1. **Always keep console open** when testing calls
2. **Test with two different browsers** (Chrome + Firefox) or incognito windows
3. **Check network tab** for failed API calls
4. **Verify user emails match** in participants list
5. **Look for JavaScript errors** before the expected logs
6. **Check if Frappe realtime is connected**: `frappe.realtime.socket.connected`
7. **Verify STUN/TURN servers** are accessible (network restrictions can block WebRTC)

---

**Debug guide complete! Use these logs and tests to identify and fix any call-related issues.** 🐛🔍
