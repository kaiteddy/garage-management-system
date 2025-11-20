#!/bin/bash

echo "🎯 Starting Clean Professional URLs - ELI MOTORS LTD"
echo "=================================================="
echo ""

echo "🔍 Checking for existing ngrok sessions..."

# Kill all local ngrok processes
echo "🛑 Stopping all local ngrok processes..."
pkill -f ngrok 2>/dev/null || true
sleep 3

# Check if GarageManager Pro is running
if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Please start it first: npm run dev"
    exit 1
fi

echo "✅ GarageManager Pro running on port 3001"
echo ""

echo "🚀 Starting clean professional URL..."
echo "   🌐 URL: https://garage-manager.eu.ngrok.io"
echo ""

# Start ngrok with the reserved domain
ngrok http 3001 --domain=garage-manager.eu.ngrok.io --authtoken=2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA &

NGROK_PID=$!
echo "📱 Ngrok started with PID: $NGROK_PID"

# Wait for ngrok to establish
echo "⏳ Waiting for tunnel to establish..."
sleep 8

# Test the URL
echo "🧪 Testing clean URL..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Clean URL is working perfectly! (HTTP $HTTP_CODE)"
else
    echo "⚠️  URL response: HTTP $HTTP_CODE (may still be starting)"
fi

echo ""
echo "🎉 Clean Professional URL Active!"
echo "================================="
echo ""
echo "🚗 GarageManager Pro:"
echo "   🌐 Dashboard: https://garage-manager.eu.ngrok.io"
echo ""
echo "📞 Clean Webhook URLs for Twilio:"
echo "   📱 WhatsApp: https://garage-manager.eu.ngrok.io/api/webhooks/whatsapp"
echo "   💬 SMS: https://garage-manager.eu.ngrok.io/api/webhooks/sms"
echo "   📞 Voice: https://garage-manager.eu.ngrok.io/api/webhooks/voice"
echo "   🔔 Status: https://garage-manager.eu.ngrok.io/api/webhooks/status"
echo ""
echo "✅ Perfect! No server hostnames visible - exactly what you wanted!"
echo ""
echo "💡 To stop: pkill -f ngrok"
echo "💡 Web interface: http://localhost:4040"
