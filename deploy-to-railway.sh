#!/bin/bash

echo "🚀 GarageManager Pro - Railway Deployment Script"
echo "================================================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run:"
    echo "   railway login"
    exit 1
fi

echo "✅ Railway CLI is ready"
echo ""

# Initialize Railway project if not already done
if [ ! -f "railway.toml" ]; then
    echo "🔧 Initializing Railway project..."
    railway init
else
    echo "✅ Railway project already initialized"
fi

echo ""
echo "🔧 Setting up environment variables..."

# Set essential environment variables
railway variables set NODE_ENV=production
railway variables set NEXT_PUBLIC_APP_URL=https://garage-manager.railway.app

# Database variables (will be set when PostgreSQL service is added)
echo "📋 Database variables will be set when PostgreSQL service is added"

# API Keys (these need to be set manually with actual values)
echo "⚠️  Please set these environment variables manually in Railway dashboard:"
echo "   - DATABASE_URL (from PostgreSQL service)"
echo "   - DVSA_API_KEY"
echo "   - MOT_HISTORY_API_KEY"
echo "   - TWILIO_ACCOUNT_SID"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - TWILIO_PHONE_NUMBER"
echo "   - TWILIO_WHATSAPP_NUMBER"
echo "   - WHATSAPP_BUSINESS_ACCOUNT_ID"
echo "   - WHATSAPP_ACCESS_TOKEN"
echo "   - WHATSAPP_PHONE_NUMBER_ID"
echo "   - WHATSAPP_WEBHOOK_VERIFY_TOKEN"
echo "   - MINIMAX_API_KEY"

echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment initiated!"
echo "🌐 Your application will be available at: https://garage-manager.railway.app"
echo ""
echo "📋 Next steps:"
echo "1. Add PostgreSQL service in Railway dashboard"
echo "2. Set environment variables in Railway dashboard"
echo "3. Update Twilio webhooks to point to Railway URL"
echo "4. Test the application functionality"
