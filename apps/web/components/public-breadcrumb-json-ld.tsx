import { resolvePublicSiteConfig } from '../lib/public-site';

type Breadcrumb = {
  name: string;
  pathname: string;
};

export function PublicBreadcrumbJsonLd({
  breadcrumbs,
}: {
  breadcrumbs: Breadcrumb[];
}) {
  const publicSite = resolvePublicSiteConfig();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      item: new URL(breadcrumb.pathname, publicSite.url).toString(),
      name: breadcrumb.name,
      position: index + 1,
    })),
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
      type="application/ld+json"
    />
  );
}
