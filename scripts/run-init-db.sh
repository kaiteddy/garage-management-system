#!/bin/bash

# Exit on error
set -e

# Load environment variables from .env.local if it exists
if [ -f "../.env.local" ]; then
  export $(grep -v '^#' ../.env.local | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set in .env.local"
  exit 1
fi

# Run the TypeScript initialization script
echo "Initializing database..."
npx tsx scripts/init-database.ts

echo "Database initialization complete!"
