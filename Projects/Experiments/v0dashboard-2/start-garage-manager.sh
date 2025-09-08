#!/bin/bash

# GarageManager Pro Startup Script
echo "🚀 Starting GarageManager Pro..."

# Kill any existing ngrok processes
echo "🔄 Stopping existing ngrok processes..."
pkill -f ngrok
sleep 2

# Start ngrok tunnel in background
echo "🌐 Starting ngrok tunnel..."
ngrok http 3000 --domain=garage-manager.eu.ngrok.io &

# Wait for tunnel to establish
echo "⏳ Waiting for tunnel to establish..."
sleep 5

# Test the connection
echo "🔍 Testing connection..."
curl -s https://garage-manager.eu.ngrok.io/api/dashboard > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ GarageManager Pro is online at: https://garage-manager.eu.ngrok.io"
    echo "📊 Dashboard: https://garage-manager.eu.ngrok.io"
    echo "📝 Job Sheets: https://garage-manager.eu.ngrok.io/job-sheet"
    echo "🚗 MOT Check: https://garage-manager.eu.ngrok.io/mot-check"
    echo "📱 SMS Dashboard: https://garage-manager.eu.ngrok.io/sms"
else
    echo "❌ Connection failed. Please check ngrok status."
fi

echo "🎯 GarageManager Pro startup complete!"
