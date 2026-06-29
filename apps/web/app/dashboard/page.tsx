'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, AuthUser } from '../../lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => setUser(response.user))
      .catch(() => router.push('/login'));
  }, [router]);

  async function logout() {
    setError(null);
    try {
      await apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Logout failed.');
    }
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <Link className="brand-link" href="/dashboard">
          soyRE
        </Link>
        <div className="topbar-actions">
          <Link href="/users">Usuarios</Link>
          <button className="secondary-button" onClick={logout} type="button">
            Salir
          </button>
        </div>
      </nav>

      <section className="page-header">
        <div>
          <p className="eyebrow">Sesion activa</p>
          <h1>{user ? `${user.firstName} ${user.lastName ?? ''}` : '...'}</h1>
        </div>
        <Link className="primary-link" href="/users">
          Gestionar usuarios
        </Link>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <section className="data-grid">
        {user?.memberships.map((membership) => (
          <article className="data-card" key={membership.id}>
            <p className="eyebrow">{membership.organizationSlug}</p>
            <h2>{membership.organizationName}</h2>
            <dl>
              <div>
                <dt>Rol</dt>
                <dd>{membership.role}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{membership.status}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </main>
  );
}
