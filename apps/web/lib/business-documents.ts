import type {
  BusinessDocumentRequirement,
  DocumentRequirementStatus,
  MembershipRole,
} from './api';

export const completeDocumentRequirementStatuses =
  new Set<DocumentRequirementStatus>(['APPROVED', 'NOT_APPLICABLE']);

export function canUploadNewDocument(
  requirement: Pick<
    BusinessDocumentRequirement,
    'allowsMultipleFiles' | 'documents' | 'uploadRoles'
  >,
  role: MembershipRole,
) {
  if (!requirement.uploadRoles.includes(role)) return false;
  return (
    requirement.allowsMultipleFiles ||
    !requirement.documents.some((document) => document.isCurrent)
  );
}

export function documentRequirementReviewTargets(
  requirement: Pick<
    BusinessDocumentRequirement,
    'status' | 'requiresReview' | 'documents'
  >,
): DocumentRequirementStatus[] {
  if (requirement.status === 'UPLOADED') {
    return requirement.requiresReview
      ? ['UNDER_REVIEW', 'EXPIRED']
      : ['APPROVED', 'UNDER_REVIEW', 'EXPIRED'];
  }
  if (requirement.status === 'UNDER_REVIEW') {
    return ['APPROVED', 'OBSERVED', 'REJECTED', 'EXPIRED'];
  }
  if (requirement.status === 'APPROVED') return ['EXPIRED'];
  if (requirement.status === 'REQUIRED' && requirement.documents.length === 0) {
    return ['NOT_APPLICABLE'];
  }
  return [];
}

export function documentRequirementStatusLabel(
  status: DocumentRequirementStatus,
) {
  return {
    REQUIRED: 'Requerido',
    UPLOADED: 'Cargado',
    UNDER_REVIEW: 'En revisión',
    APPROVED: 'Aprobado',
    OBSERVED: 'Observado',
    REJECTED: 'Rechazado',
    EXPIRED: 'Vencido',
    NOT_APPLICABLE: 'No aplica',
  }[status];
}
