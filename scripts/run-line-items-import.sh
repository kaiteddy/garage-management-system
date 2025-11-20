#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f "../.env.local" ]; then
  export $(grep -v '^#' ../.env.local | xargs)
fi

# Check if file path is provided
if [ -z "$1" ]; then
  echo "Error: Please provide the path to the LineItems.csv file"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in .env.local"
  exit 1
fi

# Run the import script
echo "Starting line items import from $1..."
npx tsx import/import-line-items.ts "$1"

echo "Line items import completed successfully!"
