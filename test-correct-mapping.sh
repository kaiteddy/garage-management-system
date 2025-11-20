#!/bin/bash

echo "🧪 Testing Correct URL Mapping - ELI MOTORS LTD"
echo "=============================================="
echo ""

echo "🔍 Testing URLs..."
echo ""

# Test GarageManager Pro (should be v0dashboard-2)
echo "🚗 Testing GarageManager Pro (v0dashboard-2):"
echo "   URL: https://garage-manager.eu.ngrok.io"
GARAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io" 2>/dev/null || echo "000")
echo "   Response: HTTP $GARAGE_CODE"

if [ "$GARAGE_CODE" = "200" ]; then
    echo "   ✅ GarageManager Pro is accessible"
else
    echo "   ⚠️  GarageManager Pro may still be starting"
fi

echo ""

# Test ProSearch Intelligence
echo "🔍 Testing ProSearch Intelligence:"
echo "   URL: https://pro-search.eu.ngrok.io"
PROSEARCH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://pro-search.eu.ngrok.io" 2>/dev/null || echo "000")
echo "   Response: HTTP $PROSEARCH_CODE"

if [ "$PROSEARCH_CODE" = "200" ]; then
    echo "   ✅ ProSearch Intelligence is accessible"
else
    echo "   ⚠️  ProSearch Intelligence may still be starting"
fi

echo ""
echo "📋 Current Mapping:"
echo "=================="
echo "🚗 garage-manager.eu.ngrok.io → GarageManager Pro (v0dashboard-2) on port 3000"
echo "🔍 pro-search.eu.ngrok.io → ProSearch Intelligence on port 3001"
echo ""

if [ "$GARAGE_CODE" = "200" ] && [ "$PROSEARCH_CODE" = "200" ]; then
    echo "🎉 Both applications are correctly mapped and accessible!"
elif [ "$GARAGE_CODE" = "200" ]; then
    echo "✅ GarageManager Pro is working correctly"
    echo "⚠️  ProSearch Intelligence needs attention"
elif [ "$PROSEARCH_CODE" = "200" ]; then
    echo "✅ ProSearch Intelligence is working correctly"
    echo "⚠️  GarageManager Pro needs attention"
else
    echo "⚠️  Both applications may still be starting up"
fi

echo ""
echo "📞 Corrected Webhook URLs:"
echo "========================="
echo "🚗 GarageManager Pro (v0dashboard-2) Webhooks:"
echo "   📱 WhatsApp: https://garage-manager.eu.ngrok.io/api/webhooks/whatsapp"
echo "   💬 SMS: https://garage-manager.eu.ngrok.io/api/webhooks/sms"
echo "   📞 Voice: https://garage-manager.eu.ngrok.io/api/webhooks/voice"
echo ""
echo "🔍 ProSearch Intelligence Webhooks:"
echo "   📊 Analytics: https://pro-search.eu.ngrok.io/api/webhooks/analytics"
echo "   📈 Reports: https://pro-search.eu.ngrok.io/api/webhooks/reports"
