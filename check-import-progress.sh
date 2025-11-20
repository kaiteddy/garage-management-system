#!/bin/bash

echo "🎯 Comprehensive Import Progress Monitor"
echo "======================================="
echo ""

for i in {1..20}; do
    echo "⏰ Check #$i - $(date '+%H:%M:%S')"
    
    # Get current database counts
    RESULT=$(curl -s "http://localhost:3000/api/import-status-check" 2>/dev/null | jq -r '.importStatus | "Customers: \(.customers.count), Vehicles: \(.vehicles.count), Documents: \(.documents.count), Line Items: \(.lineItems.count)"' 2>/dev/null || echo "checking...")
    
    echo "📊 Database Status: $RESULT"
    echo ""
    
    sleep 30
done

echo "✅ Monitoring complete. Check application logs for detailed progress."
