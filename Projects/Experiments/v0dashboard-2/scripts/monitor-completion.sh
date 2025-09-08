#!/bin/bash

echo "🏁 FINAL COMPLETION MONITOR - MOT Scan to 100%"
echo "=============================================="
echo "Starting completion monitoring at $(date)"
echo ""

# Get starting status
echo "📊 Starting Status:"
START_STATUS=$(curl -s http://localhost:3002/api/mot/status-check)
echo "$START_STATUS" | jq '.status | {
    progressPercent,
    vehiclesWithExpiryDates,
    stillNeedFixing,
    criticalMOTs: .criticalMOTs.totalCritical
}'
echo ""

START_PROCESSED=$(echo "$START_STATUS" | jq -r '.status.vehiclesWithExpiryDates')
START_CRITICAL=$(echo "$START_STATUS" | jq -r '.status.criticalMOTs.totalCritical')
START_REMAINING=$(echo "$START_STATUS" | jq -r '.status.stillNeedFixing')
START_PROGRESS=$(echo "$START_STATUS" | jq -r '.status.progressPercent')

echo "🎯 Goal: Process remaining ${START_REMAINING} vehicles to reach 100%"
echo "📈 Starting from: ${START_PROGRESS}% complete"
echo ""

# Monitor every 10 seconds for rapid updates
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
        PROGRESS_DELTA=$((PROGRESS - START_PROGRESS))
        
        echo "  📈 Progress: ${PROGRESS}% (+${PROGRESS_DELTA}% from start)"
        echo "  🔢 Processed: ${CURRENT_PROCESSED} (+${PROCESSED_DELTA} since start)"
        echo "  🚨 Critical: ${CURRENT_CRITICAL} (+${CRITICAL_DELTA} new critical)"
        echo "  ⏳ Remaining: ${REMAINING}"
        
        # Check if we're done
        if [ "$REMAINING" -eq 0 ] || [ "$PROGRESS" -eq 100 ]; then
            echo ""
            echo "🎉🎉🎉 100% COMPLETION ACHIEVED! 🎉🎉🎉"
            echo "🏆 ALL VEHICLES SCANNED SUCCESSFULLY!"
            echo ""
            echo "🎯 Final Results:"
            echo "$CURRENT_STATUS" | jq '.status'
            echo ""
            echo "🚨 Final Critical MOT Summary:"
            curl -s http://localhost:3002/api/mot/critical-check | jq '.data.summary'
            echo ""
            echo "🏁 MISSION ACCOMPLISHED - 100% VEHICLE SCAN COMPLETE!"
            break
        fi
        
        # Show processing rate if making progress
        if [ "$PROCESSED_DELTA" -gt 0 ]; then
            RATE_PER_10SEC=$((PROCESSED_DELTA))
            if [ "$RATE_PER_10SEC" -gt 0 ]; then
                RATE_PER_MINUTE=$((RATE_PER_10SEC * 6))
                if [ "$REMAINING" -gt 0 ] && [ "$RATE_PER_MINUTE" -gt 0 ]; then
                    ETA_MINUTES=$((REMAINING / RATE_PER_MINUTE))
                    echo "  ⏱️  Processing rate: ~${RATE_PER_MINUTE} vehicles/min"
                    echo "  🕐 ETA to completion: ~${ETA_MINUTES} minutes"
                fi
            fi
        fi
        
    else
        echo "❌ Error checking status"
    fi
    
    echo "  ---"
    sleep 10  # Check every 10 seconds
done
