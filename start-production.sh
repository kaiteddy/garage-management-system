#!/bin/bash

# Start GarageManager Pro Production - ELI MOTORS LTD
# This script starts the application and tunnel

echo "🚀 Starting GarageManager Pro Production"
echo "======================================"
echo "🔧 ELI MOTORS LTD - MOT Management Platform"
echo ""

# Check if GarageManager Pro is running
echo "🔍 Checking GarageManager Pro application..."

# Function to check if port is in use
check_port() {
    local port=$1
    local name=$2

    if lsof -i :$port > /dev/null 2>&1; then
        echo "✅ $name running on port $port"
        return 0
    else
        echo "❌ $name not running on port $port"
        return 1
    fi
}

# Check GarageManager Pro
GARAGE_RUNNING=false

if check_port 3002 "GarageManager Pro"; then
    GARAGE_RUNNING=true
fi

# Start GarageManager Pro if not running
if [ "$GARAGE_RUNNING" = false ]; then
    echo ""
    echo "🚀 GarageManager Pro not running on port 3002"
    echo "Please start it in another terminal:"
    echo ""
    echo "   npm run dev -- --port 3002"
    echo "   # or"
    echo "   next dev -p 3002"
    echo ""
    echo "⏳ Waiting for GarageManager Pro to start..."
    echo "Press ENTER when the application is running..."
    read
fi

# Start tunnel
echo ""
echo "🌐 Starting Cloudflare Tunnel..."

# Check if tunnel is already configured
if [ ! -f garagemanager-config.yml ]; then
    echo "⚠️  Tunnel configuration not found. Running setup..."
    ./setup-production-tunnel.sh
else
    echo "✅ Tunnel configuration found. Starting tunnel..."
    ./restart-tunnels.sh
fi

echo ""
echo "🎉 GarageManager Pro Production Started!"
echo ""
echo "🌐 Your platform is now live at:"
echo "   📱 https://app.elimotors.co.uk"
echo ""
echo "🔧 Management commands:"
echo "   📊 Check status: ./check-tunnel-status.sh"
echo "   🛑 Stop tunnel: ./stop-tunnels.sh"
echo "   🔄 Restart tunnel: ./restart-tunnels.sh"
echo ""
echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
