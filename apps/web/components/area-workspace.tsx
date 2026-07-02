'use client';

import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  FileText,
  Handshake,
  Landmark,
  Megaphone,
  Plus,
  RefreshCcw,
  ScrollText,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  ClientsResponse,
  BusinessesResponse,
  BusinessListItem,
  DashboardSummaryResponse,
  DocumentsResponse,
  ListingsResponse,
  MandatesResponse,
  MembershipRole,
  OffersResponse,
  OrganizationClient,
  OrganizationRealEstateAgent,
  OperationalDocument,
  OperationalListing,
  OperationalMandate,
  OperationalOffer,
  OperationalShowing,
  OrganizationProperty,
  OrganizationUser,
  PropertiesResponse,
  RealEstateAgentsResponse,
  ShowingsResponse,
  TaskListItem,
  TaskListResponse,
  UsersResponse,
} from '../lib/api';
import {
  activeMemberships,
  businessStatusLabel,
  businessStatusTone,
  documentEntityLabel,
  documentStatusLabel,
  documentStatusTone,
  formatDate,
  formatDateTime,
  formatMoneyCents,
  listingStatusLabel,
  listingStatusTone,
  mandateStatusLabel,
  mandateStatusTone,
  mandateTypeLabel,
  offerStatusLabel,
  offerStatusTone,
  operationLabel,
  paymentStatusLabel,
  paymentStatusTone,
  showingStatusLabel,
  showingStatusTone,
} from './operational-format';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDrawer,
  Input,
  LoadingState,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionPanel,
  Select,
  StatusBadge,
  Textarea,
  type Tone,
} from '@soyre/ui';

export type AreaKey =
  | 'audit'
  | 'commissions'
  | 'documents'
  | 'listings'
  | 'mandates'
  | 'offers'
  | 'receivables'
  | 'reports'
  | 'settlements'
  | 'showings';

type AreaConfig = {
  title: string;
  eyebrow: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  primaryHref?: string;
  primaryLabel?: string;
  sideTitle: string;
  sideDescription: string;
};

type CreatableAreaKey =
  'documents' | 'listings' | 'mandates' | 'offers' | 'showings';

type AreaRow = {
  id: string;
  title: string;
  meta: string;
  context: string;
  date: string;
  status: string;
  tone: Tone;
  amount?: string;
};

type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
  icon: LucideIcon;
};

type WorkspaceData = {
  agents: OrganizationRealEstateAgent[];
  businesses: BusinessListItem[];
  clients: OrganizationClient[];
  documents: OperationalDocument[];
  listings: OperationalListing[];
  mandates: OperationalMandate[];
  offers: OperationalOffer[];
  properties: OrganizationProperty[];
  showings: OperationalShowing[];
  summary: DashboardSummaryResponse | null;
  tasks: TaskListItem[];
  users: OrganizationUser[];
};

const operationalWriteRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'AGENT',
  'OPERATIONS',
]);

const creatableAreaLabels: Record<CreatableAreaKey, string> = {
  documents: 'Nuevo documento',
  listings: 'Nuevo listing',
  mandates: 'Nuevo mandato',
  offers: 'Nueva oferta',
  showings: 'Nueva visita',
};

const creatableAreaEndpoints: Record<CreatableAreaKey, string> = {
  documents: '/documents',
  listings: '/listings',
  mandates: '/mandates',
  offers: '/offers',
  showings: '/showings',
};

