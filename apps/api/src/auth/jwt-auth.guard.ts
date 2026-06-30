import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '@soyre/database';
import { parseCookie } from 'cookie';
import { PrismaService } from '../database/prisma.service.js';
import { AUTH_COOKIE_NAME, getJwtAccessSecret } from './auth.constants.js';
import type {
  AuthenticatedMembership,
  AuthenticatedRequest,
  AuthenticatedUser,
  JwtPayload,
} from './auth.types.js';

type MembershipWithOrganization = {
  id: string;
  organizationId: string;
  role: AuthenticatedMembership['role'];
  status: AuthenticatedMembership['status'];
  organization: {
    name: string;
    slug: string;
    status: AuthenticatedMembership['organizationStatus'];
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication is required.');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: getJwtAccessSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        memberships: {
          include: {
            organization: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active.');
    }

    const memberships = user.memberships.map(
      (membership: MembershipWithOrganization) => ({
        id: membership.id,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        organizationSlug: membership.organization.slug,
        organizationStatus: membership.organization.status,
        role: membership.role,
        status: membership.status,
      }),
    );

    if (
      !memberships.some(
        (membership: AuthenticatedMembership) =>
          membership.status === MembershipStatus.ACTIVE &&
          membership.organizationStatus === OrganizationStatus.ACTIVE,
      )
    ) {
      throw new UnauthorizedException('User has no active memberships.');
    }

    const auth: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      memberships,
    };

    request.auth = auth;

    return true;
  }

  private extractToken(request: AuthenticatedRequest) {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }

    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    return parseCookie(cookieHeader)[AUTH_COOKIE_NAME] ?? null;
  }
}
