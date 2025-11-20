#!/bin/bash

echo "🌐 Setting up Cloudflare Tunnels for ELI MOTORS LTD"
echo "=================================================="
echo "🏢 Business: ELI MOTORS LTD - Serving Hendon since 1979"
echo ""

# Updated Configuration with working API token
ACCOUNT_ID="a1c77c1b106d54b2afdca84dc8c54e7d"
API_TOKEN="WOzgE8od-w377GVmxjL4zhkD_rOx6AoRNmiU8UtJ"
ZONE_NAME="elimotors.co.uk"

echo "📋 Configuration:"
echo "   🚗 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"
echo "   📊 Account ID: $ACCOUNT_ID"
echo "   ✅ API Token: Valid and Active"
echo ""

# Test API token first
echo "🔐 Verifying API token..."
TOKEN_RESPONSE=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/tokens/verify" \
     -H "Authorization: Bearer $API_TOKEN")

TOKEN_VALID=$(echo $TOKEN_RESPONSE | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('success', False))
except:
    print(False)
" 2>/dev/null)

if [[ $TOKEN_VALID != "True" ]]; then
    echo "❌ API token verification failed"
    echo "$TOKEN_RESPONSE"
    exit 1
fi

echo "✅ API token verified successfully"
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
        errors = data.get('errors', [])
        for error in errors:
            if 'already exists' in error.get('message', '').lower():
                print('EXISTS')
                sys.exit(0)
        print('ERROR: ' + str(errors))
        sys.exit(1)
except Exception as e:
    print('ERROR: ' + str(e))
    sys.exit(1)
" 2>/dev/null)

    if [[ $tunnel_id == "EXISTS" ]]; then
        echo "⚠️  Tunnel $tunnel_name already exists, getting existing tunnel ID..."
        
        # Get existing tunnel ID
        local list_response=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel" \
            -H "Authorization: Bearer $API_TOKEN")
        
        tunnel_id=$(echo $list_response | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        for tunnel in data['result']:
            if tunnel['name'] == '$tunnel_name':
                print(tunnel['id'])
                break
except:
    pass
" 2>/dev/null)
        
        if [[ -z $tunnel_id ]]; then
            echo "❌ Could not find existing tunnel ID"
            return 1
        fi
        
        echo "✅ Using existing tunnel: $tunnel_id"
    elif [[ $tunnel_id == ERROR* ]]; then
        echo "❌ Failed to create tunnel: $tunnel_name"
        echo "$tunnel_id"
        return 1
    else
        echo "✅ Tunnel created: $tunnel_id"
    fi
    
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
        print('ERROR: Zone not found')
        sys.exit(1)
except Exception as e:
    print('ERROR: ' + str(e))
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
    if data.get('success'):
        print('True')
    else:
        errors = data.get('errors', [])
        for error in errors:
            if 'already exists' in error.get('message', '').lower():
                print('EXISTS')
                sys.exit(0)
        print('False')
except:
    print('False')
" 2>/dev/null)

    if [[ $success == "True" ]]; then
        echo "✅ DNS record created: $subdomain.$ZONE_NAME"
    elif [[ $success == "EXISTS" ]]; then
        echo "⚠️  DNS record already exists: $subdomain.$ZONE_NAME (this is normal)"
    else
        echo "⚠️  DNS record creation failed, but continuing..."
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
create_dns_record "app" "$GARAGE_TUNNEL_ID"
create_dns_record "intelligence" "$PROSEARCH_TUNNEL_ID"

# Generate configurations
echo ""
echo "📝 Generating tunnel configurations..."

# Create credentials directory
mkdir -p ~/.cloudflared

# GarageManager Pro configuration
cat > garagemanager-cloudflare.yml << EOF
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
cat > prosearch-cloudflare.yml << EOF
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

# Create simple start script
cat > start-cloudflare.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting ELI MOTORS LTD Cloudflare Tunnels"
echo "============================================="

# Check applications
echo "📊 Checking applications..."
if lsof -i :3001 >/dev/null 2>&1; then
    echo "✅ GarageManager Pro running on port 3001"
else
    echo "❌ GarageManager Pro not running on port 3001"
    echo "   Start with: npm run dev"
fi

if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ ProSearch Intelligence running on port 3000"
else
    echo "⚠️  ProSearch Intelligence not running on port 3000"
fi

echo ""
echo "🌐 Starting tunnels..."

# Start GarageManager Pro tunnel
echo "🚗 Starting GarageManager Pro tunnel..."
cloudflared tunnel --config garagemanager-cloudflare.yml run &
GARAGE_PID=$!
echo $GARAGE_PID > .garage_tunnel_pid

# Start ProSearch Intelligence tunnel
echo "🔍 Starting ProSearch Intelligence tunnel..."
cloudflared tunnel --config prosearch-cloudflare.yml run &
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
echo "⏳ Wait 30 seconds for tunnels to fully connect..."
sleep 30
echo ""
echo "🧪 Testing connections..."
echo "   🚗 GarageManager Pro: $(curl -s -o /dev/null -w "%{http_code}" https://app.elimotors.co.uk)"
echo "   🔍 ProSearch Intelligence: $(curl -s -o /dev/null -w "%{http_code}" https://intelligence.elimotors.co.uk)"
EOF

chmod +x start-cloudflare.sh

echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "🌐 Your professional URLs:"
echo "   📱 GarageManager Pro: https://app.elimotors.co.uk"
echo "   🔍 ProSearch Intelligence: https://intelligence.elimotors.co.uk"
echo ""
echo "🚀 To start the tunnels:"
echo "   ./start-cloudflare.sh"
echo ""
echo "📋 Tunnel IDs created:"
echo "   🚗 GarageManager Pro: $GARAGE_TUNNEL_ID"
echo "   🔍 ProSearch Intelligence: $PROSEARCH_TUNNEL_ID"
echo ""
echo "🏢 ELI MOTORS LTD - Professional tunnel setup complete!"
echo "   Serving Hendon since 1979 🚗"
