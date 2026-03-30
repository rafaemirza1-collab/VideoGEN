/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
      {
        source: '/capture',
        destination: 'http://localhost:3001/capture',
      },
      {
        source: '/generate',
        destination: 'http://localhost:3001/generate',
      },
      {
        source: '/music-list',
        destination: 'http://localhost:3001/music-list',
      },
      {
        source: '/output/:path*',
        destination: 'http://localhost:3001/output/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
