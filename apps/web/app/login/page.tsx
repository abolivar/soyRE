'use client';

import Link from 'next/link';
import { BrandLogo } from '../../components/brand-logo';
import { LoginForm } from '../../components/login-form';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
            <BrandLogo />
          </Link>
          <h1>Ingresar</h1>
          <p className="lead">
            Acceso al workspace operativo de propiedades, clientes y usuarios.
          </p>
        </div>

        <LoginForm />

        <p className="muted-row">
          <span>Sin cuenta?</span>
          <Link href="/register">Crear organizacion</Link>
        </p>
      </section>
    </main>
  );
}
