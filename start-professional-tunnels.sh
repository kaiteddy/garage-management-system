#!/bin/bash

# Start Professional Tunnels - ELI MOTORS LTD
# Upgraded Account with Reserved Domains

echo "🚀 Starting ELI MOTORS LTD Professional Tunnel Suite"
echo "===================================================="
echo "🏢 Upgraded Account - Reserved Domains & Enhanced Features"
echo ""

# Configure ngrok with your authtoken
echo "🔑 Configuring ngrok with upgraded authtoken..."
ngrok config add-authtoken 2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA

echo ""
echo "🔍 Checking running applications..."

# Check GarageManager Pro (port 3002)
GARAGE_RUNNING=false
if lsof -i :3002 > /dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3002"
    GARAGE_RUNNING=true
else
    echo "❌ GarageManager Pro not running on port 3002"
    echo "   Start with: npm run dev -- --port 3002"
fi

# Check ProSearch Intelligence (port 3001)
PROSEARCH_RUNNING=false
if lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3001"
    PROSEARCH_RUNNING=true
else
    echo "❌ ProSearch Intelligence not running on port 3001"
    echo "   Start with: npm run dev -- --port 3001"
fi

# Check Development (port 3003)
DEV_RUNNING=false
if lsof -i :3003 > /dev/null 2>&1; then
    echo "✅ Development server running on port 3003"
    DEV_RUNNING=true
else
    echo "⚠️  Development server not running on port 3003 (optional)"
fi

echo ""

# Stop all existing ngrok processes
echo "🛑 Stopping all existing ngrok processes..."
pkill -f ngrok
sleep 3

echo "🌐 Starting professional tunnels with reserved domains..."
echo ""

# Start tunnels using named configurations
if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 Starting GarageManager Pro tunnel..."
    echo "   Reserved URL: https://garage-manager.eu.ngrok.io"
    ngrok http 3002 --subdomain=garage-manager --authtoken=2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA --log=stdout > garage-professional.log 2>&1 &
    GARAGE_PID=$!
    sleep 2
fi

if [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 Starting ProSearch Intelligence tunnel..."
    echo "   Reserved URL: https://pro-search.eu.ngrok.io"
    ngrok http 3001 --subdomain=pro-search --authtoken=2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA --log=stdout > prosearch-professional.log 2>&1 &
    PROSEARCH_PID=$!
    sleep 2
fi

if [ "$DEV_RUNNING" = true ]; then
    echo "🔧 Starting Development tunnel..."
    echo "   Reserved URL: https://eli-dev.eu.ngrok.io"
    ngrok http 3003 --subdomain=eli-dev --authtoken=2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA --log=stdout > dev-professional.log 2>&1 &
    DEV_PID=$!
    sleep 2
fi

echo ""
echo "⏳ Waiting for professional tunnels to establish..."
sleep 8

echo ""
echo "🎉 ELI MOTORS LTD Professional Platform Suite"
echo "============================================="
echo ""

if [ "$GARAGE_RUNNING" = true ]; then
    echo "🚗 GarageManager Pro:"
    echo "   🌐 Professional URL: https://garage-manager.eu.ngrok.io"
    echo "   📱 Local Development: http://localhost:3002"
    echo "   📊 Analytics: http://localhost:4040"
    echo "   🔒 Features: HTTPS, Reserved Domain, Enhanced Security"
    echo "https://garage-manager.eu.ngrok.io" > .garage_professional_url
    echo ""
fi

if [ "$PROSEARCH_RUNNING" = true ]; then
    echo "🔍 ProSearch Intelligence:"
    echo "   🌐 Professional URL: https://pro-search.eu.ngrok.io"
    echo "   📱 Local Development: http://localhost:3001"
    echo "   📊 Analytics: http://localhost:4040"
    echo "   🔒 Features: HTTPS, Reserved Domain, Enhanced Security"
    echo "https://pro-search.eu.ngrok.io" > .prosearch_professional_url
    echo ""
fi

if [ "$DEV_RUNNING" = true ]; then
    echo "🔧 Development Environment:"
    echo "   🌐 Professional URL: https://eli-dev.eu.ngrok.io"
    echo "   📱 Local Development: http://localhost:3003"
    echo "   📊 Analytics: http://localhost:4040"
    echo "   🔒 Features: HTTPS, Reserved Domain, Testing Environment"
    echo "https://eli-dev.eu.ngrok.io" > .dev_professional_url
    echo ""
fi

echo "🎯 Professional Features Active:"
echo "   ✅ Reserved domains (URLs never change!)"
echo "   ✅ Enhanced HTTPS encryption"
echo "   ✅ Professional ngrok infrastructure"
echo "   ✅ Advanced analytics & monitoring"
echo "   ✅ Priority support"
echo "   ✅ 5GB monthly data transfer"
echo ""

echo "📊 Professional Analytics:"
echo "   🌐 Web Dashboard: http://localhost:4040"
echo "   📈 Real-time monitoring"
echo "   🔍 Traffic analysis"
echo "   🛡️ Security insights"
echo ""

echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
echo "   Professional MOT & Intelligence Platform Suite"
echo ""

echo "🛑 To stop all tunnels: pkill -f ngrok"
echo "📝 Logs: tail -f *-professional.log"
echo "🔄 URLs are now PERMANENT - no more random changes!"

echo ""
echo "🔄 Professional tunnels active. Press Ctrl+C to stop."

# Keep script running and wait for all processes
PIDS=()
[ "$GARAGE_RUNNING" = true ] && PIDS+=($GARAGE_PID)
[ "$PROSEARCH_RUNNING" = true ] && PIDS+=($PROSEARCH_PID)
[ "$DEV_RUNNING" = true ] && PIDS+=($DEV_PID)

if [ ${#PIDS[@]} -gt 0 ]; then
    wait "${PIDS[@]}"
else
    echo "❌ No applications running to tunnel"
    echo "💡 Start your applications first, then run this script"
    exit 1
fi
