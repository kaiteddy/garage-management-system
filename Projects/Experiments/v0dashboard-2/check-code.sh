#!/bin/bash

echo "🔍 Checking for WhatsApp verification code..."
echo "📱 Business Number: +447488896449"
echo "⏰ Check Time: $(date)"
echo ""

curl -s -X POST http://localhost:3002/api/check-verification-code | jq -r '
if .analysis.code_received then
  "✅ VERIFICATION CODE RECEIVED!"
else
  "❌ No verification code yet - rate limiting still active"
end,
"",
"📊 Messages in last 24h: " + (.results.total_messages_received | tostring),
"🔍 Verification codes found: " + (.results.verification_messages_found | tostring),
"",
if .analysis.likely_verification_codes | length > 0 then
  "🎯 POTENTIAL CODES FOUND:",
  (.analysis.likely_verification_codes[] | "   Code: " + (.potential_code // "N/A") + " from " + .from + " at " + .received_at)
else
  "💡 Recommendation: " + .analysis.recommendation
end'

echo ""
echo "🔄 Run this script again in a few hours to check for updates"
