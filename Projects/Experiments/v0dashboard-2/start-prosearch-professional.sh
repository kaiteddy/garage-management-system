#!/bin/bash

# Start ProSearch Intelligence Professional Tunnel - ELI MOTORS LTD
# Upgraded Account - Reserved Domain

echo "🔍 Starting ProSearch Intelligence - Professional Tunnel"
echo "======================================================="
echo "🏢 ELI MOTORS LTD - Upgraded Account Features"
echo ""

# Check if ProSearch Intelligence is running
if ! lsof -i :3001 > /dev/null 2>&1; then
    echo "❌ ProSearch Intelligence not running on port 3001"
    echo "Please start it first:"
    echo "   cd /path/to/prosearch && npm run dev -- --port 3001"
    echo "   OR"
    echo "   cd /path/to/prosearch && python app.py"
    echo "   OR"
    echo "   cd /path/to/prosearch && node server.js"
    echo ""
    exit 1
fi

echo "✅ ProSearch Intelligence running on port 3001"
echo ""

# Stop any existing ngrok processes for this port
echo "🛑 Stopping existing ngrok processes for port 3001..."
pkill -f "ngrok.*3001"
sleep 2

# Start professional tunnel with reserved domain
echo "🌐 Starting professional tunnel with reserved domain..."
echo ""

ngrok http 3001 --subdomain=pro-search --authtoken=2zrEXdLJO1jMrxOFOSiKWP0Qwln_3zT3rWjW4kwadPKHTFAGA --log=stdout > prosearch-professional.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for professional tunnel to establish..."
sleep 8

echo ""
echo "🎉 ProSearch Intelligence Professional Tunnel Active!"
echo "===================================================="
echo ""
echo "🌐 Professional URL: https://pro-search.eu.ngrok.io"
echo "📱 Local Development: http://localhost:3001"
echo "📊 Analytics Dashboard: http://localhost:4040"
echo ""
echo "🎯 Professional Features:"
echo "   ✅ Reserved domain (URL never changes!)"
echo "   ✅ Enhanced HTTPS encryption"
echo "   ✅ Professional infrastructure"
echo "   ✅ Advanced analytics"
echo "   ✅ Priority support"
echo ""
echo "🔍 Intelligence Platform Features:"
echo "   ✅ Advanced analytics access"
echo "   ✅ Search intelligence tools"
echo "   ✅ Neon database integration"
echo "   ✅ Real-time data processing"
echo "   ✅ Secure API endpoints"
echo ""
echo "🏢 ELI MOTORS LTD - Serving Hendon since 1979"
echo ""
echo "🛑 To stop: pkill -f ngrok"
echo "📊 Analytics: http://localhost:4040"
echo "📝 Logs: tail -f prosearch-professional.log"

# Save the professional URL
echo "https://pro-search.eu.ngrok.io" > .prosearch_professional_url
echo ""
echo "💾 Professional URL saved to .prosearch_professional_url"

echo ""
echo "🔄 Professional tunnel active. Press Ctrl+C to stop."

# Keep the script running
wait $NGROK_PID
