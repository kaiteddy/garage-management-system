#!/bin/bash

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Set the database name
DB_NAME="v0dashboard"

# Connect to postgres database to drop and recreate our database
psql postgres -c "DROP DATABASE IF EXISTS $DB_NAME"
psql postgres -c "CREATE DATABASE $DB_NAME"

# Set the database URL for the import script
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/$DB_NAME"

# Create the schema
echo "Creating database schema..."
psql $DB_NAME -f scripts/fix-schema-v2.sql

# Install TypeScript if not already installed
if ! command -v tsc &> /dev/null; then
  echo "Installing TypeScript..."
  npm install -g typescript
fi

# Install tsx for running TypeScript directly
if ! command -v tsx &> /dev/null; then
  echo "Installing tsx..."
  npm install -g tsx
fi

# Install project dependencies if not already installed
if [ ! -d "node_modules" ]; then
  echo "Installing project dependencies..."
  npm install
fi

# Run the import script with local tsx
echo "Starting data import..."
npx tsx scripts/import-real-data.ts
