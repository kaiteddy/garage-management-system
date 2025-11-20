#!/bin/bash

echo "🌐 Setting up Cloudflare Tunnels for ELI MOTORS LTD"
echo "=================================================="
echo "🏢 Business: ELI MOTORS LTD - Serving Hendon since 1979"
echo "🚗 Platform: GarageManager Pro + ProSearch Intelligence"
echo ""

# Configuration
ACCOUNT_ID="a1c77c1b106d54b2afdca84dc8c54e7d"
API_TOKEN="k7L627sNWj_YDQG_2Mxpvs_XkbdMMcrcK6xaTgcC"
ZONE_NAME="elimotors.co.uk"

# Subdomains
GARAGE_SUBDOMAIN="app"
PROSEARCH_SUBDOMAIN="intelligence"

echo "📋 Configuration:"
echo "   🚗 GarageManager Pro: https://$GARAGE_SUBDOMAIN.$ZONE_NAME"
echo "   🔍 ProSearch Intelligence: https://$PROSEARCH_SUBDOMAIN.$ZONE_NAME"
echo "   📊 Account ID: $ACCOUNT_ID"
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

    # Extract tunnel ID
    local tunnel_id=$(echo $response | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(data['result']['id'])
    else:
        print('ERROR: ' + str(data.get('errors', 'Unknown error')), file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('ERROR: ' + str(e), file=sys.stderr)
    sys.exit(1)
" 2>/dev/null)

    if [[ $tunnel_id == ERROR* ]]; then
        echo "❌ Failed to create tunnel: $tunnel_name"
        echo "$tunnel_id"
        return 1
    fi

    echo "✅ Tunnel created: $tunnel_id"
    
    # Save tunnel details
    echo $tunnel_id > .tunnel_${tunnel_name}_id
    echo $tunnel_secret > .tunnel_${tunnel_name}_secret
    
    return 0
}

# Function to create DNS record
create_dns_record() {
    local subdomain=$1
    local tunnel_id=$2
    
    echo "🌐 Creating DNS record: $subdomain.$ZONE_NAME"
    
    # Get zone ID
    local zone_response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
        -H "Authorization: Bearer $API_TOKEN")
    
    local zone_id=$(echo $zone_response | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success') and data['result']:
        print(data['result'][0]['id'])
    else:
        print('ERROR: Zone not found', file=sys.stderr)
        sys.exit(1)
except Exception as e:
    print('ERROR: ' + str(e), file=sys.stderr)
    sys.exit(1)
" 2>/dev/null)

    if [[ $zone_id == ERROR* ]]; then
        echo "❌ Failed to get zone ID for $ZONE_NAME"
        return 1
    fi

    # Create/update DNS record
    local dns_response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"CNAME\",
            \"name\": \"$subdomain\",
            \"content\": \"$tunnel_id.cfargotunnel.com\",
            \"ttl\": 1
        }")

    local success=$(echo $dns_response | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('success', False))
except:
    print(False)
" 2>/dev/null)

    if [[ $success == "True" ]]; then
        echo "✅ DNS record created: $subdomain.$ZONE_NAME"
    else
        echo "⚠️  DNS record may already exist (this is normal)"
    fi
}

# Create tunnels
echo "🔧 Creating tunnels..."

# Create GarageManager Pro tunnel
echo ""
echo "🚗 Setting up GarageManager Pro tunnel..."
create_tunnel "garagemanager-pro"
GARAGE_TUNNEL_ID=$(cat .tunnel_garagemanager-pro_id 2>/dev/null)
GARAGE_TUNNEL_SECRET=$(cat .tunnel_garagemanager-pro_secret 2>/dev/null)

# Create ProSearch Intelligence tunnel
echo ""
echo "🔍 Setting up ProSearch Intelligence tunnel..."
create_tunnel "prosearch-intelligence"
PROSEARCH_TUNNEL_ID=$(cat .tunnel_prosearch-intelligence_id 2>/dev/null)
PROSEARCH_TUNNEL_SECRET=$(cat .tunnel_prosearch-intelligence_secret 2>/dev/null)

# Create DNS records
echo ""
echo "🌐 Setting up DNS records..."
create_dns_record "$GARAGE_SUBDOMAIN" "$GARAGE_TUNNEL_ID"
create_dns_record "$PROSEARCH_SUBDOMAIN" "$PROSEARCH_TUNNEL_ID"

# Generate configurations
echo ""
echo "📝 Generating tunnel configurations..."

# Create credentials directory
mkdir -p ~/.cloudflared

