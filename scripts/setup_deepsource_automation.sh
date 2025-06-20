#!/bin/bash

# DeepSource Automation Setup Script
# Sets up automated fix tracking and management system

set -e

echo "🔍 Setting up DeepSource Automation System"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f ".deepsource.toml" ]; then
    print_error "DeepSource configuration not found. Please run this from the project root."
    exit 1
fi

# Create necessary directories
print_info "Creating directories..."
mkdir -p logs
mkdir -p config
mkdir -p .github/workflows
mkdir -p scripts

print_status "Directories created"

# Set up Python dependencies
print_info "Installing Python dependencies..."
if command -v pip3 &> /dev/null; then
    pip3 install requests python-dateutil flask sqlite3
    print_status "Python dependencies installed"
else
    print_warning "pip3 not found. Please install manually: requests python-dateutil flask"
fi

# Initialize the fix tracking database
print_info "Initializing fix tracking database..."
python3 -c "
import sys
import os
sys.path.insert(0, 'src')
from deepsource_fix_manager import DeepSourceFixManager

try:
    manager = DeepSourceFixManager()
    print('✅ DeepSource fix tracking database initialized')
except Exception as e:
    print(f'❌ Error initializing database: {e}')
    sys.exit(1)
"

if [ $? -eq 0 ]; then
    print_status "Fix tracking database initialized"
else
    print_error "Failed to initialize database"
    exit 1
fi

# Set up GitHub Actions workflow permissions
print_info "Checking GitHub Actions setup..."
if [ -f ".github/workflows/auto-merge-deepsource.yml" ]; then
    print_status "GitHub Actions workflow found"
    print_info "Make sure your repository has the following settings:"
    echo "  - Actions > General > Workflow permissions: Read and write permissions"
    echo "  - Actions > General > Allow GitHub Actions to create and approve pull requests: ✅"
    echo "  - Settings > Branches > Branch protection rules (if any): Allow auto-merge"
else
    print_warning "GitHub Actions workflow not found"
fi

# Check DeepSource configuration
print_info "Validating DeepSource configuration..."
if [ -f ".deepsource.toml" ]; then
    print_status "DeepSource configuration found"
    
    # Check if required analyzers are configured
    if grep -q "javascript" .deepsource.toml && grep -q "python" .deepsource.toml && grep -q "secrets" .deepsource.toml; then
        print_status "All required analyzers configured (JavaScript, Python, Secrets)"
    else
        print_warning "Some analyzers may be missing. Ensure JavaScript, Python, and Secrets analyzers are configured."
    fi
    
    # Check if transformers are configured
    if grep -q "prettier" .deepsource.toml && grep -q "autopep8" .deepsource.toml; then
        print_status "Auto-fix transformers configured"
    else
        print_warning "Auto-fix transformers may be missing. Consider adding prettier and autopep8."
    fi
else
    print_error "DeepSource configuration not found"
    exit 1
fi

# Set up environment variables
print_info "Setting up environment variables..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# DeepSource Automation Configuration
DEEPSOURCE_WEBHOOK_SECRET=your-webhook-secret-here
WEBHOOK_PORT=5002
FLASK_ENV=production

# GitHub Configuration (optional)
GITHUB_TOKEN=your-github-token-here

# Notification Settings (optional)
SLACK_WEBHOOK_URL=your-slack-webhook-here
EOF
    print_status "Environment file created (.env)"
    print_warning "Please update .env with your actual webhook secret and tokens"
else
    print_status "Environment file already exists"
fi

# Create a simple monitoring script
print_info "Creating monitoring script..."
cat > scripts/monitor_deepsource.sh << 'EOF'
#!/bin/bash

# Simple monitoring script for DeepSource automation
echo "🔍 DeepSource Automation Status"
echo "==============================="

# Check if fix manager is working
python3 -c "
import sys
sys.path.insert(0, 'src')
from deepsource_fix_manager import DeepSourceFixManager

try:
    manager = DeepSourceFixManager()
    stats = manager.get_fix_statistics()
    print(f'📊 Total fixes: {stats.get(\"total_fixes\", 0)}')
    print(f'✅ Success rate: {stats.get(\"success_rate\", 0):.1f}%')
    print(f'🕒 Recent fixes (7 days): {stats.get(\"recent_fixes\", 0)}')
except Exception as e:
    print(f'❌ Error: {e}')
"

# Check log files
if [ -f "logs/deepsource_fixes.json" ]; then
    echo "📄 Fix log file exists"
    echo "📊 Recent entries: $(tail -n 5 logs/deepsource_fixes.json | wc -l)"
else
    echo "⚠️  No fix log file found"
fi

# Check GitHub Actions status (if available)
if command -v gh &> /dev/null; then
    echo "🔄 Recent workflow runs:"
    gh run list --limit 3 --workflow="auto-merge-deepsource.yml" 2>/dev/null || echo "   No recent runs found"
fi

echo ""
echo "🌐 Dashboard: http://localhost:5001/deepsource-dashboard"
EOF

chmod +x scripts/monitor_deepsource.sh
print_status "Monitoring script created"

# Create a cleanup script
print_info "Creating cleanup script..."
cat > scripts/cleanup_deepsource.sh << 'EOF'
#!/bin/bash

# Cleanup script for DeepSource automation
echo "🧹 Cleaning up DeepSource automation data"
echo "========================================="

# Clean up old fix records (older than 90 days)
python3 -c "
import sys
sys.path.insert(0, 'src')
from deepsource_fix_manager import DeepSourceFixManager

try:
    manager = DeepSourceFixManager()
    deleted = manager.cleanup_old_records(90)
    print(f'🗑️  Cleaned up {deleted} old records')
except Exception as e:
    print(f'❌ Error: {e}')
"

# Clean up old log files
find logs -name "*.log" -mtime +30 -delete 2>/dev/null || true
echo "🗑️  Cleaned up old log files"

echo "✅ Cleanup completed"
EOF

chmod +x scripts/cleanup_deepsource.sh
print_status "Cleanup script created"

# Final setup summary
echo ""
echo "🎉 DeepSource Automation Setup Complete!"
echo "========================================"
echo ""
print_status "Components installed:"
echo "  ✅ Fix tracking database"
echo "  ✅ GitHub Actions workflow"
echo "  ✅ Configuration files"
echo "  ✅ Monitoring scripts"
echo "  ✅ API endpoints"
echo ""
print_info "Next steps:"
echo "  1. Update .env with your webhook secret"
echo "  2. Ensure GitHub Actions permissions are set"
echo "  3. Test the system with: ./scripts/monitor_deepsource.sh"
echo "  4. Access dashboard at: http://localhost:5001/deepsource-dashboard"
echo ""
print_info "Useful commands:"
echo "  Monitor status: ./scripts/monitor_deepsource.sh"
echo "  Cleanup old data: ./scripts/cleanup_deepsource.sh"
echo "  View logs: tail -f logs/fix_manager.log"
echo ""
print_warning "Remember to:"
echo "  - Set up DeepSource webhook in your repository settings"
echo "  - Configure GitHub repository permissions for Actions"
echo "  - Test the auto-merge functionality with a small change"
echo ""
echo "🔍 DeepSource automation is now ready to prevent duplicate fixes!"
