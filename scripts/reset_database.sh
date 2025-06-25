#!/bin/bash

# Reset database script
# Use this script to completely reset the database when needed

echo "⚠️ This will reset the entire database. All data will be lost."
echo "Are you sure you want to continue? (y/n)"

read -r confirm
if [[ $confirm != "y" ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "🗑️ Removing old database..."

# Check if running in Docker
if [ -f "/app/data/garage.db" ]; then
    # Running in Docker
    rm -f /app/data/garage.db
else
    # Running locally
    rm -f data/garage.db
fi

echo "✅ Database removed successfully"

# Re-initialize database
echo "🚀 Re-initializing database..."

# Check if running in Docker
if [ -f "/app/db_init.py" ]; then
    # Running in Docker
    python /app/db_init.py
else
    # Running locally
    python src/db_init.py
fi

echo "✅ Database reset complete!"
