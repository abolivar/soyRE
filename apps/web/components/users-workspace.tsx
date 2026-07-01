'use client';

import { Plus, RefreshCcw, ShieldCheck, UserCheck, UserPlus } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  CreateUserPayload,
  MembershipRole,
  MembershipStatus,
  OrganizationUser,
  UserDetailResponse,
  UsersResponse,
} from '../lib/api';
import {
  activeMemberships,
  formatDateTime,
  isActiveMembershipStatus,
} from './operational-format';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDrawer,
  LoadingState,
  PageHeader,
  SearchInput,
  SectionPanel,
  Select,
  StatusBadge,
  type Tone,
} from '@soyre/ui';

type UserFilters = {
  role: string;
  search: string;
  status: string;
};

const managerRoles = new Set<MembershipRole>(['OWNER', 'ADMIN']);

const roleOptions: Array<{ label: string; value: MembershipRole }> = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Broker', value: 'BROKER' },
  { label: 'Agente', value: 'AGENT' },
  { label: 'Operaciones', value: 'OPERATIONS' },
  { label: 'Finanzas', value: 'FINANCE' },
  { label: 'Externo', value: 'EXTERNAL_AGENT' },
  { label: 'Lectura', value: 'READONLY' },
];

const statusOptions: Array<{ label: string; value: MembershipStatus }> = [
  { label: 'Invitados', value: 'INVITED' },
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Suspendidos', value: 'SUSPENDED' },
];

const roleTone: Record<MembershipRole, Tone> = {
  ADMIN: 'featured',
  AGENT: 'rent',
  BROKER: 'primary',
  EXTERNAL_AGENT: 'warning',
  FINANCE: 'success',
  OPERATIONS: 'primary',
  OWNER: 'danger',
  READONLY: 'neutral',
};

const statusTone: Record<MembershipStatus, Tone> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  SUSPENDED: 'danger',
};

