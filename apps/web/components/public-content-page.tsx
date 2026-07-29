import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicBreadcrumbJsonLd } from './public-breadcrumb-json-ld';
import {
  DemoButton,
  PublicMarketingFooter,
  PublicMarketingHeader,
} from './public-marketing';

export type PublicContentSection = {
  body: ReactNode;
  title: string;
};

type RelatedLink = {
  description: string;
  href: string;
  label: string;
};

type PublicContentPageProps = {
  eyebrow: string;
  intro: string;
  pathname: string;
  relatedLinks: RelatedLink[];
  sections: PublicContentSection[];
  title: string;
};

export function PublicContentPage({
  eyebrow,
  intro,
  pathname,
  relatedLinks,
  sections,
  title,
}: PublicContentPageProps) {
  return (
    <main className="public-landing public-content-page">
      <PublicBreadcrumbJsonLd
        breadcrumbs={[
          { name: 'Inicio', pathname: '/' },
          { name: title, pathname },
        ]}
      />
      <PublicMarketingHeader />

      <header className="public-content-hero">
        <div className="public-landing-container public-landing-container-narrow">
          <nav className="public-breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{eyebrow}</span>
          </nav>
          <p className="public-landing-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="public-content-lead">{intro}</p>
          <div className="public-content-hero-actions">
            <DemoButton />
            <Link className="public-text-link" href="/#como-funciona">
              Ver el recorrido operativo
            </Link>
          </div>
        </div>
      </header>

      <div className="public-content-body">
        <div className="public-landing-container public-landing-container-narrow">
          {sections.map((section) => (
            <section className="public-content-section" key={section.title}>
              <h2>{section.title}</h2>
              <div className="public-content-prose">{section.body}</div>
            </section>
          ))}
        </div>
      </div>

      <section
        className="public-landing-section public-related-section"
        aria-labelledby="related-title"
      >
        <div className="public-landing-container public-landing-container-narrow">
          <h2 id="related-title">Sigue explorando la operación inmobiliaria</h2>
          <div className="public-related-grid">
            {relatedLinks.map((relatedLink) => (
              <Link href={relatedLink.href} key={relatedLink.href}>
                <strong>{relatedLink.label}</strong>
                <span>{relatedLink.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="public-landing-closing" id="demo">
        <div>
          <p className="public-landing-eyebrow">Alpha guiada</p>
          <h2>Revisa tu operación con el equipo de SoyPMS.</h2>
          <p>
            Una conversación de 30 minutos para entender tu cartera y mostrarte
            el alcance actual del producto.
          </p>
          <DemoButton />
        </div>
      </section>

      <PublicMarketingFooter />
    </main>
  );
}
