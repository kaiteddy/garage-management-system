#!/bin/bash

echo "🔍 Checking Tailscale Status"
echo "============================"

# Check if Tailscale is running
if tailscale status >/dev/null 2>&1; then
    echo "✅ Tailscale is connected!"
    echo ""
    
    # Show status
    echo "📊 Current Status:"
    tailscale status
    
    echo ""
    echo "🚀 Ready to set up your applications!"
    echo "   Run: ./setup-tailscale-funnel.sh"
    
else
    echo "❌ Tailscale is not connected"
    echo ""
    echo "🔧 To connect:"
    echo "   1. Open Tailscale app from Applications"
    echo "   2. Click 'Log In' and authenticate"
    echo "   3. Wait for green connection indicator"
    echo ""
    echo "   Or try: tailscale up"
fi

echo ""
echo "📋 Once connected, you'll have:"
echo "   🚗 GarageManager Pro: https://your-mac-name/garage"
echo "   🔍 ProSearch Intelligence: https://your-mac-name/prosearch"
echo "   📞 Webhook URLs that never change"
echo "   🔒 Military-grade WireGuard encryption"
echo "   💰 No monthly fees (free tier)"
