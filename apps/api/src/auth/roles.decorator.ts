import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '@soyre/database';

export const REQUIRED_ROLES_KEY = 'soyre:required_roles';

export const RequireRoles = (...roles: MembershipRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