const areaConfig: Record<AreaKey, AreaConfig> = {
  audit: {
    description:
      'Registro de actividad sensible y eventos operativos del sistema.',
    emptyDescription:
      'La actividad aparecera cuando el equipo cree o actualice registros.',
    emptyTitle: 'Sin actividad registrada',
    eyebrow: 'Sistema',
    icon: ScrollText,
    sideDescription:
      'La auditoría se alimenta desde el sistema y debe crecer con cada acción crítica.',
    sideTitle: 'Criterios de auditoría',
    title: 'Auditoría',
  },
  commissions: {
    description:
      'Vista financiera para comisiones devengadas, pagaderas y pendientes.',
    emptyDescription:
      'Las comisiones aparecerán al confirmar negocios con planes de comisión.',
    emptyTitle: 'Sin comisiones visibles',
    eyebrow: 'Finanzas',
    icon: TrendingUp,
    sideDescription:
      'Los montos finales deben venir de asignaciones calculadas, no de estimaciones manuales.',
    sideTitle: 'Regla financiera',
    title: 'Comisiones',
  },
  documents: {
    description:
      'Expedientes por cliente, propiedad y negocio con revisión documental.',
    emptyDescription:
      'Sube documentos desde clientes o crea acciones documentales desde un negocio.',
    emptyTitle: 'Sin documentos operativos',
    eyebrow: 'Expedientes',
    icon: FileText,
    primaryHref: '/clients',
    primaryLabel: 'Ir a clientes',
    sideDescription:
      'La siguiente fase separa documentos generales de identidad y define retencion.',
    sideTitle: 'Alcance documental',
    title: 'Documentos',
  },
  listings: {
    description:
      'Preparacion comercial interna para publicar propiedades listas.',
    emptyDescription:
      'Crea propiedades activas para empezar la preparacion comercial.',
    emptyTitle: 'Sin listings preparados',
    eyebrow: 'Publicacion',
    icon: Megaphone,
    primaryHref: '/properties',
    primaryLabel: 'Ir a propiedades',
    sideDescription:
      'No se publican portales externos en este bloque; queda preparado el control interno.',
    sideTitle: 'Canales',
    title: 'Listings',
  },
  mandates: {
    description:
      'Autorizaciones comerciales, exclusividad, vigencia y comisión pactada.',
    emptyDescription:
      'Crea propiedades con propietario para preparar mandatos comerciales.',
    emptyTitle: 'Sin mandatos derivados',
    eyebrow: 'Autorizaciones',
    icon: Handshake,
    primaryHref: '/properties',
    primaryLabel: 'Ir a propiedades',
    sideDescription:
      'El modelo persistente se implementa en el bloque de mandatos.',
    sideTitle: 'Base contractual',
    title: 'Mandatos',
  },
  offers: {
    description:
      'Ofertas, contraofertas y negociaciones antes de crear o confirmar negocio.',
    emptyDescription:
      'Las ofertas se conectaran a clientes, propiedades y negocios.',
    emptyTitle: 'Sin ofertas en negociación',
    eyebrow: 'Negociacion',
    icon: ClipboardCheck,
    primaryHref: '/businesses/new',
    primaryLabel: 'Nuevo negocio',
    sideDescription:
      'Una oferta aceptada debe crear o enlazar un negocio transaccional.',
    sideTitle: 'Handoff a negocio',
    title: 'Ofertas',
  },
  receivables: {
    description:
      'Cobros programados, vencidos y próximos derivados de planes de pago.',
    emptyDescription:
      'Los cobros aparecerán cuando los negocios tengan planes de pago confirmados.',
    emptyTitle: 'Sin cobros programados',
    eyebrow: 'Finanzas',
    icon: DollarSign,
    sideDescription:
      'Los cobros reales se derivan del payment plan, no de tareas manuales sueltas.',
    sideTitle: 'Regla de cobranza',
    title: 'Cobranza',
  },
  reports: {
    description:
      'Lecturas operativas para ventas, cobranza, comisiones y actividad.',
    emptyDescription:
      'Los reportes aparecerán a medida que existan negocios y actividad.',
    emptyTitle: 'Sin reportes calculables',
    eyebrow: 'Inteligencia operativa',
    icon: BarChart3,
    sideDescription:
      'Los reportes se alimentan de relaciones existentes, no de respaldos manuales.',
    sideTitle: 'Fuente de verdad',
    title: 'Reportes',
  },
  settlements: {
    description: 'Liquidación y pago de comisiones aprobadas.',
    emptyDescription:
      'Las liquidaciones aparecerán cuando haya comisiones aprobadas para pago.',
    emptyTitle: 'Sin liquidaciones pendientes',
    eyebrow: 'Finanzas',
    icon: Landmark,
    sideDescription:
      'Pagar una comisión debe dejar auditoría y estado financiero trazable.',
    sideTitle: 'Control de pago',
    title: 'Liquidaciones',
  },
  showings: {
    description:
      'Agenda de visitas, participantes, resultado y siguiente acción.',
    emptyDescription:
      'Las visitas se conectaran a propiedades, clientes y agentes.',
    emptyTitle: 'Sin visitas registradas',
    eyebrow: 'Agenda comercial',
    icon: CalendarDays,
    primaryHref: '/tasks',
    primaryLabel: 'Ver tareas',
    sideDescription: 'Cada visita debe cerrar con resultado y próxima acción.',
    sideTitle: 'Seguimiento',
    title: 'Visitas',
  },
};

