#!/bin/bash

# Database Cleanup Script
# This script completely empties the current database

echo "🧹 Database Cleanup Tool"
echo "========================"

# Export environment variables (using the same setup as other scripts)
export DATABASE_URL=postgres://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
export DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Show warning
echo "🚨 WARNING: This will COMPLETELY EMPTY the database!"
echo "   Database: neondb (Neon Cloud)"
echo "   All tables, data, sequences, views, and functions will be deleted"
echo "   This action CANNOT be undone!"
echo ""

# Ask for confirmation
read -p "Are you absolutely sure you want to proceed? (type 'YES' to confirm): " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo ""
echo "🚀 Starting database cleanup..."

# Run the cleanup script with force flag
npx tsx scripts/empty-database.ts --force

echo ""
echo "✅ Database cleanup completed!"
echo "   The database is now completely empty and ready for fresh data."
