#!/bin/bash

# Export environment variables
export DATABASE_URL=postgresql://neondb_owner:npg_WRqMTuEo65tQ@ep-snowy-truth-abtxy4yd-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Check if input files are provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <vehicles_csv_file> [documents_csv_file]"
  exit 1
fi

# Run the full import script
npx tsx scripts/full-import.ts "$1" "$2"
