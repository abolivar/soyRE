'use client';

import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  DollarSign,
  RefreshCcw,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  BusinessesResponse,
  BusinessListItem,
  DashboardSummaryResponse,
} from '../lib/api';
import {
  activeMemberships,
  businessStatusLabel,
  businessStatusTone,
  formatDate,
  formatDateTime,
  formatMoneyCents,
  initialsFromName,
  operationLabel,
  scheduledActionLabel,
  scheduledActionTone,
} from './operational-format';
import { buildFinanceData, buildStatusData } from './chart-data';
import {
  ActivityTimeline,
  BarChart,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  PageHeader,
  ProgressMeter,
  SectionPanel,
  Select,
  StatusBadge,
} from '@soyre/ui';

export function DashboardWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organización activa para ver el panel.');
          setIsLoading(false);
          return;
        }

        setActiveOrganizationId(firstMembership.organizationId);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Sesión no disponible.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    refreshDashboard(activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Dashboard no disponible.');
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

  async function refreshDashboard(organizationId = activeOrganizationId) {
    if (!organizationId) {
      setSummary(null);
      setBusinesses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });
    const [summaryResponse, businessesResponse] = await Promise.all([
      apiFetch<DashboardSummaryResponse>(
        `/dashboard/summary?${query.toString()}`,
      ),
      apiFetch<BusinessesResponse>(`/businesses?${query.toString()}`),
    ]);
    setSummary(summaryResponse);
    setBusinesses(businessesResponse.businesses);
    setIsLoading(false);
  }

  const statusData = useMemo(() => buildStatusData(businesses), [businesses]);
  const financeData = useMemo(() => buildFinanceData(summary), [summary]);

  const metricCards = summary
    ? [
        {
          detail: 'Inventario activo, publicado o en proceso.',
          icon: Building2,
          label: 'Propiedades',
          tone: 'neutral' as const,
          value: String(summary.metrics.activeProperties),
        },
        {
          detail: 'Clientes activos para gestión comercial.',
          icon: Users,
          label: 'Clientes',
          tone: 'neutral' as const,
          value: String(summary.metrics.activeClients),
        },
        {
          detail: 'Negocios abiertos en flujo transaccional.',
          icon: DollarSign,
          emphasis: 'highlight' as const,
          label: 'Negocios',
          tone: 'primary' as const,
          value: String(summary.metrics.openBusinesses),
        },
        {
          detail: 'Acciones programadas pendientes.',
          icon: CalendarCheck,
          label: 'Tareas',
          tone: 'neutral' as const,
          value: String(summary.metrics.pendingActions),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Operación inmobiliaria"
        title="Dashboard"
        description={
          activeMembership
            ? `Control operativo de ${activeMembership.organizationName}.`
            : 'Control operativo por organización.'
        }
        actions={
          <div className="row-actions">
            <Button asChild variant="secondary">
              <Link href="/businesses/new">
                <ClipboardCheck size={17} strokeWidth={2.2} />
                Nuevo negocio
              </Link>
            </Button>
            <Button asChild>
              <Link href="/properties">
                <Building2 size={17} strokeWidth={2.2} />
                Nueva propiedad
              </Link>
            </Button>
          </div>
        }
      />

      <FilterBar>
        {organizations.length > 1 ? (
          <Select
            id="dashboard-filter-organization"
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
        <Button
          icon={RefreshCcw}
          onClick={() => refreshDashboard()}
          variant="secondary"
        >
          Actualizar
        </Button>
      </FilterBar>

      {isLoading ? (
        <LoadingState
          description="Consultando actividad, tareas y negocios de la organización."
          title="Cargando dashboard"
        />
      ) : error ? (
        <ErrorState
          action={
            <Button
              icon={RefreshCcw}
              onClick={() => refreshDashboard()}
              variant="secondary"
            >
              Reintentar
            </Button>
          }
          description={error}
          title="No se pudo cargar el dashboard"
        />
      ) : summary ? (
        <>
          <section className="metric-grid" aria-label="Indicadores principales">
            {metricCards.map((metric) => (
              <MetricCard
                detail={metric.detail}
                emphasis={metric.emphasis}
                icon={metric.icon}
                key={metric.label}
                label={metric.label}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </section>

          <section className="summary-strip" aria-label="Resumen financiero">
            <div>
              <span>Cobros vencidos</span>
              <strong>
                {formatMoneyCents(summary.metrics.overdueReceivables.amountCents)}
              </strong>
            </div>
            <div>
              <span>Próximos 7 días</span>
              <strong>
                {formatMoneyCents(
                  summary.metrics.nextSevenDaysReceivables.amountCents,
                )}
              </strong>
            </div>
            <div>
              <span>Comisiones pendientes</span>
              <strong>
                {formatMoneyCents(summary.metrics.pendingCommissions.amountCents)}
              </strong>
            </div>
            <div>
              <span>Acciones</span>
              <strong>{summary.metrics.pendingActions}</strong>
            </div>
          </section>

          <section className="field-grid" aria-label="Composición">
            <SectionPanel
              title="Negocios por estado"
              description="Distribución del pipeline por etapa del flujo."
            >
              <BarChart
                ariaLabel="Negocios por estado"
                data={statusData}
                empty={
                  <EmptyState
                    description="Los negocios aparecerán aquí agrupados por estado."
                    icon={ClipboardCheck}
                    title="Sin negocios"
                  />
                }
              />
            </SectionPanel>

            <SectionPanel
              title="Finanzas pendientes"
              description="Cobros y comisiones que esperan acción."
            >
              <BarChart
                ariaLabel="Finanzas pendientes"
                data={financeData}
                formatValue={(value) => formatMoneyCents(String(Math.round(value)))}
                empty={
                  <EmptyState
                    description="No hay montos pendientes en este momento."
                    icon={DollarSign}
                    title="Sin pendientes"
                  />
                }
              />
            </SectionPanel>
          </section>

          <section className="dashboard-grid">
            <div className="dashboard-columns">
              <SectionPanel
                title="Borradores en progreso"
                description="Negocios guardados que pueden continuarse desde el flujo de creación."
                actions={
                  <Button asChild variant="secondary">
                    <Link href="/businesses">
                      Ver negocios
                      <ArrowUpRight size={16} strokeWidth={2.2} />
                    </Link>
                  </Button>
                }
              >
                <DataTable
                  columns={[
                    { key: 'business', label: 'Borrador' },
                    { key: 'client', label: 'Cliente' },
                    { key: 'progress', label: 'Avance' },
                    { key: 'updated', label: 'Actualizado' },
                  ]}
                  empty={
                    <EmptyState
                      action={
                        <Button asChild>
                          <Link href="/businesses/new">Crear borrador</Link>
                        </Button>
                      }
                      description="Los negocios guardados como borrador aparecerán aquí para retomarlos."
                      icon={ClipboardCheck}
                      title="Sin borradores"
                    />
                  }
                  rows={summary.draftBusinesses.map((business) => ({
                    id: business.id,
                    cells: {
                      business: (
                        <Link
                          className="entity-link"
                          href={`/businesses/new?draftId=${business.id}`}
                        >
                          <strong className="entity-title">
                            {business.title}
                          </strong>
                          <span className="meta-row">
                            {business.code} / {operationLabel(business.operationType)}
                          </span>
                        </Link>
                      ),
                      client: business.clientName ?? 'Sin cliente',
                      progress: (
                        <ProgressMeter
                          detail={
                            business.draftProgress.nextStepLabel
                              ? `Siguiente: ${business.draftProgress.nextStepLabel}`
                              : 'Listo para revisión'
                          }
                          label="Avance"
                          size="sm"
                          value={business.draftProgress.percent}
                        />
                      ),
                      updated: formatDateTime(business.updatedAt),
                    },
                  }))}
                />
              </SectionPanel>

              <SectionPanel
                title="Negocios recientes"
                description="Flujo transaccional con monto, cliente y estado actual."
                actions={
                  <Button asChild variant="secondary">
                    <Link href="/pipeline">
                      Ver funnel
                      <ArrowUpRight size={16} strokeWidth={2.2} />
                    </Link>
                  </Button>
                }
              >
                <DataTable
                  columns={[
                    { key: 'business', label: 'Negocio' },
                    { key: 'client', label: 'Cliente' },
                    { key: 'status', label: 'Estado' },
                    { key: 'amount', label: 'Monto' },
                    { key: 'closing', label: 'Cierre' },
                  ]}
                  empty={
                    <EmptyState
                      action={
                        <Button asChild>
                          <Link href="/businesses/new">Crear negocio</Link>
                        </Button>
                      }
              description="Los negocios confirmados o en borrador aparecerán aquí."
                      icon={ClipboardCheck}
                      title="Sin negocios recientes"
                    />
                  }
                  rows={summary.recentBusinesses.map((business) => ({
                    id: business.id,
                    cells: {
                      amount: formatMoneyCents(
                        business.totalContractAmountCents,
                        business.currency,
                      ),
                      business: (
                        business.status === 'DRAFT' ? (
                          <Link
                            className="entity-link"
                            href={`/businesses/new?draftId=${business.id}`}
                          >
                            <strong className="entity-title">
                              {business.title}
                            </strong>
                            <span className="meta-row">
                              {business.code} / continuar
                            </span>
                          </Link>
                        ) : (
                          <span>
                            <strong className="entity-title">
                              {business.title}
                            </strong>
                            <span className="meta-row">
                              {business.code} / {operationLabel(business.operationType)}
                            </span>
                          </span>
                        )
                      ),
                      client: business.clientName ?? 'Sin cliente',
                      closing: formatDate(business.expectedClosingDate),
                      status: (
                        <StatusBadge tone={businessStatusTone(business.status)}>
                          {businessStatusLabel(business.status)}
                        </StatusBadge>
                      ),
                    },
                  }))}
                />
              </SectionPanel>

              <SectionPanel
                title="Mi tablero"
                description="Acciones abiertas asignadas o sin responsable definido."
              >
                <div className="compact-list">
                  {summary.myActions.length > 0 ? (
                    summary.myActions.map((action) => (
                      <div className="split-row" key={action.id}>
                        <span>
                          <strong className="entity-title">
                            {scheduledActionLabel(action.eventType)}
                          </strong>
                          <span className="meta-row">
                            {action.context} / {formatDateTime(action.scheduledFor)}
                          </span>
                        </span>
                        <StatusBadge
                          tone={scheduledActionTone(action.eventType, action.status)}
                        >
                          {businessStatusLabel(action.businessStatus)}
                        </StatusBadge>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      description="No tienes acciones pendientes en este momento."
                      icon={CalendarCheck}
                      title="Tablero despejado"
                    />
                  )}
                </div>
              </SectionPanel>
            </div>

            <SectionPanel
              title="Actividad reciente"
              description="Eventos de negocio y sistema listos para auditoría."
            >
              <ActivityTimeline
                empty={
                  <EmptyState
                    description="La actividad aparecera cuando el equipo cree o actualice registros."
                    icon={ClipboardCheck}
                    title="Sin actividad"
                  />
                }
                items={summary.activity.map((item) => ({
                  detail: `${item.actor} / ${item.targetType}`,
                  id: item.id,
                  initials: initialsFromName(item.actor),
                  meta: formatDateTime(item.createdAt),
                  status: item.action,
                  title: item.action,
                  tone: 'neutral',
                }))}
              />
            </SectionPanel>
          </section>
        </>
      ) : null}
    </>
  );
}
