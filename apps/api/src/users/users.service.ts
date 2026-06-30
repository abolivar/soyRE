import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  Prisma,
  UserStatus,
} from '@soyre/database';
import { normalizeEmail } from '../auth/auth.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PasswordService } from '../auth/password.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

const MANAGER_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
]);

type SerializableMembership = {
  id: string;
  organizationId: string;
  role: MembershipRole;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    status: UserStatus;
    lastLoginAt: Date | null;
  };
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(PasswordService)
    private readonly passwordService: PasswordService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async list(auth: AuthenticatedUser, organizationId?: string) {
    const membership = this.resolveMembership(auth, organizationId);

    const members = await this.prisma.membership.findMany({
      where: {
        organizationId: membership.organizationId,
      },
      include: {
        user: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      organization: {
        id: membership.organizationId,
        name: membership.organizationName,
        slug: membership.organizationSlug,
      },
      users: members.map((member: SerializableMembership) =>
        this.serializeMembership(member),
      ),
    };
  }

  async create(auth: AuthenticatedUser, dto: CreateUserDto) {
    const manager = this.resolveManagerMembership(auth, dto.organizationId);
    const email = normalizeEmail(dto.email);
    const passwordHash = await this.passwordService.hash(dto.password);
    const membershipStatus = dto.startActive
      ? MembershipStatus.ACTIVE
      : MembershipStatus.INVITED;
    const userStatus = dto.startActive ? UserStatus.ACTIVE : UserStatus.PENDING;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingUser = await tx.user.findUnique({
        where: { email },
        include: {
          memberships: true,
        },
      });

      if (
        existingUser?.memberships.some(
          (membership: { organizationId: string }) =>
            membership.organizationId === manager.organizationId,
        )
      ) {
        throw new ConflictException('User already belongs to this organization.');
      }

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName?.trim() || null,
            passwordHash,
            status: userStatus,
          },
        }));

      if (existingUser && dto.startActive && existingUser.status === UserStatus.PENDING) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { status: UserStatus.ACTIVE },
        });
      }

      const membership = await tx.membership.create({
        data: {
          organizationId: manager.organizationId,
          userId: user.id,
          role: dto.role,
          status: membershipStatus,
        },
        include: {
          user: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: manager.organizationId,
          actorUserId: auth.id,
          action: 'users.create',
          targetType: 'membership',
          targetId: membership.id,
          metadata: {
            role: membership.role,
            status: membership.status,
          },
        },
      });

      return membership;
    });

    return { user: this.serializeMembership(result) };
  }

  async validate(auth: AuthenticatedUser, membershipId: string) {
    const membership = await this.findMembershipOrThrow(membershipId);
    this.assertManagerForOrganization(auth, membership.organizationId);

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.ACTIVE },
        include: { user: true },
      });

      if (updated.user.status === UserStatus.PENDING) {
        await tx.user.update({
          where: { id: updated.userId },
          data: { status: UserStatus.ACTIVE },
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: updated.organizationId,
          actorUserId: auth.id,
          action: 'users.validate',
          targetType: 'membership',
          targetId: updated.id,
          metadata: {
            status: updated.status,
          },
        },
      });

      return updated;
    });

    return { user: this.serializeMembership(result) };
  }

  async suspend(auth: AuthenticatedUser, membershipId: string) {
    const membership = await this.findMembershipOrThrow(membershipId);
    this.assertManagerForOrganization(auth, membership.organizationId);
    await this.assertNotLastActiveOwner(membership.id, membership.organizationId);

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.SUSPENDED },
        include: { user: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: updated.organizationId,
          actorUserId: auth.id,
          action: 'users.suspend',
          targetType: 'membership',
          targetId: updated.id,
          metadata: {
            status: updated.status,
          },
        },
      });

      return updated;
    });

    return { user: this.serializeMembership(result) };
  }

  async updateRole(
    auth: AuthenticatedUser,
    membershipId: string,
    role: MembershipRole,
  ) {
    const membership = await this.findMembershipOrThrow(membershipId);
    this.assertManagerForOrganization(auth, membership.organizationId);

    if (membership.role === role) {
      return { user: this.serializeMembership(membership) };
    }

    if (membership.role === MembershipRole.OWNER) {
      await this.assertNotLastActiveOwner(membership.id, membership.organizationId);
    }

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: { role },
        include: { user: true },
      });

      await tx.auditLog.create({
        data: {
          organizationId: updated.organizationId,
          actorUserId: auth.id,
          action: 'users.update_role',
          targetType: 'membership',
          targetId: updated.id,
          metadata: {
            previousRole: membership.role,
            role: updated.role,
          },
        },
      });

      return updated;
    });

    return { user: this.serializeMembership(result) };
  }

  private resolveMembership(auth: AuthenticatedUser, organizationId?: string) {
    const membership = organizationId
      ? auth.memberships.find(
          (item) =>
            item.organizationId === organizationId &&
            item.status === MembershipStatus.ACTIVE &&
            item.organizationStatus === OrganizationStatus.ACTIVE,
        )
      : auth.memberships.find(
          (item) =>
            item.status === MembershipStatus.ACTIVE &&
            item.organizationStatus === OrganizationStatus.ACTIVE,
        );

    if (!membership) {
      throw new ForbiddenException('No active membership for this organization.');
    }

    return membership;
  }

  private resolveManagerMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    const membership = this.resolveMembership(auth, organizationId);

    if (!MANAGER_ROLES.has(membership.role)) {
      throw new ForbiddenException('Owner or admin role is required.');
    }

    return membership;
  }

  private assertManagerForOrganization(
    auth: AuthenticatedUser,
    organizationId: string,
  ) {
    return this.resolveManagerMembership(auth, organizationId);
  }

  private async findMembershipOrThrow(membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { user: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership was not found.');
    }

    return membership;
  }

  private async assertNotLastActiveOwner(
    membershipId: string,
    organizationId: string,
  ) {
    const activeOwners = await this.prisma.membership.count({
      where: {
        organizationId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership was not found.');
    }

    if (
      membership.role === MembershipRole.OWNER &&
      membership.status === MembershipStatus.ACTIVE &&
      activeOwners <= 1
    ) {
      throw new BadRequestException(
        'An organization must keep at least one active owner.',
      );
    }
  }

  private serializeMembership(membership: SerializableMembership) {
    return {
      membershipId: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
      membershipStatus: membership.status,
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
      id: membership.user.id,
      email: membership.user.email,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      userStatus: membership.user.status,
      lastLoginAt: membership.user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
