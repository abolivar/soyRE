import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SoyPMS',
  description: 'Workspace operativo para equipos inmobiliarios.',
  icons: {
    icon: '/brands/soypms/seal-teal.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
