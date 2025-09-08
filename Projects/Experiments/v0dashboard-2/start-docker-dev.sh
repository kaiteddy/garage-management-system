#!/bin/bash

echo "🐳 Starting Garage Manager in Docker Development Mode..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your environment variables."
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start the development container
echo "🔨 Building and starting development container..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Docker development environment started!"
echo "🌐 Access the application at: http://localhost:3001"
