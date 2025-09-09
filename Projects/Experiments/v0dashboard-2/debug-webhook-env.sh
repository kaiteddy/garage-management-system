#!/bin/bash

echo "🔍 DEBUGGING WEBHOOK ENVIRONMENT VARIABLES"
echo "==========================================="
echo ""

PRODUCTION_URL="https://garagemanagerpro.vercel.app"
WEBHOOK_URL="$PRODUCTION_URL/api/webhooks/communication-responses"

echo "🌐 Production URL: $PRODUCTION_URL"
echo "📡 Webhook URL: $WEBHOOK_URL"
echo ""

echo "🧪 TESTING ENVIRONMENT VARIABLE ENDPOINT"
echo "========================================"

# Test environment variables endpoint
echo "Checking environment variables..."
ENV_RESPONSE=$(curl -s "$PRODUCTION_URL/api/test-env")

echo "📊 Environment Variables Response:"
echo "$ENV_RESPONSE" | jq . 2>/dev/null || echo "$ENV_RESPONSE"

echo ""
echo "🔍 CHECKING WEBHOOK STATUS WITH DETAILS"
echo "======================================="

# Get detailed webhook status
STATUS_RESPONSE=$(curl -s "$WEBHOOK_URL")
echo "📊 Detailed Webhook Status:"
echo "$STATUS_RESPONSE" | jq . 2>/dev/null || echo "$STATUS_RESPONSE"

echo ""
echo "🧪 TESTING VERIFICATION WITH DEBUG"
echo "=================================="

# Test verification with debug info
echo "Testing verification with token: whatsapp_verify_2024_elimotors"
DEBUG_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.challenge=debug_challenge&hub.verify_token=whatsapp_verify_2024_elimotors")

DEBUG_CODE=$(echo "$DEBUG_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
DEBUG_BODY=$(echo "$DEBUG_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "✅ Debug verification: HTTP $DEBUG_CODE"
echo "📋 Response: $DEBUG_BODY"

echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "======================="
echo "1. Check Vercel Environment Variables:"
echo "   • Go to Vercel Dashboard → Project → Settings → Environment Variables"
echo "   • Ensure WHATSAPP_WEBHOOK_VERIFY_TOKEN is set to: whatsapp_verify_2024_elimotors"
echo "   • Ensure TWILIO_WEBHOOK_VERIFY_TOKEN is also configured"
echo ""
echo "2. Redeploy the application:"
echo "   • Push any change to trigger a new deployment"
echo "   • Or manually redeploy from Vercel dashboard"
echo ""
echo "3. Test again after deployment:"
echo "   • Run ./test-whatsapp-verification.sh"
echo ""

echo "📱 Expected Environment Variables:"
echo "=================================="
echo "WHATSAPP_WEBHOOK_VERIFY_TOKEN=whatsapp_verify_2024_elimotors"
echo "TWILIO_WEBHOOK_VERIFY_TOKEN=eli_motors_webhook_2024"
echo "TWILIO_PHONE_NUMBER=+15558340240"
echo "TWILIO_WHATSAPP_NUMBER=whatsapp:+15558340240"
