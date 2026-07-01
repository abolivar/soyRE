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
  BusinessesResponse,
  BusinessListItem,
  ClientsResponse,
  DashboardSummaryResponse,
  OrganizationClient,
  OrganizationProperty,
  PropertiesResponse,
  TaskListItem,
  TaskListResponse,
} from '../lib/api';
import {
  activeMemberships,
  businessStatusLabel,
  businessStatusTone,
  formatDate,
  formatDateTime,
  formatMoneyCents,
  operationLabel,
  paymentStatusLabel,
  paymentStatusTone,
  scheduledActionLabel,
  scheduledActionTone,
  scheduledStatusLabel,
} from './operational-format';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionPanel,
  Select,
  StatusBadge,
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
  businesses: BusinessListItem[];
  clients: OrganizationClient[];
  properties: OrganizationProperty[];
  summary: DashboardSummaryResponse | null;
  tasks: TaskListItem[];
};

const areaConfig: Record<AreaKey, AreaConfig> = {
  audit: {
    description: 'Registro de actividad sensible y eventos operativos del sistema.',
    emptyDescription: 'La actividad aparecera cuando el equipo cree o actualice registros.',
    emptyTitle: 'Sin actividad registrada',
    eyebrow: 'Sistema',
    icon: ScrollText,
    sideDescription: 'La auditoria se alimenta desde el API y debe crecer con cada accion critica.',
    sideTitle: 'Criterios de auditoria',
    title: 'Auditoria',
  },
  commissions: {
    description: 'Vista financiera para comisiones devengadas, pagaderas y pendientes.',
    emptyDescription: 'Las comisiones apareceran al confirmar negocios con planes de comision.',
    emptyTitle: 'Sin comisiones visibles',
    eyebrow: 'Finanzas',
    icon: TrendingUp,
    sideDescription: 'Los montos finales deben venir de allocations calculadas, no de estimaciones manuales.',
    sideTitle: 'Regla financiera',
    title: 'Comisiones',
  },
  documents: {
    description: 'Expedientes por cliente, propiedad y negocio con revision documental.',
    emptyDescription: 'Sube documentos desde clientes o crea acciones documentales desde un negocio.',
    emptyTitle: 'Sin documentos operativos',
    eyebrow: 'Expedientes',
    icon: FileText,
    primaryHref: '/clients',
    primaryLabel: 'Ir a clientes',
    sideDescription: 'La siguiente fase separa documentos generales de identidad y define retencion.',
    sideTitle: 'Alcance documental',
    title: 'Documentos',
  },
  listings: {
    description: 'Preparacion comercial interna para publicar propiedades listas.',
    emptyDescription: 'Crea propiedades activas para empezar la preparacion comercial.',
    emptyTitle: 'Sin listings preparados',
    eyebrow: 'Publicacion',
    icon: Megaphone,
    primaryHref: '/properties',
    primaryLabel: 'Ir a propiedades',
    sideDescription: 'No se publican portales externos en este bloque; queda preparado el control interno.',
    sideTitle: 'Canales',
    title: 'Listings',
  },
  mandates: {
    description: 'Autorizaciones comerciales, exclusividad, vigencia y comision pactada.',
    emptyDescription: 'Crea propiedades con propietario para preparar mandatos comerciales.',
    emptyTitle: 'Sin mandatos derivados',
    eyebrow: 'Autorizaciones',
    icon: Handshake,
    primaryHref: '/properties',
    primaryLabel: 'Ir a propiedades',
    sideDescription: 'El modelo persistente se implementa en el bloque de mandatos.',
    sideTitle: 'Base contractual',
    title: 'Mandatos',
  },
  offers: {
    description: 'Ofertas, contraofertas y negociaciones antes de crear o confirmar negocio.',
    emptyDescription: 'Las ofertas se conectaran a clientes, propiedades y negocios.',
    emptyTitle: 'Sin ofertas en negociacion',
    eyebrow: 'Negociacion',
    icon: ClipboardCheck,
    primaryHref: '/businesses/new',
    primaryLabel: 'Nuevo negocio',
    sideDescription: 'Una oferta aceptada debe crear o enlazar un negocio transaccional.',
    sideTitle: 'Handoff a negocio',
    title: 'Ofertas',
  },
  receivables: {
    description: 'Cobros programados, vencidos y proximos derivados de planes de pago.',
    emptyDescription: 'Los cobros apareceran cuando los negocios tengan planes de pago confirmados.',
    emptyTitle: 'Sin cobros programados',
    eyebrow: 'Finanzas',
    icon: DollarSign,
    sideDescription: 'Los cobros reales se derivan del payment plan, no de tareas manuales sueltas.',
    sideTitle: 'Regla de cobranza',
    title: 'Cobranza',
  },
  reports: {
    description: 'Lecturas operativas para ventas, cobranza, comisiones y actividad.',
    emptyDescription: 'Los reportes apareceran a medida que existan negocios y actividad.',
    emptyTitle: 'Sin reportes calculables',
    eyebrow: 'Inteligencia operativa',
    icon: BarChart3,
    sideDescription: 'Los reportes se alimentan de relaciones existentes, no de snapshots manuales.',
    sideTitle: 'Fuente de verdad',
    title: 'Reportes',
  },
  settlements: {
    description: 'Liquidacion y pago de comisiones aprobadas.',
    emptyDescription: 'Las liquidaciones apareceran cuando haya comisiones aprobadas para pago.',
    emptyTitle: 'Sin liquidaciones pendientes',
    eyebrow: 'Finanzas',
    icon: Landmark,
    sideDescription: 'Pagar una comision debe dejar auditoria y estado financiero trazable.',
    sideTitle: 'Control de pago',
    title: 'Liquidaciones',
  },
  showings: {
    description: 'Agenda de visitas, participantes, resultado y siguiente accion.',
    emptyDescription: 'Las visitas se conectaran a propiedades, clientes y agentes.',
    emptyTitle: 'Sin visitas registradas',
    eyebrow: 'Agenda comercial',
    icon: CalendarDays,
    primaryHref: '/tasks',
    primaryLabel: 'Ver tareas',
    sideDescription: 'Cada visita debe cerrar con resultado y proxima accion.',
    sideTitle: 'Seguimiento',
    title: 'Visitas',
  },
};

