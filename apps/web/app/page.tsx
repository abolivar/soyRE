import { Button, StatusBadge } from '@soyre/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from '../components/brand-logo';
import { PublicLandingNavigation } from '../components/public-landing-navigation';
import { PublicSiteJsonLd } from '../components/public-site-json-ld';

const demoHref =
  'mailto:hola@soypms.com?subject=Quiero%20ver%20una%20demo%20de%20SoyPMS';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  title: {
    absolute: 'SoyPMS | Operación inmobiliaria para Latinoamérica',
  },
  description:
    'Mandatos, expedientes, tareas y comisiones de toda tu cartera en un solo lugar, sin reemplazar el CRM de tu equipo.',
  openGraph: {
    description:
      'Mandatos, expedientes, tareas y comisiones de toda tu cartera en un solo lugar, sin reemplazar el CRM de tu equipo.',
    title: 'SoyPMS | Operación inmobiliaria para Latinoamérica',
    url: '/',
  },
};

const contextSignals = [
  'Cada agencia con su propia base de datos',
  'Permisos y visibilidad por rol de agente',
  'Historial de quién cambió qué, y cuándo',
];

const operationalProblems = [
  {
    description:
      'Fechas de exclusividad, prórrogas y vencimientos viven en la cabeza del broker o en una hoja de cálculo que solo una persona mantiene.',
    title: 'El mandato que venció y nadie vio.',
  },
  {
    description:
      'Cada cierre se reparte distinto entre captador, colocador y agencia, y el cálculo se rehace desde cero en cada operación.',
    title: 'La comisión que se recalcula a mano.',
  },
  {
    description:
      'Cédulas, avalúos, mandatos firmados y soportes dispersos entre chats, correos y carpetas locales de cada agente.',
    title: 'El expediente repartido en WhatsApp.',
  },
];

const operatingEntities = [
  {
    description:
      'Inventario con estado real, disponibilidad, exclusividad y vencimiento de mandato.',
    title: 'Propiedades',
  },
  {
    description:
      'Propietarios, interesados y contrapartes vinculados a la operación, no a un embudo de ventas.',
    title: 'Clientes',
  },
  {
    description:
      'Mandato, cédula, avalúo y soportes atados al inmueble y a la operación que los originó.',
    title: 'Documentos',
  },
  {
    description:
      'Ofertas, tareas y estados en una vista que todo el equipo lee igual.',
    title: 'Procesos',
  },
];

const crmStages = ['Prospección', 'Lead', 'Contacto inicial'];
const soypmsStages = [
  'Captación',
  'Mandato',
  'Expediente',
  'Oferta',
  'Cierre',
  'Comisión',
];

const portfolioRows = [
  {
    expiration: '14/08/2026',
    name: 'Apt. Costa del Este 12B',
    operation: 'Venta',
    status: 'Activa',
    tone: 'primary' as const,
  },
  {
    expiration: '02/09/2026',
    name: 'Casa Clayton 7',
    operation: 'Alquiler',
    status: 'Alquiler',
    tone: 'rent' as const,
  },
  {
    expiration: '05/08/2026',
    name: 'Local Obarrio 04',
    operation: 'Venta',
    status: 'Por vencer',
    tone: 'warning' as const,
  },
  {
    expiration: '21/10/2026',
    name: 'Oficina Punta Pacífica',
    operation: 'Venta',
    status: 'Destacada',
    tone: 'featured' as const,
  },
];

const scopeItems = [
  'Operación diaria de propiedades, clientes, documentos y tareas.',
  'Separación por organización para equipos con varios agentes.',
  'Auditoría y permisos como base, no como módulo posterior.',
  'Venta y alquiler como dominios relacionados, con reglas distintas.',
];

const boundaryItems = [
  'No es un portal público de anuncios ni un marketplace.',
  'No reemplaza la contabilidad completa de la agencia.',
  'No persigue leads fuera del ciclo inmobiliario.',
  'No se construye sobre datos simulados ni hojas sueltas.',
];

