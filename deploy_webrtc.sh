#!/bin/bash
# F_CHAT WebRTC Deployment Script
# Run this to deploy the WebRTC implementation

set -e  # Exit on error

SITE_NAME="${1:-}"
BENCH_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"

echo ""
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         F_CHAT WEBRTC IMPLEMENTATION DEPLOYMENT                   ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if site name provided
if [ -z "$SITE_NAME" ]; then
    echo "❌ Error: Site name required"
    echo ""
    echo "Usage: bash deploy_webrtc.sh <site-name>"
    echo ""
    echo "Example:"
    echo "  bash deploy_webrtc.sh mysite.local"
    echo ""
    exit 1
fi

echo "📋 Configuration:"
echo "   Site: $SITE_NAME"
echo "   Bench: $BENCH_PATH"
echo ""

# Change to bench directory
cd "$BENCH_PATH"

# Step 1: Verify files exist
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Verifying Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FILES=(
    "apps/f_chat/f_chat/public/js/webrtc_fixed_implementation.js"
    "apps/f_chat/f_chat/public/html/call_ui_complete.html"
    "apps/f_chat/f_chat/public/js/chat_features_extended10.js"
    "apps/f_chat/f_chat/hooks.py"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - MISSING!"
        exit 1
    fi
done

echo ""

# Step 2: Check site exists
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Checking Site..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "sites/$SITE_NAME" ]; then
    echo "   ❌ Site '$SITE_NAME' does not exist!"
    echo ""
    echo "   Available sites:"
    ls -1 sites/ | grep -v "assets\|common_site_config.json" | sed 's/^/      - /'
    echo ""
    exit 1
fi

echo "   ✅ Site exists: $SITE_NAME"
echo ""

# Step 3: Build Assets
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Building Assets..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

bench build --app f_chat

if [ $? -eq 0 ]; then
    echo "   ✅ Assets built successfully"
else
    echo "   ❌ Build failed!"
    exit 1
fi

echo ""

# Step 4: Clear Cache
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Clearing Cache..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

bench --site "$SITE_NAME" clear-cache

if [ $? -eq 0 ]; then
    echo "   ✅ Cache cleared"
else
    echo "   ⚠️  Cache clear failed (non-critical)"
fi

echo ""

# Step 5: Verify Integration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Verifying Integration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if webrtc_fixed_implementation.js is in hooks.py
if grep -q "webrtc_fixed_implementation.js" apps/f_chat/f_chat/hooks.py; then
    echo "   ✅ WebRTC module in hooks.py"
else
    echo "   ❌ WebRTC module NOT in hooks.py!"
    exit 1
fi

# Check if ChatWebRTC module is in the built assets
if [ -f "sites/assets/f_chat/js/webrtc_fixed_implementation.js" ]; then
    echo "   ✅ WebRTC module in assets"
else
    echo "   ⚠️  WebRTC module not found in built assets (check build)"
fi

# Check if call UI template exists
if [ -f "sites/assets/f_chat/html/call_ui_complete.html" ]; then
    echo "   ✅ Call UI template in assets"
else
    echo "   ⚠️  Call UI template not found in built assets"
fi

echo ""

# Step 6: Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo ""
echo "   1. Restart services:"
echo "      • Development: bench start"
echo "      • Production:  sudo supervisorctl restart all"
echo ""
echo "   2. Open browser and navigate to your site"
echo ""
echo "   3. Open browser console (F12) and verify:"
echo "      • Look for: ✅ WebRTC module loaded"
echo "      • Look for: ✅ Call UI template loaded"
echo "      • Run: typeof ChatWebRTC"
echo "      • Should return: 'object'"
echo ""
echo "   4. Test with 2 users:"
echo "      • User A: Click call button in chat"
echo "      • User B: Should see incoming call popup"
echo "      • Accept call and verify audio/video works"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Documentation: apps/f_chat/IMPLEMENTATION_COMPLETE.md"
echo ""
echo "🎉 Happy calling!"
echo ""
