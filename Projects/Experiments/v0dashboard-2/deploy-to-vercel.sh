#!/bin/bash

echo "🚀 Starting deployment to Vercel..."

# Change to project directory
cd /Users/adamrutstein/v0dashboard-2

# Check git status
echo "📋 Checking git status..."
git status

# Add all changes
echo "➕ Adding all changes..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "feat: Enhanced MOT history with clickable defects, technical data integration, and oil parts system

- Enhanced MOT chart with bigger display and larger text
- Complete MOT history showing all tests with clickable defects/advisories
- Smart MOT defect parsing with 120+ repair types and professional time estimates
- Clickable MOT defects automatically create job items with accurate pricing
- New TECH button for comprehensive vehicle technical data
- Enhanced lubricant specifications with part numbers and brands
- Professional repair time database with difficulty ratings
- Oil click-to-add system for all fluid types (engine oil, brake fluid, etc.)
- Smart pricing system (£10.95/L for engine oils, specific pricing for other fluids)
- Automatic quantity calculation based on vehicle capacity
- VAT integration with 20% automatic calculation
- Technical data API with fallback mock data for testing
- Enhanced job sheet items with MOT and technical data tracking
- Improved error handling and null checks throughout
- Database storage for technical data with 7-day caching"

# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push origin main

echo "✅ Deployment complete! Vercel will automatically deploy from GitHub."
echo "🌐 Check your Vercel dashboard for deployment status."
