#!/bin/bash

echo "🎯 Tailscale Complete Setup - ELI MOTORS LTD"
echo "============================================"
echo "🚗 GarageManager Pro + 🔍 ProSearch Intelligence"
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
PROSEARCH_RUNNING=false

# Check for GarageManager Pro on various ports
for port in 3000 3001 3002; do
    if lsof -i :$port >/dev/null 2>&1; then
        # Check if it's the garage manager by looking at the process
        PROCESS_INFO=$(lsof -i :$port -t | xargs ps -p | grep -E "(npm|next|node)" || true)
        if [ ! -z "$PROCESS_INFO" ]; then
            echo "✅ GarageManager Pro found on port $port"
            GARAGE_PORT=$port
            GARAGE_RUNNING=true
            break
        fi
    fi
done

if [ "$GARAGE_RUNNING" = false ]; then
    echo "❌ GarageManager Pro not running"
    echo "   Start with: npm run dev"
    echo ""
fi

# Check for ProSearch Intelligence (typically on port 3000 if separate)
# Note: This would be a separate application directory
echo "⚠️  ProSearch Intelligence: Separate application (not in current directory)"
echo ""

# Set up Tailscale Serve/Funnel
echo "🔧 Configuring Tailscale services..."
echo ""

# Clear any existing Tailscale serve configuration
tailscale serve reset 2>/dev/null || true

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Setting up GarageManager Pro..."
    
    # Set up HTTPS serve for GarageManager Pro
    tailscale serve --bg --https=443 --set-path=/garage http://localhost:$GARAGE_PORT
    
    if [ $? -eq 0 ]; then
        echo "✅ GarageManager Pro configured successfully"
        GARAGE_URL="https://$NODE_NAME/garage"
        echo "   🌐 Internal URL: $GARAGE_URL"
        
        # Enable Funnel for external access (optional)
        echo "🌍 Enabling external access (Funnel)..."
        tailscale funnel --bg --https=443 --set-path=/garage on
        
        if [ $? -eq 0 ]; then
            GARAGE_PUBLIC_URL="https://$NODE_NAME/garage"
            echo "   🌐 Public URL: $GARAGE_PUBLIC_URL"
        else
            echo "   ⚠️  Funnel setup failed (internal access still works)"
        fi
    else
        echo "❌ Failed to configure GarageManager Pro"
    fi
    echo ""
fi

# Set up ProSearch Intelligence placeholder
echo "🔍 ProSearch Intelligence Setup:"
echo "   📁 Location: Separate application directory"
echo "   🔧 To set up ProSearch Intelligence:"
echo "      1. Navigate to ProSearch directory"
echo "      2. Start the application (typically port 3000)"
echo "      3. Run: tailscale serve --bg --https=443 --set-path=/prosearch http://localhost:3000"
echo ""

# Show current Tailscale serve status
echo "📋 Current Tailscale Configuration:"
tailscale serve status 2>/dev/null || echo "   No active serves configured"
echo ""

# Create webhook URLs for Twilio
echo "📞 Webhook URLs for Twilio Integration:"
echo "======================================"

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 GarageManager Pro Webhooks:"
    echo "   📱 WhatsApp: https://$NODE_NAME/garage/api/webhooks/whatsapp"
    echo "   📞 Voice: https://$NODE_NAME/garage/api/webhooks/voice"
    echo "   💬 SMS: https://$NODE_NAME/garage/api/webhooks/sms"
    echo ""
fi

echo "🔍 ProSearch Intelligence Webhooks:"
echo "   📊 Analytics: https://$NODE_NAME/prosearch/api/webhooks/analytics"
echo "   📈 Reports: https://$NODE_NAME/prosearch/api/webhooks/reports"
echo ""

# Create Twilio configuration helper
echo "📝 Creating Twilio configuration helper..."
cat > tailscale-twilio-config.txt << EOF
# Tailscale Webhook URLs for Twilio Configuration
# ===============================================

## GarageManager Pro - ELI MOTORS LTD
Base URL: https://$NODE_NAME/garage

WhatsApp Webhook: https://$NODE_NAME/garage/api/webhooks/whatsapp
SMS Webhook: https://$NODE_NAME/garage/api/webhooks/sms  
Voice Webhook: https://$NODE_NAME/garage/api/webhooks/voice

## ProSearch Intelligence - ELI MOTORS LTD  
Base URL: https://$NODE_NAME/prosearch

Analytics Webhook: https://$NODE_NAME/prosearch/api/webhooks/analytics
Reports Webhook: https://$NODE_NAME/prosearch/api/webhooks/reports

## Benefits of Tailscale:
✅ Permanent URLs (no disconnections)
✅ No session limits
✅ Secure WireGuard encryption
✅ Free tier available
✅ Both apps can run simultaneously
✅ Perfect for production webhooks

## Next Steps:
1. Update Twilio webhook URLs with the above
2. Test webhook delivery
3. Set up ProSearch Intelligence in its directory
4. Configure any additional webhook endpoints
EOF

echo "✅ Configuration saved to: tailscale-twilio-config.txt"
echo ""

# Summary
echo "🎉 Tailscale Setup Complete!"
echo "============================"

if [ "$GARAGE_RUNNING" = true ]; then
    echo "✅ GarageManager Pro: https://$NODE_NAME/garage"
else
    echo "⚠️  GarageManager Pro: Not running (start with npm run dev)"
fi

echo "⚠️  ProSearch Intelligence: Set up in separate directory"
echo ""
echo "📞 Next Steps:"
echo "   1. Update Twilio webhooks with new URLs"
echo "   2. Test webhook delivery"
echo "   3. Set up ProSearch Intelligence"
echo "   4. Enjoy stable, permanent URLs!"
echo ""
echo "📄 Webhook URLs saved in: tailscale-twilio-config.txt"
