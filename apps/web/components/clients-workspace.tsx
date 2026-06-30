'use client';

import { Plus, RefreshCcw, UserRoundPlus, Users } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  ClientRole,
  ClientStatus,
  ClientsResponse,
  CreateClientPayload,
  MembershipRole,
  OrganizationClient,
} from '../lib/api';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDrawer,
  LoadingState,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from './ui';

type ClientFilters = {
  search: string;
  status: string;
  role: string;
};

const clientWriteRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'AGENT',
  'OPERATIONS',
]);

const roleOptions: Array<{ value: ClientRole; label: string }> = [
  { value: 'BUYER', label: 'Comprador' },
  { value: 'SELLER', label: 'Vendedor' },
  { value: 'LESSOR', label: 'Arrendador' },
  { value: 'LESSEE', label: 'Arrendatario' },
  { value: 'INVESTOR', label: 'Inversionista' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'REFERRER', label: 'Referidor' },
  { value: 'RELATED_CONTACT', label: 'Relacionado' },
];

const propertyTypeOptions = [
  'Apartamento',
  'Casa',
  'Local comercial',
  'Oficina',
  'Terreno',
  'Bodega',
];

const statusTone: Record<ClientStatus, 'primary' | 'success' | 'warning' | 'neutral'> = {
  NEW: 'primary',
  ACTIVE: 'success',
  NURTURING: 'warning',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
};

