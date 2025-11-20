#!/bin/bash

echo "🌐 Starting Cloudflare Quick Tunnels for ELI MOTORS LTD"
echo "======================================================="
echo "🏢 Business: ELI MOTORS LTD - Serving Hendon since 1979"
echo ""

# Check applications
echo "📊 Checking applications..."
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
    GARAGE_RUNNING=false
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
    PROSEARCH_RUNNING=true
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
    PROSEARCH_RUNNING=false
fi

echo ""

if [[ $GARAGE_RUNNING == false ]]; then
    echo "❌ GarageManager Pro must be running first"
    echo "   Please start with: npm run dev"
    exit 1
fi

echo "🌐 Starting Cloudflare tunnels..."

# Start GarageManager Pro tunnel (quick tunnel)
echo "🚗 Starting GarageManager Pro tunnel..."
cloudflared tunnel --url http://localhost:3001 &
GARAGE_PID=$!
echo $GARAGE_PID > .garage_tunnel_pid

# Wait a moment for tunnel to establish
echo "⏳ Waiting for tunnel to establish..."
sleep 10

# Get the tunnel URL
echo "🔍 Getting tunnel URL..."
TUNNEL_URL=""
for i in {1..10}; do
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        if tunnel.get('proto') == 'https':
            print(tunnel.get('public_url', ''))
            break
except:
    pass
" 2>/dev/null)
    
    if [[ -n $TUNNEL_URL ]]; then
        break
    fi
    echo "   Attempt $i/10..."
    sleep 2
done

if [[ -n $TUNNEL_URL ]]; then
    echo ""
    echo "✅ GarageManager Pro tunnel started!"
    echo "   🌐 URL: $TUNNEL_URL"
    echo "   🔧 Process ID: $GARAGE_PID"
    echo ""
    echo "🧪 Testing connection..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL" 2>/dev/null)
    if [[ $HTTP_CODE == "200" ]]; then
        echo "   ✅ Connection test: SUCCESS ($HTTP_CODE)"
    else
        echo "   ⚠️  Connection test: $HTTP_CODE (may need a moment to fully connect)"
    fi
else
    echo "❌ Could not get tunnel URL"
    echo "   Check if cloudflared is working properly"
fi

# Start ProSearch tunnel if it's running
if [[ $PROSEARCH_RUNNING == true ]]; then
    echo ""
    echo "🔍 Starting ProSearch Intelligence tunnel..."
    cloudflared tunnel --url http://localhost:3000 &
    PROSEARCH_PID=$!
    echo $PROSEARCH_PID > .prosearch_tunnel_pid
    
    # Wait for ProSearch tunnel
    sleep 10
    
    # Get ProSearch tunnel URL
    PROSEARCH_URL=$(curl -s http://localhost:4041/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        if tunnel.get('proto') == 'https':
            print(tunnel.get('public_url', ''))
            break
except:
    pass
" 2>/dev/null)
    
    if [[ -n $PROSEARCH_URL ]]; then
        echo "   ✅ ProSearch tunnel started!"
        echo "   🌐 URL: $PROSEARCH_URL"
        echo "   🔧 Process ID: $PROSEARCH_PID"
    fi
fi

echo ""
echo "🎉 Cloudflare Tunnels Started!"
echo "=============================="
echo ""
echo "🌐 Your secure HTTPS URLs:"
echo "   📱 GarageManager Pro: $TUNNEL_URL"
if [[ -n $PROSEARCH_URL ]]; then
    echo "   🔍 ProSearch Intelligence: $PROSEARCH_URL"
fi
echo ""
echo "🔧 Tunnel Management:"
echo "   📊 GarageManager Pro metrics: http://localhost:4040"
if [[ $PROSEARCH_RUNNING == true ]]; then
    echo "   📊 ProSearch Intelligence metrics: http://localhost:4041"
fi
echo ""
echo "🛑 To stop tunnels:"
echo "   kill $GARAGE_PID"
if [[ -n $PROSEARCH_PID ]]; then
    echo "   kill $PROSEARCH_PID"
fi
echo "   Or use: pkill -f cloudflared"
echo ""
echo "📞 For Twilio webhooks, update to:"
echo "   Voice: $TUNNEL_URL/api/twilio/voice"
echo "   SMS: $TUNNEL_URL/api/sms/webhook"
echo ""
echo "✅ Professional HTTPS tunnels ready!"
echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"

# Save URLs for later reference
echo "$TUNNEL_URL" > .garage_tunnel_url
if [[ -n $PROSEARCH_URL ]]; then
    echo "$PROSEARCH_URL" > .prosearch_tunnel_url
fi

echo ""
echo "📋 URLs saved to files for reference:"
echo "   .garage_tunnel_url"
if [[ -n $PROSEARCH_URL ]]; then
    echo "   .prosearch_tunnel_url"
fi
