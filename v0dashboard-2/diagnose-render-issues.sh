#!/bin/bash

echo "🔍 RENDER DEPLOYMENT DIAGNOSTIC TOOL"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
    esac
}

echo "📋 CHECKING PROJECT CONFIGURATION"
echo "================================="

# Check package.json
if [ -f "package.json" ]; then
    print_status "SUCCESS" "package.json found"
    
    # Check build script
    if grep -q '"build"' package.json; then
        BUILD_COMMAND=$(grep '"build"' package.json | cut -d'"' -f4)
        print_status "SUCCESS" "Build script found: $BUILD_COMMAND"
    else
        print_status "ERROR" "No build script found in package.json"
    fi
    
    # Check start script
    if grep -q '"start"' package.json; then
        START_COMMAND=$(grep '"start"' package.json | cut -d'"' -f4)
        print_status "SUCCESS" "Start script found: $START_COMMAND"
    else
        print_status "ERROR" "No start script found in package.json"
    fi
    
    # Check Node version
    if grep -q '"node"' package.json; then
        NODE_VERSION=$(grep '"node"' package.json | cut -d'"' -f4)
        print_status "INFO" "Node version specified: $NODE_VERSION"
    else
        print_status "WARNING" "No Node version specified in package.json"
    fi
else
    print_status "ERROR" "package.json not found"
fi

echo ""
echo "🔧 CHECKING NEXT.JS CONFIGURATION"
echo "================================="

# Check next.config.js
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
    print_status "SUCCESS" "Next.js config file found"
    
    # Check for standalone output
    if grep -q "output.*standalone" next.config.* 2>/dev/null; then
        print_status "WARNING" "Standalone output detected - may cause issues on Render"
        print_status "INFO" "Consider removing 'output: standalone' for Render deployment"
    else
        print_status "SUCCESS" "No standalone output configuration"
    fi
else
    print_status "INFO" "No Next.js config file found (using defaults)"
fi

echo ""
echo "📦 CHECKING DEPENDENCIES"
echo "========================"

# Check for problematic dependencies
if [ -f "package.json" ]; then
    # Check for large dependencies that might cause memory issues
    LARGE_DEPS=("@radix-ui" "framer-motion" "three" "@tensorflow" "sharp")
    for dep in "${LARGE_DEPS[@]}"; do
        if grep -q "$dep" package.json; then
            print_status "WARNING" "Large dependency detected: $dep (may cause memory issues)"
        fi
    done
    
    # Check for dev dependencies in production
    if grep -A 50 '"devDependencies"' package.json | grep -q '"@types"'; then
        print_status "INFO" "TypeScript types found in devDependencies"
    fi
fi

echo ""
echo "🌍 CHECKING ENVIRONMENT CONFIGURATION"
echo "====================================="

# Check for environment files
ENV_FILES=(".env" ".env.local" ".env.production" ".env.example")
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "SUCCESS" "$file found"
        
        # Check for sensitive data in non-local env files
        if [[ "$file" != ".env.local" ]] && grep -q "SECRET\|TOKEN\|KEY" "$file" 2>/dev/null; then
            print_status "WARNING" "Sensitive data found in $file - should be set in Render dashboard"
        fi
    fi
done

# Check for required environment variables
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET")
print_status "INFO" "Required environment variables for Render:"
for var in "${REQUIRED_VARS[@]}"; do
    echo "  - $var"
done

echo ""
echo "🏗️  CHECKING BUILD REQUIREMENTS"
echo "==============================="

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_status "INFO" "node_modules directory exists (will be rebuilt on Render)"
    NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    print_status "INFO" "Local node_modules size: $NODE_MODULES_SIZE"
else
    print_status "INFO" "No node_modules directory (normal for fresh clone)"
fi

# Check for lock files
if [ -f "package-lock.json" ]; then
    print_status "SUCCESS" "package-lock.json found (npm)"
elif [ -f "yarn.lock" ]; then
    print_status "SUCCESS" "yarn.lock found (yarn)"
elif [ -f "pnpm-lock.yaml" ]; then
    print_status "SUCCESS" "pnpm-lock.yaml found (pnpm)"
else
    print_status "WARNING" "No lock file found - may cause dependency issues"
fi

echo ""
echo "🔍 CHECKING RENDER-SPECIFIC FILES"
echo "================================="

# Check for render.yaml
if [ -f "render.yaml" ]; then
    print_status "SUCCESS" "render.yaml found"
else
    print_status "INFO" "No render.yaml found (can be configured in dashboard)"
fi

# Check for Dockerfile (not recommended for Render)
if [ -f "Dockerfile" ]; then
    print_status "WARNING" "Dockerfile found - Render prefers native builds over Docker"
    print_status "INFO" "Consider using native Node.js build instead of Docker"
fi

echo ""
echo "🚀 RENDER DEPLOYMENT RECOMMENDATIONS"
echo "===================================="

print_status "INFO" "Recommended Render Settings:"
echo "  Build Command: npm ci && npm run build"
echo "  Start Command: npm start"
echo "  Node Version: 18 or 20"
echo "  Environment: Node"
echo ""

print_status "INFO" "Environment Variables to Set in Render Dashboard:"
echo "  - NODE_ENV=production"
echo "  - DATABASE_URL=your_database_url"
echo "  - NEXTAUTH_SECRET=your_secret"
echo "  - All API keys (Twilio, DVSA, etc.)"
echo ""

print_status "INFO" "Common Issues & Solutions:"
echo "  1. Build Timeout: Add NODE_OPTIONS=--max-old-space-size=4096"
echo "  2. Memory Issues: Upgrade to a paid plan"
echo "  3. Database Connection: Ensure SSL is enabled in DATABASE_URL"
echo "  4. Static Files: Remove 'output: standalone' from next.config.js"
echo ""

echo "📊 DIAGNOSTIC COMPLETE"
echo "======================"
print_status "SUCCESS" "Diagnostic completed. Check the recommendations above."
echo ""
print_status "INFO" "Next Steps:"
echo "  1. Fix any ERROR items above"
echo "  2. Consider WARNING items"
echo "  3. Set environment variables in Render dashboard"
echo "  4. Deploy to Render with recommended settings"
echo ""
print_status "INFO" "If issues persist, check Render logs in dashboard for specific errors."
