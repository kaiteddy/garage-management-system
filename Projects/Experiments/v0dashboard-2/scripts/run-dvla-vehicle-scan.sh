#!/bin/bash

# DVLA Vehicle Scanner Launcher
# Comprehensive scan of all vehicles against DVLA API

echo "🚀 Starting DVLA Vehicle Scanner..."
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if DVLA API key is set
if [ -z "$DVLA_API_KEY" ]; then
    echo "⚠️  Warning: DVLA_API_KEY not found in environment"
    echo "   Loading from .env.local file..."
fi

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "📦 Installing tsx..."
    npm install -g tsx
fi

echo ""
echo "📋 This script will:"
echo "   • Scan ALL vehicles in your database"
echo "   • Query DVLA API for current vehicle data"
echo "   • Update MOT expiry dates"
echo "   • Populate MOT reminder system"
echo "   • Update vehicle details (make, model, etc.)"
echo ""

# Confirm before proceeding
read -p "🤔 Do you want to proceed? This may take a while and will use API credits. (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Scan cancelled"
    exit 0
fi

echo ""
echo "🔍 Starting comprehensive vehicle scan..."
echo "⏳ This may take several minutes depending on your vehicle count..."
echo ""

# Run the scan
tsx scripts/comprehensive-dvla-vehicle-scan.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DVLA vehicle scan completed successfully!"
    echo "✅ Your MOT reminder system is now fully populated"
    echo ""
    echo "📊 Next steps:"
    echo "   • Check the MOT Critical page in your dashboard"
    echo "   • Review updated vehicle data"
    echo "   • Set up automated reminders if needed"
    echo ""
else
    echo ""
    echo "❌ DVLA vehicle scan failed"
    echo "📋 Check the error messages above for details"
    echo ""
fi