export function AreaWorkspace({ area }: { area: AreaKey }) {
  const config = areaConfig[area];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [data, setData] = useState<WorkspaceData>({
    agents: [],
    businesses: [],
    clients: [],
    documents: [],
    listings: [],
    mandates: [],
    offers: [],
    properties: [],
    showings: [],
    summary: null,
    tasks: [],
    users: [],
  });
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError(
            'No tienes una organización activa para consultar esta área.',
          );
          setIsLoading(false);
          return;
        }

        setActiveOrganizationId(firstMembership.organizationId);
      })
      .catch((caught) => {
        setError(
          caught instanceof Error ? caught.message : 'Sesión no disponible.',
        );
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    refreshArea(activeOrganizationId).catch((caught) => {
      setError(
        caught instanceof Error ? caught.message : 'Area no disponible.',
      );
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
  const rows = useMemo(() => buildRows(area, data), [area, data]);
  const filteredRows = useMemo(() => {
    const query = search.toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [row.title, row.meta, row.context, row.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [rows, search]);
  const metrics = useMemo(
    () => buildMetrics(area, data, filteredRows),
    [area, data, filteredRows],
  );
  const canCreate = activeMembership
    ? isCreatableArea(area) && operationalWriteRoles.has(activeMembership.role)
    : false;

  async function refreshArea(organizationId = activeOrganizationId) {
    if (!organizationId) {
      setData({
        agents: [],
        businesses: [],
        clients: [],
        documents: [],
        listings: [],
        mandates: [],
        offers: [],
        properties: [],
        showings: [],
        summary: null,
        tasks: [],
        users: [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });
    const [
      summary,
      agents,
      businesses,
      clients,
      properties,
      tasks,
      documents,
      mandates,
      listings,
      showings,
      offers,
      users,
    ] = await Promise.all([
      apiFetch<DashboardSummaryResponse>(
        `/dashboard/summary?${query.toString()}`,
      ),
      apiFetch<RealEstateAgentsResponse>(`/agents?${query.toString()}`),
      apiFetch<BusinessesResponse>(`/businesses?${query.toString()}`),
      apiFetch<ClientsResponse>(`/clients?${query.toString()}`),
      apiFetch<PropertiesResponse>(`/properties?${query.toString()}`),
      apiFetch<TaskListResponse>(`/tasks?${query.toString()}`),
      apiFetch<DocumentsResponse>(`/documents?${query.toString()}`),
      apiFetch<MandatesResponse>(`/mandates?${query.toString()}`),
      apiFetch<ListingsResponse>(`/listings?${query.toString()}`),
      apiFetch<ShowingsResponse>(`/showings?${query.toString()}`),
      apiFetch<OffersResponse>(`/offers?${query.toString()}`),
      apiFetch<UsersResponse>(`/users?${query.toString()}`),
    ]);

    setData({
      agents: agents.agents,
      businesses: businesses.businesses,
      clients: clients.clients,
      documents: documents.documents,
      listings: listings.listings,
      mandates: mandates.mandates,
      offers: offers.offers,
      properties: properties.properties,
      showings: showings.showings,
      summary,
      tasks: tasks.tasks,
      users: users.users,
    });
    setIsLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = form.get('search');
    setSearch(typeof value === 'string' ? value.trim() : '');
  }

  function openCreateDrawer() {
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function closeCreateDrawer() {
    if (isSubmitting) {
      return;
    }

    setIsDrawerOpen(false);
    setFormError(null);
  }

  async function createOperationalRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activeOrganizationId || !isCreatableArea(area) || !canCreate) {
      setFormError('No tienes permiso para crear registros en esta area.');
      return;
    }

    const formElement = event.currentTarget;
    setIsSubmitting(true);

    try {
      const payload = buildCreatePayload(
        area,
        new FormData(formElement),
        activeOrganizationId,
      );
      await apiFetch(creatableAreaEndpoints[area], {
        body: JSON.stringify(payload),
        method: 'POST',
      });
      formElement.reset();
      setIsDrawerOpen(false);
      await refreshArea(activeOrganizationId);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo crear el registro.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <div className="row-actions">
            {isCreatableArea(area) ? (
              <Button
                disabled={!canCreate}
                icon={Plus}
                onClick={openCreateDrawer}
              >
                {creatableAreaLabels[area]}
              </Button>
            ) : null}
            {config.primaryHref && config.primaryLabel ? (
              <Button asChild variant="secondary">
                <Link href={config.primaryHref}>{config.primaryLabel}</Link>
              </Button>
            ) : null}
            <Button
              icon={RefreshCcw}
              onClick={() => refreshArea()}
              variant="secondary"
            >
              Actualizar
            </Button>
          </div>
        }
        description={
          activeMembership
            ? `${config.description} Organización: ${activeMembership.organizationName}.`
            : config.description
        }
        eyebrow={config.eyebrow}
        title={config.title}
      />

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <Select
              id={`${area}-filter-organization`}
              label="Organización"
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
            aria-label={`Buscar en ${config.title}`}
            defaultValue={search}
            name="search"
            placeholder={`Buscar en ${config.title.toLowerCase()}`}
          />
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      {isLoading ? (
        <LoadingState
          description={`Consultando ${config.title.toLowerCase()} de la organización.`}
          title={`Cargando ${config.title.toLowerCase()}`}
        />
      ) : error ? (
        <ErrorState
          action={
            <Button
              icon={RefreshCcw}
              onClick={() => refreshArea()}
              variant="secondary"
            >
              Reintentar
            </Button>
          }
          description={error}
          title={`No se pudo cargar ${config.title.toLowerCase()}`}
        />
      ) : (
        <>
          <section
            className="metric-grid"
            aria-label={`Metricas de ${config.title}`}
          >
            {metrics.map((metric) => (
              <MetricCard
                detail={metric.detail}
                icon={metric.icon}
                key={metric.label}
                label={metric.label}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </section>

          <section className="dashboard-grid">
            <DataTable
              columns={[
                { key: 'record', label: config.title },
                { key: 'context', label: 'Contexto' },
                { key: 'date', label: 'Fecha' },
                { key: 'status', label: 'Estado' },
                { key: 'amount', label: 'Monto' },
              ]}
              empty={
                <EmptyState
                  description={config.emptyDescription}
                  icon={config.icon}
                  title={config.emptyTitle}
                />
              }
              rows={filteredRows.map((row) => ({
                id: row.id,
                cells: {
                  amount: row.amount ?? 'N/A',
                  context: row.context,
                  date: row.date,
                  record: (
                    <span>
                      <strong className="entity-title">{row.title}</strong>
                      <span className="meta-row">{row.meta}</span>
                    </span>
                  ),
                  status: (
                    <StatusBadge tone={row.tone}>{row.status}</StatusBadge>
                  ),
                },
              }))}
            />

            <SectionPanel
              description={config.sideDescription}
              title={config.sideTitle}
            >
              <div className="compact-list">
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Datos reales</strong>
                    <span className="meta-row">
                      La pantalla no usa registros simulados.
                    </span>
                  </span>
                  <StatusBadge tone="success">Activo</StatusBadge>
                </div>
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Multi-organización</strong>
                    <span className="meta-row">
                      Las consultas usan la organización activa.
                    </span>
                  </span>
                  <StatusBadge tone="primary">Base</StatusBadge>
                </div>
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Siguiente bloque</strong>
                    <span className="meta-row">
                      Persistencia específica y acciones avanzadas por módulo.
                    </span>
                  </span>
                  <StatusBadge tone="warning">Pendiente</StatusBadge>
                </div>
              </div>
            </SectionPanel>
          </section>
        </>
      )}

      {isCreatableArea(area) ? (
        <FormDrawer
          description="Crea un registro operativo asociado a la organización activa."
          footer={
            <>
              <Button
                disabled={isSubmitting}
                onClick={closeCreateDrawer}
                type="button"
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                disabled={isSubmitting}
                form={`${area}-create-form`}
                icon={Plus}
                type="submit"
              >
                {isSubmitting ? 'Creando' : 'Crear'}
              </Button>
            </>
          }
          onClose={closeCreateDrawer}
          open={isDrawerOpen && canCreate}
          title={creatableAreaLabels[area]}
        >
          <form
            className="drawer-form"
            id={`${area}-create-form`}
            onSubmit={createOperationalRecord}
          >
            <OperationalCreateFields area={area} data={data} />
            {formError ? <p className="form-error">{formError}</p> : null}
          </form>
        </FormDrawer>
      ) : null}
    </>
  );
}

function OperationalCreateFields({
  area,
  data,
}: {
  area: CreatableAreaKey;
  data: WorkspaceData;
}) {
  switch (area) {
    case 'documents':
      return (
        <>
          <section className="form-section">
            <div>
              <h3>Documento</h3>
              <p>Expediente operativo asociado a una entidad del sistema.</p>
            </div>
            <div className="form-grid two">
              <Select
                defaultValue="CLIENT"
                id="document-entity-type"
                label="Entidad"
                name="entityType"
                required
              >
                <option value="CLIENT">Cliente</option>
                <option value="PROPERTY">Propiedad</option>
                <option value="BUSINESS">Negocio</option>
                <option value="MANDATE">Mandato</option>
                <option value="LISTING">Listing</option>
                <option value="OFFER">Oferta</option>
                <option value="SHOWING">Visita</option>
                <option value="OTHER">Otro</option>
              </Select>
              <Select
                defaultValue="REQUIRED"
                id="document-status"
                label="Estado"
                name="status"
                required
              >
                <option value="REQUIRED">Requerido</option>
                <option value="UPLOADED">Cargado</option>
                <option value="IN_REVIEW">En revisión</option>
                <option value="APPROVED">Aprobado</option>
              </Select>
            </div>
            <Input
              id="document-name"
              label="Nombre"
              name="name"
              placeholder="Pasaporte, contrato firmado, poder legal"
              required
            />
            <Input
              id="document-type"
              label="Tipo documental"
              name="documentType"
              placeholder="Identidad, legal, comercial"
              required
            />
            <div className="form-grid two">
              <Input
                id="document-file-name"
                label="Archivo"
                name="fileName"
                placeholder="documento.pdf"
              />
              <Input
                id="document-storage-path"
                label="Ruta storage"
                name="storagePath"
                placeholder="documents/cliente/documento.pdf"
              />
            </div>
          </section>

          <details className="form-collapsible" open>
            <summary>Relación</summary>
            <div className="form-section">
              <div className="form-grid two">
                <Select id="document-client" label="Cliente" name="clientId">
                  <option value="">Sin cliente</option>
                  {data.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.displayName}
                    </option>
                  ))}
                </Select>
                <Select
                  id="document-property"
                  label="Propiedad"
                  name="propertyId"
                >
                  <option value="">Sin propiedad</option>
                  {data.properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Select id="document-business" label="Negocio" name="businessId">
                <option value="">Sin negocio</option>
                {data.businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.code} / {business.title}
                  </option>
                ))}
              </Select>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Vigencia y notas</summary>
            <div className="form-section">
              <div className="form-grid two">
                <Input
                  id="document-required-by"
                  label="Requerido para"
                  name="requiredBy"
                  type="date"
                />
                <Input
                  id="document-expires-at"
                  label="Vence"
                  name="expiresAt"
                  type="date"
                />
              </div>
              <Textarea
                id="document-notes"
                label="Notas"
                name="notes"
                placeholder="Detalle operativo, responsable o condicion."
              />
            </div>
          </details>
        </>
      );
    case 'mandates':
      return (
        <>
          <section className="form-section">
            <div>
              <h3>Mandato</h3>
              <p>Autorizacion comercial y condiciones basicas pactadas.</p>
            </div>
            <Select
              id="mandate-property"
              label="Propiedad"
              name="propertyId"
              required
            >
              <option value="">Seleccionar propiedad</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </Select>
            <div className="form-grid two">
              <Select
                defaultValue="SALE"
                id="mandate-type"
                label="Tipo"
                name="type"
              >
                <option value="SALE">Venta</option>
                <option value="RENT">Alquiler</option>
                <option value="BOTH">Venta y alquiler</option>
              </Select>
              <Select
                defaultValue="DRAFT"
                id="mandate-status"
                label="Estado"
                name="status"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PENDING_DOCUMENTS">Docs pendientes</option>
                <option value="ACTIVE">Activo</option>
              </Select>
            </div>
            <label>
              <input name="exclusive" type="checkbox" /> Exclusivo
            </label>
          </section>

          <section className="form-section">
            <div>
              <h3>Responsables y valores</h3>
              <p>Propietario, asesor asignado, precio autorizado y comisión.</p>
            </div>
            <div className="form-grid two">
              <Select
                id="mandate-owner"
                label="Propietario"
                name="ownerClientId"
              >
                <option value="">Usar propietario de la propiedad</option>
                {data.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.displayName}
                  </option>
                ))}
              </Select>
              <Select
                id="mandate-user"
                label="Asignado a"
                name="assignedUserId"
              >
                <option value="">Usuario actual</option>
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName ?? ''}
                  </option>
                ))}
              </Select>
            </div>
            <div className="form-grid three">
              <Input
                id="mandate-price"
                label="Precio autorizado"
                min="0"
                name="authorizedAmount"
                placeholder="250000"
                step="0.01"
                type="number"
              />
              <Input
                defaultValue="USD"
                id="mandate-currency"
                label="Moneda"
                maxLength={3}
                name="currency"
              />
              <Input
                id="mandate-commission"
                label="Comisión %"
                max="100"
                min="0"
                name="commissionPercent"
                step="0.01"
                type="number"
              />
            </div>
          </section>

          <details className="form-collapsible">
            <summary>Fechas y notas</summary>
            <div className="form-section">
              <div className="form-grid three">
                <Input
                  id="mandate-starts"
                  label="Inicio"
                  name="startsAt"
                  type="date"
                />
                <Input
                  id="mandate-ends"
                  label="Fin"
                  name="endsAt"
                  type="date"
                />
                <Input
                  id="mandate-signed"
                  label="Firma"
                  name="signedAt"
                  type="date"
                />
              </div>
              <Textarea id="mandate-notes" label="Notas" name="notes" />
            </div>
          </details>
        </>
      );
    case 'listings':
      return (
        <>
          <section className="form-section">
            <div>
              <h3>Listing</h3>
              <p>Preparacion comercial interna antes de publicar.</p>
            </div>
            <Select
              id="listing-property"
              label="Propiedad"
              name="propertyId"
              required
            >
              <option value="">Seleccionar propiedad</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </Select>
            <Input
              id="listing-title"
              label="Título"
              name="title"
              placeholder="Apartamento con vista abierta"
              required
            />
            <div className="form-grid two">
              <Select id="listing-mandate" label="Mandato" name="mandateId">
                <option value="">Sin mandato</option>
                {data.mandates.map((mandate) => (
                  <option key={mandate.id} value={mandate.id}>
                    {mandate.property.title} / {mandateTypeLabel(mandate.type)}
                  </option>
                ))}
              </Select>
              <Select
                defaultValue="DRAFT"
                id="listing-status"
                label="Estado"
                name="status"
              >
                <option value="DRAFT">Borrador</option>
                <option value="READY">Listo</option>
                <option value="APPROVED">Aprobado</option>
                <option value="PUBLISHED">Publicado</option>
              </Select>
            </div>
            <Input
              id="listing-channels"
              label="Canales"
              name="channels"
              placeholder="Web, Instagram, MLS"
            />
            <Textarea
              id="listing-copy"
              label="Copy publico"
              name="publicCopy"
              placeholder="Descripción comercial inicial."
            />
          </section>
        </>
      );
    case 'showings':
      return (
        <>
          <section className="form-section">
            <div>
              <h3>Visita</h3>
              <p>Agenda, participantes y responsable de seguimiento.</p>
            </div>
            <Select
              id="showing-property"
              label="Propiedad"
              name="propertyId"
              required
            >
              <option value="">Seleccionar propiedad</option>
              {data.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </Select>
            <div className="form-grid two">
              <Input
                id="showing-scheduled"
                label="Fecha y hora"
                name="scheduledFor"
                required
                type="datetime-local"
              />
              <Select
                defaultValue="REQUESTED"
                id="showing-status"
                label="Estado"
                name="status"
              >
                <option value="REQUESTED">Solicitada</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="COMPLETED">Completada</option>
              </Select>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Participantes</h3>
              <p>Cliente, agente inmobiliario y usuario responsable.</p>
            </div>
            <div className="form-grid two">
              <Select id="showing-client" label="Cliente" name="clientId">
                <option value="">Sin cliente</option>
                {data.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.displayName}
                  </option>
                ))}
              </Select>
              <Select
                id="showing-agent"
                label="Agente"
                name="realEstateAgentId"
              >
                <option value="">Sin agente</option>
                {data.agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="form-grid two">
              <Select
                id="showing-user"
                label="Asignado a"
                name="assignedUserId"
              >
                <option value="">Usuario actual</option>
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName ?? ''}
                  </option>
                ))}
              </Select>
              <Select id="showing-business" label="Negocio" name="businessId">
                <option value="">Sin negocio</option>
                {data.businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.code} / {business.title}
                  </option>
                ))}
              </Select>
            </div>
            <Textarea id="showing-notes" label="Notas" name="notes" />
          </section>
        </>
      );
    case 'offers':
      return (
        <>
          <section className="form-section">
            <div>
              <h3>Oferta</h3>
              <p>Propuesta económica previa a crear o enlazar negocio.</p>
            </div>
            <Select id="offer-client" label="Cliente" name="clientId" required>
              <option value="">Seleccionar cliente</option>
              {data.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.displayName}
                </option>
              ))}
            </Select>
            <div className="form-grid two">
              <Select
                defaultValue="SALE"
                id="offer-operation"
                label="Operación"
                name="operationType"
              >
                <option value="SALE">Venta</option>
                <option value="RENT">Alquiler</option>
                <option value="RESERVATION">Reserva</option>
                <option value="ASSIGNMENT">Cesión</option>
                <option value="PRE_SALE">Preventa</option>
                <option value="OTHER">Otro</option>
              </Select>
              <Select
                defaultValue="DRAFT"
                id="offer-status"
                label="Estado"
                name="status"
              >
                <option value="DRAFT">Borrador</option>
                <option value="SENT">Enviada</option>
                <option value="COUNTERED">Contraoferta</option>
                <option value="ACCEPTED">Aceptada</option>
              </Select>
            </div>
            <div className="form-grid two">
              <Input
                id="offer-amount"
                label="Monto"
                min="0"
                name="amount"
                placeholder="250000"
                required
                step="0.01"
                type="number"
              />
              <Input
                defaultValue="USD"
                id="offer-currency"
                label="Moneda"
                maxLength={3}
                name="currency"
              />
            </div>
          </section>

          <details className="form-collapsible" open>
            <summary>Relación y términos</summary>
            <div className="form-section">
              <div className="form-grid two">
                <Select id="offer-property" label="Propiedad" name="propertyId">
                  <option value="">Sin propiedad</option>
                  {data.properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title}
                    </option>
                  ))}
                </Select>
                <Select id="offer-business" label="Negocio" name="businessId">
                  <option value="">Sin negocio</option>
                  {data.businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.code} / {business.title}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                id="offer-expires"
                label="Vence"
                name="expiresAt"
                type="datetime-local"
              />
              <Textarea
                id="offer-terms"
                label="Terminos"
                name="terms"
                placeholder="Condiciones, depósito, plazo de respuesta o anexos."
              />
            </div>
          </details>
        </>
      );
  }
}

