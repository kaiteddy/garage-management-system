#!/bin/bash

# Rename scripts for clarity - GarageManager Pro focus

echo "🔄 Renaming scripts for GarageManager Pro focus"
echo "==============================================="

# Create new script names focused on single application
cp restart-tunnels.sh restart-tunnel.sh
cp stop-tunnels.sh stop-tunnel.sh

echo "✅ Created focused scripts:"
echo "   restart-tunnel.sh (single tunnel restart)"
echo "   stop-tunnel.sh (single tunnel stop)"
echo ""
echo "📝 Original scripts still available for compatibility"
echo ""
echo "🎯 Use these commands:"
echo "   ./setup-production-tunnel.sh  # First time setup"
echo "   ./start-production.sh         # Daily startup"
echo "   ./restart-tunnel.sh           # Restart tunnel"
echo "   ./stop-tunnel.sh              # Stop tunnel"
echo "   ./check-tunnel-status.sh      # Check status"
