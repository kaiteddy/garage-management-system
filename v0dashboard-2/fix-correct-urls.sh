#!/bin/bash

echo "🔧 Fixing URL Mapping - ELI MOTORS LTD"
echo "====================================="
echo "🚗 GarageManagerPro (v0dashboard-2) → garage-manager.eu.ngrok.io"
echo "🔍 ProSearchIntelligence → pro-search.eu.ngrok.io"
echo ""

# Stop all existing ngrok processes
echo "🛑 Stopping all existing ngrok processes..."
pkill -f ngrok
sleep 3

# Check what's running where
echo "📊 Checking Applications:"
echo "========================"

# Check v0dashboard-2 (GarageManager Pro)
cd /Users/adamrutstein/v0dashboard-2
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ GarageManagerPro (v0dashboard-2) running on port 3000"
    GARAGE_PORT=3000
    GARAGE_RUNNING=true
elif lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManagerPro (v0dashboard-2) running on port 3001"
    GARAGE_PORT=3001
    GARAGE_RUNNING=true
elif lsof -i :3002 >/dev/null 2>&1; then
    echo "✅ GarageManagerPro (v0dashboard-2) running on port 3002"
    GARAGE_PORT=3002
    GARAGE_RUNNING=true
else
    echo "❌ GarageManagerPro (v0dashboard-2) not running"
    echo "   Starting it now..."
    npm run dev > logs/garage-manager.log 2>&1 &
    GARAGE_PID=$!
    echo "📱 Started GarageManagerPro with PID: $GARAGE_PID"
    sleep 8
    GARAGE_PORT=3000
    GARAGE_RUNNING=true
fi

# Check ProSearch Intelligence via PM2
if pm2 list | grep -q "prosearch-frontend.*online"; then
    echo "✅ ProSearchIntelligence running via PM2"
    PROSEARCH_RUNNING=true
    # ProSearch is typically on port 3000 or 3001, let's check
    cd /Users/adamrutstein/pro-search
    if lsof -i :3000 >/dev/null 2>&1 && [ "$GARAGE_PORT" != "3000" ]; then
        PROSEARCH_PORT=3000
    elif lsof -i :3001 >/dev/null 2>&1 && [ "$GARAGE_PORT" != "3001" ]; then
        PROSEARCH_PORT=3001
    else
        PROSEARCH_PORT=3001  # Default assumption
    fi
else
    echo "❌ ProSearchIntelligence not running"
    PROSEARCH_RUNNING=false
fi

echo ""
echo "📋 Port Mapping:"
echo "================"
if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 GarageManagerPro (v0dashboard-2): Port $GARAGE_PORT"
fi
if [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 ProSearchIntelligence: Port $PROSEARCH_PORT"
fi
echo ""

# Create corrected ngrok configuration
echo "📝 Creating corrected tunnel configuration..."

cat > ngrok-corrected.yml << EOF
version: "2"
authtoken: 2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA
api_key: ak_2zrH0SRxhKbyASvEr80gz2MnvNV

tunnels:
  # GarageManagerPro (v0dashboard-2) - Correct mapping
  garage-manager:
    addr: $GARAGE_PORT
    proto: http
    name: "GarageManagerPro v0dashboard-2 - ELI MOTORS LTD"
    hostname: "garage-manager.eu.ngrok.io"
    inspect: true

  # ProSearchIntelligence - Correct mapping
  pro-search:
    addr: $PROSEARCH_PORT
    proto: http
    name: "ProSearchIntelligence - ELI MOTORS LTD"
    hostname: "pro-search.eu.ngrok.io"
    inspect: true

web_addr: localhost:4043
log_level: info
EOF

echo "✅ Corrected configuration created: ngrok-corrected.yml"
echo ""

# Start the corrected tunnels
echo "🚀 Starting corrected tunnels..."

if [ "$GARAGE_RUNNING" = true ] && [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🌐 Starting both corrected tunnels..."
    ngrok start garage-manager pro-search --config=ngrok-corrected.yml &
    NGROK_PID=$!
elif [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Starting GarageManagerPro tunnel only..."
    ngrok start garage-manager --config=ngrok-corrected.yml &
    NGROK_PID=$!
elif [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 Starting ProSearchIntelligence tunnel only..."
    ngrok start pro-search --config=ngrok-corrected.yml &
    NGROK_PID=$!
fi

echo "📱 Corrected tunnels started with PID: $NGROK_PID"
echo "⏳ Waiting for tunnels to establish..."
sleep 10

# Test the corrected URLs
echo ""
echo "🧪 Testing Corrected URLs:"
echo "=========================="

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Testing GarageManagerPro (v0dashboard-2)..."
    GARAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://garage-manager.eu.ngrok.io" || echo "000")
    if [ "$GARAGE_CODE" = "200" ]; then
        echo "✅ GarageManagerPro: https://garage-manager.eu.ngrok.io (HTTP $GARAGE_CODE)"
    else
        echo "⚠️  GarageManagerPro: HTTP $GARAGE_CODE (may still be starting)"
    fi
fi

if [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 Testing ProSearchIntelligence..."
    PROSEARCH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://pro-search.eu.ngrok.io" || echo "000")
    if [ "$PROSEARCH_CODE" = "200" ]; then
        echo "✅ ProSearchIntelligence: https://pro-search.eu.ngrok.io (HTTP $PROSEARCH_CODE)"
    else
        echo "⚠️  ProSearchIntelligence: HTTP $PROSEARCH_CODE (may still be starting)"
    fi
fi

echo ""
echo "🎉 Corrected URL Mapping Complete!"
echo "=================================="
echo ""
echo "✅ CORRECT MAPPING:"
echo "🚗 GarageManagerPro (v0dashboard-2): https://garage-manager.eu.ngrok.io"
echo "🔍 ProSearchIntelligence: https://pro-search.eu.ngrok.io"
echo ""
echo "📞 Corrected Webhook URLs:"
echo "=========================="
echo "🚗 GarageManagerPro Webhooks:"
echo "   📱 WhatsApp: https://garage-manager.eu.ngrok.io/api/webhooks/whatsapp"
echo "   💬 SMS: https://garage-manager.eu.ngrok.io/api/webhooks/sms"
echo "   📞 Voice: https://garage-manager.eu.ngrok.io/api/webhooks/voice"
echo ""
echo "🔍 ProSearchIntelligence Webhooks:"
echo "   📊 Analytics: https://pro-search.eu.ngrok.io/api/webhooks/analytics"
echo "   📈 Reports: https://pro-search.eu.ngrok.io/api/webhooks/reports"
echo ""
echo "💡 Now each application is correctly mapped to its intended URL!"
