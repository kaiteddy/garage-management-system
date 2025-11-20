#!/bin/bash

echo "🔍 MOT Scan Progress Monitor"
echo "=========================="
echo "Starting monitoring at $(date)"
echo ""

# Initial status
echo "📊 Initial Status:"
curl -s http://localhost:3002/api/mot/status-check | jq '.status | {totalVehicles, vehiclesWithExpiryDates, stillNeedFixing, progressPercent, criticalMOTs}'
echo ""

# Monitor progress every 2 minutes
while true; do
    echo "⏰ Status at $(date):"
    
    # Get current status
    STATUS=$(curl -s http://localhost:3002/api/mot/status-check)
    
    if [ $? -eq 0 ]; then
        echo "$STATUS" | jq '.status | {
            progress: "\(.progressPercent)% complete",
            processed: .vehiclesWithExpiryDates,
            remaining: .stillNeedFixing,
            critical: .criticalMOTs.totalCritical
        }'
        
        # Check if we're done
        REMAINING=$(echo "$STATUS" | jq -r '.status.stillNeedFixing')
        if [ "$REMAINING" -eq 0 ]; then
            echo ""
            echo "🎉 SCAN COMPLETE! All vehicles processed."
            break
        fi
    else
        echo "❌ Error checking status"
    fi
    
    echo "---"
    sleep 120  # Wait 2 minutes
done

echo ""
echo "📈 Final Status:"
curl -s http://localhost:3002/api/mot/status-check | jq '.status'
echo ""
echo "🚨 Critical MOTs:"
curl -s http://localhost:3002/api/mot/critical-check | jq '.data.summary'
