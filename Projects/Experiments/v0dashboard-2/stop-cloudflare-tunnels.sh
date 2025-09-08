#!/bin/bash

echo "🛑 Stopping ELI MOTORS LTD Cloudflare Tunnels"
echo "============================================="

# Stop GarageManager Pro tunnel
if [ -f .garage_tunnel_pid ]; then
    GARAGE_PID=$(cat .garage_tunnel_pid)
    if kill -0 $GARAGE_PID 2>/dev/null; then
        echo "🚗 Stopping GarageManager Pro tunnel (PID: $GARAGE_PID)"
        kill $GARAGE_PID
        rm .garage_tunnel_pid
    else
        echo "⚠️  GarageManager Pro tunnel not running"
        rm -f .garage_tunnel_pid
    fi
else
    echo "⚠️  No GarageManager Pro tunnel PID found"
fi

# Stop ProSearch Intelligence tunnel
if [ -f .prosearch_tunnel_pid ]; then
    PROSEARCH_PID=$(cat .prosearch_tunnel_pid)
    if kill -0 $PROSEARCH_PID 2>/dev/null; then
        echo "🔍 Stopping ProSearch Intelligence tunnel (PID: $PROSEARCH_PID)"
        kill $PROSEARCH_PID
        rm .prosearch_tunnel_pid
    else
        echo "⚠️  ProSearch Intelligence tunnel not running"
        rm -f .prosearch_tunnel_pid
    fi
else
    echo "⚠️  No ProSearch Intelligence tunnel PID found"
fi

# Kill any remaining cloudflared processes
echo "🧹 Cleaning up any remaining tunnel processes..."
pkill -f cloudflared

echo ""
echo "✅ All tunnels stopped!"
