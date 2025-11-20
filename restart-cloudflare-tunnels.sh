#!/bin/bash

echo "🔄 Restarting ELI MOTORS LTD Cloudflare Tunnels"
echo "==============================================="

# Stop tunnels
./stop-cloudflare-tunnels.sh

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Start tunnels
./start-cloudflare-tunnels.sh
