#!/bin/bash

# Stop script for Garage Management System

echo "🛑 Stopping Garage Management System"
echo "===================================="

# Function to stop by PID file
stop_by_pid() {
    if [ -f "logs/app.pid" ]; then
        PID=$(cat logs/app.pid)
        if ps -p $PID > /dev/null 2>&1; then
            echo "🔪 Stopping process with PID $PID..."
            kill $PID
            sleep 2
            
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo "⚡ Force killing process..."
                kill -9 $PID
            fi
            
            rm -f logs/app.pid
            echo "✅ Process stopped successfully"
        else
            echo "⚠️  Process with PID $PID not found"
            rm -f logs/app.pid
        fi
    else
        echo "⚠️  No PID file found"
    fi
}

# Function to stop by port
stop_by_port() {
    echo "🔍 Looking for processes on port 5001..."
    
    if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
        echo "📍 Found processes on port 5001:"
        lsof -Pi :5001 -sTCP:LISTEN
        
        echo "🔪 Killing processes on port 5001..."
        lsof -ti:5001 | xargs kill -9
        
        sleep 2
        
        if ! lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null ; then
            echo "✅ All processes on port 5001 stopped"
        else
            echo "⚠️  Some processes may still be running"
        fi
    else
        echo "ℹ️  No processes found on port 5001"
    fi
}

# Function to stop systemd service
stop_systemd() {
    if systemctl is-active --quiet garage-management; then
        echo "🔧 Stopping systemd service..."
        sudo systemctl stop garage-management
        echo "✅ Systemd service stopped"
    else
        echo "ℹ️  Systemd service not running"
    fi
}

# Function to stop PM2 process
stop_pm2() {
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "garage-management-system"; then
            echo "🔧 Stopping PM2 process..."
            pm2 stop garage-management-system
            echo "✅ PM2 process stopped"
        else
            echo "ℹ️  PM2 process not found"
        fi
    fi
}

# Function to stop Docker containers
stop_docker() {
    if command -v docker-compose &> /dev/null; then
        if [ -f "docker-compose.yml" ]; then
            echo "🐳 Stopping Docker containers..."
            docker-compose down
            echo "✅ Docker containers stopped"
        fi
    fi
}

# Main stopping logic
echo "🔍 Detecting running instances..."

# Try different stopping methods
stop_by_pid
stop_systemd
stop_pm2
stop_docker
stop_by_port

echo ""
echo "🏁 Stop script completed"
echo ""
echo "To verify everything is stopped:"
echo "  Check port: lsof -i :5001"
echo "  Check processes: ps aux | grep garage"