function buildRows(area: AreaKey, data: WorkspaceData): AreaRow[] {
  switch (area) {
    case 'audit':
      return (
        data.summary?.activity.map((item) => ({
          context: item.actor,
          date: formatDateTime(item.createdAt),
          id: item.id,
          meta: item.targetType,
          status: 'Auditado',
          title: item.action,
          tone: 'neutral',
        })) ?? []
      );
    case 'commissions':
      return data.businesses
        .filter((business) => business.permissionHints.canViewCommissions)
        .map((business) => ({
          amount: formatMoneyCents(
            business.totalContractAmountCents,
            business.currency,
          ),
          context: business.primaryAgentName ?? 'Sin agente principal',
          date: formatDate(business.expectedClosingDate),
          id: business.id,
          meta: `${business.code} / ${operationLabel(business.operationType)}`,
          status: businessStatusLabel(business.status),
          title: business.title,
          tone: businessStatusTone(business.status),
        }));
    case 'documents':
      return data.documents.map((document) => ({
        context: documentContext(document),
        date: formatDateTime(document.updatedAt),
        id: document.id,
        meta: `${documentEntityLabel(document.entityType)} / ${document.documentType}`,
        status: documentStatusLabel(document.status),
        title: document.fileName ?? document.name,
        tone: documentStatusTone(document.status),
      }));
    case 'listings':
      return data.listings.map((listing) => ({
        amount: propertyAskingAmount(listing.property),
        context: `${listing.property.city} / ${listing.property.zone}`,
        date: formatDateTime(
          listing.publishedAt ?? listing.approvedAt ?? listing.updatedAt,
        ),
        id: listing.id,
        meta:
          listing.channels.length > 0
            ? listing.channels.join(' + ')
            : listing.mandate
              ? mandateTypeLabel(listing.mandate.type)
              : 'Sin canal',
        status: listingStatusLabel(listing.status),
        title: listing.title,
        tone: listingStatusTone(listing.status),
      }));
    case 'mandates':
      return data.mandates.map((mandate) => ({
        amount: formatMoneyCents(
          mandate.authorizedPriceCents,
          mandate.currency,
        ),
        context: mandate.ownerClient?.displayName ?? 'Sin propietario',
        date: formatDate(
          mandate.endsAt ?? mandate.startsAt ?? mandate.updatedAt,
        ),
        id: mandate.id,
        meta: `${mandateTypeLabel(mandate.type)} / ${mandate.property.city}`,
        status: mandateStatusLabel(mandate.status),
        title: mandate.property.title,
        tone: mandateStatusTone(mandate.status),
      }));
    case 'offers':
      return data.offers.map((offer) => ({
        amount: formatMoneyCents(offer.amountCents, offer.currency),
        context: offer.client.displayName,
        date: formatDate(offer.expiresAt ?? offer.updatedAt),
        id: offer.id,
        meta: offer.property?.title ?? offer.business?.title ?? 'Sin inmueble',
        status: offerStatusLabel(offer.status),
        title: `${operationLabel(offer.operationType)} propuesta`,
        tone: offerStatusTone(offer.status),
      }));
    case 'receivables':
      return data.businesses
        .filter((business) => business.nextPayment)
        .map((business) => ({
          amount: business.nextPayment
            ? formatMoneyCents(
                business.nextPayment.amountCents,
                business.currency,
              )
            : undefined,
          context: business.clientName ?? 'Sin cliente',
          date: formatDate(business.nextPayment?.dueDate),
          id: business.nextPayment?.id ?? business.id,
          meta: business.title,
          status: business.nextPayment
            ? paymentStatusLabel(business.nextPayment.status)
            : 'Sin pago',
          title: business.nextPayment?.label ?? business.title,
          tone: business.nextPayment
            ? paymentStatusTone(business.nextPayment.status)
            : 'neutral',
        }));
    case 'reports':
      return buildReportRows(data);
    case 'settlements':
      return data.businesses
        .filter((business) => business.permissionHints.canViewCommissions)
        .filter((business) =>
          ['ACTIVE', 'CLOSED', 'PENDING_SIGNATURE'].includes(business.status),
        )
        .map((business) => ({
          amount: formatMoneyCents(
            business.totalContractAmountCents,
            business.currency,
          ),
          context: business.primaryAgentName ?? 'Sin agente principal',
          date: formatDate(business.expectedClosingDate),
          id: business.id,
          meta: business.code,
          status: businessStatusLabel(business.status),
          title: business.title,
          tone: businessStatusTone(business.status),
        }));
    case 'showings':
      return data.showings.map((showing) => ({
        context: showing.property.title,
        date: formatDateTime(showing.scheduledFor),
        id: showing.id,
        meta:
          showing.client?.displayName ??
          showing.realEstateAgent?.displayName ??
          'Sin participante',
        status: showingStatusLabel(showing.status),
        title: showing.outcome ?? 'Visita programada',
        tone: showingStatusTone(showing.status),
      }));
  }
}

