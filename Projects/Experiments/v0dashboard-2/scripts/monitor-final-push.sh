#!/bin/bash

echo "🏁 FINAL PUSH TO 100% - High-Speed Scan Monitor"
echo "=============================================="
echo "Starting final push monitoring at $(date)"
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

echo "🎯 Goal: Process remaining ${START_REMAINING} vehicles to reach 100%"
echo ""

# Monitor every 15 seconds for rapid updates
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
        REMAINING_DELTA=$((START_REMAINING - REMAINING))
        
        echo "  📈 Progress: ${PROGRESS}% complete"
        echo "  🔢 Processed: ${CURRENT_PROCESSED} (+${PROCESSED_DELTA} since start)"
        echo "  🚨 Critical: ${CURRENT_CRITICAL} (+${CRITICAL_DELTA} new critical)"
        echo "  ⏳ Remaining: ${REMAINING} (-${REMAINING_DELTA} processed)"
        
        # Check if we're done
        if [ "$REMAINING" -eq 0 ]; then
            echo ""
            echo "🎉🎉🎉 100% COMPLETION ACHIEVED! 🎉🎉🎉"
            echo "🏆 ALL VEHICLES SCANNED SUCCESSFULLY!"
            echo ""
            echo "🎯 Final Results:"
            echo "$CURRENT_STATUS" | jq '.status'
            echo ""
            echo "🚨 Final Critical MOT Count:"
            curl -s http://localhost:3002/api/mot/critical-check | jq '.data.summary'
            break
        fi
        
        # Show estimated completion time
        if [ "$PROCESSED_DELTA" -gt 0 ]; then
            RATE_PER_15SEC=$((PROCESSED_DELTA))
            if [ "$RATE_PER_15SEC" -gt 0 ]; then
                ETA_CYCLES=$((REMAINING / RATE_PER_15SEC))
                ETA_MINUTES=$((ETA_CYCLES / 4))  # 15 seconds = 1/4 minute
                echo "  ⏱️  ETA: ~${ETA_MINUTES} minutes (at current rate)"
            fi
        fi
        
    else
        echo "❌ Error checking status"
    fi
    
    echo "  ---"
    sleep 15  # Check every 15 seconds for rapid updates
done

echo ""
echo "🏁 MISSION ACCOMPLISHED - 100% VEHICLE SCAN COMPLETE!"
