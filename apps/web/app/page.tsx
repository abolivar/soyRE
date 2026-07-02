import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '../components/brand-logo';
import { LoginForm } from '../components/login-form';

type LandingItem = {
  description: string;
  icon: LucideIcon;
  title: string;
};

const operatingAreas: LandingItem[] = [
  {
    description: 'Inventario, estado, disponibilidad y contexto operativo de cada inmueble.',
    icon: Building2,
    title: 'Propiedades',
  },
  {
    description: 'Clientes vinculados al ciclo inmobiliario sin convertir el sistema en CRM generico.',
    icon: UsersRound,
    title: 'Clientes',
  },
  {
    description: 'Mandatos, soportes, identidad y archivos asociados a cada operación.',
    icon: FileText,
    title: 'Documentos',
  },
  {
    description: 'Seguimiento de oportunidades, tareas y estados con una vista compartida.',
    icon: ListChecks,
    title: 'Procesos',
  },
];

const scopeItems = [
  'Operación diaria de propiedades, clientes, documentos y tareas.',
  'Separación por organización para equipos inmobiliarios multiusuario.',
  'Auditoría y permisos como base para crecer sin perder control.',
  'Venta y alquiler como dominios relacionados, pero no idénticos.',
];

const boundaryItems = [
  'No es un marketplace publico ni un portal de anuncios.',
  'No reemplaza contabilidad completa ni procesos legales externos.',
  'No persigue leads como CRM generico fuera del ciclo inmobiliario.',
  'No se disena alrededor de hojas sueltas ni datos simulados.',
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-product-backdrop" aria-hidden="true">
          <div className="workspace-preview">
            <div className="preview-sidebar">
              <BrandLogo decorative variant="seal" />
              <span />
              <span />
              <span />
            </div>
            <div className="preview-main">
              <div className="preview-topline" />
              <div className="preview-metrics">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-board">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <nav className="landing-nav" aria-label="Navegación pública">
          <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
            <BrandLogo />
          </Link>
          <div className="landing-nav-actions">
            <Link className="secondary-link" href="/login">
              <KeyRound size={17} strokeWidth={2.2} />
              Ingresar
            </Link>
            <Link className="primary-link" href="/register">
              Crear organización
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <p className="eyebrow">Workspace inmobiliario SaaS</p>
          <h1>SoyPMS</h1>
          <p className="landing-hero-copy">
            El sistema operativo para ordenar propiedades, clientes, documentos,
            tareas y procesos de venta o alquiler en una sola fuente de verdad.
          </p>
          <div className="landing-hero-actions">
            <Link className="primary-link" href="/login">
              Entrar al espacio
              <ArrowRight size={17} strokeWidth={2.2} />
            </Link>
            <Link className="secondary-link dark" href="#alcance">
              Ver alcance
            </Link>
          </div>
          <dl className="landing-hero-metrics" aria-label="Pilares de SoyPMS">
            <div>
              <dt>Multiusuario</dt>
              <dd>roles y permisos</dd>
            </div>
            <div>
              <dt>Multi-tenant</dt>
              <dd>por organización</dd>
            </div>
            <div>
              <dt>Remoto</dt>
              <dd>base gestionada</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="landing-access" id="acceso">
        <div className="landing-access-copy">
          <p className="eyebrow">Acceso activo</p>
          <h2>Entra a tu operación sin pasar por una página intermedia.</h2>
          <p>
            La página de inicio también sirve como puerta de trabajo para equipos
            activos. Si todavía estás configurando la organización, crea el administrador
            inicial y valida usuarios desde el módulo de sistema.
          </p>
        </div>
        <div className="landing-access-panel">
          <h2>Entrar</h2>
          <p>Acceso para organizaciones activas de SoyPMS.</p>
          <LoginForm
            className="landing-login-form"
            loadingLabel="Validando..."
            submitLabel="Entrar a mi panel"
          />
          <p className="landing-access-note">
            ¿Sin cuenta? <Link href="/register">Crear organización</Link>
          </p>
        </div>
      </section>

      <section className="landing-section" id="alcance">
        <div className="landing-section-head">
          <p className="eyebrow">Que resuelve</p>
          <h2>Un centro operativo para el ciclo inmobiliario.</h2>
          <p>
            SoyPMS no empieza por promesas abstractas. Empieza por las entidades
            que el equipo necesita operar todos los días.
          </p>
        </div>
        <div className="landing-capability-grid">
          {operatingAreas.map((item) => {
            const Icon = item.icon;

            return (
              <article className="landing-capability" key={item.title}>
                <span className="landing-capability-icon">
                  <Icon size={22} strokeWidth={2.2} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-scope">
        <div className="landing-scope-column">
          <span className="landing-scope-label">
            <CheckCircle2 size={18} strokeWidth={2.3} />
            Dentro del foco
          </span>
          <ul>
            {scopeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="landing-scope-column muted">
          <span className="landing-scope-label">
            <ShieldCheck size={18} strokeWidth={2.3} />
            Limites sanos
          </span>
          <ul>
            {boundaryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-final">
        <div>
          <p className="eyebrow">Criterio primero</p>
          <h2>Automatizacion despues.</h2>
          <p>
            La base queda preparada para crecer por módulos: propiedades, clientes,
            documentos, flujos, ofertas, negocios y comisiones.
          </p>
        </div>
        <div className="landing-final-actions">
          <Link className="primary-link" href="/dashboard">
            <LayoutDashboard size={17} strokeWidth={2.2} />
            Abrir dashboard
          </Link>
          <Link className="secondary-link" href="/register">
            Crear organización
          </Link>
        </div>
      </section>
    </main>
  );
}