function buildMetrics(
  area: AreaKey,
  data: WorkspaceData,
  rows: AreaRow[],
): Metric[] {
  const summary = data.summary;

  if (area === 'reports' && summary) {
    return [
      {
        detail: 'Negocios abiertos en flujo.',
        icon: ClipboardCheck,
        label: 'Negocios',
        tone: 'primary',
        value: String(summary.metrics.openBusinesses),
      },
      {
        detail: 'Cobros vencidos.',
        icon: DollarSign,
        label: 'Vencido',
        tone: 'danger',
        value: formatMoneyCents(summary.metrics.overdueReceivables.amountCents),
      },
      {
        detail: 'Cobros de los próximos 7 días.',
        icon: CalendarDays,
        label: '7 días',
        tone: 'warning',
        value: formatMoneyCents(
          summary.metrics.nextSevenDaysReceivables.amountCents,
        ),
      },
      {
        detail: 'Comisiones pendientes.',
        icon: TrendingUp,
        label: 'Comisiones',
        tone: 'featured',
        value: formatMoneyCents(summary.metrics.pendingCommissions.amountCents),
      },
    ];
  }

  return [
    {
      detail: 'Registros visibles con la organización activa.',
      icon: areaConfig[area].icon,
      label: 'Registros',
      tone: 'primary',
      value: String(rows.length),
    },
    {
      detail: 'Negocios abiertos disponibles como fuente transaccional.',
      icon: ClipboardCheck,
      label: 'Negocios',
      tone: 'featured',
      value: String(data.businesses.length),
    },
    {
      detail: 'Propiedades en inventario consultable.',
      icon: Megaphone,
      label: 'Propiedades',
      tone: 'rent',
      value: String(data.properties.length),
    },
    {
      detail: 'Acciones programadas pendientes o activas.',
      icon: CalendarDays,
      label: 'Acciones',
      tone: 'warning',
      value: String(data.tasks.length),
    },
  ];
}

