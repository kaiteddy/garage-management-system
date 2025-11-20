#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f "../.env.local" ]; then
  export $(grep -v '^#' ../.env.local | xargs)
fi

# Check if file path is provided
if [ -z "$1" ]; then
  echo "Error: Please provide the path to the Stock.csv file"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in .env.local"
  exit 1
fi

# Run the import script
echo "Starting stock import from $1..."
npx tsx import/import-stock.ts "$1"

echo "Stock import completed successfully!"
