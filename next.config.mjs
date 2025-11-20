import webpack from 'webpack';

// Log environment variables for debugging
console.log('Environment variables in next.config.mjs:', {
  DATABASE_URL: process.env.DATABASE_URL ? '***' : 'Not set',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY ? '***' : 'Not set'
});

// Only expose necessary environment variables to the browser
const publicEnvVars = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_DVSA_API_ENABLED: process.env.DVSA_API_KEY ? 'true' : 'false',
  NEXT_PUBLIC_MINIMAX_ENABLED: process.env.MINIMAX_API_KEY ? 'true' : 'false'
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

  // Disable static optimization to avoid context issues during build
  output: 'standalone',

  // Skip static generation for problematic pages
  experimental: {
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true
  },

  // Custom webpack configuration
  webpack: (config, { isServer }) => {
    // Only expose public environment variables to the client
    if (!isServer) {
      config.plugins.push(
        new webpack.EnvironmentPlugin({
          NEXT_PUBLIC_APP_URL: publicEnvVars.NEXT_PUBLIC_APP_URL,
          NEXT_PUBLIC_DVSA_API_ENABLED: publicEnvVars.NEXT_PUBLIC_DVSA_API_ENABLED,
          NEXT_PUBLIC_MINIMAX_ENABLED: publicEnvVars.NEXT_PUBLIC_MINIMAX_ENABLED
        })
      );
    }

    return config;
  }
};

export default nextConfig;
