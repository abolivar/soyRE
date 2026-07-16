import type {
  MandateHistoryEvent,
  MembershipRole,
  OperationalMandate,
} from '../lib/api';

export type MandateWorkspaceAction =
  | 'EDIT'
  | 'SUBMIT_FOR_SIGNATURE'
  | 'RETURN_TO_DRAFT'
  | 'REGISTER_SIGNATURE'
  | 'ACTIVATE'
  | 'EXPIRE'
  | 'CANCEL'
  | 'RENEW'
  | 'ARCHIVE'
  | 'ADD_DOCUMENT';

const writeRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
  'AGENT',
]);
const commitRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
]);
const managerRoles = new Set<MembershipRole>(['OWNER', 'ADMIN']);

export function availableMandateActions(
  role: MembershipRole | null,
  userId: string | null,
  mandate: OperationalMandate | null,
) {
  if (!role || !mandate) return [] as MandateWorkspaceAction[];
  const actions: MandateWorkspaceAction[] = [];
  const isAssignedAgent = role === 'AGENT' && mandate.assignedUserId === userId;

  if (mandate.status === 'DRAFT' && writeRoles.has(role)) {
    if (role !== 'AGENT' || isAssignedAgent) {
      actions.push('EDIT', 'SUBMIT_FOR_SIGNATURE');
    }
  }
  if (mandate.status === 'PENDING_SIGNATURE' && commitRoles.has(role)) {
    actions.push('RETURN_TO_DRAFT', 'REGISTER_SIGNATURE');
  }
  if (mandate.status === 'PENDING_DOCUMENTS' && commitRoles.has(role)) {
    actions.push('ACTIVATE');
  }
  if (mandate.status === 'ACTIVE' && commitRoles.has(role)) {
    if ((daysUntil(mandate.endsAt) ?? 0) < 0) actions.push('EXPIRE');
    actions.push('CANCEL', 'RENEW');
  }
  if (
    ['DRAFT', 'PENDING_SIGNATURE', 'PENDING_DOCUMENTS'].includes(
      mandate.status,
    ) &&
    commitRoles.has(role)
  ) {
    actions.push('CANCEL');
  }
  if (
    ['EXPIRED', 'CANCELLED', 'SUPERSEDED'].includes(mandate.status) &&
    managerRoles.has(role)
  ) {
    actions.push('ARCHIVE');
  }
  if (writeRoles.has(role) && mandate.status !== 'ARCHIVED') {
    actions.push('ADD_DOCUMENT');
  }
  return [...new Set(actions)];
}

export function mandateBlockerLabel(blocker: string) {
  const labels: Record<string, string> = {
    ASSIGNEE_REQUIRED: 'Asigna una persona responsable.',
    AUTHORIZED_PRICE_REQUIRED: 'Define un precio autorizado mayor que cero.',
    COMMISSION_REQUIRED: 'Define la comisión pactada.',
    CURRENCY_INVALID: 'Corrige la moneda a un código de tres letras.',
    DATES_REQUIRED: 'Completa las fechas de inicio y fin.',
    DOCUMENTS_BLOCKING: 'Resuelve los documentos observados o pendientes.',
    DOCUMENT_BLOCKERS: 'Resuelve los documentos observados o pendientes.',
    EXPIRED: 'La vigencia del mandato terminó.',
    MANDATE_NOT_ACTIVE: 'El mandato todavía no está activo.',
    MANDATE_OUTSIDE_VALIDITY: 'La fecha actual está fuera de la vigencia.',
    NOT_STARTED: 'La vigencia del mandato todavía no ha comenzado.',
    OPERATION_MISMATCH: 'La modalidad no coincide con la operación comercial.',
    OWNER_REQUIRED: 'Vincula al cliente propietario.',
    SIGNATURE_EVIDENCE_REQUIRED: 'Agrega el mandato firmado y aprobado.',
    SIGNED_EVIDENCE_MISSING: 'Agrega el mandato firmado y aprobado.',
    SIGNATURE_MISSING: 'Registra la fecha de firma.',
    SIGNATURE_REQUIRED: 'Registra la fecha y evidencia de firma.',
  };
  return labels[blocker] ?? 'Existe una condición pendiente por resolver.';
}

export function mandateEventLabel(action: MandateHistoryEvent['action']) {
  return {
    ACTIVATE: 'Mandato activado',
    ARCHIVE: 'Mandato archivado',
    CANCEL: 'Mandato cancelado',
    CREATED: 'Borrador creado',
    EXPIRE: 'Mandato vencido',
    REGISTER_SIGNATURE: 'Firma registrada',
    RENEW: 'Renovación iniciada',
    RETURN_TO_DRAFT: 'Devuelto para corrección',
    SUBMIT_FOR_SIGNATURE: 'Enviado para firma',
    SUPERSEDE: 'Reemplazado por renovación',
    UPDATED: 'Términos actualizados',
  }[action];
}

export function daysUntil(dateValue: string | null, now = new Date()) {
  if (!dateValue) return null;
  const end = new Date(`${dateValue}T00:00:00.000Z`);
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
}

export function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
