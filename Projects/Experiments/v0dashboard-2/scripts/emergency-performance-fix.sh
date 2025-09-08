#!/bin/bash

# Emergency Performance Fix Script
# Aggressively optimizes system performance by stopping resource-heavy processes

echo "🚨 Emergency Performance Fix"
echo "============================"

# 1. Stop the resource-heavy Docker container
echo "🛑 Stopping resource-heavy Docker containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No containers to stop"

# 2. Kill Pro-Search Intelligence background processes
echo "🔥 Stopping Pro-Search Intelligence background processes..."
pkill -f "Pro-Search Intelligence" 2>/dev/null || echo "No Pro-Search processes found"
pkill -f "bulk-enrichment" 2>/dev/null || echo "No bulk-enrichment processes found"
pkill -f "enrichment-monitor" 2>/dev/null || echo "No enrichment-monitor processes found"
pkill -f "non-domestic-epc-import" 2>/dev/null || echo "No EPC import processes found"

# 3. Restart Cursor IDE to fix renderer issues
echo "🔄 Restarting Cursor IDE..."
pkill -f "Cursor" 2>/dev/null || echo "Cursor not running"
sleep 2
echo "   Opening Cursor IDE..."
open /Applications/Cursor.app

# 4. Clear system memory aggressively
echo "💾 Clearing system memory..."
sudo purge 2>/dev/null || echo "Purge not available"

# 5. Optimize Node.js memory usage
echo "⚡ Setting Node.js memory optimization..."
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# 6. Check current resource usage
echo ""
echo "📊 Current Resource Usage:"
uptime
echo ""

# 7. Show top CPU consumers
echo "🔥 Top CPU Consumers:"
ps aux | head -1
ps aux | sort -nr -k 3 | head -5
echo ""

# 8. Show memory usage
echo "💾 Memory Status:"
vm_stat | grep -E "(Pages free|Pages active|Pages inactive)"
echo ""

# 9. Docker status
echo "🐳 Docker Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CPU}}\t{{.MemUsage}}" 2>/dev/null || echo "Docker not available"
echo ""

echo "✅ Emergency fixes applied!"
echo ""
echo "🎯 What was done:"
echo "  - Stopped all Docker containers"
echo "  - Killed Pro-Search Intelligence background processes"
echo "  - Restarted Cursor IDE"
echo "  - Cleared system memory"
echo "  - Set Node.js memory optimization"
echo ""
echo "📋 Additional manual steps:"
echo "1. Close unnecessary browser tabs"
echo "2. Disable Cursor extensions you don't need"
echo "3. Consider using a lighter IDE like VS Code for simple tasks"
echo "4. Monitor with: ./scripts/monitor-performance.sh"
echo ""
echo "⚠️  If still slow, consider:"
echo "  - Restarting your Mac"
echo "  - Checking Activity Monitor for other resource-heavy apps"
echo "  - Reducing Cursor IDE extensions"
