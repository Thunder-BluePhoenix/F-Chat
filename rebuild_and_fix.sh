#!/bin/bash
# Quick fix script for F_Chat - Rebuild and clear cache
# Run this when you see "function is not defined" errors

set -e

BENCH_PATH="/Users/bluephoenix/frappe-bench/exp-bench"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         F_CHAT - REBUILD & CLEAR CACHE                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$BENCH_PATH"

# Step 1: Verify files exist
echo "1️⃣  Verifying files..."
echo ""

if [ -f "apps/f_chat/f_chat/public/js/chat_features_extended14.js" ]; then
    echo "   ✅ chat_features_extended14.js exists"

    # Check if exports are present
    if grep -q "window.initiate_call = initiate_call" "apps/f_chat/f_chat/public/js/chat_features_extended14.js"; then
        echo "   ✅ Global exports found in file"
    else
        echo "   ❌ WARNING: Global exports NOT found in file!"
        echo "   This needs to be fixed manually."
        exit 1
    fi
else
    echo "   ❌ chat_features_extended14.js NOT FOUND!"
    exit 1
fi

if [ -f "apps/f_chat/f_chat/public/js/webrtc_fixed_implementation.js" ]; then
    echo "   ✅ webrtc_fixed_implementation.js exists"
else
    echo "   ❌ webrtc_fixed_implementation.js NOT FOUND!"
    exit 1
fi

echo ""

# Step 2: Build assets
echo "2️⃣  Building assets..."
echo ""

bench build --app f_chat

if [ $? -eq 0 ]; then
    echo ""
    echo "   ✅ Build successful"
else
    echo ""
    echo "   ❌ Build failed!"
    exit 1
fi

echo ""

# Step 3: Check if files are in assets
echo "3️⃣  Verifying built assets..."
echo ""

if [ -f "sites/assets/f_chat/js/chat_features_extended14.js" ]; then
    echo "   ✅ chat_features_extended14.js in assets"

    # Verify exports in built file
    if grep -q "window.initiate_call" "sites/assets/f_chat/js/chat_features_extended14.js"; then
        echo "   ✅ Exports present in built file"
    else
        echo "   ⚠️  WARNING: Exports may be missing in built file"
    fi
else
    echo "   ⚠️  chat_features_extended14.js not found in built assets"
fi

if [ -f "sites/assets/f_chat/js/webrtc_fixed_implementation.js" ]; then
    echo "   ✅ webrtc_fixed_implementation.js in assets"
else
    echo "   ⚠️  webrtc_fixed_implementation.js not found in built assets"
fi

echo ""

# Step 4: List all sites
echo "4️⃣  Available sites:"
echo ""

ls -1 sites/ | grep -v "assets\|common_site_config.json\|.txt" | while read site; do
    if [ -d "sites/$site" ]; then
        echo "   • $site"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ REBUILD COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "   1. Clear site cache:"
echo "      bench --site <your-site> clear-cache"
echo ""
echo "   2. Restart bench:"
echo "      bench start"
echo ""
echo "   3. In browser:"
echo "      • Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo "      • Clear browser cache: Ctrl+Shift+Delete"
echo "      • Open console (F12) and verify:"
echo ""
echo "        typeof initiate_call"
echo "        // Should return: 'function'"
echo ""
echo "        typeof ChatWebRTC"
echo "        // Should return: 'object'"
echo ""
echo "   4. If still not working, check console for:"
echo "      ✅ F-Chat Extended Features loaded"
echo "      ✅ WebRTC module loaded"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
