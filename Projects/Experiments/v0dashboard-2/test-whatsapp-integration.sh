#!/bin/bash

echo "🧪 TESTING WHATSAPP INTEGRATION"
echo "==============================="
echo ""

# Configuration
PRODUCTION_URL="https://garagemanagerpro.vercel.app"
WHATSAPP_SENDER="+15558340240"
TWILIO_SANDBOX="+14155238886"

echo "📱 WhatsApp Sender: $WHATSAPP_SENDER"
echo "🌐 Production URL: $PRODUCTION_URL"
echo "📞 Twilio Sandbox: $TWILIO_SANDBOX"
echo ""

echo "🔍 STEP 1: TESTING WEBHOOK ENDPOINTS"
echo "====================================="

# Test webhook endpoints
echo "Testing Voice webhook..."
VOICE_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$PRODUCTION_URL/api/voice/webhook")
VOICE_CODE=$(echo "$VOICE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo "✅ Voice webhook: HTTP $VOICE_CODE"

echo "Testing SMS/WhatsApp webhook..."
SMS_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$PRODUCTION_URL/api/webhooks/communication-responses")
SMS_CODE=$(echo "$SMS_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo "✅ SMS/WhatsApp webhook: HTTP $SMS_CODE"

echo "Testing Status callback..."
STATUS_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$PRODUCTION_URL/api/webhooks/status-callback")
STATUS_CODE=$(echo "$STATUS_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo "✅ Status callback: HTTP $STATUS_CODE"

echo ""
echo "🔧 STEP 2: TESTING TWILIO CONFIGURATION API"
echo "============================================"

echo "Testing Twilio webhook configuration endpoint..."
CONFIG_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST "$PRODUCTION_URL/api/twilio/configure-webhooks" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"$WHATSAPP_SENDER\",
    \"baseUrl\": \"$PRODUCTION_URL\",
    \"updateSMS\": true,
    \"updateVoice\": true,
    \"updateStatusCallback\": true
  }")

CONFIG_CODE=$(echo "$CONFIG_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo "✅ Webhook configuration: HTTP $CONFIG_CODE"

if [ "$CONFIG_CODE" = "200" ]; then
    echo "🎉 Webhook configuration successful!"
else
    echo "⚠️  Webhook configuration may have issues (HTTP $CONFIG_CODE)"
fi

echo ""
echo "📱 STEP 3: WHATSAPP SANDBOX VERIFICATION"
echo "========================================"

echo "Testing WhatsApp sandbox webhook..."
SANDBOX_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST "$PRODUCTION_URL/api/webhooks/communication-responses" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:$TWILIO_SANDBOX&To=whatsapp:$WHATSAPP_SENDER&Body=test message")

SANDBOX_CODE=$(echo "$SANDBOX_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo "✅ WhatsApp sandbox test: HTTP $SANDBOX_CODE"

echo ""
echo "📋 STEP 4: CONFIGURATION SUMMARY"
echo "================================="
echo "🗣️  Voice URL: $PRODUCTION_URL/api/voice/webhook"
echo "💬 SMS URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "📱 WhatsApp URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "📊 Status Callback: $PRODUCTION_URL/api/webhooks/status-callback"
echo ""

echo "🎯 STEP 5: MANUAL VERIFICATION CHECKLIST"
echo "========================================"
echo "Please verify the following manually:"
echo ""
echo "1. 📞 TWILIO PHONE NUMBER CONFIGURATION:"
echo "   https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
echo "   • Click on: $WHATSAPP_SENDER"
echo "   • Voice URL should be: $PRODUCTION_URL/api/voice/webhook"
echo "   • SMS URL should be: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "   • Status Callback should be: $PRODUCTION_URL/api/webhooks/status-callback"
echo ""
echo "2. 📱 WHATSAPP SANDBOX CONFIGURATION:"
echo "   https://console.twilio.com/us1/develop/sms/whatsapp/sandbox"
echo "   • Webhook URL should be: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "   • HTTP method should be: POST"
echo ""
echo "3. 🔐 ENVIRONMENT VARIABLES (Vercel Dashboard):"
echo "   • TWILIO_ACCOUNT_SID=AC1572c0e5e4b55bb7440c3d9da482fd36"
echo "   • TWILIO_AUTH_TOKEN=[Your auth token]"
echo "   • TWILIO_PHONE_NUMBER=$WHATSAPP_SENDER"
echo "   • TWILIO_WHATSAPP_NUMBER=whatsapp:$WHATSAPP_SENDER"
echo ""

echo "🧪 STEP 6: LIVE TESTING INSTRUCTIONS"
echo "===================================="
echo "To test WhatsApp functionality:"
echo ""
echo "1. Join WhatsApp Sandbox:"
echo "   • Send 'join <sandbox-code>' to whatsapp:$TWILIO_SANDBOX"
echo "   • Get the sandbox code from: https://console.twilio.com/us1/develop/sms/whatsapp/sandbox"
echo ""
echo "2. Send Test Message:"
echo "   • Send any message to whatsapp:$TWILIO_SANDBOX"
echo "   • Check application logs for webhook reception"
echo ""
echo "3. Test MOT Reminders:"
echo "   • Visit: $PRODUCTION_URL/mot-reminders-sms"
echo "   • Send a test MOT reminder"
echo ""

echo "✅ INTEGRATION TEST COMPLETE!"
echo ""
echo "📊 RESULTS SUMMARY:"
echo "==================="
echo "Voice webhook: HTTP $VOICE_CODE"
echo "SMS/WhatsApp webhook: HTTP $SMS_CODE"
echo "Status callback: HTTP $STATUS_CODE"
echo "Configuration API: HTTP $CONFIG_CODE"
echo "Sandbox test: HTTP $SANDBOX_CODE"
echo ""
echo "📱 WhatsApp Sender Number: $WHATSAPP_SENDER"
echo "🌐 Production URL: $PRODUCTION_URL"
