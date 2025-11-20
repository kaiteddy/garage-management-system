#!/bin/bash

# ELI MOTORS LTD - Dual Platform Startup Script
# Manages both GarageManager Pro and ProSearch Intelligence

echo "🚀 Starting ELI MOTORS LTD Platform Suite..."
echo "   📊 GarageManager Pro (MOT Management)"
echo "   🔍 ProSearch Intelligence (Analytics)"
echo ""

LOG_FILE="./logs/dual-platform.log"
mkdir -p logs

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup_all() {
    log "🧹 Cleaning up existing processes..."
    
    # Kill all ngrok processes
    pkill -9 -f ngrok 2>/dev/null || true
    
    # Kill any existing npm/node processes on our ports
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    
    sleep 3
    log "✅ Cleanup complete"
}

start_garage_manager() {
    log "🚗 Starting GarageManager Pro on port 3000..."
    cd /Users/adamrutstein/v0dashboard-2
    
    # Start Next.js in background
    npm run dev > logs/garage-manager.log 2>&1 &
    GARAGE_PID=$!
    
    log "📱 GarageManager Pro started with PID: $GARAGE_PID"
    echo $GARAGE_PID > logs/garage-manager.pid
}

start_prosearch() {
    log "🔍 Starting ProSearch Intelligence on port 3001..."
    
    # Check if ProSearch directory exists
    if [ -d "/Users/adamrutstein/prosearch-demo" ]; then
        cd /Users/adamrutstein/prosearch-demo
        
        # Start ProSearch server in background
        PORT=3001 node server.js > ../v0dashboard-2/logs/prosearch.log 2>&1 &
        PROSEARCH_PID=$!
        
        log "🔍 ProSearch Intelligence started with PID: $PROSEARCH_PID"
        echo $PROSEARCH_PID > ../v0dashboard-2/logs/prosearch.pid
    else
        log "⚠️  ProSearch directory not found, skipping..."
    fi
}

start_tunnels() {
    log "🌐 Starting ngrok tunnels for both platforms..."
    cd /Users/adamrutstein/v0dashboard-2
    
    # Start both tunnels using the configuration file
    ngrok start --all --config=ngrok.yml > logs/ngrok.log 2>&1 &
    NGROK_PID=$!
    
    log "🔗 ngrok tunnels started with PID: $NGROK_PID"
    echo $NGROK_PID > logs/ngrok.pid
}

test_platforms() {
    log "🔍 Testing platform accessibility..."
    sleep 15  # Give time for everything to start
    
    # Test GarageManager Pro
    if curl -s --max-time 10 https://garage-manager.eu.ngrok.io/api/dashboard > /dev/null 2>&1; then
        log "✅ GarageManager Pro is online: https://garage-manager.eu.ngrok.io"
        GARAGE_ONLINE=true
    else
        log "❌ GarageManager Pro is not accessible"
        GARAGE_ONLINE=false
    fi
    
    # Test ProSearch Intelligence
    if curl -s --max-time 10 https://pro-search.eu.ngrok.io/api/analytics > /dev/null 2>&1; then
        log "✅ ProSearch Intelligence is online: https://pro-search.eu.ngrok.io"
        PROSEARCH_ONLINE=true
    else
        log "❌ ProSearch Intelligence is not accessible"
        PROSEARCH_ONLINE=false
    fi
}

show_status() {
    echo ""
    echo "🎯 ELI MOTORS LTD Platform Status:"
    echo "=================================="
    
    if [ "$GARAGE_ONLINE" = true ]; then
        echo "✅ GarageManager Pro:     https://garage-manager.eu.ngrok.io"
        echo "   📊 Dashboard:          https://garage-manager.eu.ngrok.io"
        echo "   📝 Job Sheets:         https://garage-manager.eu.ngrok.io/job-sheet"
        echo "   🚗 MOT Check:          https://garage-manager.eu.ngrok.io/mot-check"
        echo "   📱 SMS Dashboard:      https://garage-manager.eu.ngrok.io/sms"
    else
        echo "❌ GarageManager Pro:     OFFLINE"
    fi
    
    echo ""
    
    if [ "$PROSEARCH_ONLINE" = true ]; then
        echo "✅ ProSearch Intelligence: https://pro-search.eu.ngrok.io"
        echo "   🔍 Analytics:          https://pro-search.eu.ngrok.io"
        echo "   📈 Reports:            https://pro-search.eu.ngrok.io/reports"
    else
        echo "❌ ProSearch Intelligence: OFFLINE"
    fi
    
    echo ""
    echo "🔧 Management:"
    echo "   View logs:             tail -f logs/dual-platform.log"
    echo "   ngrok dashboard:       http://localhost:4042"
    echo "   Stop all:              pkill -f start-both-platforms"
    echo ""
}

# Main execution
cleanup_all

# Start applications
start_garage_manager
sleep 5
start_prosearch
sleep 5

# Start tunnels
start_tunnels

# Test and show status
test_platforms
show_status

log "🎯 Dual platform startup complete!"
log "🔄 Both platforms are now running with persistent tunnels"

# Keep script running to maintain processes
while true; do
    sleep 300  # Check every 5 minutes
    
    # Quick health check
    if ! curl -s --max-time 5 https://garage-manager.eu.ngrok.io > /dev/null 2>&1; then
        log "⚠️  GarageManager Pro health check failed"
    fi
    
    if ! curl -s --max-time 5 https://pro-search.eu.ngrok.io > /dev/null 2>&1; then
        log "⚠️  ProSearch Intelligence health check failed"
    fi
done
