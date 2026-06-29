import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-shell">
      <section className="home-content">
        <nav className="topbar">
          <span className="brand-link">soyRE</span>
          <Link href="/login">Ingresar</Link>
        </nav>

        <div className="home-grid">
          <div>
            <p className="eyebrow">SaaS inmobiliario operativo</p>
            <h1>Usuarios y organizaciones listos para operar.</h1>
            <p className="lead">
              Registro de owner, login, sesion segura, memberships por
              organizacion y validacion administrativa de usuarios.
            </p>
          </div>

          <div className="action-panel">
            <Link className="primary-link" href="/register">
              Crear organizacion
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
