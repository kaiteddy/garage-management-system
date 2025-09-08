#!/bin/bash

# Check GarageManager Pro deployment status on DigitalOcean App Platform

set -e

echo "📊 GarageManager Pro Deployment Status"
echo "======================================"

APP_ID="264f2b11-a7ce-4830-b04b-a6714493d277"

# Check if doctl is available
if ! command -v doctl &> /dev/null; then
    echo "❌ DigitalOcean CLI (doctl) is not installed"
    exit 1
fi

echo "🔍 Checking app status..."
doctl apps get $APP_ID

echo ""
echo "📋 Recent deployments:"
doctl apps list-deployments $APP_ID

echo ""
echo "🔗 Useful commands:"
echo "• View logs: doctl apps logs $APP_ID --follow"
echo "• App dashboard: https://cloud.digitalocean.com/apps/$APP_ID"
echo "• Registry: doctl registry repository list-v2 kaisark"

echo ""
echo "🐳 Docker images in registry:"
doctl registry repository list-tags kaisark/garage-manager-pro
