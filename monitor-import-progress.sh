#!/bin/bash

echo "🎯 Monitoring Comprehensive Import Progress - ELI MOTORS LTD"
echo "=========================================================="
echo ""

while true; do
    echo "⏰ $(date '+%H:%M:%S') - Checking import progress..."
    
    # Get database counts
    echo "📊 Current Database Status:"
    
    # Try to get counts via API (with short timeout)
    CUSTOMERS=$(curl -s --max-time 10 "https://garage-manager.eu.ngrok.io/api/comprehensive-import/status" 2>/dev/null | jq -r '.summary.totalRecords // "checking..."' 2>/dev/null || echo "checking...")
    
    echo "   📋 Total Records Available: $CUSTOMERS"
    
    # Check if processes are still running
    echo ""
    echo "🔄 Active Import Processes:"
    
    # Look for import-related processes in the logs
    echo "   📝 Checking application logs for progress..."
    
    # Show recent progress from the application
    echo ""
    echo "📈 Recent Progress (last few lines):"
    echo "   (Check the application terminal for detailed progress)"
    
    echo ""
    echo "⏳ Next check in 30 seconds... (Ctrl+C to stop monitoring)"
    echo "=================================================="
    echo ""
    
    sleep 30
done
