#!/bin/bash

# Load environment variables from .env.local
set -a
source .env.local
set +a

# Run the TypeScript database initialization script
echo "Initializing database schema..."
npx tsx scripts/init-db.ts

echo "Database initialization complete!"
