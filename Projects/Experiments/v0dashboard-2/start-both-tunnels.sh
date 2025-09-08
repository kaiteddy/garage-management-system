#!/bin/bash

# Start Both Professional Tunnels - ELI MOTORS LTD
# GarageManager Pro + ProSearch Intelligence

echo "🚀 Starting ELI MOTORS LTD Professional Tunnel Suite"
echo "===================================================="
echo "🏢 Professional MOT & Intelligence Platform"
echo ""

# Configure ngrok with your API key
echo "🔑 Configuring ngrok with API key..."
ngrok config add-authtoken ak_2zrH0SRxhKbyASvEr80gz2MnvNV

echo ""
echo "🔍 Checking running applications..."

# Check GarageManager Pro (port 3002)
GARAGE_RUNNING=false
if lsof -i :3002 > /dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3002"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManager Pro not running on port 3002"
fi

# Check ProSearch Intelligence (port 3001)
PROSEARCH_RUNNING=false
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3001"
    PROSEARCH_RUNNING=true
else
    echo "❌ ProSearch Intelligence not running on port 3001"
fi

echo ""

# Stop all existing ngrok processes
echo "🛑 Stopping all existing ngrok processes..."
pkill -f ngrok
sleep 3

# Start tunnels for running applications
if [ "$GARAGE_RUNNING" = true ]; then
    echo "🌐 Starting GarageManager Pro tunnel (port 3002)..."
    ngrok http 3002 --authtoken ak_2zrH0SRxhKbyASvEr80gz2MnvNV --log=stdout > garage-ngrok.log 2>&1 &
    GARAGE_PID=$!
    sleep 3
fi

if [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 Starting ProSearch Intelligence tunnel (port 3001)..."
    ngrok http 3001 --authtoken ak_2zrH0SRxhKbyASvEr80gz2MnvNV --log=stdout --web-addr=localhost:4041 > prosearch-ngrok.log 2>&1 &
    PROSEARCH_PID=$!
    sleep 3
fi

echo ""
echo "⏳ Waiting for tunnels to establish..."
sleep 8

echo ""
echo "🔍 Getting tunnel URLs..."

# Get GarageManager Pro URL
if [ "$GARAGE_RUNNING" = true ]; then
    GARAGE_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if tunnel['proto'] == 'https' and '3002' in tunnel['config']['addr']:
            print(tunnel['public_url'])
            break
except:
    pass
" 2>/dev/null)
fi

# Get ProSearch Intelligence URL
if [ "$PROSEARCH_RUNNING" = true ]; then
    PROSEARCH_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data['tunnels']:
        if tunnel['proto'] == 'https' and '3001' in tunnel['config']['addr']:
            print(tunnel['public_url'])
            break
except:
    pass
" 2>/dev/null)
fi

echo ""
echo "🎉 ELI MOTORS LTD Professional Platform Suite"
echo "============================================="
echo ""

if [ -n "$GARAGE_URL" ]; then
    echo "🚗 GarageManager Pro:"
    echo "   🌐 Professional URL: $GARAGE_URL"
    echo "   📱 Local: http://localhost:3002"
    echo "   📊 Analytics: http://localhost:4040"
    echo "$GARAGE_URL" > .garage_tunnel_url
    echo ""
fi

if [ -n "$PROSEARCH_URL" ]; then
    echo "🔍 ProSearch Intelligence:"
    echo "   🌐 Professional URL: $PROSEARCH_URL"
    echo "   📱 Local: http://localhost:3001"
    echo "   📊 Analytics: http://localhost:4041"
    echo "$PROSEARCH_URL" > .prosearch_tunnel_url
    echo ""
fi

echo "🔧 Professional Features:"
echo "   ✅ HTTPS encryption for both platforms"
echo "   ✅ Professional ngrok infrastructure"
echo "   ✅ Stable URLs during session"
echo "   ✅ Real-time analytics dashboards"
echo "   ✅ Better performance than cloudflared"
echo ""

echo "💡 Upgrade to Personal ($10/month) for:"
echo "   🎯 3 reserved tunnels (perfect for your needs)"
echo "   🔗 Custom subdomains (elimotors-garage.ngrok.app)"
echo "   📊 Enhanced analytics"
echo "   🔄 URLs that don't change on restart"
echo ""

echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
echo ""

echo "🛑 To stop all tunnels: pkill -f ngrok"
echo "📊 Analytics: http://localhost:4040 & http://localhost:4041"
echo "📝 Logs: tail -f garage-ngrok.log & tail -f prosearch-ngrok.log"

echo ""
echo "🔄 Tunnels will remain active. Press Ctrl+C to stop."

# Keep script running and wait for both processes
if [ "$GARAGE_RUNNING" = true ] && [ "$PROSEARCH_RUNNING" = true ]; then
    wait $GARAGE_PID $PROSEARCH_PID
elif [ "$GARAGE_RUNNING" = true ]; then
    wait $GARAGE_PID
elif [ "$PROSEARCH_RUNNING" = true ]; then
    wait $PROSEARCH_PID
else
    echo "❌ No applications running to tunnel"
    exit 1
fi
