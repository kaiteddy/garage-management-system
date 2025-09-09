#!/bin/bash

echo "🔍 TESTING TOKEN VALUES DIRECTLY"
echo "================================="
echo ""

PRODUCTION_URL="https://garagemanagerpro.vercel.app"
WEBHOOK_URL="$PRODUCTION_URL/api/webhooks/communication-responses"

echo "🧪 Testing different token combinations..."
echo ""

# Test 1: WhatsApp token
echo "1. Testing WhatsApp token: whatsapp_verify_2024_elimotors"
RESPONSE1=$(curl -s -w "HTTP_CODE:%{http_code}" \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=whatsapp_verify_2024_elimotors")
CODE1=$(echo "$RESPONSE1" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY1=$(echo "$RESPONSE1" | sed 's/HTTP_CODE:[0-9]*$//')
echo "   Result: HTTP $CODE1 - $BODY1"

# Test 2: Twilio token
echo "2. Testing Twilio token: eli_motors_webhook_2024"
RESPONSE2=$(curl -s -w "HTTP_CODE:%{http_code}" \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=eli_motors_webhook_2024")
CODE2=$(echo "$RESPONSE2" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY2=$(echo "$RESPONSE2" | sed 's/HTTP_CODE:[0-9]*$//')
echo "   Result: HTTP $CODE2 - $BODY2"

# Test 3: Without hub.mode (Twilio style)
echo "3. Testing without hub.mode (Twilio style): whatsapp_verify_2024_elimotors"
RESPONSE3=$(curl -s -w "HTTP_CODE:%{http_code}" \
  "$WEBHOOK_URL?hub.challenge=test123&hub.verify_token=whatsapp_verify_2024_elimotors")
CODE3=$(echo "$RESPONSE3" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY3=$(echo "$RESPONSE3" | sed 's/HTTP_CODE:[0-9]*$//')
echo "   Result: HTTP $CODE3 - $BODY3"

# Test 4: Check what tokens are actually configured
echo ""
echo "4. Checking configured tokens via API..."
TOKEN_CHECK=$(curl -s "$PRODUCTION_URL/api/test-env")
echo "   Environment check:"
echo "$TOKEN_CHECK" | jq '.environment | {WHATSAPP_WEBHOOK_VERIFY_TOKEN, TWILIO_WEBHOOK_VERIFY_TOKEN}' 2>/dev/null || echo "   Could not parse response"

echo ""
echo "📋 SUMMARY:"
echo "==========="
echo "WhatsApp token test: HTTP $CODE1"
echo "Twilio token test: HTTP $CODE2"
echo "No hub.mode test: HTTP $CODE3"

if [ "$CODE1" = "200" ] || [ "$CODE2" = "200" ] || [ "$CODE3" = "200" ]; then
    echo "✅ At least one token configuration is working!"
else
    echo "❌ No token configurations are working - check environment variables"
fi

echo ""
echo "🔧 NEXT STEPS:"
echo "=============="
echo "If all tests fail, you need to:"
echo "1. Set TWILIO_WEBHOOK_VERIFY_TOKEN=eli_motors_webhook_2024 in Vercel"
echo "2. Ensure WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatsapp_verify_2024_elimotors in Vercel"
echo "3. Redeploy the application"
echo "4. Test again"
