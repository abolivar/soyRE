import type { MetadataRoute } from 'next';
import { resolvePublicSiteConfig } from '../lib/public-site';

export default function robots(): MetadataRoute.Robots {
  const publicSite = resolvePublicSiteConfig();

  if (!publicSite.indexingEnabled) {
    return {
      host: publicSite.url.toString(),
      rules: {
        disallow: '/',
        userAgent: '*',
      },
      sitemap: new URL('/sitemap.xml', publicSite.url).toString(),
    };
  }

  return {
    host: publicSite.url.toString(),
    rules: [
      {
        allow: '/',
        disallow: '/api/',
        userAgent: '*',
      },
      {
        allow: '/',
        userAgent: ['Googlebot', 'Bingbot'],
      },
      {
        allow: '/',
        userAgent: ['OAI-SearchBot', 'PerplexityBot'],
      },
      {
        disallow: '/',
        userAgent: ['GPTBot', 'Google-Extended'],
      },
    ],
    sitemap: new URL('/sitemap.xml', publicSite.url).toString(),
  };
}
