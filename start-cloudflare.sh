#!/bin/bash

echo "🚀 Starting ELI MOTORS LTD Cloudflare Tunnels"
echo "============================================="

# Check applications
echo "📊 Checking applications..."
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
fi

echo ""
echo "🌐 Starting tunnels..."

# Start GarageManager Pro tunnel
echo "🚗 Starting GarageManager Pro tunnel..."
cloudflared tunnel --config garagemanager-cloudflare.yml run &
GARAGE_PID=$!
echo $GARAGE_PID > .garage_tunnel_pid

# Start ProSearch Intelligence tunnel
echo "🔍 Starting ProSearch Intelligence tunnel..."
cloudflared tunnel --config prosearch-cloudflare.yml run &
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
echo "⏳ Wait 30 seconds for tunnels to fully connect..."
sleep 30
echo ""
echo "🧪 Testing connections..."
echo "   🚗 GarageManager Pro: $(curl -s -o /dev/null -w "%{http_code}" https://app.elimotors.co.uk)"
echo "   🔍 ProSearch Intelligence: $(curl -s -o /dev/null -w "%{http_code}" https://intelligence.elimotors.co.uk)"
