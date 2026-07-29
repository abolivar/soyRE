import type { MetadataRoute } from 'next';
import { publicSiteDescription, publicSiteName } from '../lib/public-site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: 'rgb(249, 249, 248)',
    description: publicSiteDescription,
    display: 'standalone',
    icons: [
      {
        sizes: 'any',
        src: '/brands/soypms/seal-teal.svg',
        type: 'image/svg+xml',
      },
    ],
    lang: 'es-419',
    name: publicSiteName,
    short_name: publicSiteName,
    start_url: '/',
    theme_color: 'rgb(13, 63, 56)',
  };
}
