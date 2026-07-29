import type { Metadata } from 'next';
import '@soyre/ui/styles';
import {
  publicSiteDescription,
  publicSiteName,
  resolvePublicSiteConfig,
} from '../lib/public-site';
import './globals.css';

const publicSite = resolvePublicSiteConfig();

export const metadata: Metadata = {
  metadataBase: publicSite.url,
  title: {
    default: publicSiteName,
    template: `%s | ${publicSiteName}`,
  },
  description: publicSiteDescription,
  icons: {
    icon: '/brands/soypms/seal-teal.svg',
  },
  openGraph: {
    description: publicSiteDescription,
    images: ['/opengraph-image'],
    locale: 'es_419',
    siteName: publicSiteName,
    title: publicSiteName,
    type: 'website',
  },
  robots: publicSite.indexingEnabled
    ? {
        follow: true,
        googleBot: {
          follow: true,
          index: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
        index: true,
      }
    : {
        follow: false,
        index: false,
      },
  twitter: {
    card: 'summary_large_image',
    description: publicSiteDescription,
    images: ['/twitter-image'],
    title: publicSiteName,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-419">
      <body>{children}</body>
    </html>
  );
}
