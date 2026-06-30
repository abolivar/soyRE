'use client';

import {
  BriefcaseBusiness,
  Eye,
  Handshake,
  Loader2,
  Mail,
  Phone,
  Plus,
  RefreshCcw,
  Search,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  CreateRealEstateAgentPayload,
  MembershipRole,
  OrganizationRealEstateAgent,
  RealEstateAgentCategory,
  RealEstateAgentDetailResponse,
  RealEstateAgentsResponse,
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
  type Tone,
} from '@soyre/ui';

type AgentFilters = {
  search: string;
  category: string;
};

const agentWriteRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
]);

const categoryOptions: Array<{
  label: string;
  value: RealEstateAgentCategory;
}> = [
  { label: 'Broker', value: 'BROKER' },
  { label: 'Broker externo', value: 'EXTERNAL_BROKER' },
  { label: 'Referido', value: 'REFERRER' },
];

const categoryTone: Record<RealEstateAgentCategory, Tone> = {
  BROKER: 'primary',
  EXTERNAL_BROKER: 'featured',
  REFERRER: 'rent',
};

export function AgentsWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [agents, setAgents] = useState<OrganizationRealEstateAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedAgentDetail, setSelectedAgentDetail] =
    useState<OrganizationRealEstateAgent | null>(null);
  const [filters, setFilters] = useState<AgentFilters>({
    category: '',
    search: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organizacion activa para consultar agentes.');
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

    refreshAgents(filters, activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Agentes no disponibles.');
      setIsLoading(false);
    });
  }, [activeOrganizationId, filters]);

  useEffect(() => {
    if (!activeOrganizationId || !selectedAgentId) {
      setSelectedAgentDetail(null);
      setDetailError(null);
      return;
    }

    refreshAgentDetail(selectedAgentId, activeOrganizationId).catch((caught) => {
      setDetailError(caught instanceof Error ? caught.message : 'Detalle no disponible.');
      setIsDetailLoading(false);
    });
  }, [activeOrganizationId, selectedAgentId]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const canCreateAgents = activeMembership
    ? agentWriteRoles.has(activeMembership.role)
    : false;
  const selectedAgentSummary = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );
  const selectedAgent =
    selectedAgentDetail?.id === selectedAgentId
      ? selectedAgentDetail
      : selectedAgentSummary;
  const metrics = useMemo(
    () => ({
      brokers: agents.filter((agent) => agent.category === 'BROKER').length,
      external: agents.filter((agent) => agent.category === 'EXTERNAL_BROKER')
        .length,
      referrals: agents.filter((agent) => agent.category === 'REFERRER').length,
    }),
    [agents],
  );

  async function refreshAgents(
    nextFilters = filters,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      setAgents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });

    if (nextFilters.search) {
      query.set('search', nextFilters.search);
    }

    if (nextFilters.category) {
      query.set('category', nextFilters.category);
    }

    const response = await apiFetch<RealEstateAgentsResponse>(
      `/agents?${query.toString()}`,
    );
    setAgents(response.agents);
    setSelectedAgentId((current) =>
      current && response.agents.some((agent) => agent.id === current)
        ? current
        : response.agents[0]?.id ?? null,
    );
    setIsLoading(false);
  }

  async function refreshAgentDetail(
    agentId: string,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      return;
    }

    setIsDetailLoading(true);
    setSelectedAgentDetail(null);
    setDetailError(null);
    const query = new URLSearchParams({ organizationId });
    const response = await apiFetch<RealEstateAgentDetailResponse>(
      `/agents/${agentId}?${query.toString()}`,
    );
    setSelectedAgentDetail(response.agent);
    setIsDetailLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      category: stringValue(form, 'category') ?? '',
      search: stringValue(form, 'search') ?? '',
    });
  }

  function openCreateAgentDrawer() {
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function closeCreateAgentDrawer() {
    if (isSubmitting) {
      return;
    }

    setIsDrawerOpen(false);
    setFormError(null);
  }

  async function createAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activeOrganizationId || !canCreateAgents) {
      setFormError('No tienes permiso para crear agentes en esta organizacion.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...buildAgentPayload(new FormData(event.currentTarget)),
        organizationId: activeOrganizationId,
      };
      const response = await apiFetch<RealEstateAgentDetailResponse>('/agents', {
        body: JSON.stringify(payload),
        method: 'POST',
      });
      setAgents((current) => [response.agent, ...current]);
      setSelectedAgentId(response.agent.id);
      setSelectedAgentDetail(response.agent);
      setIsDrawerOpen(false);
      event.currentTarget.reset();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'No se pudo crear el agente.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <button
            className="button primary"
            disabled={!canCreateAgents}
            onClick={openCreateAgentDrawer}
            type="button"
          >
            <Plus size={17} strokeWidth={2.2} />
            Nuevo agente
          </button>
        }
        description={
          activeMembership
            ? `Red comercial de ${activeMembership.organizationName}.`
            : 'Agentes internos, brokers externos y referidos por organizacion.'
        }
        eyebrow="Red comercial"
        title="Agentes inmobiliarios"
      />

      <section className="summary-strip" aria-label="Resumen de agentes">
        <div>
          <span>Total</span>
          <strong>{agents.length}</strong>
        </div>
        <div>
          <span>Brokers</span>
          <strong>{metrics.brokers}</strong>
        </div>
        <div>
          <span>Externos</span>
          <strong>{metrics.external}</strong>
        </div>
        <div>
          <span>Referidos</span>
          <strong>{metrics.referrals}</strong>
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
            <Search size={17} strokeWidth={2.2} />
            <input
              aria-label="Buscar agente"
              defaultValue={filters.search}
              name="search"
              placeholder="Buscar agente, empresa, email o telefono"
            />
          </label>
          <select
            aria-label="Categoria"
            defaultValue={filters.category}
            name="category"
          >
            <option value="">Todas las categorias</option>
            {categoryOptions.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
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
            description="Consultando red comercial de la organizacion activa."
            title="Cargando agentes"
          />
        ) : error ? (
          <ErrorState
            action={
              <button
                className="button secondary"
                onClick={() => refreshAgents()}
                type="button"
              >
                <RefreshCcw size={16} strokeWidth={2.2} />
                Reintentar
              </button>
            }
            description={error}
            title="No se pudo cargar agentes"
          />
        ) : (
          <DataTable
            columns={[
              { key: 'agent', label: 'Agente' },
              { key: 'category', label: 'Categoria' },
              { key: 'contact', label: 'Contacto' },
              { key: 'company', label: 'Empresa' },
              { key: 'created', label: 'Creado' },
              { key: 'actions', label: 'Detalle' },
            ]}
            empty={
              <EmptyState
                action={
                  canCreateAgents ? (
                    <button
                      className="button primary"
                      onClick={openCreateAgentDrawer}
                      type="button"
                    >
                      <Handshake size={17} strokeWidth={2.2} />
                      Crear primer agente
                    </button>
                  ) : undefined
                }
                description={
                  canCreateAgents
                    ? 'Registra brokers internos, brokers externos o referidos para centralizar la red comercial.'
                    : 'Tu rol actual permite consultar agentes, pero no crearlos en esta organizacion.'
                }
                icon={Handshake}
                title="Sin agentes registrados"
              />
            }
            rows={agents.map((agent) => ({
              cells: {
                actions: (
                  <button
                    className={
                      agent.id === selectedAgentId
                        ? 'table-action active'
                        : 'table-action'
                    }
                    onClick={() => setSelectedAgentId(agent.id)}
                    type="button"
                  >
                    <Eye size={15} strokeWidth={2.2} />
                    Ver
                  </button>
                ),
                agent: (
                  <span>
                    <strong className="entity-title">{agent.displayName}</strong>
                    <span className="meta-row">{agent.email ?? 'Sin email'}</span>
                  </span>
                ),
                category: (
                  <StatusBadge tone={categoryTone[agent.category]}>
                    {categoryLabel(agent.category)}
                  </StatusBadge>
                ),
                company: agent.companyName ?? 'Independiente',
                contact: contactLabel(agent),
                created: formatDateTime(agent.createdAt),
              },
              id: agent.id,
            }))}
          />
        )}

        <SectionPanel
          description="Ficha ligera del agente seleccionado, categoria y datos de contacto principales."
          title="Detalle comercial"
        >
          {isDetailLoading ? (
            <LoadingState
              description="Consultando ficha del agente."
              title="Cargando detalle"
            />
          ) : detailError ? (
            <ErrorState
              action={
                selectedAgentId ? (
                  <button
                    className="button secondary"
                    onClick={() => refreshAgentDetail(selectedAgentId)}
                    type="button"
                  >
                    <RefreshCcw size={16} strokeWidth={2.2} />
                    Reintentar
                  </button>
                ) : undefined
              }
              description={detailError}
              title="Detalle no disponible"
            />
          ) : selectedAgent ? (
            <AgentDetailPanel agent={selectedAgent} />
          ) : (
            <EmptyState
              description="Selecciona un agente para revisar su informacion comercial."
              icon={Handshake}
              title="Sin agente seleccionado"
            />
          )}
        </SectionPanel>
      </section>

      <FormDrawer
        description="Crea un registro simple de agente para la organizacion activa."
        footer={
          <>
            <button
              className="button secondary"
              disabled={isSubmitting}
              onClick={closeCreateAgentDrawer}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={isSubmitting}
              form="agent-create-form"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} strokeWidth={2.2} />
                  Guardando...
                </>
              ) : (
                'Crear agente'
              )}
            </button>
          </>
        }
        onClose={closeCreateAgentDrawer}
        open={isDrawerOpen && canCreateAgents}
        title="Nuevo agente"
      >
        <form className="drawer-form" id="agent-create-form" onSubmit={createAgent}>
          <section className="form-section">
            <div>
              <h3>Datos basicos</h3>
              <p>Identificacion y categoria comercial del agente.</p>
            </div>
            <label>
              Categoria
              <select defaultValue="BROKER" name="category" required>
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid two">
              <label>
                Nombres
                <input name="firstName" placeholder="Juan" required />
              </label>
              <label>
                Apellidos
                <input name="lastName" placeholder="Perez" required />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Contacto</h3>
              <p>Email, telefono o WhatsApp. Al menos uno es requerido.</p>
            </div>
            <label>
              Email
              <input name="email" placeholder="agente@empresa.com" type="email" />
            </label>
            <div className="form-grid two">
              <label>
                Telefono
                <input name="phone" placeholder="+507 6000-0000" />
              </label>
              <label>
                WhatsApp
                <input name="whatsapp" placeholder="+507 6000-0000" />
              </label>
            </div>
          </section>

          <details className="form-collapsible">
            <summary>Empresa y notas</summary>
            <div className="form-section">
              <div>
                <h3>Contexto comercial</h3>
                <p>Datos opcionales para reconocer origen, empresa o licencia.</p>
              </div>
              <div className="form-grid two">
                <label>
                  Empresa
                  <input name="companyName" placeholder="Broker House" />
                </label>
                <label>
                  Licencia
                  <input name="licenseNumber" placeholder="PN-0000" />
                </label>
              </div>
              <label>
                Notas
                <textarea
                  name="notes"
                  placeholder="Origen del contacto, condiciones, especialidad o comentarios internos."
                />
              </label>
            </div>
          </details>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormDrawer>
    </>
  );
}