# GarageManager Pro configuration
cat > garagemanager-config.yml << EOF
# GarageManager Pro - ELI MOTORS LTD
# MOT Management & Vehicle Service Platform
tunnel: $GARAGE_TUNNEL_ID
credentials-file: /Users/adamrutstein/.cloudflared/garagemanager-pro.json

ingress:
  # Main application - GarageManager Pro Dashboard
  - hostname: app.elimotors.co.uk
    service: http://localhost:3001
  # Catch-all for any unmatched requests
  - service: http_status:404

# Enable metrics for monitoring
metrics: 0.0.0.0:2000
EOF

# ProSearch Intelligence configuration
cat > prosearch-config.yml << EOF
# ProSearch Intelligence - ELI MOTORS LTD
# Analytics & Intelligence Platform
tunnel: $PROSEARCH_TUNNEL_ID
credentials-file: /Users/adamrutstein/.cloudflared/prosearch-intelligence.json

ingress:
  # Main application - ProSearch Intelligence
  - hostname: intelligence.elimotors.co.uk
    service: http://localhost:3000
  # Catch-all for any unmatched requests
  - service: http_status:404

# Enable metrics for monitoring
metrics: 0.0.0.0:2001
EOF

# Generate credentials files
echo "🔑 Generating credentials..."

cat > ~/.cloudflared/garagemanager-pro.json << EOF
{
    "AccountTag": "$ACCOUNT_ID",
    "TunnelSecret": "$GARAGE_TUNNEL_SECRET",
    "TunnelID": "$GARAGE_TUNNEL_ID"
}
EOF

cat > ~/.cloudflared/prosearch-intelligence.json << EOF
{
    "AccountTag": "$ACCOUNT_ID",
    "TunnelSecret": "$PROSEARCH_TUNNEL_SECRET",
    "TunnelID": "$PROSEARCH_TUNNEL_ID"
}
EOF

echo "✅ Configuration files generated!"
echo ""

# Create management scripts
echo "🔧 Creating management scripts..."

# Start script
cat > start-cloudflare-tunnels.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting ELI MOTORS LTD Cloudflare Tunnels"
echo "============================================="

# Check if applications are running
echo "📊 Checking applications..."

# Check GarageManager Pro (port 3001)
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
fi

# Check ProSearch Intelligence (port 3000)
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
    echo "   This is optional - start if needed"
fi

echo ""
echo "🌐 Starting tunnels..."

# Start GarageManager Pro tunnel
echo "🚗 Starting GarageManager Pro tunnel..."
cloudflared tunnel --config garagemanager-config.yml run &
GARAGE_PID=$!
echo $GARAGE_PID > .garage_tunnel_pid

# Start ProSearch Intelligence tunnel
echo "🔍 Starting ProSearch Intelligence tunnel..."
cloudflared tunnel --config prosearch-config.yml run &
PROSEARCH_PID=$!
echo $PROSEARCH_PID > .prosearch_tunnel_pid

echo ""
echo "✅ Tunnels started!"
echo "   🚗 GarageManager Pro PID: $GARAGE_PID"
echo "   🔍 ProSearch Intelligence PID: $PROSEARCH_PID"
echo ""
echo "🌐 Your platforms are available at:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"
echo ""
echo "📊 Tunnel metrics:"
echo "   🚗 GarageManager Pro: http://localhost:2000/metrics"
echo "   🔍 ProSearch Intelligence: http://localhost:2001/metrics"
echo ""
echo "📋 Management commands:"
echo "   Check status: ./check-cloudflare-status.sh"
echo "   Stop tunnels: ./stop-cloudflare-tunnels.sh"
echo "   Restart: ./restart-cloudflare-tunnels.sh"
EOF

# Stop script
cat > stop-cloudflare-tunnels.sh << 'EOF'
#!/bin/bash

echo "🛑 Stopping ELI MOTORS LTD Cloudflare Tunnels"
echo "============================================="

# Stop GarageManager Pro tunnel
if [ -f .garage_tunnel_pid ]; then
    GARAGE_PID=$(cat .garage_tunnel_pid)
    if kill -0 $GARAGE_PID 2>/dev/null; then
        echo "🚗 Stopping GarageManager Pro tunnel (PID: $GARAGE_PID)"
        kill $GARAGE_PID
        rm .garage_tunnel_pid
    else
        echo "⚠️  GarageManager Pro tunnel not running"
        rm -f .garage_tunnel_pid
    fi
else
    echo "⚠️  No GarageManager Pro tunnel PID found"
fi

