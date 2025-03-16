/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Enable detailed logging for API requests in both development and production
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Add async headers for CORS
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ]
      }
    ]
  },
  
  // Enhanced proxy for API requests to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/api/hyperlane/:path*',
        destination: 'https://explorer.hyperlane.xyz/api/:path*',
        // Add basePath: false to make sure the proxy works in all environments
        basePath: false,
      },
    ]
  }
};

module.exports = nextConfig;
