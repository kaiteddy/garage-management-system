#!/bin/bash

# Render API Deployment Script for GarageManager Pro
RENDER_API_KEY="rnd_0Dhd8WtfwLN2LCTvMQNEGij7PQC9"
GITHUB_REPO="kaiteddy/v0dashboard"
SERVICE_NAME="garagemanager-pro"
OWNER_ID="tea-d213eb6mcj7s73ed03u0"

echo "🚀 Deploying GarageManager Pro to Render via API"
echo "================================================"

# Create the service payload
SERVICE_PAYLOAD=$(cat <<EOF
{
  "type": "web_service",
  "name": "$SERVICE_NAME",
  "ownerId": "$OWNER_ID",
  "serviceDetails": {
    "runtime": "docker",
    "repo": "$GITHUB_REPO",
    "branch": "render-deployment",
    "buildFilter": {
      "paths": [],
      "ignoredPaths": []
    },
    "rootDir": "",
    "plan": "starter",
    "region": "oregon",
    "buildCommand": "",
    "startCommand": "",
    "dockerfilePath": "./Dockerfile",
    "dockerContext": "./",
    "healthCheckPath": "/api/health",
    "publishPath": "",
    "pullRequestPreviewsEnabled": "yes",
    "numInstances": 1,
    "envVars": [
      {
        "key": "NODE_ENV",
        "value": "production"
      },
      {
        "key": "BUSINESS_NAME",
        "value": "ELI MOTORS LTD"
      },
      {
        "key": "BUSINESS_TAGLINE",
        "value": "Professional Vehicle Services"
      },
      {
        "key": "TAPI_SCOPE",
        "value": "https://tapi.dvsa.gov.uk/.default"
      },
      {
        "key": "TAPI_TOKEN_URL",
        "value": "https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token"
      }
    ]
  }
}
EOF
)

echo "📡 Creating Render service..."

# Create the service
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$SERVICE_PAYLOAD" \
  "https://api.render.com/v1/services")

echo "Response: $RESPONSE"

# Extract service ID from response
SERVICE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$SERVICE_ID" ]; then
    echo "❌ Failed to create service. Response:"
    echo "$RESPONSE"
    exit 1
fi

echo "✅ Service created with ID: $SERVICE_ID"
echo ""
echo "🔗 Service URL: https://dashboard.render.com/web/$SERVICE_ID"
echo ""
echo "⚠️  IMPORTANT: You need to add these environment variables in the Render dashboard:"
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
echo "🚀 The service will start deploying automatically!"
echo "   Monitor deployment at: https://dashboard.render.com/web/$SERVICE_ID"
