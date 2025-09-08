#!/bin/bash

# Check Tunnel Status - ELI MOTORS LTD
# Quick status check for both professional tunnels

echo "🔍 ELI MOTORS LTD - Tunnel Status Check"
echo "======================================"
echo ""

# Check if ngrok processes are running
NGROK_COUNT=$(pgrep -f ngrok | wc -l)
echo "🌐 Active ngrok processes: $NGROK_COUNT"
echo ""

# Check GarageManager Pro
echo "🚗 GarageManager Pro (Port 3002):"
if lsof -i :3002 > /dev/null 2>&1; then
    echo "   ✅ Application: Running"

    # Check for professional tunnel URL first
    if [ -f ".garage_professional_url" ]; then
        GARAGE_URL=$(cat .garage_professional_url)
        echo "   🌐 Professional URL: $GARAGE_URL (RESERVED)"
        echo "   📊 Analytics: http://localhost:4040"
        echo "   ✅ Upgraded Account Features Active"
    elif [ -f ".garage_tunnel_url" ] || [ -f ".current_tunnel_url" ]; then
        GARAGE_URL=$(cat .garage_tunnel_url 2>/dev/null || cat .current_tunnel_url 2>/dev/null)
        echo "   🌐 Free Tunnel URL: $GARAGE_URL (temporary)"
        echo "   📊 Analytics: http://localhost:4040"
        echo "   ⚠️ Consider using professional tunnel"
    else
        echo "   ❌ No tunnel URL found"
    fi
else
    echo "   ❌ Application: Not running"
fi

echo ""

# Check ProSearch Intelligence
echo "🔍 ProSearch Intelligence (Port 3001):"
if lsof -i :3001 > /dev/null 2>&1; then
    echo "   ✅ Application: Running"

    # Check for professional tunnel URL first
    if [ -f ".prosearch_professional_url" ]; then
        PROSEARCH_URL=$(cat .prosearch_professional_url)
        echo "   🌐 Professional URL: $PROSEARCH_URL (RESERVED)"
        echo "   📊 Analytics: http://localhost:4040"
        echo "   ✅ Upgraded Account Features Active"
    elif [ -f ".prosearch_tunnel_url" ]; then
        PROSEARCH_URL=$(cat .prosearch_tunnel_url)
        echo "   🌐 Free Tunnel URL: $PROSEARCH_URL (temporary)"
        echo "   📊 Analytics: http://localhost:4041"
        echo "   ⚠️ Consider using professional tunnel"
    else
        echo "   ❌ No tunnel URL found"
    fi
else
    echo "   ❌ Application: Not running"
fi

echo ""

# Quick commands
echo "🔧 Quick Commands:"
echo "   🚗 GarageManager Pro (Professional): ./start-garage-professional.sh"
echo "   🌐 All Professional Tunnels: ./start-professional-tunnels.sh"
echo "   📊 Legacy Free Tunnels: ./start-both-tunnels.sh"
echo "   🛑 Stop all tunnels: pkill -f ngrok"
echo ""

# Check ngrok web interfaces
echo "📊 Analytics Dashboards:"
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "   ✅ Main dashboard: http://localhost:4040"
else
    echo "   ❌ Main dashboard: Not available"
fi

if curl -s http://localhost:4041/api/tunnels > /dev/null 2>&1; then
    echo "   ✅ Secondary dashboard: http://localhost:4041"
else
    echo "   ❌ Secondary dashboard: Not available"
fi

echo ""
echo "🏢 ELI MOTORS LTD - Professional Tunnel Management"
