#!/bin/bash
set -e

echo "🚀 Starting database refresh and import..."

# Clean up the database
echo "🧹 Cleaning up the database..."
tsx scripts/cleanup-db.ts

# Run the enhanced import
echo "📥 Starting enhanced import..."
tsx scripts/import-enhanced.ts

echo "✅ Refresh and import completed successfully!"
