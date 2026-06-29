'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { apiFetch, AuthUser } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      await apiFetch<{ user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      router.push('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div>
          <Link className="brand-link" href="/">
            soyRE
          </Link>
          <h1>Ingresar</h1>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input name="email" required type="email" />
          </label>
          <label>
            Password
            <input minLength={10} name="password" required type="password" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="muted-row">
          <span>Sin cuenta?</span>
          <Link href="/register">Crear organizacion</Link>
        </p>
      </section>
    </main>
  );
}
