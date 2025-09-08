#!/bin/bash

# Deploy GarageManager Pro to DigitalOcean App Platform using Docker container
# This script creates or updates the App Platform service

set -e  # Exit on any error

echo "🚀 Deploying GarageManager Pro to DigitalOcean App Platform"
echo "=========================================================="

# Configuration
APP_NAME="garage-manager-pro"
CONFIG_FILE=".do/app.yaml"

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

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ App Platform configuration file not found: $CONFIG_FILE"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Check if app already exists
echo "🔍 Checking if app '$APP_NAME' already exists..."
if doctl apps list --format Name --no-header | grep -q "^$APP_NAME$"; then
    echo "📝 App '$APP_NAME' exists. Updating..."
    
    # Get the app ID
    APP_ID=$(doctl apps list --format ID,Name --no-header | grep "$APP_NAME" | awk '{print $1}')
    
    # Update the existing app
    echo "🔄 Updating app with ID: $APP_ID"
    doctl apps update "$APP_ID" --spec "$CONFIG_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ App updated successfully!"
        echo "🔗 App URL: https://cloud.digitalocean.com/apps/$APP_ID"
    else
        echo "❌ Failed to update app"
        exit 1
    fi
else
    echo "🆕 App '$APP_NAME' doesn't exist. Creating new app..."
    
    # Create new app
    doctl apps create --spec "$CONFIG_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ App created successfully!"
        
        # Get the new app ID
        APP_ID=$(doctl apps list --format ID,Name --no-header | grep "$APP_NAME" | awk '{print $1}')
        echo "🔗 App URL: https://cloud.digitalocean.com/apps/$APP_ID"
    else
        echo "❌ Failed to create app"
        exit 1
    fi
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================================"
echo "App Name: $APP_NAME"
echo "Config: $CONFIG_FILE"
echo ""
echo "📊 Useful commands:"
echo "• Check app status: doctl apps get $APP_ID"
echo "• View app logs: doctl apps logs $APP_ID"
echo "• List apps: doctl apps list"
echo ""
echo "🔗 DigitalOcean Apps Dashboard: https://cloud.digitalocean.com/apps"
echo ""
echo "⏳ Note: It may take a few minutes for the app to fully deploy and become available."
