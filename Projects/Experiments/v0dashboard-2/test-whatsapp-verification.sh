#!/bin/bash

echo "🔐 TESTING WHATSAPP WEBHOOK VERIFICATION"
echo "========================================"
echo ""

# Configuration
PRODUCTION_URL="https://garagemanagerpro.vercel.app"
WHATSAPP_VERIFY_TOKEN="whatsapp_verify_2024_elimotors"
WEBHOOK_URL="$PRODUCTION_URL/api/webhooks/communication-responses"

echo "🌐 Production URL: $PRODUCTION_URL"
echo "🔑 Verification Token: $WHATSAPP_VERIFY_TOKEN"
echo "📡 Webhook URL: $WEBHOOK_URL"
echo ""

echo "🧪 STEP 1: TESTING WHATSAPP WEBHOOK VERIFICATION"
echo "================================================"

# Test WhatsApp webhook verification (GET request with verification parameters)
echo "Testing WhatsApp webhook verification..."
VERIFICATION_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.challenge=test_challenge_123&hub.verify_token=$WHATSAPP_VERIFY_TOKEN")

VERIFICATION_CODE=$(echo "$VERIFICATION_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
VERIFICATION_BODY=$(echo "$VERIFICATION_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "✅ WhatsApp verification: HTTP $VERIFICATION_CODE"

if [ "$VERIFICATION_CODE" = "200" ]; then
    echo "🎉 WhatsApp webhook verification SUCCESSFUL!"
    echo "📋 Response body: $VERIFICATION_BODY"
    if [ "$VERIFICATION_BODY" = "test_challenge_123" ]; then
        echo "✅ Challenge response is correct!"
    else
        echo "⚠️  Challenge response unexpected: $VERIFICATION_BODY"
    fi
else
    echo "❌ WhatsApp webhook verification FAILED!"
    echo "📋 Response: $VERIFICATION_BODY"
fi

echo ""
echo "🧪 STEP 2: TESTING INVALID TOKEN"
echo "================================"

# Test with invalid token
echo "Testing with invalid verification token..."
INVALID_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.challenge=test_challenge_123&hub.verify_token=invalid_token")

INVALID_CODE=$(echo "$INVALID_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
echo "✅ Invalid token test: HTTP $INVALID_CODE"

if [ "$INVALID_CODE" = "403" ]; then
    echo "🎉 Security check PASSED - invalid tokens are rejected!"
else
    echo "⚠️  Security check concern - invalid token got HTTP $INVALID_CODE"
fi

echo ""
echo "🧪 STEP 3: TESTING WEBHOOK STATUS"
echo "================================="

# Test regular webhook status (GET without verification parameters)
echo "Testing webhook status endpoint..."
STATUS_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$WEBHOOK_URL")
STATUS_CODE=$(echo "$STATUS_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
STATUS_BODY=$(echo "$STATUS_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "✅ Webhook status: HTTP $STATUS_CODE"

if [ "$STATUS_CODE" = "200" ]; then
    echo "📊 Webhook status response:"
    echo "$STATUS_BODY" | jq . 2>/dev/null || echo "$STATUS_BODY"
else
    echo "⚠️  Webhook status issue: $STATUS_BODY"
fi

echo ""
echo "🧪 STEP 4: TESTING POST WEBHOOK (MESSAGE SIMULATION)"
echo "===================================================="

# Test POST webhook with simulated WhatsApp message
echo "Testing POST webhook with simulated message..."
POST_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+447950250970&To=whatsapp:+15558340240&Body=Test message&MessageSid=test123&AccountSid=AC1572c0e5e4b55bb7440c3d9da482fd36")

POST_CODE=$(echo "$POST_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
POST_BODY=$(echo "$POST_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "✅ POST webhook test: HTTP $POST_CODE"

if [ "$POST_CODE" = "200" ]; then
    echo "🎉 Message webhook processing SUCCESSFUL!"
    echo "📋 Response: $POST_BODY"
else
    echo "⚠️  Message webhook processing issue: $POST_BODY"
fi

echo ""
echo "📋 VERIFICATION SUMMARY"
echo "======================="
echo "🔐 WhatsApp Verification: HTTP $VERIFICATION_CODE $([ "$VERIFICATION_CODE" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "🛡️  Security Check: HTTP $INVALID_CODE $([ "$INVALID_CODE" = "403" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "📊 Status Endpoint: HTTP $STATUS_CODE $([ "$STATUS_CODE" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"
echo "📨 Message Processing: HTTP $POST_CODE $([ "$POST_CODE" = "200" ] && echo "✅ PASS" || echo "❌ FAIL")"

echo ""
echo "🎯 NEXT STEPS FOR WHATSAPP SETUP:"
echo "=================================="
echo "1. 📱 Configure WhatsApp Business API:"
echo "   • Use webhook URL: $WEBHOOK_URL"
echo "   • Use verify token: $WHATSAPP_VERIFY_TOKEN"
echo ""
echo "2. 🔧 In Meta Developer Console:"
echo "   • Go to WhatsApp > Configuration"
echo "   • Set Webhook URL: $WEBHOOK_URL"
echo "   • Set Verify Token: $WHATSAPP_VERIFY_TOKEN"
echo "   • Subscribe to message events"
echo ""
echo "3. 🧪 Test the integration:"
echo "   • Send a test message to your WhatsApp Business number"
echo "   • Check application logs for webhook reception"
echo ""

if [ "$VERIFICATION_CODE" = "200" ] && [ "$INVALID_CODE" = "403" ]; then
    echo "✅ WEBHOOK VERIFICATION READY FOR WHATSAPP!"
    echo "🎉 Your webhook is properly configured and secure."
else
    echo "⚠️  WEBHOOK NEEDS ATTENTION"
    echo "❌ Please check the configuration and try again."
fi

echo ""
echo "📱 WhatsApp Sender: +15558340240"
echo "🔑 Verification Token: $WHATSAPP_VERIFY_TOKEN"
echo "🌐 Webhook URL: $WEBHOOK_URL"
