import {
  DocumentRequirementStatus,
  type MembershipRole,
} from '@soyre/database';

export const COMPLETE_DOCUMENT_REQUIREMENT_STATUSES =
  new Set<DocumentRequirementStatus>([
    DocumentRequirementStatus.APPROVED,
    DocumentRequirementStatus.NOT_APPLICABLE,
    DocumentRequirementStatus.REPLACED,
  ]);

export function documentRoleAllows(
  roles: MembershipRole[],
  role: MembershipRole,
) {
  return roles.includes(role);
}
