#!/bin/bash

# Start ProSearch Intelligence with Ngrok - ELI MOTORS LTD
# Professional tunnel for your second application

echo "🔍 Starting ProSearch Intelligence - Professional Tunnel"
echo "========================================================"
echo "🏢 ELI MOTORS LTD - Intelligence Platform"
echo ""

# Check if ProSearch Intelligence is running (assuming port 3001)
if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "❌ ProSearch Intelligence not running on port 3001"
    echo "Please start it first:"
    echo "   cd /path/to/prosearch && npm run dev -- --port 3001"
    echo "   OR"
    echo "   cd /path/to/prosearch && python app.py"
    echo ""
    exit 1
fi

echo "✅ ProSearch Intelligence running on port 3001"
echo ""

# Stop any existing ngrok processes for this port
echo "🛑 Stopping existing ngrok processes for port 3001..."
pkill -f "ngrok.*3001"
sleep 2

# Start ngrok tunnel for ProSearch Intelligence
echo "🌐 Starting professional tunnel for ProSearch Intelligence..."
echo ""

ngrok http 3001 --authtoken ak_2zrH0SRxhKbyASvEr80gz2MnvNV --log=stdout > prosearch-ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for tunnel to establish..."
sleep 8

# Get the tunnel URL (check port 4041 for second ngrok instance)
echo "🔍 Getting tunnel URL..."
TUNNEL_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | python3 -c "
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

# If port 4041 doesn't work, try 4040 (shared interface)
if [ -z "$TUNNEL_URL" ]; then
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if '3001' in tunnel['config']['addr']:
            print(tunnel['public_url'])
            break
except:
    pass
" 2>/dev/null)
fi

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "🎉 ProSearch Intelligence is now live!"
    echo "====================================="
    echo ""
    echo "🌐 Professional URL: $TUNNEL_URL"
    echo "📱 Local Development: http://localhost:3001"
    echo ""
    echo "🔧 Features Available:"
    echo "   ✅ HTTPS encryption"
    echo "   ✅ Professional ngrok infrastructure"
    echo "   ✅ Analytics dashboard: http://localhost:4041"
    echo "   ✅ Stable during session"
    echo "   ✅ Neon database integration"
    echo ""
    echo "🏢 ELI MOTORS LTD - Intelligence Platform"
    echo ""
    echo "🛑 To stop: pkill -f 'ngrok.*3001'"
    echo "📊 Analytics: http://localhost:4041"
    
    # Save the URL for easy access
    echo "$TUNNEL_URL" > .prosearch_tunnel_url
    echo ""
    echo "💾 URL saved to .prosearch_tunnel_url for easy access"
else
    echo "❌ Failed to get tunnel URL. Checking ngrok status..."
    echo "📝 Check logs: tail -f prosearch-ngrok.log"
    sleep 2
fi

echo ""
echo "🔄 Tunnel will remain active. Press Ctrl+C to stop."

# Keep the script running
wait $NGROK_PID
