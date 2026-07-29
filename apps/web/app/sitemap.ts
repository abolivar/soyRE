import type { MetadataRoute } from 'next';
import { resolvePublicSiteConfig } from '../lib/public-site';

const publicRoutes = [
  '/',
  '/producto',
  '/mandatos-y-expedientes',
  '/comisiones-inmobiliarias',
  '/crm-inmobiliario-vs-soypms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const publicSite = resolvePublicSiteConfig();

  return publicRoutes.map((pathname) => ({
    changeFrequency: 'monthly',
    priority: pathname === '/' ? 1 : 0.7,
    url: new URL(pathname, publicSite.url).toString(),
  }));
}
