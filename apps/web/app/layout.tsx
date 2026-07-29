import type { Metadata } from 'next';
import '@soyre/ui/styles';
import {
  publicSiteDescription,
  publicSiteName,
  resolvePublicSiteConfig,
} from '../lib/public-site';
import { PublicAnalytics } from '../components/public-analytics';
import './globals.css';

const publicSite = resolvePublicSiteConfig();
const verificationEnabled =
  process.env.PUBLIC_SITE_VERIFICATION_ENABLED?.trim().toLowerCase() ===
  'true';
const googleVerification = verificationEnabled
  ? process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()
  : undefined;
const bingVerification = verificationEnabled
  ? process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim()
  : undefined;

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
  verification:
    googleVerification || bingVerification
      ? {
          google: googleVerification,
          other: bingVerification
            ? {
                'msvalidate.01': bingVerification,
              }
            : undefined,
        }
      : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-419">
      <body>
        {children}
        <PublicAnalytics
          enabled={
            process.env.NEXT_PUBLIC_ANALYTICS_ENABLED?.trim().toLowerCase() ===
            'true'
          }
          measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
        />
      </body>
    </html>
  );
}