function buildReportRows(data: WorkspaceData): AreaRow[] {
  const summary = data.summary;

  if (!summary) {
    return [];
  }

  return [
    {
      amount: String(summary.metrics.openBusinesses),
      context: 'Pipeline',
      date: 'Actual',
      id: 'report-businesses',
      meta: 'Negocios por estado',
      status: 'Disponible',
      title: 'Negocios abiertos',
      tone: 'primary',
    },
    {
      amount: formatMoneyCents(summary.metrics.overdueReceivables.amountCents),
      context: 'Cobranza',
      date: 'Actual',
      id: 'report-overdue',
      meta: `${summary.metrics.overdueReceivables.count} cuotas`,
      status: 'Disponible',
      title: 'Cobros vencidos',
      tone: summary.metrics.overdueReceivables.count > 0 ? 'danger' : 'success',
    },
    {
      amount: formatMoneyCents(
        summary.metrics.nextSevenDaysReceivables.amountCents,
      ),
      context: 'Cobranza',
      date: '7 días',
      id: 'report-next-seven',
      meta: `${summary.metrics.nextSevenDaysReceivables.count} cuotas`,
      status: 'Disponible',
      title: 'Cobros por vencer',
      tone: 'warning',
    },
    {
      amount: formatMoneyCents(summary.metrics.pendingCommissions.amountCents),
      context: 'Finanzas',
      date: 'Actual',
      id: 'report-commissions',
      meta: `${summary.metrics.pendingCommissions.count} asignaciones`,
      status: 'Disponible',
      title: 'Comisiones pendientes',
      tone: 'featured',
    },
  ];
}

