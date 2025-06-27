#!/bin/bash

# Unified Launch Script for Garage Management System
# Single integrated application with all functionality consolidated

echo "🚀 Starting Unified Garage Management System..."

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

# Check if port 8000 is available (single port for unified app)
if ! check_port 8000; then
    echo "❌ Port 8000 is already in use. Please free this port."
    echo "💡 You can kill existing processes with: lsof -ti:8000 | xargs kill -9"
    exit 1
fi

# Load environment variables if .env file exists
if [ -f .env ]; then
    echo "🔧 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
fi

# Ensure required directories exist
mkdir -p src/instance
mkdir -p src/feedback_screenshots

echo "🔧 Initializing unified database..."
cd src && python3 -c "
import sqlite3
import os
from datetime import datetime

# Create unified database
db_path = 'garage_management.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Enable foreign keys
cursor.execute('PRAGMA foreign_keys = ON')

print('✅ Unified database initialized')
conn.close()
" && cd ..

echo "🚀 Starting Unified Garage Management System on port 8000..."

# Start the unified application
python3 src/unified_app.py --port 8000 --host 0.0.0.0 &
UNIFIED_PID=$!

# Wait for service to start
sleep 3

# Check if service started successfully
if ! ps -p $UNIFIED_PID > /dev/null; then
    echo "❌ Unified application failed to start."
    exit 1
fi

echo "✅ Unified Garage Management System started successfully!"
echo ""
echo "📋 Available endpoints:"
echo "   🏠 Main Dashboard:     http://localhost:8000"
echo "   🔧 Integrated System:  http://localhost:8000/integrated"
echo "   🚗 MOT Reminders:      http://localhost:8000/mot"
echo "   📤 Upload Interface:   http://localhost:8000/upload"
echo "   💬 SMS Centre:         http://localhost:8000/api/sms"
echo "   📊 Health Check:       http://localhost:8000/health"
echo ""
echo "🎯 All functionality unified in single application!"
echo "✅ No separate services - everything integrated!"

echo "🌐 Opening integrated dashboard in browser..."

# Open browser (works on most platforms)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000/integrated
elif command -v open &> /dev/null; then
    open http://localhost:8000/integrated
elif command -v start &> /dev/null; then
    start http://localhost:8000/integrated
else
    echo "⚠️ Could not open browser automatically. Please open http://localhost:8000/integrated manually."
fi

echo "💡 Press Ctrl+C to stop the unified system"

# Function to clean up when script is terminated
cleanup() {
    echo ""
    echo "🛑 Stopping unified system..."
    kill $UNIFIED_PID 2>/dev/null
    echo "✅ Unified system stopped"
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Keep script running and show status
echo ""
echo "📊 System Status Monitor:"
echo "========================="

while true; do
    if ps -p $UNIFIED_PID > /dev/null; then
        echo "$(date '+%H:%M:%S') - ✅ Unified system running (PID: $UNIFIED_PID)"
    else
        echo "$(date '+%H:%M:%S') - ❌ Unified system stopped unexpectedly"
        break
    fi
    sleep 30
done
