import webpack from 'webpack';

// Log environment variables for debugging
console.log('Environment variables in next.config.mjs:', {
  DATABASE_URL: process.env.DATABASE_URL ? '***' : 'Not set',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY ? '***' : 'Not set',
  SCRAPINGBEE_API_KEY: process.env.SCRAPINGBEE_API_KEY ? '***' : 'Not set',
  VDG_API_KEY: process.env.VDG_API_KEY ? '***' : 'Not set',
  SWS_API_KEY: process.env.SWS_API_KEY ? '***' : 'Not set'
});

// Only expose necessary environment variables to the browser
const publicEnvVars = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_DVSA_API_ENABLED: (process.env.DVSA_API_KEY && process.env.DVSA_API_KEY.length > 0) ? 'true' : 'false',
  NEXT_PUBLIC_MINIMAX_ENABLED: (process.env.MINIMAX_API_KEY && process.env.MINIMAX_API_KEY.length > 0) ? 'true' : 'false'
};

// Log which environment variables are being exposed
console.log('Exposing environment variables to the browser:', Object.keys(publicEnvVars));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow ngrok domain for development
  allowedDevOrigins: ['garage-manager.eu.ngrok.io'],

  // Expose environment variables to the client-side
  env: publicEnvVars,


  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['hebbkx1anhila5yf.public.blob.vercel-storage.com']
  },
  async headers() {
    return [
      {
        // Apply CORS headers to API routes
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, x-api-key",
          },
        ],
      },
    ];
  },
  // External packages that should be bundled with the server
  serverExternalPackages: ['papaparse'],

  // Disable static generation for error pages to avoid context issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Enable standalone output for Docker
  output: 'standalone',

  // Skip static generation for problematic pages
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,

  // Custom webpack configuration
  webpack: (config, { isServer, dev }) => {
    // Add error handling for webpack module resolution
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Only expose public environment variables to the client
    if (!isServer) {
      try {
        config.plugins.push(
          new webpack.EnvironmentPlugin({
            NEXT_PUBLIC_APP_URL: publicEnvVars.NEXT_PUBLIC_APP_URL,
            NEXT_PUBLIC_DVSA_API_ENABLED: publicEnvVars.NEXT_PUBLIC_DVSA_API_ENABLED,
            NEXT_PUBLIC_MINIMAX_ENABLED: publicEnvVars.NEXT_PUBLIC_MINIMAX_ENABLED
          })
        );
      } catch (error) {
        console.warn('Webpack EnvironmentPlugin error:', error);
      }
    }

    // Add development optimizations to prevent memory issues
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 244000, // 244KB chunks
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }

    return config;
  }
};

export default nextConfig;
