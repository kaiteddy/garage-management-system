#!/bin/bash

echo "🌐 Setting up Tailscale Funnel for ELI MOTORS LTD"
echo "================================================="
echo "🏢 Business: ELI MOTORS LTD - Serving Hendon since 1979"
echo "📡 Funnel = Public Internet Access (like ngrok)"
echo ""

# Check if Tailscale is running
if ! tailscale status >/dev/null 2>&1; then
    echo "❌ Tailscale is not running or not authenticated"
    echo "   Please open Tailscale app and sign in first"
    exit 1
fi

echo "✅ Tailscale is connected"
echo ""

# Get Tailscale node info
NODE_INFO=$(tailscale status --json | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    node_name = data['Self']['DNSName'].rstrip('.')
    tailnet = data['Self']['TailscaleIPs'][0] if data['Self']['TailscaleIPs'] else 'unknown'
    print(f'{node_name}|{tailnet}')
except Exception as e:
    print('unknown|unknown')
" 2>/dev/null)

NODE_NAME=$(echo $NODE_INFO | cut -d'|' -f1)
TAILNET_IP=$(echo $NODE_INFO | cut -d'|' -f2)

echo "📋 Configuration:"
echo "   🖥️  Node: $NODE_NAME"
echo "   🌐 Tailnet IP: $TAILNET_IP"
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

# Set up Tailscale Funnel for GarageManager Pro
if [[ $GARAGE_RUNNING == true ]]; then
    echo "🚗 Setting up GarageManager Pro with Tailscale Funnel..."
    echo "   📡 This will be accessible from the public internet"
    
    # Enable funnel for GarageManager Pro
    tailscale funnel --bg --https=443 --set-path=/garage http://localhost:3001
    
    if [ $? -eq 0 ]; then
        echo "✅ GarageManager Pro funnel configured successfully"
        GARAGE_URL="https://$NODE_NAME/garage"
        echo "   🌐 Public URL: $GARAGE_URL"
        echo "   📞 Webhook URLs:"
        echo "      Voice: $GARAGE_URL/api/twilio/voice"
        echo "      SMS: $GARAGE_URL/api/sms/webhook"
    else
        echo "❌ Failed to configure GarageManager Pro funnel"
        echo "   Note: Funnel requires a paid Tailscale plan for HTTPS"
        echo "   Falling back to Serve (Tailscale network only)..."
        
        tailscale serve --bg --https=443 --set-path=/garage http://localhost:3001
        if [ $? -eq 0 ]; then
            echo "✅ GarageManager Pro serve configured (Tailscale network only)"
            GARAGE_URL="https://$NODE_NAME/garage"
            echo "   🔒 Private URL: $GARAGE_URL"
        fi
    fi
else
    echo "⚠️  Skipping GarageManager Pro (not running)"
fi

echo ""

# Set up Tailscale Funnel for ProSearch Intelligence
if [[ $PROSEARCH_RUNNING == true ]]; then
    echo "🔍 Setting up ProSearch Intelligence with Tailscale Funnel..."
    
    # Enable funnel for ProSearch Intelligence
    tailscale funnel --bg --https=443 --set-path=/prosearch http://localhost:3000
    
    if [ $? -eq 0 ]; then
        echo "✅ ProSearch Intelligence funnel configured successfully"
        PROSEARCH_URL="https://$NODE_NAME/prosearch"
        echo "   🌐 Public URL: $PROSEARCH_URL"
    else
        echo "❌ Failed to configure ProSearch Intelligence funnel"
        echo "   Falling back to Serve (Tailscale network only)..."
        
        tailscale serve --bg --https=443 --set-path=/prosearch http://localhost:3000
        if [ $? -eq 0 ]; then
            echo "✅ ProSearch Intelligence serve configured (Tailscale network only)"
            PROSEARCH_URL="https://$NODE_NAME/prosearch"
            echo "   🔒 Private URL: $PROSEARCH_URL"
        fi
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
    echo "   📱 Local: http://localhost:3001"
    echo "   🌐 Tailscale: $GARAGE_URL"
    echo ""
    echo "   📞 For Twilio Webhooks, use:"
    echo "      Voice: $GARAGE_URL/api/twilio/voice"
    echo "      SMS: $GARAGE_URL/api/sms/webhook"
fi

if [[ $PROSEARCH_RUNNING == true ]]; then
    echo ""
    echo "🔍 ProSearch Intelligence:"
    echo "   📱 Local: http://localhost:3000"
    echo "   🌐 Tailscale: $PROSEARCH_URL"
fi

echo ""
echo "✅ Tailscale Advantages:"
echo "   🔒 WireGuard encryption (military-grade)"
echo "   🌐 No session limits or timeouts"
echo "   💰 Free tier available"
echo "   🚀 Always-on, reliable connections"
echo "   📊 Built-in traffic monitoring"
echo "   🔧 No complex port forwarding"
echo ""
echo "📋 Management Commands:"
echo "   Status: tailscale status"
echo "   View serves: tailscale serve status"
echo "   View funnels: tailscale funnel status"
echo "   Stop all: tailscale serve --bg --https=443 --remove"
echo ""
echo "🏢 ELI MOTORS LTD - Professional secure tunneling!"
echo "   Serving Hendon since 1979 🚗"
