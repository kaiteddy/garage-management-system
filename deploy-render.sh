#!/bin/bash

echo "🚀 Deploying GarageManager Pro to Render"
echo "========================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit - GarageManager Pro"
fi

# Check if we have a remote
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "⚠️  No Git remote found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/garagemanager-pro.git"
    echo "   git push -u origin main"
    echo ""
    echo "📋 Then deploy to Render:"
    echo "   1. Go to https://dashboard.render.com/"
    echo "   2. Click 'New' → 'Web Service'"
    echo "   3. Connect your GitHub repository"
    echo "   4. Use the following settings:"
    echo "      - Environment: Docker"
    echo "      - Dockerfile Path: ./Dockerfile"
    echo "      - Health Check Path: /api/health"
    echo "   5. Add environment variables (see render.yaml for reference)"
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Update GarageManager Pro - $(date)"
fi

echo "📤 Pushing to repository..."
git push

echo ""
echo "✅ Code pushed to repository!"
echo ""
echo "🔗 Next steps:"
echo "   1. Go to https://dashboard.render.com/"
echo "   2. Your service should auto-deploy if connected"
echo "   3. Or create a new Web Service with these settings:"
echo "      - Repository: $(git remote get-url origin)"
echo "      - Environment: Docker"
echo "      - Dockerfile Path: ./Dockerfile"
echo "      - Health Check Path: /api/health"
echo ""
echo "📋 Environment Variables to set in Render:"
echo "   DATABASE_URL=your_neon_database_url"
echo "   MOT_HISTORY_API_KEY=your_mot_api_key"
echo "   TAPI_CLIENT_ID=your_tapi_client_id"
echo "   TAPI_CLIENT_SECRET=your_tapi_client_secret"
echo "   TWILIO_ACCOUNT_SID=your_twilio_sid"
echo "   TWILIO_AUTH_TOKEN=your_twilio_token"
echo "   TWILIO_PHONE_NUMBER=your_twilio_phone"
echo "   TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp"
echo "   MINIMAX_API_KEY=your_minimax_key"
echo "   NEXTAUTH_SECRET=your_nextauth_secret"
echo ""
echo "🎉 Deployment script complete!"
