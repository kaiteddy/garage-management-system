#!/bin/bash

# Restart GarageManager Pro Tunnel - ELI MOTORS LTD

echo "🔄 Restarting GarageManager Pro Tunnel"
echo "===================================="
echo "🔧 ELI MOTORS LTD - MOT Management Platform"
echo ""

# Stop existing tunnel first
echo "🛑 Stopping existing tunnel..."
./stop-tunnels.sh

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

echo ""
echo "🚀 Starting tunnels..."

# Check if config file exists
if [ ! -f garagemanager-config.yml ]; then
    echo "❌ GarageManager config not found. Run ./setup-production-tunnel.sh first"
    exit 1
fi

# Start GarageManager Pro tunnel
echo "🚀 Starting GarageManager Pro tunnel..."
cloudflared tunnel --config garagemanager-config.yml run &
GARAGE_PID=$!

# Save PID
echo $GARAGE_PID > .garage_tunnel_pid

echo ""
echo "✅ GarageManager Pro tunnel restarted!"
echo "Process ID: $GARAGE_PID"
echo ""
echo "🌐 Your platform is available at:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo ""
echo "📊 Check status: ./check-tunnel-status.sh"
