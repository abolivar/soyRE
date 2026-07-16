import {
  BusinessOperationType,
  DocumentStatus,
  MandateStatus,
  MandateType,
  PropertyOperation,
} from '@soyre/database';

type ReadinessDocument = {
  documentType: string;
  status: DocumentStatus;
};

export type MandateReadinessInput = {
  status: MandateStatus;
  type: MandateType;
  startsAt: Date | null;
  endsAt: Date | null;
  signedAt: Date | null;
  documents: ReadinessDocument[];
};

export type ExclusiveMandateCandidate = {
  id: string;
  type: MandateType;
  exclusive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

const BLOCKING_DOCUMENT_STATUSES = new Set<DocumentStatus>([
  DocumentStatus.REQUIRED,
  DocumentStatus.REJECTED,
  DocumentStatus.EXPIRED,
]);

export function isBlockingMandateDocumentStatus(status: DocumentStatus) {
  return BLOCKING_DOCUMENT_STATUSES.has(status);
}

export function mandateReadinessBlockers(
  mandate: MandateReadinessInput,
  operationType?: BusinessOperationType,
  today = todayUtc(),
) {
  const blockers: string[] = [];
  if (mandate.status !== MandateStatus.ACTIVE)
    blockers.push('MANDATE_NOT_ACTIVE');
  if (!mandate.startsAt || today < mandate.startsAt)
    blockers.push('NOT_STARTED');
  if (!mandate.endsAt || today > mandate.endsAt) blockers.push('EXPIRED');
  if (!mandate.signedAt) blockers.push('SIGNATURE_MISSING');
  if (
    !mandate.documents.some(
      (item) =>
        item.documentType === 'SIGNED_MANDATE' &&
        item.status === DocumentStatus.APPROVED,
    )
  ) {
    blockers.push('SIGNED_EVIDENCE_MISSING');
  }
  if (
    mandate.documents.some((item) =>
      isBlockingMandateDocumentStatus(item.status),
    )
  ) {
    blockers.push('DOCUMENT_BLOCKERS');
  }
  if (operationType && !mandateSupportsOperation(mandate.type, operationType)) {
    blockers.push('OPERATION_MISMATCH');
  }
  return [...new Set(blockers)];
}

export function mandateMatchesProperty(
  type: MandateType,
  operations: PropertyOperation[],
) {
  if (type === MandateType.BOTH) {
    return (
      operations.includes(PropertyOperation.SALE) &&
      operations.includes(PropertyOperation.RENT)
    );
  }
  return operations.includes(
    type === MandateType.SALE ? PropertyOperation.SALE : PropertyOperation.RENT,
  );
}

export function mandateSupportsOperation(
  type: MandateType,
  operation: BusinessOperationType,
) {
  return (
    type === MandateType.BOTH ||
    (type === MandateType.SALE && operation === BusinessOperationType.SALE) ||
    (type === MandateType.RENT && operation === BusinessOperationType.RENT)
  );
}

export function operationTypesOverlap(a: MandateType, b: MandateType) {
  return a === MandateType.BOTH || b === MandateType.BOTH || a === b;
}

export function dateRangesOverlap(
  aStart: Date | null,
  aEnd: Date | null,
  bStart: Date | null,
  bEnd: Date | null,
) {
  if (!aStart || !aEnd || !bStart || !bEnd) return true;
  return aStart <= bEnd && bStart <= aEnd;
}

export function findExclusiveMandateConflict(
  mandate: ExclusiveMandateCandidate,
  activeMandates: ExclusiveMandateCandidate[],
) {
  return activeMandates.find(
    (other) =>
      other.id !== mandate.id &&
      (mandate.exclusive || other.exclusive) &&
      operationTypesOverlap(mandate.type, other.type) &&
      dateRangesOverlap(
        mandate.startsAt,
        mandate.endsAt,
        other.startsAt,
        other.endsAt,
      ),
  );
}

function todayUtc() {
  const today = new Date();
  return new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
}
