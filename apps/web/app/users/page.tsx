'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  OrganizationUser,
  UsersResponse,
} from '../../lib/api';

const roles = [
  'ADMIN',
  'BROKER',
  'AGENT',
  'OPERATIONS',
  'FINANCE',
  'EXTERNAL_AGENT',
  'READONLY',
];

export default function UsersPage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeMemberships = useMemo(
    () =>
      authUser?.memberships.filter(
        (membership) => membership.status === 'ACTIVE',
      ) ?? [],
    [authUser],
  );

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        setAuthUser(response.user);
        const firstOrganization = response.user.memberships.find(
          (membership) => membership.status === 'ACTIVE',
        );
        setSelectedOrganizationId(firstOrganization?.organizationId ?? '');
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Session failed.');
      });
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId) {
      return;
    }

    refreshUsers(selectedOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Users failed.');
    });
  }, [selectedOrganizationId]);

  async function refreshUsers(organizationId: string) {
    const response = await apiFetch<UsersResponse>(
      `/users?organizationId=${organizationId}`,
    );
    setUsers(response.users);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: selectedOrganizationId,
          firstName: form.get('firstName'),
          lastName: form.get('lastName') || undefined,
          email: form.get('email'),
          password: form.get('password'),
          role: form.get('role'),
          startActive: form.get('startActive') === 'on',
        }),
      });
      event.currentTarget.reset();
      await refreshUsers(selectedOrganizationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Create user failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function patchUser(path: string) {
    setError(null);
    try {
      await apiFetch(path, { method: 'PATCH' });
      await refreshUsers(selectedOrganizationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Update failed.');
    }
  }

  async function updateRole(membershipId: string, role: string) {
    setError(null);
    try {
      await apiFetch(`/users/${membershipId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      await refreshUsers(selectedOrganizationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Role update failed.');
    }
  }

  const selectedMembership = activeMemberships.find(
    (membership) => membership.organizationId === selectedOrganizationId,
  );
  const canManage = isManager(selectedMembership);

  return (
    <main className="app-shell">
      <nav className="topbar">
        <Link className="brand-link" href="/dashboard">
          soyRE
        </Link>
        <div className="topbar-actions">
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <section className="page-header">
        <div>
          <p className="eyebrow">Identidad</p>
          <h1>Usuarios</h1>
        </div>
        <select
          onChange={(event) => setSelectedOrganizationId(event.target.value)}
          value={selectedOrganizationId}
        >
          {activeMemberships.map((membership) => (
            <option key={membership.id} value={membership.organizationId}>
              {membership.organizationName}
            </option>
          ))}
        </select>
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      {canManage ? (
        <section className="form-band">
          <h2>Crear usuario</h2>
          <form className="user-form" onSubmit={createUser}>
            <input name="firstName" placeholder="Nombre" required />
            <input name="lastName" placeholder="Apellido" />
            <input name="email" placeholder="Email" required type="email" />
            <input
              minLength={10}
              name="password"
              placeholder="Password temporal"
              required
              type="password"
            />
            <select name="role" required>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <label className="inline-check">
              <input name="startActive" type="checkbox" />
              Activo
            </label>
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creando...' : 'Crear'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Acceso</th>
              <th>Usuario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.membershipId}>
                <td>
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>
                  {canManage ? (
                    <select
                      onChange={(event) =>
                        updateRole(user.membershipId, event.target.value)
                      }
                      value={user.role}
                    >
                      {['OWNER', ...roles].map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td>{user.membershipStatus}</td>
                <td>{user.userStatus}</td>
                <td>
                  <div className="row-actions">
                    {canManage && user.membershipStatus !== 'ACTIVE' ? (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          patchUser(`/users/${user.membershipId}/validate`)
                        }
                        type="button"
                      >
                        Validar
                      </button>
                    ) : null}
                    {canManage && user.membershipStatus === 'ACTIVE' ? (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          patchUser(`/users/${user.membershipId}/suspend`)
                        }
                        type="button"
                      >
                        Suspender
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function isManager(membership?: AuthMembership) {
  return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
}
