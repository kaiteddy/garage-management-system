#!/bin/bash

echo "🚀 HIGH-SPEED Final Scan Monitor"
echo "================================"
echo "Starting final scan monitoring at $(date)"
echo ""

# Get starting status
echo "📊 Starting Status:"
START_STATUS=$(curl -s http://localhost:3002/api/mot/status-check)
echo "$START_STATUS" | jq '.status | {
    totalVehicles,
    vehiclesWithExpiryDates,
    stillNeedFixing,
    progressPercent,
    criticalMOTs: .criticalMOTs.totalCritical
}'
echo ""

START_PROCESSED=$(echo "$START_STATUS" | jq -r '.status.vehiclesWithExpiryDates')
START_CRITICAL=$(echo "$START_STATUS" | jq -r '.status.criticalMOTs.totalCritical')

# Monitor every 30 seconds for faster updates
while true; do
    echo "⚡ Status at $(date):"
    
    CURRENT_STATUS=$(curl -s http://localhost:3002/api/mot/status-check)
    
    if [ $? -eq 0 ]; then
        CURRENT_PROCESSED=$(echo "$CURRENT_STATUS" | jq -r '.status.vehiclesWithExpiryDates')
        CURRENT_CRITICAL=$(echo "$CURRENT_STATUS" | jq -r '.status.criticalMOTs.totalCritical')
        REMAINING=$(echo "$CURRENT_STATUS" | jq -r '.status.stillNeedFixing')
        PROGRESS=$(echo "$CURRENT_STATUS" | jq -r '.status.progressPercent')
        
        # Calculate deltas
        PROCESSED_DELTA=$((CURRENT_PROCESSED - START_PROCESSED))
        CRITICAL_DELTA=$((CURRENT_CRITICAL - START_CRITICAL))
        
        echo "  📈 Progress: ${PROGRESS}% complete"
        echo "  🔢 Processed: ${CURRENT_PROCESSED} (+${PROCESSED_DELTA} since start)"
        echo "  🚨 Critical: ${CURRENT_CRITICAL} (+${CRITICAL_DELTA} new critical)"
        echo "  ⏳ Remaining: ${REMAINING}"
        
        # Check if we're done
        if [ "$REMAINING" -eq 0 ]; then
            echo ""
            echo "🎉 HIGH-SPEED SCAN COMPLETE!"
            echo "🎯 Final Results:"
            echo "$CURRENT_STATUS" | jq '.status'
            break
        fi
    else
        echo "❌ Error checking status"
    fi
    
    echo "  ---"
    sleep 30  # Check every 30 seconds
done

echo ""
echo "🏁 FINAL CRITICAL MOT STATUS:"
curl -s http://localhost:3002/api/mot/critical-check | jq '.data.summary'
