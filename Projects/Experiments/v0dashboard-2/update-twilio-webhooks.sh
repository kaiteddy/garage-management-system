#!/bin/bash

echo "🔧 Updating Twilio Webhooks for Production"
echo "=========================================="

# Current webhook URLs (from your screenshot)
echo "📋 Current webhook URLs:"
echo "   Voice: https://v0dashboard-loxvef6im-kaisarkinnovations.vercel.app/api/twilio/voice/smart-routing"
echo "   SMS: https://v0dashboard-loxvef6im-kaisarkinnovations.vercel.app/api/sms/webhook"
echo ""

# New webhook URLs (for current deployment)
echo "🎯 Recommended webhook URLs:"
echo "   Voice: https://garagemanagerpro.vercel.app/api/voice/webhook"
echo "   SMS: https://garagemanagerpro.vercel.app/api/webhooks/communication-responses"
echo "   WhatsApp: https://garagemanagerpro.vercel.app/api/webhooks/communication-responses"
echo "   Status Callback: https://garagemanagerpro.vercel.app/api/webhooks/status-callback"
echo ""

# Test current webhook configuration
echo "🧪 Testing current webhook configuration..."
curl -s http://localhost:3000/api/twilio/configure-webhooks | jq .

echo ""
echo "🔧 To update webhooks automatically, run:"
echo "curl -X POST http://localhost:3000/api/twilio/configure-webhooks \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"baseUrl\": \"https://garagemanagerpro.vercel.app\", \"updateSMS\": true, \"updateVoice\": true, \"updateStatusCallback\": true}'"

echo ""
echo "📱 MANUAL UPDATE INSTRUCTIONS:"
echo "=============================="
echo "1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
echo "2. Click on: +447488896449"
echo "3. Update these URLs:"
echo "   • Voice URL: https://garagemanagerpro.vercel.app/api/voice/webhook"
echo "   • SMS URL: https://garagemanagerpro.vercel.app/api/webhooks/communication-responses"
echo "   • Status Callback: https://garagemanagerpro.vercel.app/api/webhooks/status-callback"
echo "4. Set all methods to: POST"
echo "5. Save configuration"
echo ""
echo "📱 WHATSAPP SETUP:"
echo "=================="
echo "1. Go to: https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders"
echo "2. Click: 'Register a WhatsApp Sender'"
echo "3. Enter: +447488896449"
echo "4. Business Name: ELI MOTORS LTD"
echo "5. Complete business verification process"
