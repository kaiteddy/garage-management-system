#!/bin/bash

echo "🔧 GarageManager Pro - Complete Server Restart"
echo "=============================================="

# Kill all existing processes
echo "1️⃣ Stopping all existing processes..."
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true  
pkill -f "ngrok" 2>/dev/null || true
sleep 2

# Clear Next.js cache
echo "2️⃣ Clearing Next.js cache..."
rm -rf .next 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Start development server
echo "3️⃣ Starting development server..."
npm run dev &
DEV_PID=$!

# Wait for server to be ready
echo "4️⃣ Waiting for server to be ready..."
sleep 5

# Test server
echo "5️⃣ Testing server connection..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running on http://localhost:3000"
else
    echo "❌ Server failed to start"
    exit 1
fi

# Start ngrok tunnel
echo "6️⃣ Starting ngrok tunnel..."
sleep 2
ngrok start garage-manager --config=ngrok.yml &
NGROK_PID=$!

# Wait for ngrok to be ready
echo "7️⃣ Waiting for ngrok tunnel..."
sleep 5

# Test ngrok
echo "8️⃣ Testing ngrok tunnel..."
if curl -s https://garage-manager.eu.ngrok.io > /dev/null; then
    echo "✅ Ngrok tunnel is active: https://garage-manager.eu.ngrok.io"
else
    echo "⚠️  Ngrok tunnel may still be starting..."
fi

echo ""
echo "🎉 GarageManager Pro is ready!"
echo "   Local:  http://localhost:3000"
echo "   Public: https://garage-manager.eu.ngrok.io"
echo ""
echo "📊 Process IDs:"
echo "   Dev Server: $DEV_PID"
echo "   Ngrok:      $NGROK_PID"
echo ""
echo "To stop all services: pkill -f 'npm run dev'; pkill -f ngrok"