export function ClientsWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [clients, setClients] = useState<OrganizationClient[]>([]);
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    status: '',
    role: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organizacion activa para consultar clientes.');
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

    refreshClients(filters, activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Clientes no disponibles.');
      setIsLoading(false);
    });
  }, [activeOrganizationId, filters]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const canCreateClients = activeMembership
    ? clientWriteRoles.has(activeMembership.role)
    : false;

  const metrics = useMemo(() => {
    const active = clients.filter((client) => client.status === 'ACTIVE').length;
    const hot = clients.filter((client) => client.temperature === 'HOT').length;
    const followUps = clients.filter((client) => client.nextFollowUpAt).length;

    return { active, hot, followUps };
  }, [clients]);

  async function refreshClients(
    nextFilters = filters,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams();
    query.set('organizationId', organizationId);

    if (nextFilters.search) {
      query.set('search', nextFilters.search);
    }

    if (nextFilters.status) {
      query.set('status', nextFilters.status);
    }

    if (nextFilters.role) {
      query.set('role', nextFilters.role);
    }

    const response = await apiFetch<ClientsResponse>(
      `/clients${query.size > 0 ? `?${query.toString()}` : ''}`,
    );
    setClients(response.clients);
    setIsLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? '',
      role: stringValue(form, 'role') ?? '',
    });
  }

  async function createClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activeOrganizationId || !canCreateClients) {
      setFormError('No tienes permiso para crear clientes en esta organizacion.');
      return;
    }

    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const payload = {
        ...buildClientPayload(form),
        organizationId: activeOrganizationId,
      };
      const response = await apiFetch<{ client: OrganizationClient }>('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setClients((current) => [response.client, ...current]);
      setIsDrawerOpen(false);
      event.currentTarget.reset();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo crear el cliente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Relaciones"
        title="Clientes"
        description={
          activeMembership
            ? `Personas, empresas y propietarios de ${activeMembership.organizationName}.`
            : 'Personas, empresas y propietarios conectados a una necesidad inmobiliaria concreta.'
        }
        actions={
          <button
            className="button primary"
            disabled={!canCreateClients}
            onClick={() => setIsDrawerOpen(true)}
            type="button"
          >
            <Plus size={17} strokeWidth={2.2} />
            Nuevo cliente
          </button>
        }
      />

      <section className="summary-strip" aria-label="Resumen de clientes">
        <div>
          <span>Total</span>
          <strong>{clients.length}</strong>
        </div>
        <div>
          <span>Activos</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Alta prioridad</span>
          <strong>{metrics.hot}</strong>
        </div>
        <div>
          <span>Seguimientos</span>
          <strong>{metrics.followUps}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <select
              aria-label="Organizacion"
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
            </select>
          ) : null}
          <label className="search-input">
            <Users size={17} strokeWidth={2.2} />
            <input
              aria-label="Buscar cliente"
              defaultValue={filters.search}
              name="search"
              placeholder="Buscar cliente, email, telefono o empresa"
            />
          </label>
          <select aria-label="Estado" defaultValue={filters.status} name="status">
            <option value="">Todos los estados</option>
            <option value="NEW">Nuevos</option>
            <option value="ACTIVE">Activos</option>
            <option value="NURTURING">Nutricion</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
          <select aria-label="Rol comercial" defaultValue={filters.role} name="role">
            <option value="">Todos los roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button className="button secondary" type="submit">
            Aplicar
          </button>
        </FilterBar>
      </form>

      <section className="dashboard-grid">
        {isLoading ? (
          <LoadingState
            description="Consultando clientes de la organizacion activa."
            title="Cargando clientes"
          />
        ) : error ? (
          <ErrorState
            action={
              <button
                className="button secondary"
                onClick={() => refreshClients()}
                type="button"
              >
                <RefreshCcw size={16} strokeWidth={2.2} />
                Reintentar
              </button>
            }
            description={error}
            title="No se pudo cargar clientes"
          />
        ) : (
          <DataTable
            columns={[
              { key: 'client', label: 'Cliente' },
              { key: 'roles', label: 'Roles' },
              { key: 'interest', label: 'Interes' },
              { key: 'budget', label: 'Presupuesto' },
              { key: 'followUp', label: 'Seguimiento' },
              { key: 'owner', label: 'Owner' },
            ]}
            empty={
              <EmptyState
                action={
                  canCreateClients ? (
                    <button
                      className="button primary"
                      onClick={() => setIsDrawerOpen(true)}
                      type="button"
                    >
                      <UserRoundPlus size={17} strokeWidth={2.2} />
                      Crear primer cliente
                    </button>
                  ) : undefined
                }
                description={
                  canCreateClients
                    ? 'Crea clientes con roles comerciales, presupuesto, preferencias y proxima accion para alimentar el ciclo inmobiliario.'
                    : 'Tu rol actual permite consultar clientes, pero no crear registros en esta organizacion.'
                }
                icon={Users}
                title="Sin clientes registrados"
              />
            }
            rows={clients.map((client) => ({
              id: client.id,
              cells: {
                client: (
                  <span>
                    <strong className="entity-title">{client.displayName}</strong>
                    <span className="meta-row">
                      {client.email ?? client.phone ?? 'Sin contacto principal'}
                    </span>
                  </span>
                ),
                roles: (
                  <span className="badge-cluster">
                    {client.roles.slice(0, 2).map((role) => (
                      <StatusBadge key={role} tone="primary">
                        {roleLabel(role)}
                      </StatusBadge>
                    ))}
                    {client.roles.length > 2 ? (
                      <StatusBadge tone="neutral">+{client.roles.length - 2}</StatusBadge>
                    ) : null}
                  </span>
                ),
                interest: (
                  <span>
                    <strong className="entity-title">
                      {interestLabel(client.interestType)}
                    </strong>
                    <span className="meta-row">
                      {client.preferredZones.join(', ') || client.zone || 'Zona abierta'}
                    </span>
                  </span>
                ),
                budget: formatBudget(client),
                followUp: (
                  <StatusBadge tone={statusTone[client.status]}>
                    {statusLabel(client.status)}
                  </StatusBadge>
                ),
                owner: client.assignedUser
                  ? `${client.assignedUser.firstName} ${
                      client.assignedUser.lastName ?? ''
                    }`.trim()
                  : 'Sin owner',
              },
            }))}
          />
        )}

        <SectionPanel
          title="Ficha minima"
          description="El alta de clientes exige contexto comercial suficiente para que el siguiente asesor pueda actuar sin reconstruir la historia."
        >
          <div className="compact-list">
            <div className="split-row">
              <span>
                <strong className="entity-title">Organizacion activa</strong>
                <span className="meta-row">
                  {activeMembership?.organizationName ?? 'Sin organizacion activa'}
                </span>
              </span>
              <StatusBadge tone={canCreateClients ? 'success' : 'neutral'}>
                {canCreateClients ? 'Escritura' : 'Lectura'}
              </StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Roles multiples</strong>
                <span className="meta-row">Comprador, vendedor, arrendador o lead.</span>
              </span>
              <StatusBadge tone="primary">Base</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Preferencia inmobiliaria</strong>
                <span className="meta-row">Zonas, presupuesto, tipo y tiempo de decision.</span>
              </span>
              <StatusBadge tone="featured">Contexto</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Seguimiento</strong>
                <span className="meta-row">Estado, temperatura, responsable y proxima accion.</span>
              </span>
              <StatusBadge tone="warning">SLA</StatusBadge>
            </div>
          </div>
        </SectionPanel>
      </section>

      <FormDrawer
        description="Registra identidad, contacto, roles y necesidad inmobiliaria para iniciar seguimiento operativo."
        footer={
          <>
            <button
              className="button secondary"
              disabled={isSubmitting}
              onClick={() => setIsDrawerOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={isSubmitting}
              form="client-create-form"
              type="submit"
            >
              {isSubmitting ? 'Guardando...' : 'Crear cliente'}
            </button>
          </>
        }
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen && canCreateClients}
        title="Nuevo cliente"
      >
        <form className="drawer-form" id="client-create-form" onSubmit={createClient}>
          <section className="form-section">
            <div>
              <h3>Identidad</h3>
              <p>Persona natural, empresa o contacto relacionado.</p>
            </div>
            <div className="form-grid two">
              <label>
                Tipo
                <select defaultValue="PERSON" name="type">
                  <option value="PERSON">Persona</option>
                  <option value="COMPANY">Empresa</option>
                </select>
              </label>
              <label>
                Estado
                <select defaultValue="NEW" name="status">
                  <option value="NEW">Nuevo</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="NURTURING">Nutricion</option>
                  <option value="INACTIVE">Inactivo</option>
                </select>
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Nombre
                <input name="firstName" placeholder="Maria" />
              </label>
              <label>
                Apellido
                <input name="lastName" placeholder="Moreno" />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Empresa
                <input name="companyName" placeholder="Grupo Terra" />
              </label>
              <label>
                Cedula o RUC
                <input name="legalId" placeholder="8-000-000" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Roles comerciales</h3>
              <p>Un cliente puede ocupar varios roles dentro del ciclo inmobiliario.</p>
            </div>
            <div className="option-grid">
              {roleOptions.map((role) => (
                <label className="check-card" key={role.value}>
                  <input
                    defaultChecked={role.value === 'LEAD'}
                    name="roles"
                    type="checkbox"
                    value={role.value}
                  />
                  <span>{role.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Contacto</h3>
              <p>Canales y preferencia para contactar sin duplicar datos.</p>
            </div>
            <div className="form-grid two">
              <label>
                Email
                <input name="email" placeholder="cliente@correo.com" type="email" />
              </label>
              <label>
                Metodo preferido
                <select defaultValue="WHATSAPP" name="preferredContactMethod">
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Telefono</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="IN_PERSON">Presencial</option>
                </select>
              </label>
            </div>
            <div className="form-grid three">
              <label>
                Telefono
                <input name="phone" placeholder="+507 6000-0000" />
              </label>
              <label>
                WhatsApp
                <input name="whatsapp" placeholder="+507 6000-0000" />
              </label>
              <label>
                Alterno
                <input name="alternatePhone" placeholder="+507 6000-0001" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Ubicacion y origen</h3>
              <p>Contexto de mercado y fuente de captacion.</p>
            </div>
            <div className="form-grid three">
              <label>
                Pais
                <input defaultValue="Panama" name="country" />
              </label>
              <label>
                Ciudad
                <input name="city" placeholder="Panama" />
              </label>
              <label>
                Zona actual
                <input name="zone" placeholder="Costa del Este" />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Direccion
                <input name="address" placeholder="Calle, edificio o referencia" />
              </label>
              <label>
                Fuente
                <input name="source" placeholder="Referido, portal, evento" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Necesidad inmobiliaria</h3>
              <p>Preferencias para conectar clientes con propiedades y procesos.</p>
            </div>
            <div className="form-grid three">
              <label>
                Interes
                <select defaultValue="BUY" name="interestType">
                  <option value="BUY">Compra</option>
                  <option value="RENT">Alquiler</option>
                  <option value="SELL">Venta</option>
                  <option value="LEASE">Dar en alquiler</option>
                  <option value="INVEST">Inversion</option>
                  <option value="MANAGE">Administracion</option>
                  <option value="REFER">Referir</option>
                </select>
              </label>
              <label>
                Tiempo de decision
                <select defaultValue="EXPLORING" name="timeline">
                  <option value="IMMEDIATE">Inmediato</option>
                  <option value="ONE_TO_THREE_MONTHS">1 a 3 meses</option>
                  <option value="THREE_TO_SIX_MONTHS">3 a 6 meses</option>
                  <option value="SIX_PLUS_MONTHS">6+ meses</option>
                  <option value="EXPLORING">Explorando</option>
                </select>
              </label>
              <label>
                Financiamiento
                <select defaultValue="UNKNOWN" name="financingStatus">
                  <option value="CASH">Contado</option>
                  <option value="PRE_APPROVED">Preaprobado</option>
                  <option value="NEEDS_FINANCING">Necesita financiamiento</option>
                  <option value="UNKNOWN">Por definir</option>
                </select>
              </label>
            </div>
            <div className="form-grid three">
              <label>
                Presupuesto min.
                <input min="0" name="budgetMin" placeholder="250000" type="number" />
              </label>
              <label>
                Presupuesto max.
                <input min="0" name="budgetMax" placeholder="450000" type="number" />
              </label>
              <label>
                Moneda
                <input defaultValue="USD" name="currency" />
              </label>
            </div>
            <div className="option-grid">
              {propertyTypeOptions.map((type) => (
                <label className="check-card" key={type}>
                  <input name="propertyTypes" type="checkbox" value={type} />
                  <span>{type}</span>
                </label>
              ))}
            </div>
            <label>
              Zonas preferidas
              <input
                name="preferredZones"
                placeholder="Costa del Este, Santa Maria, San Francisco"
              />
            </label>
            <div className="form-grid three">
              <label>
                Recamaras min.
                <input min="0" name="bedroomsMin" type="number" />
              </label>
              <label>
                Banos min.
                <input min="0" name="bathroomsMin" type="number" />
              </label>
              <label>
                Parkings min.
                <input min="0" name="parkingMin" type="number" />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Area min.
                <input min="0" name="areaMin" placeholder="80" type="number" />
              </label>
              <label>
                Area max.
                <input min="0" name="areaMax" placeholder="180" type="number" />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Seguimiento</h3>
              <p>Estado operativo, temperatura y proxima accion.</p>
            </div>
            <div className="form-grid three">
              <label>
                Temperatura
                <select defaultValue="WARM" name="temperature">
                  <option value="COLD">Frio</option>
                  <option value="WARM">Tibio</option>
                  <option value="HOT">Alta prioridad</option>
                </select>
              </label>
              <label>
                Ultimo contacto
                <input name="lastContactAt" type="date" />
              </label>
              <label>
                Proximo seguimiento
                <input name="nextFollowUpAt" type="date" />
              </label>
            </div>
            <label>
              Tags
              <input name="tags" placeholder="VIP, inversion, referido" />
            </label>
            <label>
              Notas
              <textarea name="notes" placeholder="Necesidad, objeciones, preferencias y proxima accion." />
            </label>
            <div className="consent-list">
              <label className="inline-check">
                <input name="marketingConsent" type="checkbox" />
                Acepta comunicaciones comerciales
              </label>
              <label className="inline-check">
                <input name="dataConsent" type="checkbox" />
                Autoriza tratamiento de datos
              </label>
            </div>
          </section>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormDrawer>
    </>
  );
}

function activeMemberships(user: AuthUser | null): AuthMembership[] {
  return (
    user?.memberships.filter(
      (membership) =>
        membership.status === 'ACTIVE' &&
        membership.organizationStatus === 'ACTIVE',
    ) ?? []
  );
}

function buildClientPayload(form: FormData): CreateClientPayload {
  return compactPayload({
    type: stringValue(form, 'type'),
    roles: form.getAll('roles').map(String) as ClientRole[],
    status: stringValue(form, 'status'),
    temperature: stringValue(form, 'temperature'),
    firstName: stringValue(form, 'firstName'),
    lastName: stringValue(form, 'lastName'),
    companyName: stringValue(form, 'companyName'),
    legalId: stringValue(form, 'legalId'),
    email: stringValue(form, 'email'),
    phone: stringValue(form, 'phone'),
    alternatePhone: stringValue(form, 'alternatePhone'),
    whatsapp: stringValue(form, 'whatsapp'),
    preferredContactMethod: stringValue(form, 'preferredContactMethod'),
    country: stringValue(form, 'country'),
    city: stringValue(form, 'city'),
    zone: stringValue(form, 'zone'),
    address: stringValue(form, 'address'),
    source: stringValue(form, 'source'),
    interestType: stringValue(form, 'interestType'),
    budgetMin: numberValue(form, 'budgetMin'),
    budgetMax: numberValue(form, 'budgetMax'),
    currency: stringValue(form, 'currency'),
    preferredZones: csvValue(form, 'preferredZones'),
    propertyTypes: form.getAll('propertyTypes').map(String),
    bedroomsMin: numberValue(form, 'bedroomsMin'),
    bathroomsMin: numberValue(form, 'bathroomsMin'),
    parkingMin: numberValue(form, 'parkingMin'),
    areaMin: numberValue(form, 'areaMin'),
    areaMax: numberValue(form, 'areaMax'),
    timeline: stringValue(form, 'timeline'),
    financingStatus: stringValue(form, 'financingStatus'),
    lastContactAt: stringValue(form, 'lastContactAt'),
    nextFollowUpAt: stringValue(form, 'nextFollowUpAt'),
    notes: stringValue(form, 'notes'),
    tags: csvValue(form, 'tags'),
    marketingConsent: form.get('marketingConsent') === 'on',
    dataConsent: form.get('dataConsent') === 'on',
  }) as CreateClientPayload;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined && value !== '';
    }),
  );
}

