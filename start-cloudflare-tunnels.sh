#!/bin/bash

echo "🚀 Starting ELI MOTORS LTD Cloudflare Tunnels"
echo "============================================="

# Check if applications are running
echo "📊 Checking applications..."

# Check GarageManager Pro (port 3001)
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
fi

# Check ProSearch Intelligence (port 3000)
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
    echo "   This is optional - start if needed"
fi

echo ""
echo "🌐 Starting tunnels..."

# Start GarageManager Pro tunnel
echo "🚗 Starting GarageManager Pro tunnel..."
cloudflared tunnel --config garagemanager-config.yml run &
GARAGE_PID=$!
echo $GARAGE_PID > .garage_tunnel_pid

# Start ProSearch Intelligence tunnel
echo "🔍 Starting ProSearch Intelligence tunnel..."
cloudflared tunnel --config prosearch-config.yml run &
PROSEARCH_PID=$!
echo $PROSEARCH_PID > .prosearch_tunnel_pid

echo ""
echo "✅ Tunnels started!"
echo "   🚗 GarageManager Pro PID: $GARAGE_PID"
echo "   🔍 ProSearch Intelligence PID: $PROSEARCH_PID"
echo ""
echo "🌐 Your platforms are available at:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"
echo ""
echo "📊 Tunnel metrics:"
echo "   🚗 GarageManager Pro: http://localhost:2000/metrics"
echo "   🔍 ProSearch Intelligence: http://localhost:2001/metrics"
echo ""
echo "📋 Management commands:"
echo "   Check status: ./check-cloudflare-status.sh"
echo "   Stop tunnels: ./stop-cloudflare-tunnels.sh"
echo "   Restart: ./restart-cloudflare-tunnels.sh"
