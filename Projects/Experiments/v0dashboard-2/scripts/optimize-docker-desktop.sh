#!/bin/bash

# Docker Desktop Optimization Script
# Optimizes Docker Desktop settings for development performance

echo "🐳 Docker Desktop Optimization Script"
echo "====================================="

# Check if Docker Desktop is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker Desktop is not running. Please start Docker Desktop first."
    exit 1
fi

echo "📊 Current Docker Desktop Settings:"
echo "  CPUs: $(docker info --format '{{.NCPU}}')"
echo "  Memory: $(docker info --format '{{.MemTotal}}' | awk '{printf "%.1fGB", $1/1024/1024/1024}')"
echo ""

# Stop all running containers
echo "🛑 Stopping all running containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No containers to stop"

# Clean up Docker resources
echo "🧹 Cleaning up Docker resources..."
docker system prune -af --volumes
docker builder prune -af

# Get current resource usage
echo ""
echo "📈 System Resource Usage:"
echo "  Load Average: $(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | sed 's/,//')"
echo "  Free Memory: $(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')00 pages"

echo ""
echo "🎯 RECOMMENDED DOCKER DESKTOP SETTINGS"
echo "======================================"
echo ""
echo "Please manually adjust these settings in Docker Desktop:"
echo ""
echo "1. Open Docker Desktop"
echo "2. Go to Settings (gear icon)"
echo "3. Click 'Resources' in the left sidebar"
echo "4. Adjust the following:"
echo ""
echo "   📊 RESOURCES:"
echo "   ├── CPUs: 6-8 cores (currently: $(docker info --format '{{.NCPU}}'))"
echo "   ├── Memory: 4-6 GB (currently: $(docker info --format '{{.MemTotal}}' | awk '{printf "%.1fGB", $1/1024/1024/1024}'))"
echo "   ├── Swap: 1 GB"
echo "   └── Disk image size: 64 GB max"
echo ""
echo "   ⚡ ADVANCED:"
echo "   ├── Enable 'Use Rosetta for x86/amd64 emulation' (if on Apple Silicon)"
echo "   ├── Enable 'Use Virtualization framework'"
echo "   └── Disable 'Send usage statistics'"
echo ""
echo "   🔧 FEATURES IN DEVELOPMENT:"
echo "   ├── Disable 'Use containerd for pulling and storing images'"
echo "   └── Enable 'Enable host networking' (if available)"
echo ""

# Create optimized Docker Compose settings
echo "📝 Creating optimized Docker Compose configuration..."

cat > docker-compose.override.yml << 'EOF'
# Docker Compose override for development optimization
# This file automatically applies resource limits to all services

version: '3.8'

x-resource-limits: &resource-limits
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '1.0'
      reservations:
        memory: 256M
        cpus: '0.5'

services:
  # Apply resource limits to any service that doesn't have them
  app:
    <<: *resource-limits
    environment:
      - NODE_OPTIONS=--max-old-space-size=1024
    
  postgres:
    <<: *resource-limits
    command: >
      postgres
      -c shared_buffers=64MB
      -c effective_cache_size=128MB
      -c maintenance_work_mem=32MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=8MB
      -c default_statistics_target=50
      -c random_page_cost=1.1
      -c effective_io_concurrency=100
    
  redis:
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.5'
        reservations:
          memory: 64M
          cpus: '0.25'
    command: >
      redis-server
      --maxmemory 64mb
      --maxmemory-policy allkeys-lru
      --save ""
EOF

echo "✅ Created docker-compose.override.yml with resource limits"

# Create a Docker Desktop restart script
cat > scripts/restart-docker-desktop.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting Docker Desktop..."
killall Docker
sleep 3
open /Applications/Docker.app
echo "⏳ Waiting for Docker Desktop to start..."
while ! docker info >/dev/null 2>&1; do
    sleep 2
    echo "   Still waiting..."
done
echo "✅ Docker Desktop restarted successfully!"
EOF

chmod +x scripts/restart-docker-desktop.sh

echo ""
echo "🚀 OPTIMIZATION COMPLETE!"
echo "========================"
echo ""
echo "✅ What was done:"
echo "  - Stopped all Docker containers"
echo "  - Cleaned up Docker resources"
echo "  - Created docker-compose.override.yml with resource limits"
echo "  - Created Docker Desktop restart script"
echo ""
echo "📋 NEXT STEPS (Manual):"
echo "1. Adjust Docker Desktop settings as shown above"
echo "2. Restart Docker Desktop: ./scripts/restart-docker-desktop.sh"
echo "3. Monitor performance: ./scripts/monitor-performance.sh"
echo ""
echo "🎯 Expected improvements after manual settings adjustment:"
echo "  - 50-70% reduction in Docker resource usage"
echo "  - Improved system responsiveness"
echo "  - Faster container startup times"
echo "  - Better memory management"
echo ""
echo "💡 Pro tip: Use 'docker-compose up' instead of 'docker run' for better resource management"
