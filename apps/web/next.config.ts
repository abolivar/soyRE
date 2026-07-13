import type { NextConfig } from 'next';
import path from 'node:path';

const workspaceRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiProxyUrl = process.env.API_PROXY_URL?.trim().replace(/\/$/, '');

    if (!apiProxyUrl) {
      return [];
    }

    return [
      {
        destination: `${apiProxyUrl}/api/:path*`,
        source: '/api/:path*',
      },
    ];
  },
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
