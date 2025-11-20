#!/bin/bash

# Start Both Professional Tunnels - ELI MOTORS LTD
# Proper method using ngrok configuration file

echo "🚀 Starting ELI MOTORS LTD Professional Tunnel Suite"
echo "===================================================="
echo "🏢 Upgraded Account - Reserved Domains"
echo ""

# Check if both applications are running
echo "🔍 Checking applications..."

GARAGE_RUNNING=false
if lsof -i :3002 > /dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3002"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManager Pro not running on port 3002"
    echo "   Start with: npm run dev -- --port 3002"
fi

PROSEARCH_RUNNING=false
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3001"
    PROSEARCH_RUNNING=true
else
    echo "❌ ProSearch Intelligence not running on port 3001"
    echo "   Start with: cd prosearch-demo && npm start"
fi

echo ""

if [ "$GARAGE_RUNNING" = false ] && [ "$PROSEARCH_RUNNING" = false ]; then
    echo "❌ No applications running. Please start your applications first."
    exit 1
fi

# Stop existing ngrok processes
echo "🛑 Stopping existing ngrok processes..."
pkill -f ngrok
sleep 2

# Start both tunnels using configuration file
echo "🌐 Starting professional tunnels with reserved domains..."
echo ""

if [ "$GARAGE_RUNNING" = true ] && [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🚀 Starting both tunnels:"
    echo "   🚗 GarageManager Pro: https://garage-manager.eu.ngrok.io"
    echo "   🔍 ProSearch Intelligence: https://pro-search.eu.ngrok.io"
    ngrok start garagemanager-pro prosearch-intelligence --config=ngrok.yml &
elif [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Starting GarageManager Pro tunnel:"
    echo "   https://garage-manager.eu.ngrok.io"
    ngrok start garagemanager-pro --config=ngrok.yml &
elif [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 Starting ProSearch Intelligence tunnel:"
    echo "   https://pro-search.eu.ngrok.io"
    ngrok start prosearch-intelligence --config=ngrok.yml &
fi

NGROK_PID=$!

# Wait for tunnels to establish
echo ""
echo "⏳ Waiting for professional tunnels to establish..."
sleep 8

# Get tunnel URLs
echo ""
echo "🔍 Getting tunnel URLs..."
TUNNEL_INFO=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        print(f'{tunnel[\"name\"]}: {tunnel[\"public_url\"]}')
except:
    print('Error getting tunnel info')
" 2>/dev/null)

echo ""
echo "🎉 ELI MOTORS LTD Professional Platform Suite"
echo "============================================="
echo ""

if echo "$TUNNEL_INFO" | grep -q "garagemanager-pro"; then
    GARAGE_URL=$(echo "$TUNNEL_INFO" | grep "garagemanager-pro" | cut -d' ' -f2)
    echo "🚗 GarageManager Pro:"
    echo "   🌐 Professional URL: $GARAGE_URL (RESERVED)"
    echo "   📱 Local Development: http://localhost:3002"
    echo "   📊 Analytics: http://localhost:4040"
    echo "$GARAGE_URL" > .garage_professional_url
    echo ""
fi

if echo "$TUNNEL_INFO" | grep -q "prosearch-intelligence"; then
    PROSEARCH_URL=$(echo "$TUNNEL_INFO" | grep "prosearch-intelligence" | cut -d' ' -f2)
    echo "🔍 ProSearch Intelligence:"
    echo "   🌐 Professional URL: $PROSEARCH_URL (RESERVED)"
    echo "   📱 Local Development: http://localhost:3001"
    echo "   📊 Analytics: http://localhost:4040"
    echo "$PROSEARCH_URL" > .prosearch_professional_url
    echo ""
fi

echo "🎯 Professional Features Active:"
echo "   ✅ Reserved domains (URLs never change!)"
echo "   ✅ Enhanced HTTPS encryption"
echo "   ✅ Professional ngrok infrastructure"
echo "   ✅ Advanced analytics & monitoring"
echo "   ✅ Priority support"
echo "   ✅ 5GB monthly data transfer"
echo ""

echo "📊 Professional Analytics: http://localhost:4040"
echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
echo ""

echo "🛑 To stop: pkill -f ngrok"
echo "🔄 Professional tunnels active. Press Ctrl+C to stop."

# Keep script running
wait $NGROK_PID
