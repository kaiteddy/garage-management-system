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
            test: /[\/]node_modules[\/]/,
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
