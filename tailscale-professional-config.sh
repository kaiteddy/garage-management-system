#!/bin/bash

echo "🎯 Tailscale Professional Configuration - ELI MOTORS LTD"
echo "========================================================"
echo "🚗 GarageManagerPro + 🔍 ProSearchIntelligence"
echo ""

# Get Tailscale node information
NODE_NAME=$(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')
NODE_IP=$(tailscale status --json | jq -r '.Self.TailscaleIPs[0]')

if [ -z "$NODE_NAME" ] || [ "$NODE_NAME" = "null" ]; then
    echo "❌ Tailscale not properly connected"
    echo "   Please run: tailscale up"
    exit 1
fi

echo "📋 Tailscale Configuration:"
echo "   🖥️  Node: $NODE_NAME"
echo "   🌐 IP: $NODE_IP"
echo ""

# Check current running applications
echo "📊 Checking applications..."

GARAGE_PORT=""
GARAGE_RUNNING=false

# Check for GarageManager Pro on various ports
for port in 3000 3001 3002; do
    if lsof -i :$port >/dev/null 2>&1; then
        # Check if it's the garage manager by looking at the process
        PROCESS_INFO=$(lsof -i :$port -t | xargs ps -p | grep -E "(npm|next|node)" || true)
        if [ ! -z "$PROCESS_INFO" ]; then
            echo "✅ GarageManagerPro found on port $port"
            GARAGE_PORT=$port
            GARAGE_RUNNING=true
            break
        fi
    fi
done

if [ "$GARAGE_RUNNING" = false ]; then
    echo "❌ GarageManagerPro not running"
    echo "   Start with: npm run dev"
    echo ""
    exit 1
fi

# Reset existing configuration
echo "🔧 Resetting Tailscale configuration..."
tailscale serve reset 2>/dev/null || true

# Set up GarageManagerPro
echo "🚗 Configuring GarageManagerPro..."
tailscale serve --bg --https=443 --set-path=/GarageManagerPro http://localhost:$GARAGE_PORT

if [ $? -eq 0 ]; then
    echo "✅ GarageManagerPro configured successfully"
    GARAGE_URL="https://$NODE_NAME/GarageManagerPro"
    echo "   🌐 URL: $GARAGE_URL"
else
    echo "❌ Failed to configure GarageManagerPro"
    exit 1
fi

# Reserve path for ProSearchIntelligence (when ready)
echo ""
echo "🔍 ProSearchIntelligence Configuration:"
echo "   📁 Reserved path: /ProSearchIntelligence"
echo "   🔧 To activate when ready:"
echo "      tailscale serve --bg --https=443 --set-path=/ProSearchIntelligence http://localhost:3000"
echo ""

# Show current configuration
echo "📋 Current Tailscale Serve Status:"
tailscale serve status
echo ""

# Create professional webhook URLs
echo "📞 Professional Webhook URLs for Twilio:"
echo "========================================"
echo ""
echo "🚗 GarageManagerPro - ELI MOTORS LTD:"
echo "   📱 WhatsApp: https://$NODE_NAME/GarageManagerPro/api/webhooks/whatsapp"
echo "   💬 SMS: https://$NODE_NAME/GarageManagerPro/api/webhooks/sms"
echo "   📞 Voice: https://$NODE_NAME/GarageManagerPro/api/webhooks/voice"
echo "   🔔 Status: https://$NODE_NAME/GarageManagerPro/api/webhooks/status"
echo ""
echo "🔍 ProSearchIntelligence - ELI MOTORS LTD:"
echo "   📊 Analytics: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/analytics"
echo "   📈 Reports: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/reports"
echo "   🔍 Search: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/search"
echo ""

# Create updated configuration file
cat > tailscale-professional-urls.txt << EOF
# Professional Tailscale URLs - ELI MOTORS LTD
# ============================================

## GarageManagerPro - MOT Management Platform
Base URL: https://$NODE_NAME/GarageManagerPro
Dashboard: https://$NODE_NAME/GarageManagerPro

Webhook URLs:
- WhatsApp: https://$NODE_NAME/GarageManagerPro/api/webhooks/whatsapp
- SMS: https://$NODE_NAME/GarageManagerPro/api/webhooks/sms
- Voice: https://$NODE_NAME/GarageManagerPro/api/webhooks/voice
- Status: https://$NODE_NAME/GarageManagerPro/api/webhooks/status

## ProSearchIntelligence - Analytics Platform
Base URL: https://$NODE_NAME/ProSearchIntelligence
Dashboard: https://$NODE_NAME/ProSearchIntelligence

Webhook URLs:
- Analytics: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/analytics
- Reports: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/reports
- Search: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/search

## Configuration Commands:
# GarageManagerPro (Active):
tailscale serve --bg --https=443 --set-path=/GarageManagerPro http://localhost:$GARAGE_PORT

# ProSearchIntelligence (When ready):
tailscale serve --bg --https=443 --set-path=/ProSearchIntelligence http://localhost:3000

## Benefits:
✅ Professional URL structure
✅ Permanent, stable URLs
✅ No session limits or disconnections
✅ Secure WireGuard encryption
✅ Perfect for production webhooks
✅ Both platforms can run simultaneously
EOF

echo "✅ Professional configuration saved to: tailscale-professional-urls.txt"
echo ""

# Test the URL
echo "🧪 Testing GarageManagerPro URL..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$GARAGE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ GarageManagerPro is responding correctly (HTTP $HTTP_CODE)"
else
    echo "⚠️  GarageManagerPro response: HTTP $HTTP_CODE"
fi

echo ""
echo "🎉 Professional Tailscale Setup Complete!"
echo "========================================"
echo "✅ GarageManagerPro: https://$NODE_NAME/GarageManagerPro"
echo "⚠️  ProSearchIntelligence: Ready to configure when needed"
echo ""
echo "📞 Update your Twilio webhooks with the new professional URLs!"
echo "📄 All URLs saved in: tailscale-professional-urls.txt"
