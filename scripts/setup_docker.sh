#!/bin/bash

# Setup script for Docker environment
# Creates necessary directories and sets permissions

echo "🚀 Setting up Docker environment for Garage Management System..."

# Create data directory if it doesn't exist
mkdir -p data
chmod 777 data
echo "✅ Created data directory with proper permissions"

# Create logs directory if it doesn't exist
mkdir -p logs
chmod 777 logs
echo "✅ Created logs directory with proper permissions"

# Build Docker image
echo "🔨 Building Docker image..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

echo "✅ Docker environment setup complete!"
echo "📋 Available endpoints:"
echo "   • Main Application: http://localhost:8002"
echo "   • Integrated Dashboard: http://localhost:8002/integrated"
echo "   • MOT Service API: http://localhost:8001/api"