function AgentDetailPanel({ agent }: { agent: OrganizationRealEstateAgent }) {
  return (
    <div className="client-detail">
      <div className="detail-hero">
        <span>
          <strong>{agent.displayName}</strong>
          <small>{agent.companyName ?? 'Agente independiente'}</small>
        </span>
        <StatusBadge tone={categoryTone[agent.category]}>
          {categoryLabel(agent.category)}
        </StatusBadge>
      </div>

      <div className="detail-grid">
        <DetailField label="Categoria" value={categoryLabel(agent.category)} />
        <DetailField label="Email" value={agent.email ?? 'Pendiente'} />
        <DetailField label="Telefono" value={agent.phone ?? 'Pendiente'} />
        <DetailField label="WhatsApp" value={agent.whatsapp ?? 'Pendiente'} />
        <DetailField label="Empresa" value={agent.companyName ?? 'Independiente'} />
        <DetailField label="Licencia" value={agent.licenseNumber ?? 'Pendiente'} />
      </div>

      <div className="compact-list">
        <div className="split-row">
          <span>
            <strong className="entity-title">Contacto principal</strong>
            <span className="meta-row">{contactLabel(agent)}</span>
          </span>
          <Phone size={17} strokeWidth={2.2} />
        </div>
        <div className="split-row">
          <span>
            <strong className="entity-title">Correo</strong>
            <span className="meta-row">{agent.email ?? 'Sin email registrado'}</span>
          </span>
          <Mail size={17} strokeWidth={2.2} />
        </div>
        <div className="split-row">
          <span>
            <strong className="entity-title">Actualizacion</strong>
            <span className="meta-row">{formatDateTime(agent.updatedAt)}</span>
          </span>
          <BriefcaseBusiness size={17} strokeWidth={2.2} />
        </div>
      </div>

      {agent.notes ? (
        <div className="detail-notes">
          <strong>Notas</strong>
          <p>{agent.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <span className="detail-field">
      <strong>{label}</strong>
      <small>{value}</small>
    </span>
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

function buildAgentPayload(form: FormData): CreateRealEstateAgentPayload {
  const payload = compactPayload({
    category: stringValue(form, 'category') as RealEstateAgentCategory | undefined,
    companyName: stringValue(form, 'companyName'),
    email: stringValue(form, 'email')?.toLowerCase(),
    firstName: nameValue(form, 'firstName'),
    lastName: nameValue(form, 'lastName'),
    licenseNumber: stringValue(form, 'licenseNumber'),
    notes: stringValue(form, 'notes'),
    phone: stringValue(form, 'phone'),
    whatsapp: stringValue(form, 'whatsapp'),
  }) as CreateRealEstateAgentPayload;

  if (!payload.email && !payload.phone && !payload.whatsapp) {
    throw new Error('Agrega email, telefono o WhatsApp para el agente.');
  }

  return payload;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      return value !== undefined && value !== '';
    }),
  );
}

function stringValue(form: FormData, key: string) {
  const value = form.get(key);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nameValue(form: FormData, key: string) {
  const value = stringValue(form, key);

  return value ? toNameCase(value) : undefined;
}

function toNameCase(value: string) {
  return value
    .toLocaleLowerCase('es-PA')
    .replace(/(^|[\s'-])(\p{L})/gu, (match, boundary: string, letter: string) =>
      `${boundary}${letter.toLocaleUpperCase('es-PA')}`,
    );
}

function categoryLabel(category: RealEstateAgentCategory) {
  const labels: Record<RealEstateAgentCategory, string> = {
    BROKER: 'Broker',
    EXTERNAL_BROKER: 'Broker externo',
    REFERRER: 'Referido',
  };

  return labels[category];
}

function contactLabel(agent: OrganizationRealEstateAgent) {
  return agent.whatsapp ?? agent.phone ?? agent.email ?? 'Sin contacto';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
