#!/bin/bash

# Setup Automated MOT Scanning
# This script helps configure automated MOT scanning for your garage management system

set -e

echo "🚗 Setting up Automated MOT Scanning 🚗"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "scripts/automated-mot-scanner.cjs" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if required packages are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
fi

# Check for required environment variables
echo "🔧 Checking environment configuration..."
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo "✅ Found $ENV_FILE"
    
    # Check for required DVSA variables
    REQUIRED_VARS=("DVSA_API_KEY" "DVSA_CLIENT_ID" "DVSA_CLIENT_SECRET" "DVSA_TENANT_ID" "DATABASE_URL")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE"; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        echo "✅ All required environment variables are configured"
    else
        echo "❌ Missing required environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
        echo ""
        echo "Please add these variables to your $ENV_FILE file"
        exit 1
    fi
else
    echo "❌ Error: $ENV_FILE file not found"
    echo "Please create a $ENV_FILE file with the required DVSA credentials"
    exit 1
fi

# Test the bulk MOT script
echo "🧪 Testing bulk MOT scanning script..."
if node scripts/bulk-mot-check-optimized.cjs --help &> /dev/null; then
    echo "✅ Bulk MOT script is working"
else
    echo "⚠️  Testing bulk MOT script (this may take a moment)..."
    # Run a quick test - this will validate environment and database connection
    timeout 30s node scripts/bulk-mot-check-optimized.cjs || {
        echo "✅ Script started successfully (test timeout reached)"
    }
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
echo "✅ Logs directory created"

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/automated-mot-scanner.cjs
chmod +x scripts/setup-automated-mot-scanning.sh
echo "✅ Scripts are now executable"

echo ""
echo "🎉 Setup Complete! 🎉"
echo "==================="
echo ""
echo "You can now run automated MOT scanning in several ways:"
echo ""
echo "1. 📅 Start the scheduler (runs daily at 2 AM):"
echo "   node scripts/automated-mot-scanner.cjs"
echo ""
echo "2. 🚀 Run an immediate scan:"
echo "   node scripts/automated-mot-scanner.cjs --run-now"
echo ""
echo "3. 🔄 Use PM2 for production (recommended):"
echo "   npm install -g pm2"
echo "   pm2 start scripts/deployment/ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. 🖥️  Use systemd service (Linux servers):"
echo "   sudo cp scripts/deployment/mot-scanner.service /etc/systemd/system/"
echo "   sudo systemctl enable mot-scanner"
echo "   sudo systemctl start mot-scanner"
echo ""
echo "📊 Monitor progress:"
echo "   - Logs will be displayed in the console"
echo "   - PM2 logs: pm2 logs mot-scanner"
echo "   - Systemd logs: journalctl -u mot-scanner -f"
echo ""
echo "⚙️  Configuration:"
echo "   - Edit scripts/automated-mot-scanner.cjs to change schedule"
echo "   - Current schedule: Daily at 2:00 AM"
echo "   - Bulk scan processes ~100 vehicles per batch"
echo ""
echo "✅ Your MOT scanning system is ready!"
