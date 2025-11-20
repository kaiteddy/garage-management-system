#!/bin/bash

echo "🎯 Live Import Progress Monitor - ELI MOTORS LTD"
echo "==============================================="
echo ""

while true; do
    echo "⏰ $(date '+%H:%M:%S') - Checking import progress..."
    
    # Get current database counts
    RESULT=$(curl -s "https://garage-manager.eu.ngrok.io/api/import-status-check" 2>/dev/null | jq -r '.importStatus | "\(.customers.count) customers, \(.vehicles.count) vehicles, \(.documents.count) documents"' 2>/dev/null || echo "checking...")
    
    echo "📊 Database: $RESULT"
    
    # Show recent application logs (last few lines)
    echo "📝 Recent Progress:"
    echo "   (Check application terminal for detailed progress)"
    
    echo ""
    echo "⏳ Next check in 30 seconds... (Ctrl+C to stop)"
    echo "=================================================="
    echo ""
    
    sleep 30
done
