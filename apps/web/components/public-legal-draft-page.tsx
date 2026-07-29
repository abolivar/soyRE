import Link from 'next/link';
import {
  PublicMarketingFooter,
  PublicMarketingHeader,
} from './public-marketing';

type LegalSection = {
  body: string[];
  title: string;
};

export function PublicLegalDraftPage({
  sections,
  title,
}: {
  sections: LegalSection[];
  title: string;
}) {
  return (
    <main className="public-landing public-legal-page">
      <PublicMarketingHeader />
      <header className="public-content-hero">
        <div className="public-landing-container public-landing-container-narrow">
          <p className="public-landing-eyebrow">Borrador no aprobado</p>
          <h1>{title}</h1>
          <p className="public-content-lead">
            Este texto es un borrador operativo pendiente de revisión legal. No
            representa todavía una política vigente ni habilita captura,
            medición o indexación.
          </p>
        </div>
      </header>
      <div className="public-content-body">
        <div className="public-landing-container public-landing-container-narrow">
          {sections.map((section) => (
            <section className="public-content-section" key={section.title}>
              <h2>{section.title}</h2>
              <div className="public-content-prose">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
          <p className="public-legal-back">
            <Link href="/">Volver al sitio público</Link>
          </p>
        </div>
      </div>
      <PublicMarketingFooter />
    </main>
  );
}
