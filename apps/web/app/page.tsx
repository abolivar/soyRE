import { StatusBadge } from '@soyre/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  DemoButton,
  PublicMarketingFooter,
  PublicMarketingHeader,
} from '../components/public-marketing';
import { PublicDemoRequestSection } from '../components/public-demo-request-section';
import { PublicSiteJsonLd } from '../components/public-site-json-ld';

const homeTitle = 'Software inmobiliario para agencias y equipos | SoyPMS';
const homeDescription =
  'Centraliza propiedades, mandatos, expedientes, tareas, ofertas, cierres y comisiones. SoyPMS opera tu cartera sin reemplazar tu CRM. Solicita una demo.';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  title: {
    absolute: homeTitle,
  },
  description: homeDescription,
  openGraph: {
    description: homeDescription,
    title: homeTitle,
    url: '/',
  },
};

const contextSignals = [
  'Datos aislados por organización',
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

const publicJourneys = [
  {
    description:
      'Propiedades, tareas, ofertas y cierres conectados en un recorrido operativo.',
    href: '/producto',
    title: 'Producto',
  },
  {
    description:
      'Vigencias, responsables y documentos unidos al inmueble que los origina.',
    href: '/mandatos-y-expedientes',
    title: 'Mandatos y expedientes',
  },
  {
    description:
      'Participantes y reglas de reparto visibles junto al negocio cerrado.',
    href: '/comisiones-inmobiliarias',
    title: 'Comisiones inmobiliarias',
  },
  {
    description:
      'Una separación clara entre el seguimiento comercial y la operación de cartera.',
    href: '/crm-inmobiliario-vs-soypms',
    title: 'CRM inmobiliario y SoyPMS',
  },
];

const securityPrinciples = [
  {
    description:
      'La organización es la frontera de acceso para los datos de cada agencia o equipo.',
    title: 'Aislamiento por organización',
  },
  {
    description:
      'La visibilidad y las acciones disponibles dependen de la responsabilidad de cada rol.',
    title: 'Permisos explícitos',
  },
  {
    description:
      'Los cambios relevantes conservan autor y momento para facilitar revisión operativa.',
    title: 'Trazabilidad',
  },
];

const frequentlyAskedQuestions = [
  {
    answer:
      'No. El CRM puede seguir gestionando prospección, contactos y oportunidades. SoyPMS organiza la continuidad operativa de cada propiedad desde la captación.',
    question: '¿SoyPMS reemplaza mi CRM inmobiliario?',
  },
  {
    answer:
      'SoyPMS está en alpha guiada. La demo permite validar el recorrido disponible y confirmar si encaja con la forma de operar de tu equipo.',
    question: '¿El producto ya está disponible?',
  },
  {
    answer:
      'Está pensado para agencias y equipos inmobiliarios en Latinoamérica que comparten cartera, responsables, mandatos, documentos y cierres.',
    question: '¿Para quién está pensado SoyPMS?',
  },
  {
    answer:
      'Las imágenes del sitio son vistas ilustrativas del producto. No se presentan como capturas con datos reales de clientes.',
    question: '¿Los datos que aparecen en las vistas son reales?',
  },
];

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
      <PublicMarketingHeader />

      <header className="public-landing-hero" id="top">
        <div className="public-landing-container public-landing-hero-grid">
          <div className="public-landing-hero-copy" data-landing-reveal>
            <p className="public-landing-eyebrow">
              Software inmobiliario para agencias y equipos
            </p>
            <h1>Opera toda tu cartera, de la captación a la comisión.</h1>
            <p className="public-landing-lead">
              Centraliza propiedades, mandatos, expedientes, tareas, ofertas,
              cierres y comisiones sin reemplazar el CRM con el que tu equipo ya
              trabaja.
            </p>
            <p className="public-landing-differentiator">
              Tu CRM persigue el lead. SoyPMS opera la cartera.
            </p>
            <div className="public-landing-hero-action">
              <DemoButton />
              <small>Alpha guiada · Conversación inicial de 30 minutos.</small>
            </div>
          </div>

          <figure className="landing-hero-preview" data-landing-reveal>
            <PortfolioPreview />
            <figcaption>
              Vista ilustrativa del producto. No contiene datos de clientes.
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

      <section className="public-landing-section public-landing-definition">
        <div className="public-landing-container public-landing-container-narrow">
          <div className="public-landing-section-heading" data-landing-reveal>
            <p className="public-landing-eyebrow">Qué es SoyPMS</p>
            <h2 className="public-landing-section-title">
              Software de operación inmobiliaria para una cartera compartida.
            </h2>
            <p>
              SoyPMS mantiene el contexto de cada propiedad mientras avanza por
              mandato, expediente, tareas, oferta, cierre, comisión y archivo.
              La propiedad es la entidad central; la organización define la
              frontera de acceso del equipo.
            </p>
          </div>
          <div className="public-landing-journey-grid">
            {publicJourneys.map((journey) => (
              <Link data-landing-reveal href={journey.href} key={journey.href}>
                <strong>{journey.title}</strong>
                <span>{journey.description}</span>
                <small>Explorar →</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="public-landing-section">
        <div className="public-landing-container">
          <h2
            className="public-landing-section-title narrow"
            data-landing-reveal
          >
            Problemas operativos que el CRM no fue diseñado para resolver.
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
          <Link
            className="public-dark-link"
            data-landing-reveal
            href="/crm-inmobiliario-vs-soypms"
          >
            Comparar CRM inmobiliario y SoyPMS →
          </Link>
        </div>
      </section>

      <section className="public-landing-section public-landing-gallery-section">
        <div className="public-landing-container">
          <div className="public-landing-gallery-heading" data-landing-reveal>
            <h2 className="public-landing-section-title">
              Así se ve por dentro.
            </h2>
            <p>
              Vistas ilustrativas del producto. No contienen datos reales de
              clientes.
            </p>
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

      <section className="public-landing-section public-landing-security">
        <div className="public-landing-container public-landing-container-narrow">
          <div className="public-landing-section-heading" data-landing-reveal>
            <p className="public-landing-eyebrow">Seguridad operativa</p>
            <h2 className="public-landing-section-title">
              Control desde la arquitectura, no desde una hoja compartida.
            </h2>
            <p>
              SoyPMS aplica límites de acceso y conserva contexto operativo. No
              publicamos certificaciones ni promesas regulatorias que todavía no
              han sido verificadas.
            </p>
          </div>
          <div className="public-landing-lined-grid public-landing-security-grid">
            {securityPrinciples.map((principle) => (
              <article data-landing-reveal key={principle.title}>
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-landing-section public-landing-faq">
        <div className="public-landing-container public-landing-container-narrow">
          <div className="public-landing-section-heading" data-landing-reveal>
            <p className="public-landing-eyebrow">Preguntas frecuentes</p>
            <h2 className="public-landing-section-title">
              Lo esencial antes de solicitar una demo.
            </h2>
          </div>
          <div className="public-landing-faq-list">
            {frequentlyAskedQuestions.map((item) => (
              <details data-landing-reveal key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <PublicDemoRequestSection />

      <PublicMarketingFooter />
    </main>
  );
}
