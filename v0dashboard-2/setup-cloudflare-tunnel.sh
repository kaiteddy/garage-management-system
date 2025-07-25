#!/bin/bash

echo "🌐 Setting up Cloudflare Tunnel for GarageManager Pro"
echo "=================================================="

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing Cloudflare Tunnel..."
    
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install cloudflared
    # For Linux
    else
        wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
        sudo dpkg -i cloudflared-linux-amd64.deb
    fi
fi

echo "🔐 Please run the following commands to set up Cloudflare Tunnel:"
echo ""
echo "1. Login to Cloudflare:"
echo "   cloudflared tunnel login"
echo ""
echo "2. Create a tunnel:"
echo "   cloudflared tunnel create garage-manager"
echo ""
echo "3. Create tunnel configuration:"
echo "   nano ~/.cloudflared/config.yml"
echo ""
echo "4. Add this configuration:"
echo "   tunnel: garage-manager"
echo "   credentials-file: ~/.cloudflared/[tunnel-id].json"
echo "   ingress:"
echo "     - hostname: garage-manager.yourdomain.com"
echo "       service: http://localhost:3000"
echo "     - service: http_status:404"
echo ""
echo "5. Route the tunnel:"
echo "   cloudflared tunnel route dns garage-manager garage-manager.yourdomain.com"
echo ""
echo "6. Run the tunnel:"
echo "   cloudflared tunnel run garage-manager"
echo ""
echo "📝 Note: Replace 'yourdomain.com' with your actual domain"
echo "🔗 Your Cloudflare account ID: a1c77c1b106d54b2afdca84dc8c54e7d"
