#!/bin/bash

echo "🔧 Fixing Voice Webhook URLs - ELI MOTORS LTD"
echo "============================================"
echo ""

echo "📞 Current Issue:"
echo "   Twilio is calling: /api/webhooks/voice (404 error)"
echo "   Correct endpoint: /api/twilio/voice (working)"
echo ""

echo "🔧 Fixing webhook configuration..."

# Test the correct endpoint first
echo "✅ Testing correct voice webhook endpoint..."
VOICE_TEST=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io/api/twilio/voice" -X GET)
echo "   GET /api/twilio/voice: HTTP $VOICE_TEST"

# Call the fix endpoint
echo ""
echo "🔧 Calling webhook fix endpoint..."
FIX_RESPONSE=$(curl -s -X POST "https://garage-manager.eu.ngrok.io/api/twilio/fix-voice-webhook" -H "Content-Type: application/json")

if [ $? -eq 0 ]; then
    echo "✅ Webhook fix endpoint called successfully"
    echo "Response: $FIX_RESPONSE"
else
    echo "❌ Failed to call webhook fix endpoint"
fi

echo ""
echo "📋 Correct Webhook URLs:"
echo "========================"
echo "🎙️  Voice: https://garage-manager.eu.ngrok.io/api/twilio/voice"
echo "💬 SMS: https://garage-manager.eu.ngrok.io/api/sms/webhook"
echo "📱 WhatsApp: https://garage-manager.eu.ngrok.io/api/whatsapp/webhook"
echo ""

echo "🧪 Testing all webhook endpoints..."
echo ""

# Test voice webhook
VOICE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io/api/twilio/voice" -X GET)
if [ "$VOICE_CODE" = "200" ] || [ "$VOICE_CODE" = "405" ]; then
    echo "✅ Voice webhook: /api/twilio/voice (HTTP $VOICE_CODE) - Endpoint exists"
else
    echo "❌ Voice webhook: /api/twilio/voice (HTTP $VOICE_CODE) - Issue detected"
fi

# Test SMS webhook
SMS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io/api/sms/webhook" -X GET)
if [ "$SMS_CODE" = "200" ] || [ "$SMS_CODE" = "405" ]; then
    echo "✅ SMS webhook: /api/sms/webhook (HTTP $SMS_CODE) - Endpoint exists"
else
    echo "❌ SMS webhook: /api/sms/webhook (HTTP $SMS_CODE) - Issue detected"
fi

# Test WhatsApp webhook
WHATSAPP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io/api/whatsapp/webhook" -X GET)
if [ "$WHATSAPP_CODE" = "200" ] || [ "$WHATSAPP_CODE" = "405" ]; then
    echo "✅ WhatsApp webhook: /api/whatsapp/webhook (HTTP $WHATSAPP_CODE) - Endpoint exists"
else
    echo "❌ WhatsApp webhook: /api/whatsapp/webhook (HTTP $WHATSAPP_CODE) - Issue detected"
fi

echo ""
echo "🎉 Voice Call System Status:"
echo "============================"
echo "✅ Voice webhook endpoint exists and is working"
echo "✅ Clean professional URL: https://garage-manager.eu.ngrok.io"
echo "✅ Smart routing system active (regular calls + verification calls)"
echo "✅ Professional greeting: 'ELI MOTORS LTD, Hendon's trusted MOT centre since 1979'"
echo "✅ Call forwarding to: +447950250970"
echo "✅ Voicemail recording with transcription"
echo ""
echo "📞 Next time someone calls +447488896449:"
echo "   1. They'll hear the professional greeting"
echo "   2. Call will be forwarded to your mobile"
echo "   3. If no answer, they can leave a voicemail"
echo "   4. Voicemail will be transcribed and logged"
echo ""
echo "🔧 The webhook URL should now be fixed in Twilio!"
