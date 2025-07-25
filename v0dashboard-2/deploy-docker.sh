#!/bin/bash

# Deploy GarageManager Pro using Docker to DigitalOcean Container Registry
# This script builds and deploys without requiring GitHub

set -e  # Exit on any error

echo "🐳 Building and Deploying GarageManager Pro via Docker"
echo "====================================================="

# Configuration
REGISTRY="registry.digitalocean.com/kaisark"
IMAGE_NAME="garage-manager-pro"
TAG="${1:-latest}"  # Allow tag override via first argument
FULL_IMAGE_NAME="$REGISTRY/$IMAGE_NAME:$TAG"

echo "📋 Deployment Configuration:"
echo "   Registry: $REGISTRY"
echo "   Image: $IMAGE_NAME"
echo "   Tag: $TAG"
echo "   Full Image Name: $FULL_IMAGE_NAME"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if doctl is installed and authenticated
if ! command -v doctl &> /dev/null; then
    echo "❌ DigitalOcean CLI (doctl) is not installed"
    echo "   Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean"
    echo "   Run: doctl auth init"
    exit 1
fi

echo "✅ Docker and DigitalOcean CLI are ready"

# Validate registry exists
echo "🔍 Validating DigitalOcean Container Registry..."
if ! doctl registry get kaisark > /dev/null 2>&1; then
    echo "❌ Registry 'kaisark' not found or not accessible"
    echo "   Available registries:"
    doctl registry list
    exit 1
fi

# Login to DigitalOcean Container Registry
echo "🔐 Logging into DigitalOcean Container Registry..."
if ! doctl registry login; then
    echo "❌ Failed to login to DigitalOcean Container Registry"
    exit 1
fi

# Build the Docker image
echo "🏗️  Building Docker image..."
docker build -t $FULL_IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

# Push to DigitalOcean Container Registry
echo "📤 Pushing image to DigitalOcean Container Registry..."
docker push $FULL_IMAGE_NAME

if [ $? -ne 0 ]; then
    echo "❌ Docker push failed"
    exit 1
fi

echo "✅ Image pushed successfully to: $FULL_IMAGE_NAME"

# Create .dockerignore if it doesn't exist
if [ ! -f ".dockerignore" ]; then
    echo "📝 Creating .dockerignore file..."
    cat > .dockerignore << EOF
node_modules
.next
.git
.gitignore
README.md
Dockerfile
.dockerignore
npm-debug.log
.nyc_output
.coverage
.env.local
.env.development.local
.env.test.local
.env.production.local
*.zip
.DS_Store
EOF
fi

echo ""
# Clean up test image
echo "🧹 Cleaning up test images..."
docker rmi test-build 2>/dev/null || true

echo ""
echo "🎉 Deployment Complete!"
echo "======================================"
echo "Image: $FULL_IMAGE_NAME"
echo "Registry: $REGISTRY"
echo "Build completed at: $(date)"
echo ""
echo "🚀 Next steps:"
echo "1. Create a DigitalOcean App Platform service"
echo "2. Configure it to use this container image: $FULL_IMAGE_NAME"
echo "3. Set up environment variables (DATABASE_URL, etc.)"
echo "4. Configure health checks on /api/health"
echo ""
echo "📊 Useful commands:"
echo "• Test locally: docker run -p 3000:3000 -e DATABASE_URL=\$DATABASE_URL $FULL_IMAGE_NAME"
echo "• View registry: doctl registry repository list-v2 kaisark"
echo "• Deploy new version: ./deploy-docker.sh v1.1"
echo ""
echo "🔗 DigitalOcean App Platform: https://cloud.digitalocean.com/apps"
