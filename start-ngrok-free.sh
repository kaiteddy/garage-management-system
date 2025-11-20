#!/bin/bash

# Start GarageManager Pro with Ngrok Free - ELI MOTORS LTD
# Free tier with random URL (still professional and stable during session)

echo "🚀 Starting GarageManager Pro - Free Professional Tunnel"
echo "======================================================="
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

# Start ngrok with free tier (random URL but professional features)
echo "🌐 Starting professional tunnel (free tier)..."
echo ""

ngrok http 3002 --config=ngrok.yml &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for tunnel to establish..."
sleep 8

# Get the tunnel URL
echo "🔍 Getting tunnel URL..."
TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if tunnel['proto'] == 'https':
            print(tunnel['public_url'])
            break
except:
    pass
" 2>/dev/null)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "🎉 GarageManager Pro is now live!"
    echo "================================"
    echo ""
    echo "🌐 Professional URL: $TUNNEL_URL"
    echo "📱 Local Development: http://localhost:3002"
    echo ""
    echo "🔧 Features Available:"
    echo "   ✅ HTTPS encryption"
    echo "   ✅ Professional ngrok infrastructure"
    echo "   ✅ Analytics dashboard: http://localhost:4040"
    echo "   ✅ Stable during session"
    echo "   ✅ Better than basic cloudflared"
    echo ""
    echo "💡 Upgrade Options:"
    echo "   Personal ($8/month): Custom subdomain + reserved URLs"
    echo "   Pro ($20/month): Custom domain (app.elimotors.co.uk)"
    echo "   Visit: https://dashboard.ngrok.com/billing"
    echo ""
    echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
    echo ""
    echo "🛑 To stop: pkill -f ngrok"
    echo "📊 Analytics: http://localhost:4040"
    
    # Save the URL for easy access
    echo "$TUNNEL_URL" > .current_tunnel_url
    echo ""
    echo "💾 URL saved to .current_tunnel_url for easy access"
else
    echo "❌ Failed to get tunnel URL. Checking ngrok status..."
    sleep 2
    curl -s http://localhost:4040/api/tunnels 2>/dev/null || echo "Ngrok web interface not available"
fi

echo ""
echo "🔄 Tunnel will remain active. Press Ctrl+C to stop."

# Keep the script running
wait $NGROK_PID
