#!/bin/bash

# Start GarageManager Pro with Ngrok - ELI MOTORS LTD
# Professional tunnel solution

echo "🚀 Starting GarageManager Pro - Professional Tunnel"
echo "=================================================="
echo "🏢 ELI MOTORS LTD - MOT Management Platform"
echo ""

# Check if GarageManager Pro is running
if ! lsof -i :3002 > /dev/null 2>&1; then
    echo "❌ GarageManager Pro not running on port 3002"
    echo "Please start it first:"
    echo "   npm run dev -- --port 3002"
    echo ""
    exit 1
fi

echo "✅ GarageManager Pro running on port 3002"
echo ""

# Stop any existing ngrok processes
echo "🛑 Stopping existing ngrok processes..."
pkill -f ngrok
sleep 2

# Start ngrok with the new configuration
echo "🌐 Starting professional tunnel..."
echo ""

# Try to get the reserved subdomain first (free tier)
ngrok http 3002 --subdomain=elimotors-garage --config=ngrok.yml &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for tunnel to establish..."
sleep 5

# Get the tunnel URL
echo "🔍 Getting tunnel URL..."
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if tunnel['proto'] == 'https':
            print(tunnel['public_url'])
            break
except:
    pass
")

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "🎉 GarageManager Pro is now live!"
    echo "================================"
    echo ""
    echo "🌐 Professional URL: $TUNNEL_URL"
    echo "📱 Local Development: http://localhost:3002"
    echo ""
    echo "🔧 Features Available:"
    echo "   ✅ Stable subdomain (elimotors-garage)"
    echo "   ✅ HTTPS encryption"
    echo "   ✅ Professional appearance"
    echo "   ✅ Analytics dashboard: http://localhost:4040"
    echo ""
    echo "💡 To upgrade to custom domain (app.elimotors.co.uk):"
    echo "   1. Visit: https://dashboard.ngrok.com/billing"
    echo "   2. Upgrade to Personal plan ($8/month)"
    echo "   3. Uncomment domain line in ngrok.yml"
    echo ""
    echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
    echo ""
    echo "🛑 To stop: pkill -f ngrok"
else
    echo "❌ Failed to get tunnel URL. Check ngrok status at http://localhost:4040"
fi

# Keep the script running
wait $NGROK_PID