function documentContext(document: OperationalDocument) {
  return (
    document.client?.displayName ??
    document.property?.title ??
    document.business?.title ??
    document.business?.code ??
    document.businessContract?.contractNumber ??
    'Sin relación'
  );
}

function propertyAskingAmount(
  property: OperationalListing['property'],
): string | undefined {
  if (property.salePrice !== null) {
    return formatMoneyCents(
      String(property.salePrice * 100),
      property.currency,
    );
  }

  if (property.rentPrice !== null) {
    return formatMoneyCents(
      String(property.rentPrice * 100),
      property.currency,
    );
  }

  return undefined;
}

function isCreatableArea(area: AreaKey): area is CreatableAreaKey {
  return (
    area === 'documents' ||
    area === 'listings' ||
    area === 'mandates' ||
    area === 'offers' ||
    area === 'showings'
  );
}

function buildCreatePayload(
  area: CreatableAreaKey,
  form: FormData,
  organizationId: string,
) {
  switch (area) {
    case 'documents':
      return stripEmpty({
        organizationId,
        businessId: optionalString(form, 'businessId'),
        clientId: optionalString(form, 'clientId'),
        documentType: requiredString(form, 'documentType', 'Tipo documental'),
        entityType: requiredString(form, 'entityType', 'Entidad'),
        expiresAt: optionalString(form, 'expiresAt'),
        fileName: optionalString(form, 'fileName'),
        name: requiredString(form, 'name', 'Nombre'),
        notes: optionalString(form, 'notes'),
        propertyId: optionalString(form, 'propertyId'),
        requiredBy: optionalString(form, 'requiredBy'),
        status: requiredString(form, 'status', 'Estado'),
        storagePath: optionalString(form, 'storagePath'),
      });
    case 'mandates':
      return stripEmpty({
        organizationId,
        assignedUserId: optionalString(form, 'assignedUserId'),
        authorizedPriceCents: optionalMoneyCents(form, 'authorizedAmount'),
        commissionBps: optionalPercentBps(form, 'commissionPercent'),
        currency: optionalString(form, 'currency') ?? 'USD',
        endsAt: optionalString(form, 'endsAt'),
        exclusive: form.get('exclusive') === 'on',
        notes: optionalString(form, 'notes'),
        ownerClientId: optionalString(form, 'ownerClientId'),
        propertyId: requiredString(form, 'propertyId', 'Propiedad'),
        signedAt: optionalString(form, 'signedAt'),
        startsAt: optionalString(form, 'startsAt'),
        status: requiredString(form, 'status', 'Estado'),
        type: requiredString(form, 'type', 'Tipo'),
      });
    case 'listings':
      return stripEmpty({
        organizationId,
        channels: splitList(optionalString(form, 'channels')),
        mandateId: optionalString(form, 'mandateId'),
        propertyId: requiredString(form, 'propertyId', 'Propiedad'),
        publicCopy: optionalString(form, 'publicCopy'),
        status: requiredString(form, 'status', 'Estado'),
        title: requiredString(form, 'title', 'Título'),
      });
    case 'showings':
      return stripEmpty({
        organizationId,
        assignedUserId: optionalString(form, 'assignedUserId'),
        businessId: optionalString(form, 'businessId'),
        clientId: optionalString(form, 'clientId'),
        notes: optionalString(form, 'notes'),
        propertyId: requiredString(form, 'propertyId', 'Propiedad'),
        realEstateAgentId: optionalString(form, 'realEstateAgentId'),
        scheduledFor: requiredDateTime(form, 'scheduledFor', 'Fecha y hora'),
        status: requiredString(form, 'status', 'Estado'),
      });
    case 'offers':
      return stripEmpty({
        organizationId,
        amountCents: requiredMoneyCents(form, 'amount', 'Monto'),
        businessId: optionalString(form, 'businessId'),
        clientId: requiredString(form, 'clientId', 'Cliente'),
        currency: optionalString(form, 'currency') ?? 'USD',
        expiresAt: optionalDateTime(form, 'expiresAt'),
        operationType: requiredString(form, 'operationType', 'Operación'),
        propertyId: optionalString(form, 'propertyId'),
        status: requiredString(form, 'status', 'Estado'),
        terms: optionalString(form, 'terms'),
      });
  }
}

