#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f "../.env.local" ]; then
  export $(grep -v '^#' ../.env.local | xargs)
fi

# Check if DVLA_API_KEY is set
if [ -z "$DVLA_API_KEY" ]; then
  echo "Error: DVLA_API_KEY is not set in .env.local"
  exit 1
fi

# Run the update script
echo "Starting DVLA vehicle data update..."
npx tsx update-vehicles-dvla.ts

echo "DVLA update completed successfully!"
