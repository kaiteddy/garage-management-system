#!/bin/bash

# Database Integrity Check Runner
# This script runs comprehensive database integrity verification

echo "🔍 Database Integrity Verification Tool"
echo "========================================"

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

# Check what type of check to run
case "${1:-full}" in
    "quick"|"q")
        echo "🚀 Running Quick Health Check..."
        npx tsx scripts/quick-db-health.ts
        ;;
    "full"|"f"|"")
        echo "🚀 Running Full Integrity Check..."
        npx tsx scripts/verify-database-integrity.ts
        ;;
    "help"|"h")
        echo "Usage: $0 [quick|full|help]"
        echo ""
        echo "Options:"
        echo "  quick, q    - Run quick health check (faster)"
        echo "  full, f     - Run comprehensive integrity check (default)"
        echo "  help, h     - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0          # Run full check"
        echo "  $0 quick    # Run quick check"
        echo "  $0 full     # Run full check"
        ;;
    *)
        echo "❌ Unknown option: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
