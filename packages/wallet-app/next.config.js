/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    appDir: true,
  },
  env: {
    BLOCKCHAIN_API_URL: process.env.BLOCKCHAIN_API_URL || 'http://localhost:3001',
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:3001/api/auth/:path*',
      },
      {
        source: '/api/transactions/pending',
        destination: 'http://localhost:3001/api/transactions/pending',
      },
      {
        source: '/api/blocks/:path*',
        destination: 'http://localhost:3001/api/blocks/:path*',
      },
      {
        source: '/api/transactions/:path*',
        destination: 'http://localhost:3001/api/transactions/:path*',
      },
      {
        source: '/api/blockchain/:path*',
        destination: 'http://localhost:3001/api/blockchain/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig
