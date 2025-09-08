#!/bin/bash

# Performance Monitoring Script for Development Environment
# Monitors system resources, Docker usage, and provides optimization suggestions

echo "📊 Development Environment Performance Monitor"
echo "=============================================="

# System Overview
echo ""
echo "🖥️  SYSTEM OVERVIEW"
echo "-------------------"
uptime
echo ""

# CPU and Memory Usage
echo "💾 MEMORY USAGE"
echo "---------------"
vm_stat | head -10
echo ""

# Docker Resource Usage
echo "🐳 DOCKER RESOURCE USAGE"
echo "-------------------------"
if command -v docker &> /dev/null; then
    echo "Active containers:"
    docker ps --format "table {{.Names}}\t{{.CPU}}\t{{.MemUsage}}\t{{.Status}}"
    echo ""
    
    echo "Docker system usage:"
    docker system df
    echo ""
    
    # Check Docker Desktop resource allocation
    echo "Docker Desktop resource allocation:"
    echo "  CPUs: $(docker info --format '{{.NCPU}}')"
    echo "  Memory: $(docker info --format '{{.MemTotal}}' | numfmt --to=iec)"
    echo ""
else
    echo "Docker not available"
fi

# Node.js Processes
echo "🟢 NODE.JS PROCESSES"
echo "--------------------"
ps aux | grep -E "(node|npm|next)" | grep -v grep | head -10
echo ""

# Cursor/IDE Processes
echo "💻 IDE PROCESSES"
echo "----------------"
ps aux | grep -E "(Cursor|cursor|code)" | grep -v grep | head -5
echo ""

# Disk Usage
echo "💽 DISK USAGE"
echo "-------------"
df -h | head -5
echo ""

# Network Activity
echo "🌐 NETWORK ACTIVITY"
echo "-------------------"
netstat -i | head -5
echo ""

# Performance Recommendations
echo "🎯 PERFORMANCE RECOMMENDATIONS"
echo "==============================="

# Check load average
load_avg=$(uptime | awk -F'load averages:' '{print $2}' | awk '{print $1}' | sed 's/,//')
if (( $(echo "$load_avg > 3.0" | bc -l) )); then
    echo "⚠️  HIGH LOAD AVERAGE ($load_avg) - Consider:"
    echo "   - Reducing Docker resource allocation"
    echo "   - Closing unnecessary applications"
    echo "   - Stopping unused Docker containers"
fi

# Check memory pressure
memory_pressure=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
if [ "$memory_pressure" -lt 100000 ]; then
    echo "⚠️  LOW FREE MEMORY - Consider:"
    echo "   - Reducing Docker memory allocation"
    echo "   - Closing browser tabs"
    echo "   - Restarting memory-intensive applications"
fi

# Check Docker containers
container_count=$(docker ps -q | wc -l | tr -d ' ')
if [ "$container_count" -gt 3 ]; then
    echo "⚠️  MANY DOCKER CONTAINERS ($container_count) - Consider:"
    echo "   - Stopping development containers not in use"
    echo "   - Using docker-compose down when not developing"
fi

echo ""
echo "✅ OPTIMIZATION COMMANDS"
echo "========================"
echo "Run optimization script:     ./scripts/optimize-dev-env.sh"
echo "Stop all containers:         docker stop \$(docker ps -q)"
echo "Clean Docker resources:      docker system prune -f"
echo "Restart Docker Desktop:      killall Docker && open /Applications/Docker.app"
echo "Clear system memory:         sudo purge"
echo ""

# Auto-suggestions based on current state
echo "🤖 AUTO-SUGGESTIONS"
echo "==================="

# Suggest Docker optimization if high resource usage
docker_cpu=$(docker stats --no-stream --format "table {{.CPUPerc}}" | tail -n +2 | sed 's/%//' | awk '{sum+=$1} END {print sum}')
if (( $(echo "$docker_cpu > 10" | bc -l) )); then
    echo "🔧 Docker is using ${docker_cpu}% CPU - Consider reducing container resources"
fi

# Suggest IDE optimization if many processes
ide_processes=$(ps aux | grep -E "(Cursor|cursor|code)" | grep -v grep | wc -l | tr -d ' ')
if [ "$ide_processes" -gt 5 ]; then
    echo "🔧 Multiple IDE processes detected - Consider restarting Cursor IDE"
fi

echo ""
echo "📈 Monitor continuously with: watch -n 5 ./scripts/monitor-performance.sh"
