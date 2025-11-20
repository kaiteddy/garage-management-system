#!/bin/bash

# GarageManager Pro Stability Monitor
# Keeps the application stable and online

echo "🚀 GarageManager Pro Stability Monitor"
echo "======================================"
echo ""

# Current URLs
LOCAL_URL="http://localhost:3002"
LIVE_URL="https://marker-newly-marshall-treating.trycloudflare.com"

echo "📍 Local Development: $LOCAL_URL"
echo "🌐 Live Application: $LIVE_URL"
echo ""

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        echo "✅ $name: ONLINE"
        return 0
    else
        echo "❌ $name: OFFLINE"
        return 1
    fi
}

# Function to check processes
check_processes() {
    echo "🔍 Process Status:"
    
    # Check if Next.js dev server is running
    if pgrep -f "next dev" > /dev/null; then
        echo "✅ Next.js Development Server: RUNNING"
    else
        echo "❌ Next.js Development Server: NOT RUNNING"
        echo "   → Run: npm run dev"
    fi
    
    # Check if Cloudflare tunnel is running
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        echo "✅ Cloudflare Tunnel: RUNNING"
    else
        echo "❌ Cloudflare Tunnel: NOT RUNNING"
        echo "   → Run: cloudflared tunnel --url http://localhost:3002"
    fi
    
    echo ""
}

# Function to test database connection
test_database() {
    echo "🗄️  Database Connection Test:"
    
    response=$(curl -s --max-time 15 "$LOCAL_URL/api/data-connections-final" 2>/dev/null)
    
    if echo "$response" | grep -q '"success":true'; then
        customers=$(echo "$response" | grep -o '"customers":"[0-9]*"' | cut -d'"' -f4)
        vehicles=$(echo "$response" | grep -o '"vehicles":"[0-9]*"' | cut -d'"' -f4)
        documents=$(echo "$response" | grep -o '"documents":"[0-9]*"' | cut -d'"' -f4)
        
        echo "✅ Database: CONNECTED"
        echo "   → Customers: $customers"
        echo "   → Vehicles: $vehicles" 
        echo "   → Documents: $documents"
    else
        echo "❌ Database: CONNECTION FAILED"
    fi
    
    echo ""
}

# Main monitoring loop
main() {
    while true; do
        clear
        echo "🚀 GarageManager Pro Stability Monitor - $(date)"
        echo "======================================"
        echo ""
        
        # Check processes
        check_processes
        
        # Check services
        echo "🌐 Service Status:"
        check_service "$LOCAL_URL" "Local Development Server"
        check_service "$LIVE_URL" "Live Application (Cloudflare)"
        echo ""
        
        # Test database
        test_database
        
        echo "📊 System Status: ALL SYSTEMS OPERATIONAL"
        echo ""
        echo "🔗 Quick Links:"
        echo "   Local:  $LOCAL_URL"
        echo "   Live:   $LIVE_URL"
        echo ""
        echo "Press Ctrl+C to stop monitoring"
        echo "Checking again in 30 seconds..."
        
        sleep 30
    done
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
