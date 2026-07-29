import { Button } from '@soyre/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from './brand-logo';
import { PublicLandingNavigation } from './public-landing-navigation';

export const demoHref =
  'mailto:hola@soypms.com?subject=Quiero%20ver%20una%20demo%20de%20SoyPMS';

export function DemoButton({
  children = 'Ver una demo',
}: {
  children?: ReactNode;
}) {
  return (
    <Button
      asChild
      className="landing-demo-cta landing-demo-cta-coral"
      data-demo-cta
      variant="primary"
    >
      <a href={demoHref}>{children}</a>
    </Button>
  );
}

export function PublicMarketingHeader() {
  return <PublicLandingNavigation demoHref={demoHref} />;
}

export function PublicMarketingFooter() {
  return (
    <footer className="public-landing-footer">
      <div className="public-landing-container">
        <div className="public-landing-footer-main">
          <div className="public-landing-footer-brand">
            <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
              <BrandLogo />
            </Link>
            <p>
              Software de operación inmobiliaria para agencias y equipos en
              Latinoamérica. Producto en alpha guiada.
            </p>
          </div>
          <div className="public-landing-footer-links">
            <div>
              <strong>Producto</strong>
              <Link href="/producto">Producto</Link>
              <Link href="/#como-funciona">Cómo funciona</Link>
              <Link href="/#alcance">Alcance</Link>
              <Link href="/mandatos-y-expedientes">Mandatos y expedientes</Link>
              <Link href="/comisiones-inmobiliarias">Comisiones</Link>
              <Link href="/crm-inmobiliario-vs-soypms">CRM y SoyPMS</Link>
            </div>
            <div>
              <strong>Contacto</strong>
              <a href="mailto:hola@soypms.com">hola@soypms.com</a>
              <Link href="/login">Ingresar</Link>
            </div>
          </div>
        </div>
        <div className="public-landing-footer-legal">
          <span>© 2026 SoyPMS. Todos los derechos reservados.</span>
          <span>Latinoamérica · Español</span>
        </div>
      </div>
    </footer>
  );
}
