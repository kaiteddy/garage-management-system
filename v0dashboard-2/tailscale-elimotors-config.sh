#!/bin/bash

echo "🏢 ELI MOTORS Professional Tailscale Configuration"
echo "================================================="
echo "🚗 GarageManagerPro + 🔍 ProSearchIntelligence"
echo ""

# Get Tailscale node information
NODE_NAME=$(tailscale status --json | jq -r '.Self.DNSName' | sed 's/\.$//')
NODE_IP=$(tailscale status --json | jq -r '.Self.TailscaleIPs[0]')

echo "📋 Professional Server Configuration:"
echo "   🏢 Server: $NODE_NAME"
echo "   🌐 IP: $NODE_IP"
echo ""

# Test the new professional URL
GARAGE_URL="https://$NODE_NAME/GarageManagerPro"
echo "🧪 Testing GarageManagerPro..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$GARAGE_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ GarageManagerPro is responding correctly (HTTP $HTTP_CODE)"
else
    echo "⚠️  GarageManagerPro response: HTTP $HTTP_CODE"
fi

echo ""
echo "🎯 Professional URLs - ELI MOTORS LTD"
echo "===================================="
echo ""
echo "🚗 GarageManagerPro - MOT Management Platform:"
echo "   🌐 Dashboard: https://$NODE_NAME/GarageManagerPro"
echo ""
echo "📞 Professional Webhook URLs:"
echo "   📱 WhatsApp: https://$NODE_NAME/GarageManagerPro/api/webhooks/whatsapp"
echo "   💬 SMS: https://$NODE_NAME/GarageManagerPro/api/webhooks/sms"
echo "   📞 Voice: https://$NODE_NAME/GarageManagerPro/api/webhooks/voice"
echo "   🔔 Status: https://$NODE_NAME/GarageManagerPro/api/webhooks/status"
echo ""
echo "🔍 ProSearchIntelligence - Analytics Platform:"
echo "   🌐 Dashboard: https://$NODE_NAME/ProSearchIntelligence"
echo "   📊 Analytics: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/analytics"
echo "   📈 Reports: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/reports"
echo ""

# Create professional configuration file
cat > elimotors-professional-urls.txt << EOF
# ELI MOTORS LTD - Professional Tailscale URLs
# ===========================================

## Professional Server: $NODE_NAME
## Secure, Permanent, Professional URLs

## GarageManagerPro - MOT Management Platform
Dashboard: https://$NODE_NAME/GarageManagerPro

Webhook URLs:
- WhatsApp: https://$NODE_NAME/GarageManagerPro/api/webhooks/whatsapp
- SMS: https://$NODE_NAME/GarageManagerPro/api/webhooks/sms
- Voice: https://$NODE_NAME/GarageManagerPro/api/webhooks/voice
- Status: https://$NODE_NAME/GarageManagerPro/api/webhooks/status

## ProSearchIntelligence - Analytics Platform
Dashboard: https://$NODE_NAME/ProSearchIntelligence

Webhook URLs:
- Analytics: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/analytics
- Reports: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/reports
- Search: https://$NODE_NAME/ProSearchIntelligence/api/webhooks/search

## Configuration Commands:
# GarageManagerPro (Active):
tailscale serve --bg --https=443 --set-path=/GarageManagerPro http://localhost:3001

# ProSearchIntelligence (When ready):
tailscale serve --bg --https=443 --set-path=/ProSearchIntelligence http://localhost:3000

## Professional Benefits:
✅ Professional hostname: elimotors-server
✅ Branded URL structure
✅ Permanent, stable URLs
✅ No session limits or disconnections
✅ Secure WireGuard encryption
✅ Perfect for production webhooks
✅ Both platforms can run simultaneously
✅ Professional appearance for clients/partners
EOF

echo "✅ Professional configuration saved to: elimotors-professional-urls.txt"
echo ""
echo "🎉 ELI MOTORS Professional Setup Complete!"
echo "========================================"
echo "✅ Professional Server: elimotors-server.taila0aa39.ts.net"
echo "✅ GarageManagerPro: https://$NODE_NAME/GarageManagerPro"
echo "⚠️  ProSearchIntelligence: Ready to configure when needed"
echo ""
echo "📞 Your professional webhook URLs are ready for Twilio!"
echo "📄 All URLs saved in: elimotors-professional-urls.txt"
