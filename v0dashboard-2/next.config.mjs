/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_DVSA_API_ENABLED: process.env.DVSA_API_KEY ? 'true' : 'false',
    NEXT_PUBLIC_MINIMAX_ENABLED: process.env.MINIMAX_API_KEY ? 'true' : 'false'
  }
};

export default nextConfig;
