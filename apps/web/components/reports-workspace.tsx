'use client';

import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  RefreshCcw,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  BusinessesResponse,
  BusinessListItem,
  BusinessOperationType,
  BusinessStatus,
  DashboardSummaryResponse,
} from '../lib/api';
import {
  activeMemberships,
  businessStatusLabel,
  businessStatusTone,
  formatMoneyCents,
  operationLabel,
  operationTone,
} from './operational-format';
import {
  BarChart,
  Button,
  type ChartDatum,
  DonutChart,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  MetricCard,
  PageHeader,
  SectionPanel,
  Select,
} from '@soyre/ui';

export function ReportsWorkspace() {
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
          setError('No tienes una organización activa para ver reportes.');
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

    refreshReports(activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Reportes no disponibles.');
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

  async function refreshReports(organizationId = activeOrganizationId) {
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

  const operationData = useMemo(() => buildOperationData(businesses), [businesses]);
  const statusData = useMemo(() => buildStatusData(businesses), [businesses]);
  const financeData = useMemo(() => buildFinanceData(summary), [summary]);

  const metricCards = summary
    ? [
        {
          detail: 'Negocios abiertos en flujo transaccional.',
          icon: ClipboardCheck,
          label: 'Negocios',
          tone: 'primary' as const,
          value: String(summary.metrics.openBusinesses),
        },
        {
          detail: 'Cobros vencidos pendientes.',
          icon: DollarSign,
          label: 'Vencido',
          tone: 'danger' as const,
          value: formatMoneyCents(summary.metrics.overdueReceivables.amountCents),
        },
        {
          detail: 'Cobros de los próximos 7 días.',
          icon: CalendarDays,
          label: '7 días',
          tone: 'warning' as const,
          value: formatMoneyCents(
            summary.metrics.nextSevenDaysReceivables.amountCents,
          ),
        },
        {
          detail: 'Comisiones pendientes de liquidar.',
          icon: TrendingUp,
          label: 'Comisiones',
          tone: 'featured' as const,
          value: formatMoneyCents(summary.metrics.pendingCommissions.amountCents),
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Inteligencia operativa"
        title="Reportes"
        description={
          activeMembership
            ? `Lecturas operativas de ${activeMembership.organizationName}.`
            : 'Lecturas operativas por organización.'
        }
        actions={
          <div className="row-actions">
            <Button
              icon={RefreshCcw}
              onClick={() => refreshReports()}
              variant="secondary"
            >
              Actualizar
            </Button>
          </div>
        }
      />

      <FilterBar>
        {organizations.length > 1 ? (
          <Select
            id="reports-filter-organization"
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
      </FilterBar>

      {isLoading ? (
        <LoadingState
          description="Calculando composición de negocios, cobranza y comisiones."
          title="Cargando reportes"
        />
      ) : error ? (
        <ErrorState
          action={
            <Button
              icon={RefreshCcw}
              onClick={() => refreshReports()}
              variant="secondary"
            >
              Reintentar
            </Button>
          }
          description={error}
          title="No se pudieron cargar los reportes"
        />
      ) : summary ? (
        <>
          <section className="metric-grid" aria-label="Indicadores de reportes">
            {metricCards.map((metric) => (
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

          <section className="module-grid" aria-label="Gráficos de composición">
            <SectionPanel
              title="Negocios por operación"
              description="Distribución del pipeline por tipo de operación."
            >
              <DonutChart
                ariaLabel="Negocios por operación"
                centerLabel="negocios"
                centerValue={String(businesses.length)}
                data={operationData}
                empty={
                  <EmptyState
                    description="Aún no hay negocios para distribuir por operación."
                    icon={ClipboardCheck}
                    title="Sin negocios"
                  />
                }
              />
            </SectionPanel>

            <SectionPanel
              title="Negocios por estado"
              description="Volumen de negocios en cada etapa del flujo."
            >
              <BarChart
                ariaLabel="Negocios por estado"
                data={statusData}
                empty={
                  <EmptyState
                    description="Aún no hay negocios para agrupar por estado."
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
        </>
      ) : (
        <EmptyState
          description="Los reportes aparecerán cuando existan negocios y actividad."
          icon={BarChart3}
          title="Sin reportes calculables"
        />
      )}
    </>
  );
}

function buildOperationData(businesses: readonly BusinessListItem[]): ChartDatum[] {
  const counts = new Map<BusinessOperationType, number>();

  for (const business of businesses) {
    counts.set(
      business.operationType,
      (counts.get(business.operationType) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .map(([operation, value]) => ({
      label: operationLabel(operation),
      tone: operationTone(operation),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildStatusData(businesses: readonly BusinessListItem[]): ChartDatum[] {
  const counts = new Map<BusinessStatus, number>();

  for (const business of businesses) {
    counts.set(business.status, (counts.get(business.status) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([status, value]) => ({
      label: businessStatusLabel(status),
      tone: businessStatusTone(status),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildFinanceData(
  summary: DashboardSummaryResponse | null,
): ChartDatum[] {
  if (!summary) {
    return [];
  }

  const { metrics } = summary;

  const items: ChartDatum[] = [
    {
      label: 'Cobros vencidos',
      tone: 'danger',
      value: Number(metrics.overdueReceivables.amountCents),
    },
    {
      label: 'Próximos 7 días',
      tone: 'warning',
      value: Number(metrics.nextSevenDaysReceivables.amountCents),
    },
    {
      label: 'Comisiones',
      tone: 'featured',
      value: Number(metrics.pendingCommissions.amountCents),
    },
  ];

  return items.filter((item) => item.value > 0);
}
