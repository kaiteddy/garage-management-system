#!/bin/bash

echo "🌐 Setting up Tailscale Serve for ELI MOTORS LTD"
echo "==============================================="
echo "🏢 Business: ELI MOTORS LTD - Serving Hendon since 1979"
echo ""

# Check if Tailscale is running
if ! tailscale status >/dev/null 2>&1; then
    echo "❌ Tailscale is not running or not authenticated"
    echo "   Please open Tailscale app and sign in first"
    exit 1
fi

echo "✅ Tailscale is connected"
echo ""

# Get Tailscale node name
NODE_NAME=$(tailscale status --json | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['Self']['DNSName'].replace('.', '-'))
except:
    print('unknown')
" 2>/dev/null)

if [[ "$NODE_NAME" == "unknown" ]]; then
    NODE_NAME="your-mac"
fi

echo "📋 Configuration:"
echo "   🖥️  Node: $NODE_NAME"
echo "   🚗 GarageManager Pro: Port 3001"
echo "   🔍 ProSearch Intelligence: Port 3000"
echo ""

# Check if applications are running
echo "📊 Checking applications..."

if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
    GARAGE_RUNNING=false
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
    PROSEARCH_RUNNING=true
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
    PROSEARCH_RUNNING=false
fi

echo ""

# Set up Tailscale Serve for GarageManager Pro
if [[ $GARAGE_RUNNING == true ]]; then
    echo "🚗 Setting up GarageManager Pro on Tailscale..."
    
    # Enable serve for GarageManager Pro
    tailscale serve --bg --https=443 --set-path=/garage http://localhost:3001
    
    if [ $? -eq 0 ]; then
        echo "✅ GarageManager Pro configured successfully"
        GARAGE_URL="https://$NODE_NAME/garage"
        echo "   🌐 URL: $GARAGE_URL"
    else
        echo "❌ Failed to configure GarageManager Pro"
    fi
else
    echo "⚠️  Skipping GarageManager Pro (not running)"
fi

echo ""

# Set up Tailscale Serve for ProSearch Intelligence
if [[ $PROSEARCH_RUNNING == true ]]; then
    echo "🔍 Setting up ProSearch Intelligence on Tailscale..."
    
    # Enable serve for ProSearch Intelligence
    tailscale serve --bg --https=443 --set-path=/prosearch http://localhost:3000
    
    if [ $? -eq 0 ]; then
        echo "✅ ProSearch Intelligence configured successfully"
        PROSEARCH_URL="https://$NODE_NAME/prosearch"
        echo "   🌐 URL: $PROSEARCH_URL"
    else
        echo "❌ Failed to configure ProSearch Intelligence"
    fi
else
    echo "⚠️  Skipping ProSearch Intelligence (not running)"
fi

echo ""
echo "🎉 Tailscale Setup Complete!"
echo "============================"
echo ""

if [[ $GARAGE_RUNNING == true ]]; then
    echo "🚗 GarageManager Pro:"
    echo "   📱 Internal: http://localhost:3001"
    echo "   🌐 Tailscale: $GARAGE_URL"
    echo "   📞 Webhooks:"
    echo "      Voice: $GARAGE_URL/api/twilio/voice"
    echo "      SMS: $GARAGE_URL/api/sms/webhook"
fi

if [[ $PROSEARCH_RUNNING == true ]]; then
    echo ""
    echo "🔍 ProSearch Intelligence:"
    echo "   📱 Internal: http://localhost:3000"
    echo "   🌐 Tailscale: $PROSEARCH_URL"
fi

echo ""
echo "✅ Benefits of Tailscale:"
echo "   🔒 Secure WireGuard encryption"
echo "   🌐 No session limits or disconnections"
echo "   💰 Free for personal use"
echo "   🚀 Always-on connections"
echo "   📊 Built-in monitoring"
echo ""
echo "📋 Management Commands:"
echo "   Status: tailscale status"
echo "   Stop serving: tailscale serve --bg --https=443 --remove"
echo "   View config: tailscale serve status"
echo ""
echo "🏢 ELI MOTORS LTD - Secure tunnel setup complete!"
