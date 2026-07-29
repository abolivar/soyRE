import type { NextConfig } from 'next';
import path from 'node:path';

const workspaceRoot = path.resolve(process.cwd(), '../..');
const customDomainEnabled =
  process.env.PUBLIC_SITE_CUSTOM_DOMAIN_ENABLED?.trim().toLowerCase() ===
  'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    if (!customDomainEnabled) {
      return [];
    }

    return [
      {
        destination: 'https://soypms.com/:path*',
        has: [{ type: 'host', value: 'www.soypms.com' }],
        permanent: true,
        source: '/:path*',
      },
      {
        destination: 'https://soypms.com/:path*',
        has: [{ type: 'host', value: 'soypms-alpha.vercel.app' }],
        permanent: true,
        source: '/:path*',
      },
    ];
  },
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
