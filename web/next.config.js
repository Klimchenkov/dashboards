/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static generation cache
  generateBuildId: async () => {
    return `${Date.now()}`
  },
  
  // Disable static cache in development
  experimental: {
    esmExternals: true,
  },
  
  // Add cache control headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Disable ETag generation
  generateEtags: false,
  
  // Disable x-powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;