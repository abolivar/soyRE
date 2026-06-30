'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { BrandLogo } from '../../components/brand-logo';
import { apiFetch, AuthUser } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      await apiFetch<{ user: AuthUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          organizationName: form.get('organizationName'),
          organizationSlug: form.get('organizationSlug') || undefined,
          firstName: form.get('firstName'),
          lastName: form.get('lastName') || undefined,
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      router.push('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel wide">
        <div>
          <Link className="brand-link" href="/" aria-label="SoyPMS inicio">
            <BrandLogo />
          </Link>
          <h1>Crear organizacion</h1>
          <p className="lead">
            Crea el owner inicial y deja la organizacion lista para validacion
            de usuarios.
          </p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label>
              Organizacion
              <input name="organizationName" required />
            </label>
            <label>
              Slug
              <input name="organizationSlug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </label>
          </div>
          <div className="field-grid">
            <label>
              Nombre
              <input name="firstName" required />
            </label>
            <label>
              Apellido
              <input name="lastName" />
            </label>
          </div>
          <label>
            Email
            <input name="email" required type="email" />
          </label>
          <label>
            Contrasena
            <input minLength={10} name="password" required type="password" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creando...' : 'Crear'}
          </button>
        </form>

        <p className="muted-row">
          <span>Ya tienes cuenta?</span>
          <Link href="/login">Ingresar</Link>
        </p>
      </section>
    </main>
  );
}
