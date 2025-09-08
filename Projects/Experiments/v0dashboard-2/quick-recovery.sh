#!/bin/bash

# V0 Dashboard Quick Recovery Script
# This script helps quickly restore the application from backup

echo "🔄 V0 Dashboard Quick Recovery Script"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Checking environment files..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. You'll need to create this file with your environment variables."
    echo "   Reference: COMPLETE_BACKUP_GUIDE.md for required variables"
fi

echo "🗄️  Checking database connection..."
if [ -f ".env.local" ]; then
    echo "   Environment file found - please verify DATABASE_URL is correct"
else
    echo "   Please create .env.local with your database credentials"
fi

echo "🏗️  Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Ready to start the application:"
    echo "   npm run dev"
    echo ""
    echo "📋 Don't forget to:"
    echo "   1. Verify .env.local has all required variables"
    echo "   2. Check database connection"
    echo "   3. Run any pending database migrations"
    echo "   4. Test all integrations (SWS, Haynes, Twilio, etc.)"
    echo ""
    echo "📖 For detailed recovery instructions, see: COMPLETE_BACKUP_GUIDE.md"
else
    echo "❌ Build failed. Please check for missing dependencies or configuration issues."
    echo "📖 See COMPLETE_BACKUP_GUIDE.md for troubleshooting."
fi
