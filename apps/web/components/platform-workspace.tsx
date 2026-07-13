'use client';

import {
  Building2,
  Plus,
  RefreshCcw,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  CreatePlatformOrganizationPayload,
  CreateUserPayload,
  MembershipRole,
  MembershipStatus,
  OrganizationUser,
  PlatformOrganization,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationsResponse,
  PlatformUsersResponse,
  UserDetailResponse,
} from '../lib/api';
import { formatDateTime } from './operational-format';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  PasswordInput,
  SectionPanel,
  Select,
  StatusBadge,
  type Tone,
} from '@soyre/ui';

const roleOptions: Array<{ label: string; value: MembershipRole }> = [
  { label: 'Administrador', value: 'OWNER' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Broker', value: 'BROKER' },
  { label: 'Agente', value: 'AGENT' },
  { label: 'Operaciones', value: 'OPERATIONS' },
  { label: 'Finanzas', value: 'FINANCE' },
  { label: 'Externo', value: 'EXTERNAL_AGENT' },
  { label: 'Lectura', value: 'READONLY' },
];

const membershipStatusTone: Record<MembershipStatus, Tone> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  SUSPENDED: 'danger',
};

export function PlatformWorkspace() {
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [organizationFormError, setOrganizationFormError] = useState<string | null>(
    null,
  );
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [updatingMembershipId, setUpdatingMembershipId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    refreshOrganizations().catch((caught) => {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo cargar el backoffice.',
      );
      setIsLoadingOrganizations(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setUsers([]);
      return;
    }

    refreshUsers(selectedOrganizationId).catch((caught) => {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo cargar usuarios de la organización.',
      );
      setIsLoadingUsers(false);
    });
  }, [selectedOrganizationId]);

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === selectedOrganizationId,
      ) ?? null,
    [organizations, selectedOrganizationId],
  );

  const metrics = useMemo(
    () => ({
      activeOrganizations: organizations.filter(
        (organization) => organization.status === 'ACTIVE',
      ).length,
      organizations: organizations.length,
      users: organizations.reduce(
        (total, organization) => total + organization.memberCount,
        0,
      ),
    }),
    [organizations],
  );

  async function refreshOrganizations() {
    setIsLoadingOrganizations(true);
    setError(null);
    const response = await apiFetch<PlatformOrganizationsResponse>(
      '/platform/organizations',
    );
    setOrganizations(response.organizations);
    setSelectedOrganizationId(
      (current) => current || response.organizations[0]?.id || '',
    );
    setIsLoadingOrganizations(false);
  }

  async function refreshUsers(organizationId = selectedOrganizationId) {
    if (!organizationId) {
      setUsers([]);
      return;
    }

    setIsLoadingUsers(true);
    setError(null);
    const response = await apiFetch<PlatformUsersResponse>(
      `/platform/organizations/${organizationId}/users`,
    );
    setUsers(response.users);
    setIsLoadingUsers(false);
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrganizationFormError(null);
    setIsCreatingOrganization(true);

    try {
      const payload = buildCreateOrganizationPayload(
        new FormData(event.currentTarget),
      );
      const response = await apiFetch<PlatformOrganizationDetailResponse>(
        '/platform/organizations',
        {
          body: JSON.stringify(payload),
          method: 'POST',
        },
      );
      setOrganizations((current) => [response.organization, ...current]);
      setSelectedOrganizationId(response.organization.id);
      setUsers([response.owner]);
      event.currentTarget.reset();
    } catch (caught) {
      setOrganizationFormError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo crear la organización.',
      );
    } finally {
      setIsCreatingOrganization(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserFormError(null);

    if (!selectedOrganizationId) {
      setUserFormError('Selecciona una organización.');
      return;
    }

    setIsCreatingUser(true);

    try {
      const payload = buildCreateUserPayload(new FormData(event.currentTarget));
      const response = await apiFetch<UserDetailResponse>(
        `/platform/organizations/${selectedOrganizationId}/users`,
        {
          body: JSON.stringify(payload),
          method: 'POST',
        },
      );
      setUsers((current) => [response.user, ...current]);
      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === selectedOrganizationId
            ? {
                ...organization,
                memberCount: organization.memberCount + 1,
              }
            : organization,
        ),
      );
      event.currentTarget.reset();
    } catch (caught) {
      setUserFormError(
        caught instanceof Error ? caught.message : 'No se pudo crear el usuario.',
      );
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function updateMembershipStatus(
    organizationUser: OrganizationUser,
    status: MembershipStatus,
  ) {
    setUpdatingMembershipId(organizationUser.membershipId);
    setError(null);

    try {
      const response = await apiFetch<UserDetailResponse>(
        `/platform/memberships/${organizationUser.membershipId}/status`,
        {
          body: JSON.stringify({ status }),
          method: 'PATCH',
        },
      );
      setUsers((current) =>
        current.map((item) =>
          item.membershipId === response.user.membershipId ? response.user : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo actualizar el usuario.',
      );
    } finally {
      setUpdatingMembershipId(null);
    }
  }

  async function updateMembershipRole(
    organizationUser: OrganizationUser,
    role: MembershipRole,
  ) {
    if (organizationUser.role === role) {
      return;
    }

    setUpdatingMembershipId(organizationUser.membershipId);
    setError(null);

    try {
      const response = await apiFetch<UserDetailResponse>(
        `/platform/memberships/${organizationUser.membershipId}/role`,
        {
          body: JSON.stringify({ role }),
          method: 'PATCH',
        },
      );
      setUsers((current) =>
        current.map((item) =>
          item.membershipId === response.user.membershipId ? response.user : item,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo actualizar el rol del usuario.',
      );
    } finally {
      setUpdatingMembershipId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Backoffice SaaS"
        title="Organizaciones y usuarios"
        description="Control interno para crear clientes SaaS y preparar usuarios de prueba."
        actions={
          <Button icon={RefreshCcw} onClick={() => refreshOrganizations()}>
            Actualizar
          </Button>
        }
      />

      <section className="summary-strip" aria-label="Resumen del backoffice">
        <div>
          <span>Organizaciones</span>
          <strong>{metrics.organizations}</strong>
        </div>
        <div>
          <span>Activas</span>
          <strong>{metrics.activeOrganizations}</strong>
        </div>
        <div>
          <span>Usuarios</span>
          <strong>{metrics.users}</strong>
        </div>
      </section>

      {error ? (
        <ErrorState
          action={
            <Button
              icon={RefreshCcw}
              onClick={() => refreshOrganizations()}
              variant="secondary"
            >
              Reintentar
            </Button>
          }
          description={error}
          title="No se pudo cargar el backoffice"
        />
      ) : null}

      <section className="dashboard-grid">
        <div className="dashboard-columns">
          <SectionPanel
            title="Organizaciones"
            description="Clientes SaaS registrados en la plataforma."
          >
            {isLoadingOrganizations ? (
              <LoadingState
                description="Consultando organizaciones y propietarios."
                title="Cargando organizaciones"
              />
            ) : (
              <DataTable
                columns={[
                  { key: 'organization', label: 'Organización' },
                  { key: 'owner', label: 'Owner' },
                  { key: 'members', label: 'Usuarios' },
                  { key: 'inventory', label: 'Operación' },
                  { key: 'status', label: 'Estado' },
                ]}
                empty={
                  <EmptyState
                    description="Crea la primera organización para comenzar las pruebas."
                    icon={Building2}
                    title="Sin organizaciones"
                  />
                }
                rows={organizations.map((organization) => ({
                  id: organization.id,
                  cells: {
                    inventory: `${organization.propertyCount} propiedades / ${organization.businessCount} negocios`,
                    members: organization.memberCount,
                    organization: (
                      <button
                        className="table-action"
                        onClick={() => setSelectedOrganizationId(organization.id)}
                        type="button"
                      >
                        <strong className="entity-title">{organization.name}</strong>
                        <span className="meta-row">{organization.slug}</span>
                      </button>
                    ),
                    owner:
                      organization.owners[0]?.email ?? 'Sin owner registrado',
                    status: (
                      <StatusBadge
                        tone={
                          organization.status === 'ACTIVE' ? 'success' : 'warning'
                        }
                      >
                        {organization.status}
                      </StatusBadge>
                    ),
                  },
                }))}
              />
            )}
          </SectionPanel>

          <SectionPanel
            title="Usuarios de la organización"
            description={
              selectedOrganization
                ? `Acceso interno de ${selectedOrganization.name}.`
                : 'Selecciona una organización.'
            }
            actions={
              selectedOrganization ? (
                <Select
                  id="platform-organization"
                  label="Organización"
                  labelHidden
                  onChange={(event) => setSelectedOrganizationId(event.target.value)}
                  value={selectedOrganizationId}
                >
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </Select>
              ) : null
            }
          >
            {isLoadingUsers ? (
              <LoadingState
                description="Consultando membresías de la organización."
                title="Cargando usuarios"
              />
            ) : (
              <DataTable
                columns={[
                  { key: 'user', label: 'Usuario' },
                  { key: 'email', label: 'Email' },
                  { key: 'role', label: 'Rol' },
                  { key: 'status', label: 'Acceso' },
                  { key: 'lastLogin', label: 'Último acceso' },
                  { key: 'actions', label: 'Acciones' },
                ]}
                empty={
                  <EmptyState
                    description="Crea usuarios para iniciar la prueba de la organización."
                    icon={UserCheck}
                    title="Sin usuarios"
                  />
                }
                rows={users.map((organizationUser) => ({
                  id: organizationUser.membershipId,
                  cells: {
                    actions: (
                      <div className="row-actions">
                        {organizationUser.membershipStatus !== 'ACTIVE' ? (
                          <Button
                            loading={
                              updatingMembershipId === organizationUser.membershipId
                            }
                            onClick={() =>
                              updateMembershipStatus(organizationUser, 'ACTIVE')
                            }
                            variant="secondary"
                          >
                            Activar
                          </Button>
                        ) : null}
                        {organizationUser.membershipStatus !== 'SUSPENDED' ? (
                          <Button
                            loading={
                              updatingMembershipId === organizationUser.membershipId
                            }
                            onClick={() =>
                              updateMembershipStatus(organizationUser, 'SUSPENDED')
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
                      <Select
                        disabled={
                          updatingMembershipId === organizationUser.membershipId
                        }
                        id={`platform-user-role-${organizationUser.membershipId}`}
                        label={`Rol de ${organizationUser.firstName}`}
                        labelHidden
                        onChange={(event) =>
                          updateMembershipRole(
                            organizationUser,
                            event.target.value as MembershipRole,
                          )
                        }
                        value={organizationUser.role}
                      >
                        {roleOptions.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </Select>
                    ),
                    status: (
                      <StatusBadge
                        tone={
                          membershipStatusTone[
                            organizationUser.membershipStatus as MembershipStatus
                          ]
                        }
                      >
                        {membershipStatusLabel(
                          organizationUser.membershipStatus as MembershipStatus,
                        )}
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
          </SectionPanel>
        </div>

        <div className="dashboard-sidebar">
          <SectionPanel
            title="Crear organización"
            description="Crea el cliente SaaS y su owner inicial."
          >
            <form className="stack" onSubmit={createOrganization}>
              <Input
                id="platform-organization-name"
                label="Organización"
                name="organizationName"
                placeholder="Inmobiliaria Central"
                required
              />
              <Input
                id="platform-organization-slug"
                label="Slug"
                name="organizationSlug"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="inmobiliaria-central"
              />
              <div className="field-grid">
                <Input
                  id="platform-owner-first-name"
                  label="Nombre owner"
                  name="ownerFirstName"
                  required
                />
                <Input
                  id="platform-owner-last-name"
                  label="Apellido"
                  name="ownerLastName"
                />
              </div>
              <Input
                id="platform-owner-email"
                label="Correo owner"
                name="ownerEmail"
                required
                type="email"
              />
              <PasswordInput
                id="platform-owner-password"
                label="Contraseña temporal"
                minLength={10}
                name="ownerPassword"
                required
              />
              {organizationFormError ? (
                <p className="form-error">{organizationFormError}</p>
              ) : null}
              <Button
                disabled={isCreatingOrganization}
                icon={Plus}
                loading={isCreatingOrganization}
                type="submit"
              >
                Crear organización
              </Button>
            </form>
          </SectionPanel>

          <SectionPanel
            title="Crear usuario"
            description="Agrega un usuario a la organización seleccionada."
          >
            <form className="stack" onSubmit={createUser}>
              <div className="field-grid">
                <Input
                  id="platform-user-first-name"
                  label="Nombre"
                  name="firstName"
                  required
                />
                <Input
                  id="platform-user-last-name"
                  label="Apellido"
                  name="lastName"
                />
              </div>
              <Input
                id="platform-user-email"
                label="Correo"
                name="email"
                required
                type="email"
              />
              <div className="field-grid">
                <Select
                  id="platform-user-role"
                  label="Rol"
                  name="role"
                  required
                  defaultValue="AGENT"
                >
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
                <PasswordInput
                  id="platform-user-password"
                  label="Contraseña"
                  minLength={10}
                  name="password"
                  required
                />
              </div>
              <label className="checkbox-row">
                <input defaultChecked name="startActive" type="checkbox" value="true" />
                Activar usuario de inmediato
              </label>
              {userFormError ? <p className="form-error">{userFormError}</p> : null}
              <Button
                disabled={!selectedOrganizationId || isCreatingUser}
                icon={UserPlus}
                loading={isCreatingUser}
                type="submit"
              >
                Crear usuario
              </Button>
            </form>
          </SectionPanel>
        </div>
      </section>
    </>
  );
}

function buildCreateOrganizationPayload(
  form: FormData,
): CreatePlatformOrganizationPayload {
  return {
    organizationName: requiredString(form, 'organizationName'),
    organizationSlug: stringValue(form, 'organizationSlug') ?? undefined,
    ownerEmail: requiredString(form, 'ownerEmail'),
    ownerFirstName: requiredString(form, 'ownerFirstName'),
    ownerLastName: stringValue(form, 'ownerLastName') ?? undefined,
    ownerPassword: requiredString(form, 'ownerPassword'),
  };
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

function requiredString(form: FormData, field: string) {
  const value = stringValue(form, field);

  if (!value) {
    throw new Error('Completa los campos requeridos.');
  }

  return value;
}

function stringValue(form: FormData, field: string) {
  const value = form.get(field);

  return typeof value === 'string' ? value.trim() : null;
}