function stringValue(form: FormData, key: string) {
  const value = form.get(key);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(form: FormData, key: string) {
  const value = stringValue(form, key);

  return value ? Number(value) : undefined;
}

function csvValue(form: FormData, key: string) {
  return (
    stringValue(form, key)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function roleLabel(role: ClientRole) {
  return roleOptions.find((item) => item.value === role)?.label ?? role;
}

function statusLabel(status: ClientStatus) {
  const labels: Record<ClientStatus, string> = {
    NEW: 'Nuevo',
    ACTIVE: 'Activo',
    NURTURING: 'Nutricion',
    INACTIVE: 'Inactivo',
    ARCHIVED: 'Archivado',
  };

  return labels[status];
}

function interestLabel(value: OrganizationClient['interestType']) {
  const labels: Record<string, string> = {
    BUY: 'Compra',
    RENT: 'Alquiler',
    SELL: 'Venta',
    LEASE: 'Dar en alquiler',
    INVEST: 'Inversion',
    MANAGE: 'Administracion',
    REFER: 'Referido',
  };

  return value ? labels[value] : 'Interes abierto';
}

function formatBudget(client: OrganizationClient) {
  if (client.budgetMin === null && client.budgetMax === null) {
    return 'Por definir';
  }

  const formatter = new Intl.NumberFormat('en-US', {
    currency: client.currency,
    maximumFractionDigits: 0,
    style: 'currency',
  });

  if (client.budgetMin !== null && client.budgetMax !== null) {
    return `${formatter.format(client.budgetMin)} - ${formatter.format(
      client.budgetMax,
    )}`;
  }

  if (client.budgetMin !== null) {
    return `Desde ${formatter.format(client.budgetMin)}`;
  }

  return `Hasta ${formatter.format(client.budgetMax ?? 0)}`;
}
