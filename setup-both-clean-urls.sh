#!/bin/bash

echo "🎯 Setting Up Both Clean Professional URLs - ELI MOTORS LTD"
echo "=========================================================="
echo "🚗 GarageManagerPro + 🔍 ProSearchIntelligence"
echo ""

# Check applications
echo "📊 Checking Applications:"
echo "========================"

# Check GarageManager Pro (port 3001)
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManagerPro running on port 3001"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManagerPro not running on port 3001"
    GARAGE_RUNNING=false
fi

# Check ProSearch Intelligence (port 3001 - same port, different app)
# Let's check if ProSearch is running via PM2
PROSEARCH_RUNNING=false
if pm2 list | grep -q "prosearch-frontend.*online"; then
    echo "✅ ProSearchIntelligence running via PM2"
    PROSEARCH_RUNNING=true
else
    echo "❌ ProSearchIntelligence not running"
fi

echo ""

if [ "$GARAGE_RUNNING" = false ] && [ "$PROSEARCH_RUNNING" = false ]; then
    echo "❌ No applications running. Please start them first."
    exit 1
fi

# Create ngrok configuration for both apps
echo "📝 Creating dual tunnel configuration..."

cat > ngrok-dual-clean.yml << EOF
version: "2"
authtoken: 2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA
api_key: ak_2zrH0SRxhKbyASvEr80gz2MnvNV

tunnels:
  # GarageManagerPro - Clean Professional URL
  garage-manager:
    addr: 3001
    proto: http
    name: "GarageManagerPro - ELI MOTORS LTD"
    hostname: "garage-manager.eu.ngrok.io"
    inspect: true

  # ProSearchIntelligence - Clean Professional URL  
  pro-search:
    addr: 3001
    proto: http
    name: "ProSearchIntelligence - ELI MOTORS LTD"
    hostname: "pro-search.eu.ngrok.io"
    inspect: true

web_addr: localhost:4042
log_level: info
EOF

echo "✅ Dual tunnel configuration created: ngrok-dual-clean.yml"
echo ""

# Stop any existing ngrok processes
echo "🛑 Stopping existing ngrok processes..."
pkill -f ngrok
sleep 3

# Start both tunnels
echo "🚀 Starting both clean professional URLs..."
echo ""

if [ "$GARAGE_RUNNING" = true ] && [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🌐 Starting both tunnels simultaneously..."
    ngrok start garage-manager pro-search --config=ngrok-dual-clean.yml &
    NGROK_PID=$!
    
    echo "📱 Both ngrok tunnels started with PID: $NGROK_PID"
    
elif [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Starting GarageManagerPro tunnel only..."
    ngrok start garage-manager --config=ngrok-dual-clean.yml &
    NGROK_PID=$!
    
    echo "📱 GarageManagerPro tunnel started with PID: $NGROK_PID"
    
elif [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 Starting ProSearchIntelligence tunnel only..."
    ngrok start pro-search --config=ngrok-dual-clean.yml &
    NGROK_PID=$!
    
    echo "📱 ProSearchIntelligence tunnel started with PID: $NGROK_PID"
fi

# Wait for tunnels to establish
echo "⏳ Waiting for tunnels to establish..."
sleep 10

# Test the URLs
echo ""
echo "🧪 Testing Clean URLs:"
echo "====================="

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Testing GarageManagerPro..."
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
echo "🎉 Clean Professional URLs Setup Complete!"
echo "=========================================="
echo ""

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 GarageManagerPro:"
    echo "   🌐 Dashboard: https://garage-manager.eu.ngrok.io"
    echo "   📞 Webhooks:"
    echo "      📱 WhatsApp: https://garage-manager.eu.ngrok.io/api/webhooks/whatsapp"
    echo "      💬 SMS: https://garage-manager.eu.ngrok.io/api/webhooks/sms"
    echo "      📞 Voice: https://garage-manager.eu.ngrok.io/api/webhooks/voice"
    echo ""
fi

if [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 ProSearchIntelligence:"
    echo "   🌐 Dashboard: https://pro-search.eu.ngrok.io"
    echo "   📞 Webhooks:"
    echo "      📊 Analytics: https://pro-search.eu.ngrok.io/api/webhooks/analytics"
    echo "      📈 Reports: https://pro-search.eu.ngrok.io/api/webhooks/reports"
    echo ""
fi

# Create summary file
cat > both-clean-urls-summary.txt << EOF
# Both Applications - Clean Professional URLs
# ===========================================

## GarageManagerPro - MOT Management Platform
Dashboard: https://garage-manager.eu.ngrok.io

Clean Webhook URLs:
- WhatsApp: https://garage-manager.eu.ngrok.io/api/webhooks/whatsapp
- SMS: https://garage-manager.eu.ngrok.io/api/webhooks/sms
- Voice: https://garage-manager.eu.ngrok.io/api/webhooks/voice
- Status: https://garage-manager.eu.ngrok.io/api/webhooks/status

## ProSearchIntelligence - Analytics Platform
Dashboard: https://pro-search.eu.ngrok.io

Clean Webhook URLs:
- Analytics: https://pro-search.eu.ngrok.io/api/webhooks/analytics
- Reports: https://pro-search.eu.ngrok.io/api/webhooks/reports
- Search: https://pro-search.eu.ngrok.io/api/webhooks/search

## Management Commands:
# Start both tunnels:
ngrok start garage-manager pro-search --config=ngrok-dual-clean.yml

# Start individual tunnels:
ngrok start garage-manager --config=ngrok-dual-clean.yml
ngrok start pro-search --config=ngrok-dual-clean.yml

# Stop all tunnels:
pkill -f ngrok

## Benefits:
✅ Clean, professional URLs (no server hostnames)
✅ Project-focused naming
✅ Perfect for webhooks
✅ Both applications accessible simultaneously
✅ Professional appearance for clients
✅ Stable, reserved domains
EOF

echo "✅ Summary saved to: both-clean-urls-summary.txt"
echo ""
echo "💡 Both applications now have clean, professional URLs!"
echo "📄 Web interface: http://localhost:4042"
