import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  Prisma,
  UserStatus,
} from '@soyre/database';
import { PrismaService } from '../database/prisma.service.js';
import { ACCESS_TOKEN_EXPIRES_IN, getJwtAccessSecret } from './auth.constants.js';
import type { AuthenticatedUser, JwtPayload } from './auth.types.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './password.service.js';

type AuthMembershipFromDb = {
  id: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
  organization: {
    name: string;
    slug: string;
    status: AuthenticatedUser['memberships'][number]['organizationStatus'];
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);
    const slug = dto.organizationSlug ?? slugify(dto.organizationName);

    if (!slug) {
      throw new BadRequestException('Organization slug is required.');
    }

    const [existingUser, existingOrganization] = await Promise.all([
      this.prisma.user.findUnique({ where: { email } }),
      this.prisma.organization.findUnique({ where: { slug } }),
    ]);

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    if (existingOrganization) {
      throw new ConflictException('An organization with this slug already exists.');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
          passwordHash,
          status: UserStatus.ACTIVE,
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId: user.id,
          action: 'auth.register',
          targetType: 'membership',
          targetId: membership.id,
          metadata: {
            role: membership.role,
            status: membership.status,
          },
        },
      });

      return { organization, user, membership };
    });

    const authUser: AuthenticatedUser = {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      status: result.user.status,
      memberships: [
        {
          id: result.membership.id,
          organizationId: result.organization.id,
          organizationName: result.organization.name,
          organizationSlug: result.organization.slug,
          organizationStatus: result.organization.status,
          role: result.membership.role,
          status: result.membership.status,
        },
      ],
    };

    return this.createSession(authUser);
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active.');
    }

    const activeMemberships = user.memberships.filter(
      (membership: AuthMembershipFromDb) =>
        membership.status === MembershipStatus.ACTIVE &&
        membership.organization.status === OrganizationStatus.ACTIVE,
    );

    if (activeMemberships.length === 0) {
      throw new UnauthorizedException('User has no active memberships.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      memberships: user.memberships.map((membership: AuthMembershipFromDb) => ({
        id: membership.id,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        organizationSlug: membership.organization.slug,
        organizationStatus: membership.organization.status,
        role: membership.role,
        status: membership.status,
      })),
    };

    return this.createSession(authUser);
  }

  createSession(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      secret: getJwtAccessSecret(),
    });

    return {
      accessToken,
      user,
    };
  }

  serializeUser(user: AuthenticatedUser) {
    return { user };
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
