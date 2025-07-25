#!/bin/bash

# Render Build Script for GarageManager Pro
# This script optimizes the build process for Render deployment

echo "🏗️  Starting Render build process..."

# Set Node.js memory limit to prevent OOM errors
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean any existing build artifacts
echo "🧹 Cleaning previous builds..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies with clean cache
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Build the application
echo "🔨 Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"

# Verify build output
if [ -d ".next" ]; then
    echo "✅ .next directory created"
    echo "📊 Build size:"
    du -sh .next
else
    echo "❌ Build failed - .next directory not found"
    exit 1
fi

# Check for critical files
if [ -f ".next/standalone/server.js" ]; then
    echo "✅ Standalone server.js found"
elif [ -f "package.json" ] && grep -q '"start"' package.json; then
    echo "✅ Start script found in package.json"
else
    echo "⚠️  No start method found - this may cause deployment issues"
fi

echo "🎉 Build preparation complete!"