function optionalString(form: FormData, key: string) {
  const value = form.get(key);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function requiredString(form: FormData, key: string, label: string) {
  const value = optionalString(form, key);

  if (!value) {
    throw new Error(`${label} es requerido.`);
  }

  return value;
}

function optionalMoneyCents(form: FormData, key: string) {
  const value = optionalString(form, key);

  return value ? moneyToCents(value, key) : undefined;
}

function requiredMoneyCents(form: FormData, key: string, label: string) {
  const value = optionalString(form, key);

  if (!value) {
    throw new Error(`${label} es requerido.`);
  }

  return moneyToCents(value, label);
}

function moneyToCents(value: string, label: string) {
  const normalized = value.replace(/,/g, '').trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${label} debe ser un monto válido.`);
  }

  const [whole = '0', decimals = ''] = normalized.split('.');

  return `${whole}${decimals.padEnd(2, '0')}`;
}

function optionalPercentBps(form: FormData, key: string) {
  const value = optionalString(form, key);

  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Comisión debe ser un porcentaje válido.');
  }

  const [whole = '0', decimals = ''] = normalized.split('.');

  return Number(`${whole}${decimals.padEnd(2, '0')}`);
}

function optionalDateTime(form: FormData, key: string) {
  const value = optionalString(form, key);

  return value ? new Date(value).toISOString() : undefined;
}

function requiredDateTime(form: FormData, key: string, label: string) {
  const value = optionalDateTime(form, key);

  if (!value) {
    throw new Error(`${label} es requerido.`);
  }

  return value;
}

function splitList(value: string | undefined) {
  return (
    value
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function stripEmpty<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  );
}
