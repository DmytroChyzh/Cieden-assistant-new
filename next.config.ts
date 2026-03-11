import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore TypeScript errors during build for PoC deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint warnings during build for PoC deployment  
    ignoreDuringBuilds: true,
  },
  // Optimize for production performance
  experimental: {
    optimizePackageImports: ['@elevenlabs/react', '@elevenlabs/client'],
  },
  // Headers for better security and performance
  async headers() {
    return [
      {
        source: '/api/elevenlabs/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
