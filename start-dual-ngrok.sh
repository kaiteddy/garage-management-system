#!/bin/bash

echo "🚀 Starting Dual ngrok Tunnels for ELI MOTORS LTD"
echo "================================================="
echo "🏢 Business: ELI MOTORS LTD - Serving Hendon since 1979"
echo ""

# Check if applications are running
echo "📊 Checking applications..."

# Check GarageManager Pro (port 3001)
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
    GARAGE_RUNNING=false
fi

# Check ProSearch Intelligence (port 3000)
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
    PROSEARCH_RUNNING=true
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
    echo "   This is optional - will skip this tunnel"
    PROSEARCH_RUNNING=false
fi

echo ""

# Kill any existing ngrok processes
echo "🛑 Stopping any existing ngrok processes..."
pkill -f ngrok
sleep 3

# Check for any remaining processes
REMAINING=$(ps aux | grep -v grep | grep ngrok | wc -l)
if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Found $REMAINING remaining ngrok processes, force killing..."
    pkill -9 -f ngrok
    sleep 2
fi

echo "🌐 Starting ngrok tunnels..."

# Determine which tunnels to start
if [[ $GARAGE_RUNNING == true && $PROSEARCH_RUNNING == true ]]; then
    echo "🚀 Starting both tunnels..."
    TUNNELS="garage-manager pro-search"
elif [[ $GARAGE_RUNNING == true ]]; then
    echo "🚗 Starting GarageManager Pro tunnel only..."
    TUNNELS="garage-manager"
else
    echo "❌ No applications running, cannot start tunnels"
    exit 1
fi

# Start the tunnels
echo "📡 Executing: ngrok start $TUNNELS --config=ngrok.yml"
ngrok start $TUNNELS --config=ngrok.yml &
NGROK_PID=$!

# Save PID for management
echo $NGROK_PID > .ngrok_pid

echo ""
echo "⏳ Waiting for tunnels to establish..."
sleep 10

# Check if ngrok is running
if kill -0 $NGROK_PID 2>/dev/null; then
    echo "✅ ngrok process running (PID: $NGROK_PID)"
else
    echo "❌ ngrok process failed to start"
    exit 1
fi

# Get tunnel URLs
echo "🔍 Getting tunnel URLs..."

# Try to get tunnel information
TUNNEL_INFO=""
for i in {1..10}; do
    TUNNEL_INFO=$(curl -s http://localhost:4042/api/tunnels 2>/dev/null)
    if [[ -n "$TUNNEL_INFO" && "$TUNNEL_INFO" != *"connection refused"* ]]; then
        break
    fi
    echo "   Attempt $i/10 to connect to ngrok API..."
    sleep 2
done

if [[ -n "$TUNNEL_INFO" && "$TUNNEL_INFO" != *"connection refused"* ]]; then
    echo ""
    echo "✅ Tunnels established successfully!"
    echo ""
    
    # Parse and display tunnel URLs
    echo "$TUNNEL_INFO" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('🌐 Active Tunnels:')
    for tunnel in data.get('tunnels', []):
        name = tunnel.get('name', 'unknown')
        url = tunnel.get('public_url', 'unknown')
        proto = tunnel.get('proto', 'unknown')
        if proto == 'https':
            if 'garage-manager' in name:
                print(f'   🚗 GarageManager Pro: {url}')
            elif 'pro-search' in name:
                print(f'   🔍 ProSearch Intelligence: {url}')
            else:
                print(f'   📡 {name}: {url}')
except Exception as e:
    print('⚠️  Could not parse tunnel information')
    print('Raw response:', data if 'data' in locals() else 'No data')
"
else
    echo "⚠️  Could not get tunnel information from ngrok API"
    echo "   Tunnels may still be starting up..."
fi

echo ""
echo "📊 Management Information:"
echo "   🔧 ngrok PID: $NGROK_PID"
echo "   📊 Web Interface: http://localhost:4042"
echo "   📋 Config File: ngrok.yml"
echo ""
echo "🛑 To stop tunnels:"
echo "   kill $NGROK_PID"
echo "   Or run: pkill -f ngrok"
echo ""
echo "📞 For Twilio webhooks:"
echo "   Voice: https://garage-manager.eu.ngrok.io/api/twilio/voice"
echo "   SMS: https://garage-manager.eu.ngrok.io/api/sms/webhook"
echo ""
echo "✅ Dual tunnel setup complete!"
echo "🏢 ELI MOTORS LTD - Professional tunnel management"
