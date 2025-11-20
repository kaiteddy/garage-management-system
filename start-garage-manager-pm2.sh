#!/bin/bash

echo "🚀 Starting GarageManager Pro with PM2 Auto-Restart..."

# Create logs directory
mkdir -p logs

# Check if PM2 is installed, if not install it
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop any existing PM2 processes
echo "🛑 Stopping existing processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Kill any standalone ngrok processes
pkill -f ngrok 2>/dev/null || true

# Wait a moment
sleep 3

# Start with PM2
echo "🔄 Starting GarageManager Pro with PM2..."
pm2 start ecosystem.config.js

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Test the connection
echo "🔍 Testing connection..."
for i in {1..5}; do
    if curl -s https://garage-manager.eu.ngrok.io/api/dashboard > /dev/null 2>&1; then
        echo "✅ GarageManager Pro is online!"
        echo ""
        echo "🌐 URLs:"
        echo "   📊 Dashboard: https://garage-manager.eu.ngrok.io"
        echo "   📝 Job Sheets: https://garage-manager.eu.ngrok.io/job-sheet"
        echo "   🚗 MOT Check: https://garage-manager.eu.ngrok.io/mot-check"
        echo "   📱 SMS: https://garage-manager.eu.ngrok.io/sms"
        echo ""
        echo "🔧 PM2 Management:"
        echo "   pm2 status          - Check status"
        echo "   pm2 logs            - View logs"
        echo "   pm2 restart all     - Restart all services"
        echo "   pm2 stop all        - Stop all services"
        echo ""
        echo "🎯 Auto-restart is now enabled!"
        break
    else
        echo "⏳ Attempt $i/5 - Still starting..."
        sleep 5
    fi
done

# Show PM2 status
echo "📊 Current PM2 Status:"
pm2 status

echo "✨ Setup complete! Your services will auto-restart if they crash."