export function AreaWorkspace({ area }: { area: AreaKey }) {
  const config = areaConfig[area];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [data, setData] = useState<WorkspaceData>({
    businesses: [],
    clients: [],
    properties: [],
    summary: null,
    tasks: [],
  });
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organizacion activa para consultar esta area.');
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

    refreshArea(activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Area no disponible.');
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

  async function refreshArea(organizationId = activeOrganizationId) {
    if (!organizationId) {
      setData({
        businesses: [],
        clients: [],
        properties: [],
        summary: null,
        tasks: [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });
    const [summary, businesses, properties, clients, tasks] = await Promise.all([
      apiFetch<DashboardSummaryResponse>(`/dashboard/summary?${query.toString()}`),
      apiFetch<BusinessesResponse>(`/businesses?${query.toString()}`),
      apiFetch<PropertiesResponse>(`/properties?${query.toString()}`),
      apiFetch<ClientsResponse>(`/clients?${query.toString()}`),
      apiFetch<TaskListResponse>(`/tasks?${query.toString()}`),
    ]);

    setData({
      businesses: businesses.businesses,
      clients: clients.clients,
      properties: properties.properties,
      summary,
      tasks: tasks.tasks,
    });
    setIsLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = form.get('search');
    setSearch(typeof value === 'string' ? value.trim() : '');
  }

  return (
    <>
      <PageHeader
        actions={
          <div className="row-actions">
            {config.primaryHref && config.primaryLabel ? (
              <Button asChild>
                <Link href={config.primaryHref}>{config.primaryLabel}</Link>
              </Button>
            ) : null}
            <Button icon={RefreshCcw} onClick={() => refreshArea()} variant="secondary">
              Actualizar
            </Button>
          </div>
        }
        description={
          activeMembership
            ? `${config.description} Organizacion: ${activeMembership.organizationName}.`
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
          description={`Consultando ${config.title.toLowerCase()} de la organizacion.`}
          title={`Cargando ${config.title.toLowerCase()}`}
        />
      ) : error ? (
        <ErrorState
          action={
            <Button icon={RefreshCcw} onClick={() => refreshArea()} variant="secondary">
              Reintentar
            </Button>
          }
          description={error}
          title={`No se pudo cargar ${config.title.toLowerCase()}`}
        />
      ) : (
        <>
          <section className="metric-grid" aria-label={`Metricas de ${config.title}`}>
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
                  status: <StatusBadge tone={row.tone}>{row.status}</StatusBadge>,
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
                    <strong className="entity-title">Multi-organizacion</strong>
                    <span className="meta-row">
                      Las consultas usan la organizacion activa.
                    </span>
                  </span>
                  <StatusBadge tone="primary">Base</StatusBadge>
                </div>
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Siguiente bloque</strong>
                    <span className="meta-row">
                      Persistencia especifica y acciones avanzadas por modulo.
                    </span>
                  </span>
                  <StatusBadge tone="warning">Pendiente</StatusBadge>
                </div>
              </div>
            </SectionPanel>
          </section>
        </>
      )}
    </>
  );
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
          amount: formatMoneyCents(business.totalContractAmountCents, business.currency),
          context: business.primaryAgentName ?? 'Sin agente principal',
          date: formatDate(business.expectedClosingDate),
          id: business.id,
          meta: `${business.code} / ${operationLabel(business.operationType)}`,
          status: businessStatusLabel(business.status),
          title: business.title,
          tone: businessStatusTone(business.status),
        }));
    case 'documents':
      return [
        ...data.clients
          .filter((client) => client.identityDocument)
          .map((client) => ({
            context: client.identityDocument?.documentNumber ?? 'Sin numero',
            date: formatDateTime(client.updatedAt),
            id: `identity-${client.id}`,
            meta: client.displayName,
            status: 'Validado',
            title: client.identityDocument?.fileName ?? 'Documento de identidad',
            tone: 'success' as Tone,
          })),
        ...data.tasks
          .filter((task) => task.eventType === 'DOCUMENT_REQUIRED')
          .map((task) => ({
            context: task.business.title,
            date: formatDateTime(task.scheduledFor),
            id: task.id,
            meta: task.business.clientName ?? 'Sin cliente',
            status: scheduledStatusLabel(task.status),
            title: scheduledActionLabel(task.eventType),
            tone: scheduledActionTone(task.eventType, task.status),
          })),
      ];
    case 'listings':
      return data.properties
        .filter((property) =>
          ['ACTIVE', 'PUBLISHED', 'RESERVED'].includes(property.status),
        )
        .map((property) => ({
          amount: property.salePrice
            ? formatMoneyCents(String(property.salePrice * 100), property.currency)
            : property.rentPrice
              ? formatMoneyCents(String(property.rentPrice * 100), property.currency)
              : undefined,
          context: `${property.city} / ${property.zone}`,
          date: formatDateTime(property.updatedAt),
          id: property.id,
          meta: property.operations.join(' + ') || 'Sin modalidad',
          status: property.status,
          title: property.title,
          tone: property.status === 'PUBLISHED' ? 'success' : 'primary',
        }));
    case 'mandates':
      return data.properties
        .filter((property) => property.ownerClient)
        .map((property) => ({
          amount: property.salePrice
            ? formatMoneyCents(String(property.salePrice * 100), property.currency)
            : property.rentPrice
              ? formatMoneyCents(String(property.rentPrice * 100), property.currency)
              : undefined,
          context: property.ownerClient?.displayName ?? 'Sin propietario',
          date: formatDateTime(property.updatedAt),
          id: property.id,
          meta: `${property.city} / ${property.zone}`,
          status: property.status,
          title: property.title,
          tone: property.status === 'ACTIVE' ? 'success' : 'neutral',
        }));
    case 'offers':
      return data.businesses
        .filter((business) =>
          ['DRAFT', 'PENDING_REVIEW', 'APPROVED'].includes(business.status),
        )
        .map((business) => ({
          amount: formatMoneyCents(business.totalContractAmountCents, business.currency),
          context: business.clientName ?? 'Sin cliente',
          date: formatDate(business.expectedClosingDate),
          id: business.id,
          meta: business.propertyTitle ?? 'Sin inmueble',
          status: businessStatusLabel(business.status),
          title: business.title,
          tone: businessStatusTone(business.status),
        }));
    case 'receivables':
      return data.businesses
        .filter((business) => business.nextPayment)
        .map((business) => ({
          amount: business.nextPayment
            ? formatMoneyCents(business.nextPayment.amountCents, business.currency)
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
          amount: formatMoneyCents(business.totalContractAmountCents, business.currency),
          context: business.primaryAgentName ?? 'Sin agente principal',
          date: formatDate(business.expectedClosingDate),
          id: business.id,
          meta: business.code,
          status: businessStatusLabel(business.status),
          title: business.title,
          tone: businessStatusTone(business.status),
        }));
    case 'showings':
      return data.tasks
        .filter((task) => task.eventType === 'CUSTOM')
        .map((task) => ({
          context: task.business.propertyTitle ?? task.business.title,
          date: formatDateTime(task.scheduledFor),
          id: task.id,
          meta: task.business.clientName ?? 'Sin cliente',
          status: scheduledStatusLabel(task.status),
          title: scheduledActionLabel(task.eventType),
          tone: scheduledActionTone(task.eventType, task.status),
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
        detail: 'Cobros de los proximos 7 dias.',
        icon: CalendarDays,
        label: '7 dias',
        tone: 'warning',
        value: formatMoneyCents(summary.metrics.nextSevenDaysReceivables.amountCents),
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
      detail: 'Registros visibles con la organizacion activa.',
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
      amount: formatMoneyCents(summary.metrics.nextSevenDaysReceivables.amountCents),
      context: 'Cobranza',
      date: '7 dias',
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
      meta: `${summary.metrics.pendingCommissions.count} allocations`,
      status: 'Disponible',
      title: 'Comisiones pendientes',
      tone: 'featured',
    },
  ];
}
