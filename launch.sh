#!/bin/bash

# Launch script for the Garage Management System
# This script starts both the main application and MOT service

echo "🚀 Starting Garage Management System..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3."
    exit 1
fi

# Function to check if port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 1
    else
        return 0
    fi
}

# Check if ports are available
if ! check_port 8001; then
    echo "❌ Port 8001 is already in use. Please free this port."
    exit 1
fi

if ! check_port 8002; then
    echo "❌ Port 8002 is already in use. Please free this port."
    exit 1
fi

# Start MOT service
echo "🚗 Starting MOT service on port 8001..."
python3 src/mot_service.py --port 8001 &
MOT_PID=$!

# Start main application
echo "🏢 Starting main application on port 8002..."
python3 src/main.py --port 8002 &
MAIN_PID=$!

# Wait for services to start
sleep 2

# Check if services started successfully
if ! ps -p $MOT_PID > /dev/null; then
    echo "❌ MOT service failed to start."
    kill $MAIN_PID 2>/dev/null
    exit 1
fi

if ! ps -p $MAIN_PID > /dev/null; then
    echo "❌ Main application failed to start."
    kill $MOT_PID 2>/dev/null
    exit 1
fi

echo "✅ Services started successfully!"
echo "📋 Available endpoints:"
echo "   • Main Application: http://localhost:8002"
echo "   • Integrated Dashboard: http://localhost:8002/integrated"
echo "   • MOT Service API: http://localhost:8001/api"

echo "🌐 Opening integrated dashboard in browser..."

# Open browser (works on most platforms)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8002/integrated
elif command -v open &> /dev/null; then
    open http://localhost:8002/integrated
elif command -v start &> /dev/null; then
    start http://localhost:8002/integrated
else
    echo "⚠️ Could not open browser automatically. Please open http://localhost:8002/integrated manually."
fi

echo "💡 Press Ctrl+C to stop all services"

# Function to clean up when script is terminated
cleanup() {
    echo "\n🛑 Stopping services..."
    kill $MOT_PID 2>/dev/null
    kill $MAIN_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done
