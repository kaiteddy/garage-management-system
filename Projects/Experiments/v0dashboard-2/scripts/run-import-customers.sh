#!/bin/bash

# Load environment variables from .env.local
set -a
source .env.local
set +a

# Check if file path is provided
if [ -z "$1" ]; then
  echo "Error: Please provide the path to the customers CSV file"
  echo "Usage: $0 <path-to-customers-csv>"
  exit 1
fi

# Run the TypeScript import script
echo "Starting customer import from $1..."
node --import tsx scripts/import-customers.ts "$1"

echo "Customer import complete!"
