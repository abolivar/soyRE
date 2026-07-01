import { MembershipRole } from '@soyre/database';

export const READ_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
  MembershipRole.FINANCE,
  MembershipRole.EXTERNAL_AGENT,
  MembershipRole.READONLY,
]);

export const WRITE_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
]);

export const BROKER_OPERATION_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.OPERATIONS,
]);

export const MANAGER_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
]);

export const COMMIT_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.OPERATIONS,
]);

export const COMMISSION_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.FINANCE,
]);
