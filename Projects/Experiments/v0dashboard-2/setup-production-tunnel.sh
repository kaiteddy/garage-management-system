#!/bin/bash

# GarageManager Pro - Production Tunnel Setup for ELI MOTORS LTD
# Account ID: a1c77c1b106d54b2afdca84dc8c54e7d
# API Token: k7L627sNWj_YDQG_2Mxpvs_XkbdMMcrcK6xaTgcC

echo "🚀 Setting up GarageManager Pro - ELI MOTORS LTD"
echo "==============================================="
echo "🔧 MOT Management & Vehicle Service Platform"
echo ""

# Configuration
API_TOKEN="k7L627sNWj_YDQG_2Mxpvs_XkbdMMcrcK6xaTgcC"
ACCOUNT_ID="a1c77c1b106d54b2afdca84dc8c54e7d"
ZONE_NAME="elimotors.co.uk"
GARAGE_SUBDOMAIN="app"

# Export API token for cloudflared
export CLOUDFLARE_API_TOKEN="$API_TOKEN"

echo "📋 Configuration:"
echo "   Business: ELI MOTORS LTD"
echo "   Platform: GarageManager Pro"
echo "   Domain: $ZONE_NAME"
echo "   Production URL: https://$GARAGE_SUBDOMAIN.$ZONE_NAME"
echo "   Current Port: 3002 (from your existing setup)"
echo ""

# Function to create tunnel via API
create_tunnel() {
    local tunnel_name=$1
    local tunnel_secret=$(openssl rand -hex 32)

    echo "📡 Creating tunnel: $tunnel_name"

    # Create tunnel via API
    local response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$tunnel_name\",
            \"tunnel_secret\": \"$tunnel_secret\"
        }")

    # Extract tunnel ID from response
    local tunnel_id=$(echo $response | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$tunnel_id" ]; then
        echo "✅ Tunnel created: $tunnel_id"
        echo "$tunnel_id" > ".tunnel_${tunnel_name}_id"
        echo "$tunnel_secret" > ".tunnel_${tunnel_name}_secret"
        return 0
    else
        echo "❌ Failed to create tunnel: $tunnel_name"
        echo "Response: $response"
        return 1
    fi
}

# Function to create DNS record
create_dns_record() {
    local subdomain=$1
    local tunnel_id=$2

    echo "🌐 Creating DNS record: $subdomain.$ZONE_NAME"

    # Get zone ID first
    local zone_response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
        -H "Authorization: Bearer $API_TOKEN")

    local zone_id=$(echo $zone_response | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -z "$zone_id" ]; then
        echo "❌ Could not find zone ID for $ZONE_NAME"
        return 1
    fi

    # Create CNAME record pointing to tunnel
    local dns_response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"CNAME\",
            \"name\": \"$subdomain\",
            \"content\": \"$tunnel_id.cfargotunnel.com\",
            \"ttl\": 1
        }")

    if echo $dns_response | grep -q '"success":true'; then
        echo "✅ DNS record created: $subdomain.$ZONE_NAME"
        return 0
    else
        echo "❌ Failed to create DNS record"
        echo "Response: $dns_response"
        return 1
    fi
}

# Create tunnel for GarageManager Pro
echo "🔧 Creating GarageManager Pro tunnel..."
create_tunnel "garagemanager-pro"
GARAGE_TUNNEL_ID=$(cat .tunnel_garagemanager-pro_id 2>/dev/null)
GARAGE_TUNNEL_SECRET=$(cat .tunnel_garagemanager-pro_secret 2>/dev/null)

# Create DNS record
echo ""
echo "🌐 Setting up DNS record for app.elimotors.co.uk..."
create_dns_record "$GARAGE_SUBDOMAIN" "$GARAGE_TUNNEL_ID"

# Generate GarageManager Pro tunnel configuration
echo "📝 Generating tunnel configuration..."
cat > garagemanager-config.yml << EOF
# GarageManager Pro - ELI MOTORS LTD
# MOT Management & Vehicle Service Platform
tunnel: $GARAGE_TUNNEL_ID
credentials-file: /Users/adamrutstein/.cloudflared/garagemanager-pro.json

ingress:
  # Main application - GarageManager Pro Dashboard
  - hostname: app.elimotors.co.uk
    service: http://localhost:3002
  # Catch-all for any unmatched requests
  - service: http_status:404

# Enable metrics for monitoring
metrics: 0.0.0.0:2000
EOF

# Generate credentials file
echo "🔑 Generating credentials..."
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/garagemanager-pro.json << EOF
{
    "AccountTag": "$ACCOUNT_ID",
    "TunnelSecret": "$GARAGE_TUNNEL_SECRET",
    "TunnelID": "$GARAGE_TUNNEL_ID"
}
EOF

echo "✅ Configuration files generated!"
echo ""
echo "🚀 Starting GarageManager Pro tunnel..."
echo "Platform will be available at: https://app.elimotors.co.uk"
echo ""

# Start tunnel in background
echo "Starting tunnel process..."
cloudflared tunnel --config garagemanager-config.yml run &
GARAGE_PID=$!

# Save PID for management
echo $GARAGE_PID > .garage_tunnel_pid

echo ""
echo "✅ GarageManager Pro tunnel started!"
echo "Process ID: $GARAGE_PID"
echo ""
echo "🌐 Your platform is now live at: https://app.elimotors.co.uk"
echo "📱 Make sure your application is running on port 3002"
echo ""
echo "🔧 Management commands:"
echo "   📊 Check status: ./check-tunnel-status.sh"
echo "   🔄 Restart: ./restart-tunnel.sh"
echo "   🚫 Stop: ./stop-tunnel.sh"
echo ""
echo "🎉 ELI MOTORS LTD - GarageManager Pro is now live!"