function DemoButton({ children = 'Ver una demo' }: { children?: ReactNode }) {
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

function PortfolioPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        'landing-product-screen',
        'landing-portfolio-preview',
        compact ? 'landing-product-screen-compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="landing-product-screen-header">
        <div className="landing-product-screen-title">
          <strong>Cartera</strong>
          <span>Inmobiliaria Vista Mar</span>
        </div>
        <small>28 propiedades</small>
      </div>
      <div className="landing-portfolio-table" role="presentation">
        <div className="landing-portfolio-heading">Propiedad</div>
        <div className="landing-portfolio-heading">Operación</div>
        <div className="landing-portfolio-heading">Mandato vence</div>
        <div className="landing-portfolio-heading">Estado</div>
        {portfolioRows.map((row) => (
          <div className="landing-portfolio-row" key={row.name}>
            <strong>{row.name}</strong>
            <span>{row.operation}</span>
            <span className={row.tone === 'warning' ? 'is-warning' : undefined}>
              {row.expiration}
            </span>
            <span className="landing-portfolio-status">
              <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyFilePreview() {
  const documents = [
    ['Mandato firmado.pdf', '14/07/2026'],
    ['Cédula propietario.pdf', '14/07/2026'],
    ['Avalúo comercial.pdf', '18/07/2026'],
  ];

  return (
    <div className="landing-product-screen landing-property-preview">
      <div className="landing-property-heading">
        <strong>Apt. Costa del Este 12B</strong>
        <span>Venta · Mandato exclusivo vence 14/08/2026</span>
      </div>
      <div className="landing-property-tabs">
        <strong>Documentos</strong>
        <span>Tareas</span>
        <span>Ofertas</span>
      </div>
      <div className="landing-document-list">
        {documents.map(([name, date]) => (
          <div key={name}>
            <span>{name}</span>
            <small>{date}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommissionPreview() {
  const allocations = [
    ['Captador · 40%', 'B/. 3,700'],
    ['Colocador · 40%', 'B/. 3,700'],
    ['Agencia · 20%', 'B/. 1,850'],
  ];

  return (
    <div className="landing-product-screen landing-commission-preview">
      <div className="landing-product-screen-header">
        <strong>Cierre y comisión</strong>
        <StatusBadge tone="success">Cerrada</StatusBadge>
      </div>
      <div className="landing-closing-price">
        <span>Precio de cierre</span>
        <strong>B/. 185,000</strong>
      </div>
      <div className="landing-allocation-list">
        {allocations.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="public-landing">
      <PublicSiteJsonLd />
      <PublicLandingNavigation demoHref={demoHref} />

      <header className="public-landing-hero" id="top">
        <div className="public-landing-container public-landing-hero-grid">
          <div className="public-landing-hero-copy" data-landing-reveal>
            <p className="public-landing-eyebrow">
              PMS inmobiliario para Latinoamérica
            </p>
            <h1>Tu CRM persigue el lead. SoyPMS opera la cartera.</h1>
            <p className="public-landing-lead">
              Mandatos, expedientes, tareas y comisiones de toda tu cartera en
              un solo lugar. Sin pedirte que cambies el CRM con el que tu equipo
              ya trabaja.
            </p>
            <div className="public-landing-hero-action">
              <DemoButton />
              <small>30 minutos, con tu propia cartera en pantalla.</small>
            </div>
          </div>

          <figure className="landing-hero-preview" data-landing-reveal>
            <PortfolioPreview />
            <figcaption>
              Vista ilustrativa del producto — se reemplazará por una captura
              definitiva.
            </figcaption>
          </figure>
        </div>
      </header>

      <section
        className="public-landing-context"
        id="producto"
        aria-label="Contexto operativo"
      >
        <div className="public-landing-container public-landing-context-grid">
          {contextSignals.map((signal) => (
            <p data-landing-reveal key={signal}>
              {signal}
            </p>
          ))}
        </div>
      </section>

      <section className="public-landing-section">
        <div className="public-landing-container">
          <h2
            className="public-landing-section-title narrow"
            data-landing-reveal
          >
            Lo que tu CRM no estaba hecho para resolver.
          </h2>
          <div className="public-landing-lined-grid public-landing-problem-grid">
            {operationalProblems.map((problem) => (
              <article data-landing-reveal key={problem.title}>
                <h3>{problem.title}</h3>
                <p>{problem.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="public-landing-section public-landing-entities"
        id="alcance"
      >
        <div className="public-landing-container">
          <div className="public-landing-section-heading" data-landing-reveal>
            <p className="public-landing-eyebrow">Alcance</p>
            <h2 className="public-landing-section-title">
              Cuatro entidades, una sola fuente de verdad.
            </h2>
          </div>
          <div className="public-landing-lined-grid public-landing-entity-grid">
            {operatingEntities.map((entity) => (
              <article data-landing-reveal key={entity.title}>
                <h3>{entity.title}</h3>
                <p>{entity.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-landing-crm" id="como-funciona">
        <div className="public-landing-container public-landing-container-narrow">
          <div className="public-landing-crm-copy" data-landing-reveal>
            <h2>No te pedimos que cambies de CRM.</h2>
            <p>
              Tu equipo comercial sigue trabajando donde ya trabaja. SoyPMS toma
              la operación desde que hay una propiedad captada: mandato,
              expediente, tareas, oferta, cierre y liquidación de comisión.
            </p>
          </div>
          <div className="public-landing-crm-diagram" data-landing-reveal>
            <div className="public-landing-crm-block">
              <p>Tu CRM</p>
              <div className="public-landing-crm-list">
                {crmStages.map((stage) => (
                  <span key={stage}>{stage}</span>
                ))}
              </div>
            </div>
            <span className="public-landing-crm-arrow" aria-hidden="true">
              →
            </span>
            <div className="public-landing-crm-block public-landing-crm-block-primary">
              <p>SoyPMS</p>
              <div className="public-landing-crm-chips">
                {soypmsStages.map((stage) => (
                  <span key={stage}>{stage}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="public-landing-section public-landing-gallery-section">
        <div className="public-landing-container">
          <div className="public-landing-gallery-heading" data-landing-reveal>
            <h2 className="public-landing-section-title">
              Así se ve por dentro.
            </h2>
            <p>Vistas ilustrativas del producto.</p>
          </div>
          <div
            className="public-landing-gallery"
            aria-label="Vistas ilustrativas de SoyPMS"
          >
            <figure data-landing-reveal>
              <PortfolioPreview compact />
              <figcaption>
                <strong>Panel de cartera</strong>
                <span>
                  Estado real de cada propiedad, sin abrir una hoja de cálculo.
                </span>
              </figcaption>
            </figure>
            <figure data-landing-reveal>
              <PropertyFilePreview />
              <figcaption>
                <strong>Ficha de propiedad</strong>
                <span>
                  Mandato, documentos y tareas en el mismo lugar que el
                  inmueble.
                </span>
              </figcaption>
            </figure>
            <figure data-landing-reveal>
              <CommissionPreview />
              <figcaption>
                <strong>Cierre y comisión</strong>
                <span>
                  El reparto calculado una vez y guardado con la operación.
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="public-landing-section public-landing-scope">
        <div className="public-landing-container public-landing-container-narrow">
          <div className="public-landing-section-heading" data-landing-reveal>
            <h2 className="public-landing-section-title">Alcance definido.</h2>
            <p>Preferimos decirlo antes de la demo y no después.</p>
          </div>
          <div className="public-landing-lined-grid public-landing-scope-grid">
            <article data-landing-reveal>
              <h3>Sí hace</h3>
              <ul>
                {scopeItems.map((item) => (
                  <li key={item}>
                    <span className="is-positive" aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <article data-landing-reveal>
              <h3>No hace</h3>
              <ul>
                {boundaryItems.map((item) => (
                  <li key={item}>
                    <span aria-hidden="true">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="public-landing-closing" id="demo">
        <div data-landing-reveal>
          <h2>Ordena la operación antes de automatizarla.</h2>
          <p>
            Te mostramos el sistema con tu propia cartera, en treinta minutos.
          </p>
          <DemoButton />
        </div>
      </section>

      <footer className="public-landing-footer">
        <div className="public-landing-container">
          <div className="public-landing-footer-main">
            <div className="public-landing-footer-brand">
              <Link
                className="brand-link"
                href="#top"
                aria-label="SoyPMS inicio"
              >
                <BrandLogo />
              </Link>
              <p>
                Sistema de operación de cartera inmobiliaria. Opera en Panamá.
              </p>
            </div>
            <div className="public-landing-footer-links">
              <div>
                <strong>Producto</strong>
                <Link href="#producto">Producto</Link>
                <Link href="#como-funciona">Cómo funciona</Link>
                <Link href="#alcance">Alcance</Link>
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
            <span>Panamá · Español</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
