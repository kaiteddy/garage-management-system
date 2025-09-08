#!/bin/bash

# Development Environment Optimization Script
# Optimizes Docker, system resources, and IDE performance

echo "🚀 Optimizing Development Environment..."

# 1. Docker Optimization
echo "📦 Optimizing Docker..."

# Stop unnecessary containers
echo "Stopping non-essential Docker containers..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "v0dashboard\|postgres\|redis" | tail -n +2 | awk '{print $1}' | xargs -r docker stop

# Clean up Docker resources
echo "Cleaning up Docker resources..."
docker system prune -f --volumes
docker image prune -f
docker builder prune -f

# Optimize Docker Desktop settings
echo "Optimizing Docker Desktop resource allocation..."
echo "Recommended Docker Desktop settings:"
echo "  - CPUs: 6-8 (instead of 14)"
echo "  - Memory: 4-6GB (instead of 8GB)"
echo "  - Swap: 1GB"
echo "  - Disk image size: 64GB max"

# 2. System Resource Optimization
echo "🔧 Optimizing system resources..."

# Clear system caches
sudo purge 2>/dev/null || echo "Purge command not available"

# Optimize Node.js memory usage
export NODE_OPTIONS="--max-old-space-size=4096"

# 3. IDE Optimization
echo "💻 Optimizing IDE performance..."

# Cursor IDE optimizations
echo "Cursor IDE optimization recommendations:"
echo "  - Disable unnecessary extensions"
echo "  - Reduce TypeScript service memory"
echo "  - Enable file watching exclusions"

# Create .cursorignore for better performance
cat > .cursorignore << EOF
node_modules/
.next/
.git/
dist/
build/
*.log
.DS_Store
coverage/
.nyc_output/
docker-data/
*.docker
Dockerfile*
docker-compose*.yml
EOF

# 4. Next.js Development Optimization
echo "⚡ Optimizing Next.js development..."

# Create optimized next.config.mjs
cat > next.config.optimized.mjs << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    // Reduce memory usage
    workerThreads: false,
    esmExternals: true,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Development optimizations
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git', '**/.next'],
      }
      
      // Reduce memory usage
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },
  
  // Reduce bundle size
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['vehicleimages.ukvehicledata.co.uk'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variables (existing)
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    VDG_API_KEY: process.env.VDG_API_KEY,
    SWS_API_KEY: process.env.SWS_API_KEY,
    SCRAPINGBEE_API_KEY: process.env.SCRAPINGBEE_API_KEY,
  },
}

export default nextConfig
EOF

echo "✅ Development environment optimization complete!"
echo ""
echo "📋 Manual steps to complete optimization:"
echo "1. Restart Docker Desktop with reduced resource allocation"
echo "2. Replace next.config.mjs with next.config.optimized.mjs if needed"
echo "3. Restart Cursor IDE"
echo "4. Run: npm run dev"
echo ""
echo "🎯 Expected improvements:"
echo "  - Reduced memory usage"
echo "  - Faster IDE response"
echo "  - Improved Docker performance"
echo "  - Faster Next.js compilation"
