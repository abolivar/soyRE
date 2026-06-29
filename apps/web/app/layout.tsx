import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'soyRE',
  description: 'Operational SaaS for real estate brokers.',
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
