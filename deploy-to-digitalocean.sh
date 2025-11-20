#!/bin/bash

# Deploy GarageManager Pro to DigitalOcean App Platform
# This script helps deploy the application using the DigitalOcean CLI

echo "🚀 Deploying GarageManager Pro to DigitalOcean App Platform"
echo "============================================================"

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ DigitalOcean CLI (doctl) is not installed"
    echo "   Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list &> /dev/null; then
    echo "❌ Not authenticated with DigitalOcean"
    echo "   Run: doctl auth init"
    exit 1
fi

echo "✅ DigitalOcean CLI is ready"

# Check if app.yaml exists
if [ ! -f ".do/app.yaml" ]; then
    echo "❌ .do/app.yaml not found"
    exit 1
fi

echo "✅ App configuration found"

# Deploy the application
echo "🚀 Creating DigitalOcean App..."
doctl apps create .do/app.yaml

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "   1. Check deployment status: doctl apps list"
echo "   2. View app details: doctl apps get <app-id>"
echo "   3. View logs: doctl apps logs <app-id>"
echo ""
echo "🌐 Your app will be available at the URL provided by DigitalOcean"
echo "   It may take a few minutes to build and deploy."
