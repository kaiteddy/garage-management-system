#!/bin/bash

# Stop GarageManager Pro Tunnel - ELI MOTORS LTD

echo "🛑 Stopping GarageManager Pro Tunnel"
echo "==================================="
echo "🔧 ELI MOTORS LTD - MOT Management Platform"
echo ""

# Stop GarageManager Pro tunnel
if [ -f .garage_tunnel_pid ]; then
    GARAGE_PID=$(cat .garage_tunnel_pid)
    if kill -0 $GARAGE_PID 2>/dev/null; then
        echo "🛑 Stopping GarageManager Pro tunnel (PID: $GARAGE_PID)"
        kill $GARAGE_PID
        echo "✅ GarageManager Pro tunnel stopped"
    else
        echo "⚠️  GarageManager Pro tunnel not running"
    fi
    rm -f .garage_tunnel_pid
else
    echo "⚠️  No GarageManager Pro tunnel PID found"
fi



# Kill any remaining cloudflared processes
echo ""
echo "🧹 Cleaning up any remaining cloudflared processes..."
pkill -f "cloudflared tunnel"

echo ""
echo "✅ GarageManager Pro tunnel stopped!"
echo "🚀 To restart, run: ./restart-tunnel.sh"
echo "📊 To check status, run: ./check-tunnel-status.sh"
