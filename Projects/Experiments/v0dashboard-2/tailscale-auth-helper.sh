#!/bin/bash

echo "🔐 Tailscale Authentication Helper"
echo "=================================="
echo ""

# Check if daemon is running
if ! pgrep -x tailscaled > /dev/null; then
    echo "❌ Tailscale daemon is not running"
    echo "   The daemon should have been installed. Let me check..."
    
    # Check if the daemon is installed
    if [ -f "/Library/LaunchDaemons/com.tailscale.tailscaled.plist" ]; then
        echo "✅ Daemon is installed, starting it..."
        sudo launchctl load /Library/LaunchDaemons/com.tailscale.tailscaled.plist
        sleep 3
    else
        echo "❌ Daemon not found. Please reinstall Tailscale."
        exit 1
    fi
fi

echo "🔍 Checking Tailscale status..."
STATUS=$(tailscale status 2>&1)

if echo "$STATUS" | grep -q "Logged out"; then
    echo "📱 You need to authenticate with Tailscale"
    echo ""
    echo "🌐 Opening Tailscale login page..."
    echo "   This will open in your browser for authentication"
    echo ""
    
    # Try to get the login URL
    echo "🔗 Getting authentication URL..."
    tailscale up --timeout=5s 2>&1 | head -10 &
    
    sleep 2
    
    echo ""
    echo "📋 Manual Authentication Steps:"
    echo "   1. Go to: https://login.tailscale.com/"
    echo "   2. Sign in with your account (Google, Microsoft, etc.)"
    echo "   3. Add this device to your network"
    echo "   4. Come back here and run: tailscale status"
    echo ""
    echo "🔧 Alternative: Use the Tailscale app"
    echo "   1. Open Tailscale app from Applications"
    echo "   2. It should now show a login option"
    echo "   3. Click login and authenticate"
    
elif echo "$STATUS" | grep -q "100\."; then
    echo "✅ Tailscale is connected!"
    echo ""
    echo "$STATUS"
    echo ""
    echo "🚀 Ready to set up your applications!"
    echo "   Run: ./setup-tailscale-funnel.sh"
    
else
    echo "⚠️  Tailscale status unclear:"
    echo "$STATUS"
    echo ""
    echo "🔧 Try running: tailscale up"
fi

echo ""
echo "📞 Once connected, you'll have:"
echo "   🚗 GarageManager Pro: https://your-mac-name/garage"
echo "   🔍 ProSearch Intelligence: https://your-mac-name/prosearch"
echo "   📱 Permanent webhook URLs for Twilio"
