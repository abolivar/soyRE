import Link from 'next/link';
import { BrandLogo } from '../../components/brand-logo';
import { LoginForm } from '../../components/login-form';
import { resolveLoginRedirectTarget } from '../../lib/auth-routing';

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = resolveLoginRedirectTarget(params.next);

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
            <BrandLogo />
          </Link>
          <h1>Ingresar</h1>
          <p className="lead">
            Acceso al espacio operativo de propiedades, clientes y usuarios.
          </p>
        </div>

        <LoginForm redirectTo={redirectTo} />

        <p className="muted-row">
          <span>¿Sin cuenta?</span>
          <Link href="/register">Crear organización</Link>
        </p>
      </section>
    </main>
  );
}
