#!/bin/bash

# Stable GarageManager Pro - Handles ngrok session limits properly
echo "🚀 Starting Stable GarageManager Pro..."

LOG_FILE="./logs/stable-restart.log"
mkdir -p logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup_ngrok() {
    log "🧹 Cleaning up all ngrok processes..."
    pkill -9 -f ngrok 2>/dev/null || true
    sleep 3
}

start_ngrok() {
    log "🌐 Starting ngrok tunnel..."
    ngrok http 3000 --domain=garage-manager.eu.ngrok.io &
    NGROK_PID=$!
    log "🔗 ngrok started with PID: $NGROK_PID"
    sleep 5
}

check_tunnel() {
    if curl -s --max-time 10 https://garage-manager.eu.ngrok.io/api/dashboard > /dev/null 2>&1; then
        return 0  # Success
    else
        return 1  # Failed
    fi
}

restart_tunnel() {
    log "🔄 Restarting ngrok tunnel..."
    cleanup_ngrok
    start_ngrok
    
    # Wait and test
    sleep 10
    if check_tunnel; then
        log "✅ Tunnel restarted successfully"
    else
        log "⚠️  Tunnel restart may have failed, will retry on next check"
    fi
}

# Cleanup any existing sessions
cleanup_ngrok

# Start ngrok
start_ngrok

# Initial test
log "🔍 Testing initial connection..."
sleep 10
if check_tunnel; then
    log "✅ GarageManager Pro is online at: https://garage-manager.eu.ngrok.io"
    log "📊 Dashboard: https://garage-manager.eu.ngrok.io"
    log "📝 Job Sheets: https://garage-manager.eu.ngrok.io/job-sheet"
    log "🚗 MOT Check: https://garage-manager.eu.ngrok.io/mot-check"
else
    log "⚠️  Initial connection failed, but continuing monitoring..."
fi

log "🔄 Monitoring started. Checking every 60 seconds..."

# Monitor and restart if needed
while true; do
    if ! check_tunnel; then
        log "❌ Tunnel is down, restarting..."
        restart_tunnel
    else
        log "✅ Tunnel is healthy"
    fi
    
    sleep 60  # Check every minute
done
