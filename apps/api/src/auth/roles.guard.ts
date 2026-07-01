import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '@soyre/database';
import type { AuthenticatedRequest } from './auth.types.js';
import { OrganizationAccessService } from './organization-access.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { REQUIRED_ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.auth;

    if (!user) {
      throw new ForbiddenException('Authentication context is required.');
    }

    const hasRole = this.organizationAccess.activeMemberships(user).some(
      (membership) => requiredRoles.includes(membership.role),
    );

    if (!hasRole) {
      throw new ForbiddenException('Required role is missing.');
    }

    return true;
  }
}
