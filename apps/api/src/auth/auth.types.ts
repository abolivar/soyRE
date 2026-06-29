import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '@soyre/database';
import type { Request } from 'express';

export type JwtPayload = {
  sub: string;
  email: string;
};

export type AuthenticatedMembership = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: OrganizationStatus;
  role: MembershipRole;
  status: MembershipStatus;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  status: UserStatus;
  memberships: AuthenticatedMembership[];
};

export type AuthenticatedRequest = Request & {
  auth: AuthenticatedUser;
};
