#!/bin/bash

echo "📊 ELI MOTORS LTD - Cloudflare Tunnel Status"
echo "==========================================="

# Check applications
echo "📱 Applications:"
if lsof -i :3001 >/dev/null 2>&1; then
    echo "   ✅ GarageManager Pro (port 3001) - RUNNING"
else
    echo "   ❌ GarageManager Pro (port 3001) - NOT RUNNING"
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "   ✅ ProSearch Intelligence (port 3000) - RUNNING"
else
    echo "   ⚠️  ProSearch Intelligence (port 3000) - NOT RUNNING"
fi

echo ""
echo "🌐 Tunnels:"

# Check GarageManager Pro tunnel
if [ -f .garage_tunnel_pid ]; then
    GARAGE_PID=$(cat .garage_tunnel_pid)
    if kill -0 $GARAGE_PID 2>/dev/null; then
        echo "   ✅ GarageManager Pro tunnel (PID: $GARAGE_PID) - RUNNING"
    else
        echo "   ❌ GarageManager Pro tunnel - NOT RUNNING"
    fi
else
    echo "   ❌ GarageManager Pro tunnel - NOT RUNNING"
fi

# Check ProSearch Intelligence tunnel
if [ -f .prosearch_tunnel_pid ]; then
    PROSEARCH_PID=$(cat .prosearch_tunnel_pid)
    if kill -0 $PROSEARCH_PID 2>/dev/null; then
        echo "   ✅ ProSearch Intelligence tunnel (PID: $PROSEARCH_PID) - RUNNING"
    else
        echo "   ❌ ProSearch Intelligence tunnel - NOT RUNNING"
    fi
else
    echo "   ❌ ProSearch Intelligence tunnel - NOT RUNNING"
fi

echo ""
echo "🌐 URLs:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"

echo ""
echo "📊 Metrics:"
echo "   🚗 GarageManager Pro: http://localhost:2000/metrics"
echo "   🔍 ProSearch Intelligence: http://localhost:2001/metrics"

echo ""
echo "🔧 Quick tests:"
echo "   Test GarageManager Pro: curl -s -o /dev/null -w \"%{http_code}\" https://app.elimotors.co.uk"
echo "   Test ProSearch Intelligence: curl -s -o /dev/null -w \"%{http_code}\" https://intelligence.elimotors.co.uk"