# Stop ProSearch Intelligence tunnel
if [ -f .prosearch_tunnel_pid ]; then
    PROSEARCH_PID=$(cat .prosearch_tunnel_pid)
    if kill -0 $PROSEARCH_PID 2>/dev/null; then
        echo "🔍 Stopping ProSearch Intelligence tunnel (PID: $PROSEARCH_PID)"
        kill $PROSEARCH_PID
        rm .prosearch_tunnel_pid
    else
        echo "⚠️  ProSearch Intelligence tunnel not running"
        rm -f .prosearch_tunnel_pid
    fi
else
    echo "⚠️  No ProSearch Intelligence tunnel PID found"
fi

# Kill any remaining cloudflared processes
echo "🧹 Cleaning up any remaining tunnel processes..."
pkill -f cloudflared

echo ""
echo "✅ All tunnels stopped!"
EOF

# Status check script
cat > check-cloudflare-status.sh << 'EOF'
#!/bin/bash

echo "📊 ELI MOTORS LTD - Cloudflare Tunnel Status"
echo "==========================================="

# Check applications
echo "📱 Applications:"
if lsof -i :3001 >/dev/null 2>&1; then
    echo "   ✅ GarageManager Pro (port 3001) - RUNNING"
else
    echo "   ❌ GarageManager Pro (port 3001) - NOT RUNNING"
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "   ✅ ProSearch Intelligence (port 3000) - RUNNING"
else
    echo "   ⚠️  ProSearch Intelligence (port 3000) - NOT RUNNING"
fi

echo ""
echo "🌐 Tunnels:"

# Check GarageManager Pro tunnel
if [ -f .garage_tunnel_pid ]; then
    GARAGE_PID=$(cat .garage_tunnel_pid)
    if kill -0 $GARAGE_PID 2>/dev/null; then
        echo "   ✅ GarageManager Pro tunnel (PID: $GARAGE_PID) - RUNNING"
    else
        echo "   ❌ GarageManager Pro tunnel - NOT RUNNING"
    fi
else
    echo "   ❌ GarageManager Pro tunnel - NOT RUNNING"
fi

# Check ProSearch Intelligence tunnel
if [ -f .prosearch_tunnel_pid ]; then
    PROSEARCH_PID=$(cat .prosearch_tunnel_pid)
    if kill -0 $PROSEARCH_PID 2>/dev/null; then
        echo "   ✅ ProSearch Intelligence tunnel (PID: $PROSEARCH_PID) - RUNNING"
    else
        echo "   ❌ ProSearch Intelligence tunnel - NOT RUNNING"
    fi
else
    echo "   ❌ ProSearch Intelligence tunnel - NOT RUNNING"
fi

echo ""
echo "🌐 URLs:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"

echo ""
echo "📊 Metrics:"
echo "   🚗 GarageManager Pro: http://localhost:2000/metrics"
echo "   🔍 ProSearch Intelligence: http://localhost:2001/metrics"

echo ""
echo "🔧 Quick tests:"
echo "   Test GarageManager Pro: curl -s -o /dev/null -w \"%{http_code}\" https://app.elimotors.co.uk"
echo "   Test ProSearch Intelligence: curl -s -o /dev/null -w \"%{http_code}\" https://intelligence.elimotors.co.uk"
EOF

# Restart script
cat > restart-cloudflare-tunnels.sh << 'EOF'
#!/bin/bash

echo "🔄 Restarting ELI MOTORS LTD Cloudflare Tunnels"
echo "==============================================="

# Stop tunnels
./stop-cloudflare-tunnels.sh

echo ""
echo "⏳ Waiting 3 seconds..."
sleep 3

# Start tunnels
./start-cloudflare-tunnels.sh
EOF

# Make scripts executable
chmod +x start-cloudflare-tunnels.sh
chmod +x stop-cloudflare-tunnels.sh
chmod +x check-cloudflare-status.sh
chmod +x restart-cloudflare-tunnels.sh

echo "✅ Management scripts created!"
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🌐 Your professional URLs:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"
echo ""
echo "🚀 Next steps:"
echo "   1. Make sure your applications are running:"
echo "      - GarageManager Pro: npm run dev (port 3001)"
echo "      - ProSearch Intelligence: (port 3000, optional)"
echo ""
echo "   2. Start the tunnels:"
echo "      ./start-cloudflare-tunnels.sh"
echo ""
echo "   3. Check status:"
echo "      ./check-cloudflare-status.sh"
echo ""
echo "📋 Management commands:"
echo "   Start: ./start-cloudflare-tunnels.sh"
echo "   Stop: ./stop-cloudflare-tunnels.sh"
echo "   Status: ./check-cloudflare-status.sh"
echo "   Restart: ./restart-cloudflare-tunnels.sh"
echo ""
echo "🏢 ELI MOTORS LTD - Professional tunnel setup complete!"
echo "   Serving Hendon since 1979 🚗"
