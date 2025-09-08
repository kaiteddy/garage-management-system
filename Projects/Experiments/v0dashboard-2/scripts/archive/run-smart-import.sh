#!/bin/bash

echo "🚀 Starting Smart Merge Import..."
echo "📁 Using CSV files from ./data directory"
echo "🔗 Connecting to Neon database..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "💡 Please create .env.local with your DATABASE_URL"
    exit 1
fi

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "❌ Error: data directory not found"
    echo "💡 Please ensure your CSV files are in the ./data directory"
    exit 1
fi

# List available CSV files
echo "📋 Available CSV files:"
ls -la data/*.csv

echo ""
echo "🔄 Running smart merge import..."

# Run the TypeScript import script
npx ts-node scripts/smart-merge-import.ts

echo ""
echo "✅ Import completed! Check the results above."
echo "📄 Detailed results saved to: data/smart-merge-import-results.json"
