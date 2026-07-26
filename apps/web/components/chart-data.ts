import type { ChartDatum } from '@soyre/ui';
import type {
  BusinessListItem,
  BusinessOperationType,
  BusinessStatus,
  DashboardSummaryResponse,
} from '../lib/api';
import {
  businessStatusLabel,
  businessStatusTone,
  operationLabel,
  operationTone,
} from './operational-format';

/**
 * Chart aggregations shared by the Reports and Dashboard workspaces. Each datum
 * maps to the existing semantic tone system so chart colors match the badges
 * the app already uses for the same entity.
 */

export function buildOperationData(
  businesses: readonly BusinessListItem[],
): ChartDatum[] {
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

export function buildStatusData(
  businesses: readonly BusinessListItem[],
): ChartDatum[] {
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

export function buildFinanceData(
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
