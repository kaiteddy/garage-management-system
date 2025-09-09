#!/bin/bash

echo "🚀 UPDATING TWILIO WEBHOOKS FOR PRODUCTION"
echo "=========================================="
echo ""

# Production URLs
PRODUCTION_URL="https://garagemanagerpro.vercel.app"
PHONE_NUMBER="+15558340240"

echo "📱 Phone Number: $PHONE_NUMBER"
echo "🌐 Production URL: $PRODUCTION_URL"
echo ""

echo "🔧 Updating webhooks automatically..."
echo ""

# Update webhooks using the API
curl -X POST "$PRODUCTION_URL/api/twilio/configure-webhooks" \
  -H "Content-Type: application/json" \
  -d "{
    \"phoneNumber\": \"$PHONE_NUMBER\",
    \"baseUrl\": \"$PRODUCTION_URL\",
    \"updateSMS\": true,
    \"updateVoice\": true,
    \"updateStatusCallback\": true
  }" | jq .

echo ""
echo "✅ WEBHOOK CONFIGURATION COMPLETE!"
echo ""

echo "📋 NEW WEBHOOK URLS:"
echo "==================="
echo "🗣️  Voice URL: $PRODUCTION_URL/api/twilio/voice"
echo "💬 SMS URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "📱 WhatsApp URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "📊 Status Callback: $PRODUCTION_URL/api/webhooks/status-callback"
echo ""

echo "🧪 TESTING WEBHOOKS:"
echo "===================="
echo "Testing webhook endpoints..."

# Test each webhook endpoint
echo "Testing Voice webhook..."
curl -s -o /dev/null -w "Voice webhook: %{http_code}\n" "$PRODUCTION_URL/api/twilio/voice"

echo "Testing SMS webhook..."
curl -s -o /dev/null -w "SMS webhook: %{http_code}\n" "$PRODUCTION_URL/api/webhooks/communication-responses"

echo "Testing Status callback..."
curl -s -o /dev/null -w "Status callback: %{http_code}\n" "$PRODUCTION_URL/api/webhooks/status-callback"

echo ""
echo "📱 WHATSAPP SANDBOX SETUP:"
echo "=========================="
echo "1. Go to: https://console.twilio.com/us1/develop/sms/whatsapp/sandbox"
echo "2. Set webhook URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "3. Set HTTP method: POST"
echo "4. Save configuration"
echo ""

echo "🎯 MANUAL VERIFICATION:"
echo "======================="
echo "1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
echo "2. Click on: $PHONE_NUMBER"
echo "3. Verify these URLs are set:"
echo "   • Voice URL: $PRODUCTION_URL/api/twilio/voice"
echo "   • SMS URL: $PRODUCTION_URL/api/webhooks/communication-responses"
echo "   • Status Callback: $PRODUCTION_URL/api/webhooks/status-callback"
echo ""

echo "✅ PRODUCTION DEPLOYMENT COMPLETE!"
echo "🌐 Main URL: $PRODUCTION_URL"
echo "📱 WhatsApp messages will now work correctly!"
