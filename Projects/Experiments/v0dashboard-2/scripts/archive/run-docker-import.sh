#!/bin/bash

# 🐳 Docker Import Runner Script
# This script starts the Docker import process

echo "🐳 DOCKER IMPORT RUNNER"
echo "======================="
echo "⏰ Start Time: $(date)"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "💡 Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "💡 Please ensure your environment file exists"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Check if ProSearch folder exists
PROSEARCH_PATH="/Users/adamrutstein/Downloads/ProSearch Intelligence"
if [ ! -d "$PROSEARCH_PATH" ]; then
    echo "⚠️  ProSearch Intelligence folder not found at: $PROSEARCH_PATH"
    echo "💡 The container will still run, but ProSearch data won't be available"
else
    echo "✅ ProSearch Intelligence folder found"
fi

echo ""
echo "🚀 STARTING DOCKER IMPORT CONTAINER..."
echo "======================================"

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Build and start the container
docker-compose -f docker-compose.import.yml up --build --detach

echo ""
echo "🎉 DOCKER CONTAINER STARTED!"
echo "============================"
echo ""
echo "📊 Monitor the import process:"
echo "   🌐 Web Monitor: http://localhost:3004"
echo "   📋 Container Logs: docker logs garage-import-container -f"
echo "   🔍 Container Shell: docker exec -it garage-import-container bash"
echo ""
echo "🛑 Stop the container:"
echo "   docker-compose -f docker-compose.import.yml down"
echo ""
echo "🔄 Restart the import:"
echo "   docker-compose -f docker-compose.import.yml restart garage-import"
echo ""

# Show initial logs
echo "📋 INITIAL CONTAINER LOGS:"
echo "=========================="
sleep 3
docker logs garage-import-container --tail 20

echo ""
echo "✅ Docker import process is running!"
echo "💡 Check the web monitor at http://localhost:3004 for real-time updates"
