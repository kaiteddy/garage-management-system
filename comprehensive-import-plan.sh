#!/bin/bash

echo "🎯 Comprehensive Data Import Plan - ELI MOTORS LTD"
echo "================================================="
echo "📅 Fresh exports completed today - Ready for import"
echo ""

# Define the base path
BASE_PATH="/Users/adamrutstein/Library/CloudStorage/GoogleDrive-adam@elimotors.co.uk/My Drive/Data Exports"

echo "📁 Checking available export files..."
echo "===================================="

# Check for all expected files
FILES=(
    "Customers.csv"
    "Vehicles.csv" 
    "Documents.csv"
    "LineItems.csv"
    "Document_Extras.csv"
    "Receipts.csv"
)

AVAILABLE_FILES=()
MISSING_FILES=()

for file in "${FILES[@]}"; do
    if [ -f "$BASE_PATH/$file" ]; then
        SIZE=$(ls -lh "$BASE_PATH/$file" | awk '{print $5}')
        LINES=$(wc -l < "$BASE_PATH/$file" 2>/dev/null || echo "0")
        echo "✅ $file - Size: $SIZE, Lines: $LINES"
        AVAILABLE_FILES+=("$file")
    else
        echo "❌ $file - NOT FOUND"
        MISSING_FILES+=("$file")
    fi
done

echo ""
echo "📊 Import Statistics Preview:"
echo "============================"

if [ -f "$BASE_PATH/Customers.csv" ]; then
    CUSTOMER_COUNT=$(($(wc -l < "$BASE_PATH/Customers.csv") - 1))
    echo "👥 Customers: ~$CUSTOMER_COUNT records"
fi

if [ -f "$BASE_PATH/Vehicles.csv" ]; then
    VEHICLE_COUNT=$(($(wc -l < "$BASE_PATH/Vehicles.csv") - 1))
    echo "🚗 Vehicles: ~$VEHICLE_COUNT records"
fi

if [ -f "$BASE_PATH/Documents.csv" ]; then
    DOCUMENT_COUNT=$(($(wc -l < "$BASE_PATH/Documents.csv") - 1))
    echo "📄 Documents: ~$DOCUMENT_COUNT records"
fi

if [ -f "$BASE_PATH/LineItems.csv" ]; then
    LINEITEM_COUNT=$(($(wc -l < "$BASE_PATH/LineItems.csv") - 1))
    echo "📝 Line Items: ~$LINEITEM_COUNT records"
fi

if [ -f "$BASE_PATH/Document_Extras.csv" ]; then
    EXTRAS_COUNT=$(($(wc -l < "$BASE_PATH/Document_Extras.csv") - 1))
    echo "📋 Document Extras: ~$EXTRAS_COUNT records"
fi

if [ -f "$BASE_PATH/Receipts.csv" ]; then
    RECEIPTS_COUNT=$(($(wc -l < "$BASE_PATH/Receipts.csv") - 1))
    echo "🧾 Receipts: ~$RECEIPTS_COUNT records"
fi

echo ""
echo "🎯 Comprehensive Import Strategy:"
echo "================================="
echo ""

echo "Phase 1: 🧹 Clean Import Preparation"
echo "   1.1 Create database backup"
echo "   1.2 Clear existing data (with confirmation)"
echo "   1.3 Reset auto-increment sequences"
echo "   1.4 Verify clean state"
echo ""

echo "Phase 2: 👥 Core Data Import (Foundation)"
echo "   2.1 Import Customers (~$CUSTOMER_COUNT records)"
echo "   2.2 Import Vehicles (~$VEHICLE_COUNT records)"
echo "   2.3 Verify customer-vehicle relationships"
echo ""

echo "Phase 3: 📄 Document System Import (Comprehensive)"
echo "   3.1 Import Documents (~$DOCUMENT_COUNT records)"
echo "   3.2 Import Line Items (~$LINEITEM_COUNT records)"
echo "   3.3 Import Document Extras (~$EXTRAS_COUNT records)"
echo "   3.4 Import Receipts (~$RECEIPTS_COUNT records)"
echo "   3.5 Verify document relationships"
echo ""

echo "Phase 4: 🔍 Data Enhancement & Verification"
echo "   4.1 DVLA vehicle data updates"
echo "   4.2 MOT history integration"
echo "   4.3 Customer data cleaning"
echo "   4.4 Phone number validation"
echo ""

echo "Phase 5: ✅ Final Verification & Optimization"
echo "   5.1 Data integrity checks"
echo "   5.2 Performance optimization"
echo "   5.3 Index creation"
echo "   5.4 Final statistics report"
echo ""

echo "🚀 Import Execution Commands:"
echo "============================="
echo ""

echo "# Phase 1: Clean Import Preparation"
echo "curl -X POST 'https://garage-manager.eu.ngrok.io/api/system/clean-import' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"phase\": \"backup\"}'"
echo ""

echo "# Phase 2: Core Data Import"
echo "curl -X POST 'https://garage-manager.eu.ngrok.io/api/mot/import-from-original-source'"
echo ""

echo "# Phase 3: Document System Import"
echo "curl -X POST 'https://garage-manager.eu.ngrok.io/api/documents/import-complete-history'"
echo ""

echo "# Phase 4: Data Enhancement"
echo "curl -X POST 'https://garage-manager.eu.ngrok.io/api/bulk-processing/execute-full-import' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"phase\": \"dvla\", \"batchSize\": 100}'"
echo ""

echo "# Phase 5: Final Verification"
echo "curl -X POST 'https://garage-manager.eu.ngrok.io/api/system/clean-import' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"phase\": \"verify\"}'"
echo ""

echo "⚠️  Important Notes:"
echo "==================="
echo "• All sample/test data will be completely removed"
echo "• Expecting ~7,000 customer records as mentioned"
echo "• Complete document history with line items"
echo "• Fresh exports from today ensure data accuracy"
echo "• Process will take significant time due to data volume"
echo "• Each phase should be completed before proceeding"
echo ""

echo "📞 Ready to proceed with comprehensive import?"
echo "=============================================="
echo "This will import ALL your business data from the fresh exports."
echo "Estimated total time: 2-4 hours depending on data volume."
echo ""

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo "❌ Cannot proceed - Missing files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "Please ensure all export files are present before starting import."
else
    echo "✅ All required files are present and ready for import!"
    echo ""
    echo "🎯 Next step: Execute Phase 1 (Clean Import Preparation)"
fi
