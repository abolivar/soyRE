import type {
  AuthMembership,
  AuthUser,
  BusinessOperationType,
  BusinessStatus,
  MembershipStatus,
  OrganizationStatus,
  PaymentScheduleLineStatus,
  ScheduledActionStatus,
  ScheduledActionType,
} from '../lib/api';
import type { Tone } from '@soyre/ui';

export function activeMemberships(user: AuthUser | null): AuthMembership[] {
  return (
    user?.memberships.filter(
      (membership) =>
        membership.status === 'ACTIVE' &&
        membership.organizationStatus === 'ACTIVE',
    ) ?? []
  );
}

export function isActiveMembershipStatus(
  status: MembershipStatus,
  organizationStatus: OrganizationStatus,
) {
  return status === 'ACTIVE' && organizationStatus === 'ACTIVE';
}

export function formatMoneyCents(value: string | null | undefined, currency = 'USD') {
  const rawValue = value && /^-?\d+$/.test(value) ? value : '0';
  const negative = rawValue.startsWith('-');
  const absolute = negative ? rawValue.slice(1) : rawValue;
  const padded = absolute.padStart(3, '0');
  const whole = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimals = padded.slice(-2);
  const symbol = currency === 'USD' || currency === 'PAB' ? '$' : `${currency} `;

  return `${negative ? '-' : ''}${symbol}${whole}.${decimals}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha invalida';
  }

  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha invalida';
  }

  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

export function formatRelativeDue(value: string | null | undefined) {
  if (!value) {
    return 'Sin fecha';
  }

  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return 'Fecha invalida';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate);
  target.setHours(0, 0, 0, 0);
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (days < 0) {
    return `Vencida hace ${Math.abs(days)} d`;
  }

  if (days === 0) {
    return 'Hoy';
  }

  if (days === 1) {
    return 'Manana';
  }

  if (days <= 7) {
    return `${days} d`;
  }

  return formatDate(value);
}

export function initialsFromName(name: string | null | undefined) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function businessStatusLabel(status: BusinessStatus) {
  return (
    {
      DRAFT: 'Borrador',
      PENDING_REVIEW: 'Revision',
      APPROVED: 'Aprobado',
      CONTRACT_GENERATED: 'Contrato',
      PENDING_SIGNATURE: 'Firma',
      ACTIVE: 'Activo',
      CLOSED: 'Cerrado',
      CANCELLED: 'Cancelado',
      REJECTED: 'Rechazado',
    } satisfies Record<BusinessStatus, string>
  )[status];
}

export function businessStatusTone(status: BusinessStatus): Tone {
  return (
    {
      DRAFT: 'neutral',
      PENDING_REVIEW: 'warning',
      APPROVED: 'primary',
      CONTRACT_GENERATED: 'featured',
      PENDING_SIGNATURE: 'warning',
      ACTIVE: 'success',
      CLOSED: 'rent',
      CANCELLED: 'danger',
      REJECTED: 'danger',
    } satisfies Record<BusinessStatus, Tone>
  )[status];
}

export function operationLabel(operation: BusinessOperationType) {
  return (
    {
      SALE: 'Venta',
      RENT: 'Alquiler',
      RESERVATION: 'Reserva',
      ASSIGNMENT: 'Cesion',
      PRE_SALE: 'Preventa',
      SEPARATION: 'Separacion',
      OTHER: 'Otro',
    } satisfies Record<BusinessOperationType, string>
  )[operation];
}

export function operationTone(operation: BusinessOperationType): Tone {
  return (
    {
      SALE: 'primary',
      RENT: 'rent',
      RESERVATION: 'featured',
      ASSIGNMENT: 'warning',
      PRE_SALE: 'success',
      SEPARATION: 'featured',
      OTHER: 'neutral',
    } satisfies Record<BusinessOperationType, Tone>
  )[operation];
}

export function scheduledActionLabel(type: ScheduledActionType) {
  return (
    {
      PAYMENT_DUE: 'Cobro programado',
      PAYMENT_OVERDUE: 'Cobro vencido',
      COMMISSION_DUE: 'Comision pendiente',
      CONTRACT_REVIEW_DUE: 'Revision contrato',
      SIGNATURE_DUE: 'Firma pendiente',
      DOCUMENT_REQUIRED: 'Documento requerido',
      APPROVAL_REQUIRED: 'Aprobacion requerida',
      CUSTOM: 'Accion',
    } satisfies Record<ScheduledActionType, string>
  )[type];
}

export function scheduledActionTone(
  type: ScheduledActionType,
  status: ScheduledActionStatus,
): Tone {
  if (status === 'COMPLETED') {
    return 'success';
  }

  if (status === 'CANCELLED' || status === 'FAILED') {
    return 'danger';
  }

  return (
    {
      PAYMENT_DUE: 'primary',
      PAYMENT_OVERDUE: 'danger',
      COMMISSION_DUE: 'featured',
      CONTRACT_REVIEW_DUE: 'warning',
      SIGNATURE_DUE: 'warning',
      DOCUMENT_REQUIRED: 'rent',
      APPROVAL_REQUIRED: 'warning',
      CUSTOM: 'neutral',
    } satisfies Record<ScheduledActionType, Tone>
  )[type];
}

export function scheduledStatusLabel(status: ScheduledActionStatus) {
  return (
    {
      PENDING: 'Pendiente',
      COMPLETED: 'Completa',
      CANCELLED: 'Cancelada',
      FAILED: 'Fallida',
    } satisfies Record<ScheduledActionStatus, string>
  )[status];
}

export function paymentStatusLabel(status: PaymentScheduleLineStatus) {
  return (
    {
      PENDING: 'Pendiente',
      INVOICED: 'Facturada',
      PARTIALLY_PAID: 'Parcial',
      PAID: 'Pagada',
      OVERDUE: 'Vencida',
      CANCELLED: 'Cancelada',
    } satisfies Record<PaymentScheduleLineStatus, string>
  )[status];
}

export function paymentStatusTone(status: PaymentScheduleLineStatus): Tone {
  return (
    {
      PENDING: 'neutral',
      INVOICED: 'primary',
      PARTIALLY_PAID: 'warning',
      PAID: 'success',
      OVERDUE: 'danger',
      CANCELLED: 'danger',
    } satisfies Record<PaymentScheduleLineStatus, Tone>
  )[status];
}
