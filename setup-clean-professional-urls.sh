#!/bin/bash

echo "🎯 Clean Professional URLs Setup - ELI MOTORS LTD"
echo "================================================"
echo "🚗 GarageManagerPro + 🔍 ProSearchIntelligence"
echo ""

echo "🤔 URL Options Analysis:"
echo "========================"
echo ""
echo "❌ Current Tailscale URLs:"
echo "   https://elimotors-server.taila0aa39.ts.net/GarageManagerPro"
echo "   ↳ Shows server hostname (not clean)"
echo ""
echo "✅ Desired Clean URLs (like ngrok):"
echo "   https://garage-manager.eu.ngrok.io"
echo "   https://pro-search.eu.ngrok.io"
echo "   ↳ Clean, professional, project-focused"
echo ""

echo "🔧 Solution Options:"
echo "==================="
echo ""
echo "Option 1: 🚀 Use Your Upgraded Ngrok Account (Recommended)"
echo "   ✅ Clean URLs: garage-manager.eu.ngrok.io"
echo "   ✅ Multiple simultaneous tunnels (upgraded account)"
echo "   ✅ Reserved domains"
echo "   ✅ Professional appearance"
echo "   ✅ Perfect for webhooks"
echo ""
echo "Option 2: 🌐 Custom Domain with Tailscale"
echo "   ⚠️  Requires domain setup and DNS configuration"
echo "   ⚠️  More complex setup"
echo ""
echo "Option 3: 🔄 Reverse Proxy with Clean URLs"
echo "   ⚠️  Additional complexity"
echo "   ⚠️  Still shows base hostname"
echo ""

echo "💡 Recommendation: Use Your Upgraded Ngrok Account"
echo "================================================="
echo ""
echo "Since you have an upgraded ngrok account with:"
echo "   ✅ Multiple agent sessions"
echo "   ✅ Reserved domains"
echo "   ✅ No session limits"
echo "   ✅ Professional URLs"
echo ""
echo "Let's set up both applications with ngrok for clean URLs:"
echo ""

# Check if applications are running
echo "📊 Checking Applications:"
echo "========================"

GARAGE_RUNNING=false
GARAGE_PORT=""

# Check for GarageManager Pro
for port in 3000 3001 3002; do
    if lsof -i :$port >/dev/null 2>&1; then
        PROCESS_INFO=$(lsof -i :$port -t | xargs ps -p | grep -E "(npm|next|node)" || true)
        if [ ! -z "$PROCESS_INFO" ]; then
            echo "✅ GarageManagerPro found on port $port"
            GARAGE_PORT=$port
            GARAGE_RUNNING=true
            break
        fi
    fi
done

if [ "$GARAGE_RUNNING" = false ]; then
    echo "❌ GarageManagerPro not running"
    echo "   Start with: npm run dev"
    echo ""
fi

echo ""
echo "🚀 Setting Up Clean Professional URLs:"
echo "====================================="
echo ""

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 GarageManagerPro Configuration:"
    echo "   📍 Local: http://localhost:$GARAGE_PORT"
    echo "   🌐 Clean URL: https://garage-manager.eu.ngrok.io"
    echo "   🔧 Command: ngrok http $GARAGE_PORT --domain=garage-manager.eu.ngrok.io"
    echo ""
fi

echo "🔍 ProSearchIntelligence Configuration:"
echo "   📍 Local: http://localhost:3000"
echo "   🌐 Clean URL: https://pro-search.eu.ngrok.io"
echo "   🔧 Command: ngrok http 3000 --domain=pro-search.eu.ngrok.io"
echo ""

# Create ngrok configuration for both apps
echo "📝 Creating Clean URL Configuration..."

cat > ngrok-clean-urls.yml << EOF
version: "2"
authtoken: 2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA
api_key: ak_2zrH0SRxhKbyASvEr80gz2MnvNV

tunnels:
  # GarageManagerPro - Clean Professional URL
  garage-manager-pro:
    addr: $GARAGE_PORT
    proto: http
    name: "GarageManagerPro - ELI MOTORS LTD"
    hostname: "garage-manager.eu.ngrok.io"
    inspect: true

  # ProSearchIntelligence - Clean Professional URL  
  pro-search-intelligence:
    addr: 3000
    proto: http
    name: "ProSearchIntelligence - ELI MOTORS LTD"
    hostname: "pro-search.eu.ngrok.io"
    inspect: true

web_addr: localhost:4040
log_level: info
EOF

echo "✅ Clean URL configuration saved to: ngrok-clean-urls.yml"
echo ""

# Create webhook URLs with clean domains
cat > clean-professional-webhooks.txt << EOF
# Clean Professional URLs - ELI MOTORS LTD
# ========================================

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

## Start Commands:
# Start both tunnels simultaneously:
ngrok start garage-manager-pro pro-search-intelligence --config=ngrok-clean-urls.yml

# Or start individually:
ngrok start garage-manager-pro --config=ngrok-clean-urls.yml
ngrok start pro-search-intelligence --config=ngrok-clean-urls.yml

## Benefits:
✅ Clean, professional URLs
✅ No server hostnames visible
✅ Perfect for webhooks
✅ Multiple simultaneous tunnels
✅ Reserved domains (upgraded account)
✅ Professional appearance for clients
EOF

echo "✅ Clean webhook URLs saved to: clean-professional-webhooks.txt"
echo ""

echo "🎉 Clean Professional URLs Ready!"
echo "================================"
echo ""
echo "🚗 GarageManagerPro: https://garage-manager.eu.ngrok.io"
echo "🔍 ProSearchIntelligence: https://pro-search.eu.ngrok.io"
echo ""
echo "🚀 To Start Both Applications:"
echo "   ngrok start garage-manager-pro pro-search-intelligence --config=ngrok-clean-urls.yml"
echo ""
echo "📞 Your clean webhook URLs are ready for Twilio!"
echo "📄 Configuration saved in: clean-professional-webhooks.txt"
echo ""
echo "💡 These URLs are exactly what you wanted - clean and professional!"
