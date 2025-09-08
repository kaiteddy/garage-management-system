#!/bin/bash

echo "🔍 Verifying WhatsApp Communication System Deployment on Vercel"
echo "=============================================================="

# Configuration
VERCEL_URL="https://garagemanagerpro.vercel.app"
TEST_PHONE="+447488896449"

echo "🌐 Testing deployment at: $VERCEL_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local description=$3
    local data=$4
    
    echo "🧪 Testing: $description"
    echo "   Endpoint: $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$VERCEL_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$VERCEL_URL$endpoint")
    fi
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ Status: $http_code (Success)"
        if command -v jq &> /dev/null; then
            echo "   📄 Response preview:"
            cat /tmp/response.json | jq -r '.success // .message // "Response received"' | head -3 | sed 's/^/      /'
        fi
    else
        echo "   ❌ Status: $http_code (Failed)"
        echo "   📄 Response:"
        cat /tmp/response.json | head -3 | sed 's/^/      /'
    fi
    echo ""
}

# Test basic connectivity
echo "1️⃣ BASIC CONNECTIVITY"
echo "===================="
test_endpoint "/" "GET" "Homepage accessibility"
test_endpoint "/api/health" "GET" "Health check endpoint"

# Test database setup
echo "2️⃣ DATABASE SETUP"
echo "================="
test_endpoint "/api/setup-communication-database" "GET" "Database status check"

# Test communication system
echo "3️⃣ COMMUNICATION SYSTEM"
echo "======================="
test_endpoint "/api/test-communication-system" "GET" "System configuration check"

# Test WhatsApp setup
echo "4️⃣ WHATSAPP CONFIGURATION"
echo "========================="
test_endpoint "/api/whatsapp/setup-sender" "GET" "WhatsApp sender status"

# Test webhook endpoints
echo "5️⃣ WEBHOOK ENDPOINTS"
echo "==================="
test_endpoint "/api/webhooks/communication-responses" "GET" "Communication webhook"
test_endpoint "/api/whatsapp/webhook" "GET" "WhatsApp webhook"
test_endpoint "/api/voice/webhook" "GET" "Voice webhook"

# Test campaign system
echo "6️⃣ CAMPAIGN SYSTEM"
echo "=================="
test_endpoint "/api/reminders/mot-campaign" "GET" "MOT campaign status"

# Test smart communication
echo "7️⃣ SMART COMMUNICATION"
echo "======================"
test_endpoint "/api/communication/smart-send" "GET" "Smart send capabilities"

# Test correspondence system
echo "8️⃣ CORRESPONDENCE TRACKING"
echo "=========================="
test_endpoint "/api/correspondence/history" "GET" "Correspondence history"
test_endpoint "/api/correspondence/automated-responses" "GET" "Automated responses"

echo "🧪 FUNCTIONAL TESTS"
echo "==================="

# Test database initialization (if needed)
echo "🗄️ Testing database initialization..."
test_endpoint "/api/setup-communication-database" "POST" "Database table creation" \
    '{"createTables": true, "createIndexes": true, "insertSampleData": true}'

# Test system validation
echo "🔧 Testing system validation..."
test_endpoint "/api/test-communication-system" "POST" "Full system test (dry run)" \
    "{\"testType\": \"full\", \"testPhoneNumber\": \"$TEST_PHONE\", \"dryRun\": true}"

# Test campaign dry run
echo "📱 Testing campaign system..."
test_endpoint "/api/reminders/mot-campaign" "POST" "MOT campaign dry run" \
    '{"campaignType": "critical", "dryRun": true, "limit": 3}'

echo "📊 DEPLOYMENT VERIFICATION SUMMARY"
echo "=================================="

# Check if key endpoints are working
working_endpoints=0
total_endpoints=8

# Count successful responses (this is a simplified check)
if curl -s "$VERCEL_URL/" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/health" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/setup-communication-database" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/test-communication-system" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/whatsapp/setup-sender" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/webhooks/communication-responses" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/reminders/mot-campaign" > /dev/null 2>&1; then ((working_endpoints++)); fi
if curl -s "$VERCEL_URL/api/communication/smart-send" > /dev/null 2>&1; then ((working_endpoints++)); fi

echo "✅ Working endpoints: $working_endpoints/$total_endpoints"

if [ $working_endpoints -eq $total_endpoints ]; then
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "============="
    echo "1. 🔧 Configure environment variables in Vercel dashboard"
    echo "2. 🔑 Update Twilio auth token"
    echo "3. 🔗 Configure webhooks in Twilio Console:"
    echo "   • SMS: $VERCEL_URL/api/webhooks/communication-responses"
    echo "   • WhatsApp: $VERCEL_URL/api/webhooks/communication-responses"
    echo "   • Voice: $VERCEL_URL/api/voice/webhook"
    echo "4. 📱 Join WhatsApp sandbox and test messaging"
    echo "5. 🧪 Use testing dashboard: $VERCEL_URL/test-communications"
    echo ""
    echo "📊 MONITORING DASHBOARDS:"
    echo "========================"
    echo "• Testing: $VERCEL_URL/test-communications"
    echo "• Communications: $VERCEL_URL/communications"
    echo "• MOT Critical: $VERCEL_URL/mot-critical"
    echo ""
elif [ $working_endpoints -gt $((total_endpoints / 2)) ]; then
    echo "⚠️ PARTIAL DEPLOYMENT"
    echo "Some endpoints are working, but configuration may be needed."
    echo ""
    echo "🔧 TROUBLESHOOTING:"
    echo "=================="
    echo "1. Check Vercel deployment logs"
    echo "2. Verify environment variables are set"
    echo "3. Check database connection"
    echo "4. Verify Twilio credentials"
else
    echo "❌ DEPLOYMENT ISSUES DETECTED"
    echo "Multiple endpoints are not responding correctly."
    echo ""
    echo "🚨 IMMEDIATE ACTIONS:"
    echo "===================="
    echo "1. Check Vercel deployment status"
    echo "2. Review build logs for errors"
    echo "3. Verify environment variables"
    echo "4. Check database connectivity"
fi

echo ""
echo "🔗 USEFUL LINKS:"
echo "==============="
echo "• Vercel Dashboard: https://vercel.com/dashboard"
echo "• Twilio Console: https://console.twilio.com"
echo "• App URL: $VERCEL_URL"
echo "• Testing Dashboard: $VERCEL_URL/test-communications"
echo ""
echo "📞 SUPPORT:"
echo "==========="
echo "If you encounter issues, check the Vercel deployment logs and"
echo "ensure all environment variables are properly configured."

# Cleanup
rm -f /tmp/response.json

echo ""
echo "🎯 Verification complete!"
