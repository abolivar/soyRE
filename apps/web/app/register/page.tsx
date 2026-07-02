'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Input } from '@soyre/ui';
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
          <h1>Crear organización</h1>
          <p className="lead">
            Crea el administrador inicial y deja la organización lista para validación
            de usuarios.
          </p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <div className="field-grid">
            <Input
              id="register-organization-name"
              label="Organización"
              name="organizationName"
              required
            />
            <Input
              id="register-organization-slug"
              label="Slug"
              name="organizationSlug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </div>
          <div className="field-grid">
            <Input
              id="register-first-name"
              label="Nombre"
              name="firstName"
              required
            />
            <Input id="register-last-name" label="Apellido" name="lastName" />
          </div>
          <Input
            id="register-email"
            label="Email"
            name="email"
            required
            type="email"
          />
          <Input
            id="register-password"
            label="Contrasena"
            minLength={10}
            name="password"
            required
            type="password"
          />
          {error ? <p className="form-error">{error}</p> : null}
          <Button disabled={isSubmitting} loading={isSubmitting} type="submit">
            {isSubmitting ? 'Creando...' : 'Crear'}
          </Button>
        </form>

        <p className="muted-row">
          <span>Ya tienes cuenta?</span>
          <Link href="/login">Ingresar</Link>
        </p>
      </section>
    </main>
  );
}
