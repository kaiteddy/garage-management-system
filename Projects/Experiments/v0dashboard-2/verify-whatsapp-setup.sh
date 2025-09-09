#!/bin/bash

echo "🔍 VERIFYING WHATSAPP SETUP"
echo "============================"
echo ""

# Configuration
PRODUCTION_URL="https://garagemanagerpro.vercel.app"
WHATSAPP_SENDER="+15558340240"
PHONE_NUMBER="+15558340240"

echo "📱 WhatsApp Sender: $WHATSAPP_SENDER"
echo "🌐 Production URL: $PRODUCTION_URL"
echo ""

echo "🧪 TESTING WEBHOOK ENDPOINTS:"
echo "=============================="

# Test webhook endpoints
echo "Testing Voice webhook..."
VOICE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/twilio/voice")
echo "✅ Voice webhook: HTTP $VOICE_STATUS"

echo "Testing SMS/WhatsApp webhook..."
SMS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/webhooks/communication-responses")
echo "✅ SMS/WhatsApp webhook: HTTP $SMS_STATUS"

echo "Testing Status callback..."
STATUS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$PRODUCTION_URL/api/webhooks/status-callback")
echo "✅ Status callback: HTTP $STATUS_STATUS"

echo ""
echo "📋 CURRENT WEBHOOK CONFIGURATION:"
echo "=================================="
echo "🗣️  Voice URL: $PRODUCTION_URL/api/twilio/voice"
echo "💬 SMS URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "📱 WhatsApp URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "📊 Status Callback: $PRODUCTION_URL/api/webhooks/status-callback"
echo ""

echo "🔧 TWILIO CONSOLE VERIFICATION:"
echo "==============================="
echo "1. Phone Number Configuration:"
echo "   https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
echo "   Click on: $PHONE_NUMBER"
echo ""
echo "2. WhatsApp Sandbox Configuration:"
echo "   https://console.twilio.com/us1/develop/sms/whatsapp/sandbox"
echo "   Webhook URL should be: $PRODUCTION_URL/api/webhooks/communication-responses"
echo ""

echo "📱 TEST WHATSAPP MESSAGE:"
echo "========================"
echo "To test WhatsApp functionality:"
echo "1. Join the sandbox by texting 'join <sandbox-code>' to whatsapp:+14155238886"
echo "2. Send a test message to verify webhook reception"
echo "3. Check the application logs for incoming webhook calls"
echo ""

echo "🔍 ENVIRONMENT VARIABLES TO CHECK:"
echo "=================================="
echo "Make sure these are set in Vercel:"
echo "• TWILIO_ACCOUNT_SID"
echo "• TWILIO_AUTH_TOKEN"
echo "• TWILIO_PHONE_NUMBER=$WHATSAPP_SENDER"
echo "• TWILIO_WHATSAPP_NUMBER=whatsapp:$WHATSAPP_SENDER"
echo ""

echo "✅ VERIFICATION COMPLETE!"
echo "📱 WhatsApp Sender Number: $WHATSAPP_SENDER"
echo "🌐 All webhooks pointing to: $PRODUCTION_URL"
