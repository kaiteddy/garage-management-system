#!/bin/bash

# Auto-Restart GarageManager Pro with Permanent Solution
# This script implements the auto-restart system you prefer

LOG_FILE="logs/garage-manager-auto.log"
PID_FILE="logs/garage-manager.pid"
NGROK_PID_FILE="logs/ngrok.pid"
PORT=3000
NGROK_DOMAIN="garage-manager.eu.ngrok.io"
CHECK_INTERVAL=30

# Create logs directory
mkdir -p logs

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to cleanup processes
cleanup() {
    log "🧹 Cleaning up all processes..."
    pkill -f "npm run dev" 2>/dev/null
    pkill -f "ngrok http" 2>/dev/null
    rm -f "$PID_FILE" "$NGROK_PID_FILE"
    sleep 2
}

# Function to start development server
start_dev_server() {
    log "🚀 Starting GarageManager Pro development server..."
    cd /Users/adamrutstein/v0dashboard-2
    npm run dev > logs/dev-server.log 2>&1 &
    DEV_PID=$!
    echo $DEV_PID > "$PID_FILE"
    log "📱 Development server started with PID: $DEV_PID"
    sleep 5
}

# Function to start ngrok tunnel
start_ngrok() {
    log "🌐 Starting ngrok tunnel..."
    ngrok http $PORT --domain=$NGROK_DOMAIN > logs/ngrok-output.log 2>&1 &
    NGROK_PID=$!
    echo $NGROK_PID > "$NGROK_PID_FILE"
    log "🔗 ngrok started with PID: $NGROK_PID"
    sleep 10
}

# Function to check if development server is running
check_dev_server() {
    if [ -f "$PID_FILE" ]; then
        DEV_PID=$(cat "$PID_FILE")
        if ps -p $DEV_PID > /dev/null 2>&1; then
            # Check if server is responding
            if curl -s -f "http://localhost:$PORT" > /dev/null 2>&1; then
                return 0
            fi
        fi
    fi
    return 1
}

# Function to check if ngrok is running
check_ngrok() {
    if [ -f "$NGROK_PID_FILE" ]; then
        NGROK_PID=$(cat "$NGROK_PID_FILE")
        if ps -p $NGROK_PID > /dev/null 2>&1; then
            # Check if tunnel is responding
            if curl -s -f "https://$NGROK_DOMAIN/api/dashboard" > /dev/null 2>&1; then
                return 0
            fi
        fi
    fi
    return 1
}

# Function to restart everything
restart_all() {
    log "🔄 Restarting GarageManager Pro..."
    cleanup
    start_dev_server
    start_ngrok
    
    # Wait and verify
    sleep 15
    if check_dev_server && check_ngrok; then
        log "✅ GarageManager Pro successfully restarted"
        log "🌐 Available at: https://$NGROK_DOMAIN"
    else
        log "❌ Restart failed, will retry on next check"
    fi
}

# Trap signals for clean shutdown
trap cleanup EXIT INT TERM

# Initial startup
log "🚀 Starting Auto-Restart GarageManager Pro System"
log "📊 Dashboard: https://$NGROK_DOMAIN"
log "🚗 MOT Check: https://$NGROK_DOMAIN/mot-check"
log "📝 Job Sheets: https://$NGROK_DOMAIN/job-sheet"
log "📱 SMS Dashboard: https://$NGROK_DOMAIN/sms"

cleanup
start_dev_server
start_ngrok

# Wait for initial startup
sleep 20

# Main monitoring loop
log "🔄 Starting monitoring loop (checking every ${CHECK_INTERVAL}s)..."
while true; do
    DEV_OK=false
    NGROK_OK=false
    
    if check_dev_server; then
        DEV_OK=true
    fi
    
    if check_ngrok; then
        NGROK_OK=true
    fi
    
    if [ "$DEV_OK" = true ] && [ "$NGROK_OK" = true ]; then
        log "✅ All systems healthy"
    else
        if [ "$DEV_OK" = false ]; then
            log "❌ Development server is down"
        fi
        if [ "$NGROK_OK" = false ]; then
            log "❌ ngrok tunnel is down"
        fi
        restart_all
    fi
    
    sleep $CHECK_INTERVAL
done
