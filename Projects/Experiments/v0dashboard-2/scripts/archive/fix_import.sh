#!/bin/bash
# Fix the import validation

# Replace the firstName line
sed -i '' "s/const firstName = record\.nameforename || ''/const firstName = record.nameforename || record.nametitle || 'Unknown'/" scripts/daily-ga4-import.ts

# Replace the validation line  
sed -i '' "s/if (!id || !firstName) {/if (!id || (!firstName \&\& !lastName \&\& !record.nametitle)) {/" scripts/daily-ga4-import.ts

echo "✅ Fixed validation logic"
