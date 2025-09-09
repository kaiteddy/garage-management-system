#!/bin/bash

echo "🔍 DEBUGGING WEBHOOK TOKEN VERIFICATION"
echo "======================================="
echo ""

PRODUCTION_URL="https://garagemanagerpro.vercel.app"
WEBHOOK_URL="$PRODUCTION_URL/api/webhooks/communication-responses"

echo "🌐 Production URL: $PRODUCTION_URL"
echo "📡 Webhook URL: $WEBHOOK_URL"
echo ""

echo "🧪 STEP 1: CHECK ENVIRONMENT VARIABLES"
echo "======================================"
ENV_RESPONSE=$(curl -s "$PRODUCTION_URL/api/test-env")
echo "Environment Variables:"
echo "$ENV_RESPONSE" | jq '.environment | {WHATSAPP_WEBHOOK_VERIFY_TOKEN, TWILIO_WEBHOOK_VERIFY_TOKEN}' 2>/dev/null

echo ""
echo "All Environment Keys:"
echo "$ENV_RESPONSE" | jq '.allEnvKeys[]' 2>/dev/null | grep -E "(WHATSAPP|TWILIO).*TOKEN"

echo ""
echo "🧪 STEP 2: TEST VERIFICATION WITH DEBUG INFO"
echo "============================================"

# Test WhatsApp verification with detailed response
echo "Testing WhatsApp token verification..."
WHATSAPP_RESPONSE=$(curl -s -v \
  "$WEBHOOK_URL?hub.mode=subscribe&hub.challenge=debug_test&hub.verify_token=whatsapp_verify_2024_elimotors" \
  2>&1)

echo "WhatsApp Response:"
echo "$WHATSAPP_RESPONSE" | grep -E "(< HTTP|debug_test|Forbidden|200|403)"

echo ""
echo "Testing Twilio token verification..."
TWILIO_RESPONSE=$(curl -s -v \
  "$WEBHOOK_URL?hub.challenge=debug_test&hub.verify_token=eli_motors_webhook_2024" \
  2>&1)

echo "Twilio Response:"
echo "$TWILIO_RESPONSE" | grep -E "(< HTTP|debug_test|Forbidden|200|403)"

echo ""
echo "🧪 STEP 3: TEST WITH EXACT VALUES FROM ENVIRONMENT"
echo "=================================================="

# Extract the actual environment values and test with them
WHATSAPP_TOKEN_STATUS=$(echo "$ENV_RESPONSE" | jq -r '.environment.WHATSAPP_WEBHOOK_VERIFY_TOKEN // "not_found"')
TWILIO_TOKEN_STATUS=$(echo "$ENV_RESPONSE" | jq -r '.environment.TWILIO_WEBHOOK_VERIFY_TOKEN // "not_found"')

echo "WHATSAPP_WEBHOOK_VERIFY_TOKEN status: $WHATSAPP_TOKEN_STATUS"
echo "TWILIO_WEBHOOK_VERIFY_TOKEN status: $TWILIO_TOKEN_STATUS"

echo ""
echo "🔧 DEBUGGING SUGGESTIONS:"
echo "========================="
echo "1. If TWILIO_WEBHOOK_VERIFY_TOKEN shows 'not_found':"
echo "   • Check Vercel environment variables are saved correctly"
echo "   • Ensure the variable name is exactly: TWILIO_WEBHOOK_VERIFY_TOKEN"
echo "   • Try redeploying the application"
echo ""
echo "2. If both tokens show 'Present' but verification fails:"
echo "   • The webhook code might have a logic issue"
echo "   • Check the actual token values match exactly"
echo ""
echo "3. Current working configuration:"
echo "   • Twilio token 'eli_motors_webhook_2024' works"
echo "   • Use this for immediate Twilio console setup"
echo ""

echo "📱 IMMEDIATE WORKING SETUP:"
echo "==========================="
echo "For Twilio Console (works now):"
echo "• Webhook URL: $WEBHOOK_URL"
echo "• Verification: Use 'eli_motors_webhook_2024'"
echo ""
echo "For WhatsApp Business API (after fixing):"
echo "• Webhook URL: $WEBHOOK_URL"
echo "• Verify Token: whatsapp_verify_2024_elimotors"
