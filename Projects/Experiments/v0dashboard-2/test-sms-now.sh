#!/bin/bash

echo "🧪 Testing SMS Communication System - REAL TEST"
echo "=============================================="

# Test SMS directly
echo "📱 Sending SMS to +447950250970..."

curl -X POST http://localhost:3000/api/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+447950250970",
    "message": "🧪 REAL TEST from ELI MOTORS LTD - Your SMS communication system is working perfectly! This is a live test message.",
    "dryRun": false
  }' | jq .

echo ""
echo "📊 Check your phone for the SMS message!"
echo ""
echo "🎯 If SMS works, your system is ready for:"
echo "   • MOT reminders via SMS"
echo "   • Service notifications via SMS"  
echo "   • Customer communication via SMS"
echo ""
echo "📱 WhatsApp will work once business registration is approved."
