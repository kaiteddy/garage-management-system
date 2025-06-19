#!/bin/bash

# Production startup script for Garage Management System
# This script will start the application in production mode

set -e

echo "🚀 Starting Garage Management System in Production Mode"
echo "======================================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Create necessary directories
mkdir -p logs
mkdir -p instance

# Set environment variables
export FLASK_ENV=production
export PORT=5001
export PYTHONPATH="$SCRIPT_DIR/src:$PYTHONPATH"

# Function to check if port is available
check_port() {
    if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port 5001 is already in use!"
        echo "   Checking what's running on port 5001..."
        lsof -Pi :5001 -sTCP:LISTEN
        echo ""
        read -p "Do you want to kill the existing process? (y/N): " kill_existing
        if [[ $kill_existing =~ ^[Yy]$ ]]; then
            echo "🔪 Killing existing process..."
            lsof -ti:5001 | xargs kill -9
            sleep 2
        else
            echo "❌ Cannot start - port 5001 is in use"
            exit 1
        fi
    fi
}

# Function to start with Gunicorn (recommended)
start_with_gunicorn() {
    echo "🔧 Starting with Gunicorn (Production Server)..."
    
    # Install gunicorn if not present
    if ! command -v gunicorn &> /dev/null; then
        echo "📦 Installing Gunicorn..."
        pip3 install gunicorn
    fi
    
    # Start with Gunicorn
    gunicorn --config gunicorn.conf.py src.main:app
}

# Function to start with Python directly (fallback)
start_with_python() {
    echo "🐍 Starting with Python directly..."
    cd src
    python3 main.py
}

# Function to start in background
start_background() {
    echo "🌙 Starting in background mode..."
    
    # Create PID file directory
    mkdir -p logs
    
    # Start in background
    nohup python3 src/main.py > logs/app.log 2>&1 &
    echo $! > logs/app.pid
    
    echo "✅ Application started in background with PID $(cat logs/app.pid)"
    echo "📋 View logs with: tail -f logs/app.log"
    echo "🛑 Stop with: kill \$(cat logs/app.pid)"
    echo "🌐 Access at: http://localhost:5001"
}

# Check if Python dependencies are installed
echo "📦 Checking Python dependencies..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask not found. Installing dependencies..."
    pip3 install -r requirements.txt
fi

# Check port availability
check_port

# Ask user for startup method
echo ""
echo "Choose startup method:"
echo "1. Gunicorn (Recommended for production)"
echo "2. Python directly (Simple)"
echo "3. Background process"
echo "4. Auto-detect best method"
echo ""

read -p "Enter your choice (1-4) [default: 4]: " choice
choice=${choice:-4}

case $choice in
    1)
        start_with_gunicorn
        ;;
    2)
        start_with_python
        ;;
    3)
        start_background
        ;;
    4)
        echo "🤖 Auto-detecting best startup method..."
        if command -v gunicorn &> /dev/null; then
            echo "✅ Gunicorn found - using production server"
            start_with_gunicorn
        else
            echo "⚠️  Gunicorn not found - using Python directly"
            start_with_python
        fi
        ;;
    *)
        echo "❌ Invalid choice. Using auto-detect..."
        if command -v gunicorn &> /dev/null; then
            start_with_gunicorn
        else
            start_with_python
        fi
        ;;
esac
