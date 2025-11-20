#!/bin/bash

# Quick Start GarageManager Pro with Professional Tunnel - ELI MOTORS LTD
# Upgraded Account - Reserved Domain

echo "🚗 Starting GarageManager Pro - Professional Tunnel"
echo "=================================================="
echo "🏢 ELI MOTORS LTD - Upgraded Account Features"
echo ""

# Check if GarageManager Pro is running
if ! lsof -i :3002 > /dev/null 2>&1; then
    echo "❌ GarageManager Pro not running on port 3002"
    echo "Please start it first:"
    echo "   npm run dev -- --port 3002"
    echo ""
    exit 1
fi

echo "✅ GarageManager Pro running on port 3002"
echo ""

# Stop any existing ngrok processes
echo "🛑 Stopping existing ngrok processes..."
pkill -f ngrok
sleep 2

# Start professional tunnel with reserved domain
echo "🌐 Starting professional tunnel with reserved domain..."
echo ""

ngrok http 3002 --subdomain=garage-manager --authtoken=2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA --log=stdout > garage-professional.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for professional tunnel to establish..."
sleep 8

echo ""
echo "🎉 GarageManager Pro Professional Tunnel Active!"
echo "==============================================="
echo ""
echo "🌐 Professional URL: https://garage-manager.eu.ngrok.io"
echo "📱 Local Development: http://localhost:3002"
echo "📊 Analytics Dashboard: http://localhost:4040"
echo ""
echo "🎯 Professional Features:"
echo "   ✅ Reserved domain (URL never changes!)"
echo "   ✅ Enhanced HTTPS encryption"
echo "   ✅ Professional infrastructure"
echo "   ✅ Advanced analytics"
echo "   ✅ Priority support"
echo ""
echo "🔧 MOT Management Features:"
echo "   ✅ Customer database access"
echo "   ✅ WhatsApp integration"
echo "   ✅ MOT reminders"
echo "   ✅ Vehicle tracking"
echo "   ✅ Document management"
echo ""
echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
echo ""
echo "🛑 To stop: pkill -f ngrok"
echo "📊 Analytics: http://localhost:4040"
echo "📝 Logs: tail -f garage-professional.log"

# Save the professional URL
echo "https://garage-manager.eu.ngrok.io" > .garage_professional_url
echo ""
echo "💾 Professional URL saved to .garage_professional_url"

echo ""
echo "🔄 Professional tunnel active. Press Ctrl+C to stop."

# Keep the script running
wait $NGROK_PID
