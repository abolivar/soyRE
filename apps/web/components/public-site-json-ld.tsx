import {
  absolutePublicUrl,
  publicSiteDescription,
  publicSiteName,
} from '../lib/public-site';

const publicSiteGraph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@id': `${absolutePublicUrl()}#website`,
      '@type': 'WebSite',
      description: publicSiteDescription,
      inLanguage: 'es-419',
      name: publicSiteName,
      url: absolutePublicUrl(),
    },
    {
      '@id': `${absolutePublicUrl()}#organization`,
      '@type': 'Organization',
      description: publicSiteDescription,
      email: 'hola@soypms.com',
      logo: absolutePublicUrl('/brands/soypms/seal-teal.svg'),
      name: publicSiteName,
      url: absolutePublicUrl(),
    },
    {
      '@id': `${absolutePublicUrl()}#application`,
      '@type': 'WebApplication',
      applicationCategory: 'BusinessApplication',
      description: publicSiteDescription,
      inLanguage: 'es-419',
      name: publicSiteName,
      operatingSystem: 'Web',
      provider: {
        '@id': `${absolutePublicUrl()}#organization`,
      },
      url: absolutePublicUrl(),
    },
  ],
};

export function PublicSiteJsonLd() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(publicSiteGraph).replace(/</g, '\\u003c'),
      }}
      type="application/ld+json"
    />
  );
}