export function UsersWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    role: '',
    search: '',
    status: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organizacion activa para consultar usuarios.');
          setIsLoading(false);
          return;
        }

        setActiveOrganizationId(firstMembership.organizationId);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Sesion no disponible.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    refreshUsers(activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Usuarios no disponibles.');
      setIsLoading(false);
    });
  }, [activeOrganizationId]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const canManageUsers = activeMembership
    ? managerRoles.has(activeMembership.role)
    : false;
  const filteredUsers = useMemo(
    () =>
      users.filter((organizationUser) => {
        const query = filters.search.toLowerCase();
        const matchesSearch =
          !query ||
          organizationUser.email.toLowerCase().includes(query) ||
          `${organizationUser.firstName} ${organizationUser.lastName ?? ''}`
            .trim()
            .toLowerCase()
            .includes(query);
        const matchesRole = !filters.role || organizationUser.role === filters.role;
        const matchesStatus =
          !filters.status || organizationUser.membershipStatus === filters.status;

        return matchesSearch && matchesRole && matchesStatus;
      }),
    [filters, users],
  );
  const metrics = useMemo(
    () => ({
      active: users.filter((organizationUser) =>
        isActiveMembershipStatus(
          organizationUser.membershipStatus as MembershipStatus,
          'ACTIVE',
        ),
      ).length,
      invited: users.filter(
        (organizationUser) => organizationUser.membershipStatus === 'INVITED',
      ).length,
      suspended: users.filter(
        (organizationUser) => organizationUser.membershipStatus === 'SUSPENDED',
      ).length,
      total: users.length,
    }),
    [users],
  );

  async function refreshUsers(organizationId = activeOrganizationId) {
    if (!organizationId) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });
    const response = await apiFetch<UsersResponse>(`/users?${query.toString()}`);
    setUsers(response.users);
    setIsLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      role: stringValue(form, 'role') ?? '',
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? '',
    });
  }

  function openCreateUserDrawer() {
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function closeCreateUserDrawer() {
    if (isSubmitting) {
      return;
    }

    setIsDrawerOpen(false);
    setFormError(null);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activeOrganizationId || !canManageUsers) {
      setFormError('No tienes permiso para crear usuarios en esta organizacion.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...buildCreateUserPayload(new FormData(event.currentTarget)),
        organizationId: activeOrganizationId,
      };
      const response = await apiFetch<UserDetailResponse>('/users', {
        body: JSON.stringify(payload),
        method: 'POST',
      });
      setUsers((current) => [response.user, ...current]);
      setIsDrawerOpen(false);
      event.currentTarget.reset();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo crear el usuario.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateMembershipStatus(
    organizationUser: OrganizationUser,
    action: 'suspend' | 'validate',
  ) {
    if (!canManageUsers) {
      return;
    }

    setUpdatingMembershipId(organizationUser.membershipId);
    setError(null);

    try {
      const response = await apiFetch<UserDetailResponse>(
        `/users/${organizationUser.membershipId}/${action}`,
        { method: 'PATCH' },
      );
      setUsers((current) =>
        current.map((item) =>
          item.membershipId === response.user.membershipId ? response.user : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'No se pudo actualizar el usuario.',
      );
    } finally {
      setUpdatingMembershipId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sistema de acceso"
        title="Usuarios"
        description={
          activeMembership
            ? `Roles y acceso de ${activeMembership.organizationName}.`
            : 'Roles y acceso por organizacion.'
        }
        actions={
          <Button
            disabled={!canManageUsers}
            icon={Plus}
            onClick={openCreateUserDrawer}
          >
            Invitar usuario
          </Button>
        }
      />

      <section className="summary-strip" aria-label="Resumen de usuarios">
        <div>
          <span>Total</span>
          <strong>{metrics.total}</strong>
        </div>
        <div>
          <span>Activos</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Invitados</span>
          <strong>{metrics.invited}</strong>
        </div>
        <div>
          <span>Suspendidos</span>
          <strong>{metrics.suspended}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <Select
              id="users-filter-organization"
              label="Organizacion"
              labelHidden
              onChange={(event) => setActiveOrganizationId(event.target.value)}
              value={activeOrganizationId ?? ''}
            >
              {organizations.map((membership) => (
                <option
                  key={membership.organizationId}
                  value={membership.organizationId}
                >
                  {membership.organizationName}
                </option>
              ))}
            </Select>
          ) : null}
          <SearchInput
            aria-label="Buscar usuario"
            defaultValue={filters.search}
            name="search"
            placeholder="Buscar usuario o email"
          />
          <Select
            id="users-filter-status"
            label="Estado"
            labelHidden
            defaultValue={filters.status}
            name="status"
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Select
            id="users-filter-role"
            label="Rol"
            labelHidden
            defaultValue={filters.role}
            name="role"
          >
            <option value="">Todos los roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
          <Button variant="secondary" type="submit">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      <section className="dashboard-grid">
        <div className="dashboard-columns">
          {isLoading ? (
            <LoadingState
              description="Consultando usuarios y membresias."
              title="Cargando usuarios"
            />
          ) : error ? (
            <ErrorState
              action={
                <Button
                  icon={RefreshCcw}
                  onClick={() => refreshUsers()}
                  variant="secondary"
                >
                  Reintentar
                </Button>
              }
              description={error}
              title="No se pudo cargar usuarios"
            />
          ) : (
            <DataTable
              columns={[
                { key: 'user', label: 'Usuario' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Rol' },
                { key: 'access', label: 'Acceso' },
                { key: 'lastLogin', label: 'Ultimo acceso' },
                { key: 'actions', label: 'Acciones' },
              ]}
              empty={
                <EmptyState
                  action={
                    canManageUsers ? (
                      <Button icon={UserPlus} onClick={openCreateUserDrawer}>
                        Crear usuario
                      </Button>
                    ) : undefined
                  }
                  description="No hay usuarios que coincidan con los filtros."
                  icon={UserCheck}
                  title="Sin usuarios"
                />
              }
              rows={filteredUsers.map((organizationUser) => ({
                id: organizationUser.membershipId,
                cells: {
                  access: (
                    <StatusBadge
                      tone={
                        statusTone[
                          organizationUser.membershipStatus as MembershipStatus
                        ]
                      }
                    >
                      {membershipStatusLabel(
                        organizationUser.membershipStatus as MembershipStatus,
                      )}
                    </StatusBadge>
                  ),
                  actions: (
                    <div className="row-actions">
                      {organizationUser.membershipStatus !== 'ACTIVE' ? (
                        <Button
                          disabled={!canManageUsers}
                          loading={
                            updatingMembershipId === organizationUser.membershipId
                          }
                          onClick={() =>
                            updateMembershipStatus(organizationUser, 'validate')
                          }
                          variant="secondary"
                        >
                          Validar
                        </Button>
                      ) : null}
                      {organizationUser.membershipStatus !== 'SUSPENDED' ? (
                        <Button
                          disabled={!canManageUsers}
                          loading={
                            updatingMembershipId === organizationUser.membershipId
                          }
                          onClick={() =>
                            updateMembershipStatus(organizationUser, 'suspend')
                          }
                          variant="ghost"
                        >
                          Suspender
                        </Button>
                      ) : null}
                    </div>
                  ),
                  email: organizationUser.email,
                  lastLogin: formatDateTime(organizationUser.lastLoginAt),
                  role: (
                    <StatusBadge
                      tone={roleTone[organizationUser.role as MembershipRole]}
                    >
                      {roleLabel(organizationUser.role as MembershipRole)}
                    </StatusBadge>
                  ),
                  user: (
                    <span>
                      <strong className="entity-title">
                        {organizationUser.firstName}{' '}
                        {organizationUser.lastName ?? ''}
                      </strong>
                      <span className="meta-row">
                        {organizationUser.userStatus}
                      </span>
                    </span>
                  ),
                },
              }))}
            />
          )}
        </div>

        <SectionPanel
          title="Reglas activas"
          description="Politicas base para mantener controlado el acceso al workspace."
        >
          <div className="role-list">
            <article className="role-item">
              <span className="avatar">
                <ShieldCheck size={17} strokeWidth={2.2} />
              </span>
              <span>
                <strong className="entity-title">Owner protegido</strong>
                <span className="meta-row">
                  El backend bloquea suspender el ultimo owner activo.
                </span>
              </span>
              <StatusBadge tone="success">Activo</StatusBadge>
            </article>
            <article className="role-item">
              <span className="avatar">
                <UserCheck size={17} strokeWidth={2.2} />
              </span>
              <span>
                <strong className="entity-title">Validacion manual</strong>
                <span className="meta-row">
                  Invitados pasan a activos por accion administrativa.
                </span>
              </span>
              <StatusBadge tone="warning">Base</StatusBadge>
            </article>
          </div>
        </SectionPanel>
      </section>

      <FormDrawer
        description="Crea un usuario con membresia en la organizacion activa."
        footer={
          <>
            <Button
              disabled={isSubmitting}
              onClick={closeCreateUserDrawer}
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={isSubmitting}
              form="user-create-form"
              loading={isSubmitting}
              type="submit"
            >
              Crear usuario
            </Button>
          </>
        }
        onClose={closeCreateUserDrawer}
        open={isDrawerOpen && canManageUsers}
        title="Nuevo usuario"
      >
        <form className="drawer-form" id="user-create-form" onSubmit={createUser}>
          <section className="form-section">
            <div>
              <h3>Datos basicos</h3>
              <p>Identidad, email y rol dentro de la organizacion.</p>
            </div>
            <div className="form-grid two">
              <label>
                Nombres
                <input name="firstName" placeholder="Ana" required />
              </label>
              <label>
                Apellidos
                <input name="lastName" placeholder="Perez" />
              </label>
            </div>
            <label>
              Email
              <input name="email" placeholder="ana@empresa.com" required type="email" />
            </label>
            <div className="form-grid two">
              <label>
                Rol
                <select defaultValue="AGENT" name="role" required>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Password temporal
                <input
                  minLength={10}
                  name="password"
                  placeholder="Minimo 10 caracteres"
                  required
                  type="password"
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input name="startActive" type="checkbox" value="true" />
              Activar usuario de inmediato
            </label>
          </section>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormDrawer>
    </>
  );
}

function buildCreateUserPayload(form: FormData): CreateUserPayload {
  return {
    email: requiredString(form, 'email'),
    firstName: requiredString(form, 'firstName'),
    lastName: stringValue(form, 'lastName') ?? undefined,
    password: requiredString(form, 'password'),
    role: (stringValue(form, 'role') ?? 'AGENT') as MembershipRole,
    startActive: form.get('startActive') === 'true',
  };
}

function membershipStatusLabel(status: MembershipStatus) {
  return (
    {
      ACTIVE: 'Activo',
      INVITED: 'Invitado',
      SUSPENDED: 'Suspendido',
    } satisfies Record<MembershipStatus, string>
  )[status];
}

function roleLabel(role: MembershipRole) {
  return (
    {
      ADMIN: 'Admin',
      AGENT: 'Agente',
      BROKER: 'Broker',
      EXTERNAL_AGENT: 'Externo',
      FINANCE: 'Finanzas',
      OPERATIONS: 'Operaciones',
      OWNER: 'Owner',
      READONLY: 'Lectura',
    } satisfies Record<MembershipRole, string>
  )[role];
}

function requiredString(form: FormData, field: string) {
  const value = stringValue(form, field);

  if (!value) {
    throw new Error(`${field} is required.`);
  }

  return value;
}

function stringValue(form: FormData, field: string) {
  const value = form.get(field);

  return typeof value === 'string' ? value.trim() : null;
}
