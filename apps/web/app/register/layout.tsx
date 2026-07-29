import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Alta privada de una organización en SoyPMS.',
  robots: {
    follow: true,
    index: false,
  },
  title: 'Crear organización',
};

export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
