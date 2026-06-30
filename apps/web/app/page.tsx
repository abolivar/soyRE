import Link from 'next/link';
import { BrandLogo } from '../components/brand-logo';

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-content">
        <nav className="topbar">
          <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
            <BrandLogo />
          </Link>
          <Link href="/dashboard">Abrir workspace</Link>
        </nav>

        <div className="home-grid">
          <div>
            <p className="eyebrow">Workspace inmobiliario</p>
            <h1>Operacion, inventario y acceso en un mismo sistema.</h1>
            <p className="lead">
              Punto de entrada para revisar el layout base, el lenguaje visual
              generico y los primeros modulos reutilizables de SoyPMS.
            </p>
          </div>

          <div className="action-panel">
            <Link className="primary-link" href="/dashboard">
              Ver dashboard
            </Link>
            <Link className="secondary-link" href="/login">
              Ingresar
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
