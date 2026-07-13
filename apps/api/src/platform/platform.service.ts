import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Membership,
  MembershipRole,
  MembershipStatus,
  type Organization,
  OrganizationStatus,
  Prisma,
  type User,
  UserStatus,
} from '@soyre/database';
import { normalizeEmail, slugify } from '../auth/auth.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PasswordService } from '../auth/password.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreatePlatformOrganizationDto } from './dto/create-platform-organization.dto.js';
import { CreatePlatformUserDto } from './dto/create-platform-user.dto.js';
import { PlatformAccessService } from './platform-access.service.js';

type OrganizationWithCounts = Organization & {
  _count: {
    businesses: number;
    clients: number;
    memberships: number;
    properties: number;
  };
  memberships: Array<
    Pick<Membership, 'id' | 'status'> & {
      user: Pick<User, 'email' | 'firstName' | 'id' | 'lastName'>;
    }
  >;
};

type MembershipWithUserAndOrganization = Membership & {
  organization: Pick<Organization, 'name' | 'slug'>;
  user: Pick<
    User,
    'email' | 'firstName' | 'id' | 'lastLoginAt' | 'lastName' | 'status'
  >;
};

@Injectable()
export class PlatformService {
  constructor(
    @Inject(PasswordService)
    private readonly passwordService: PasswordService,
    @Inject(PlatformAccessService)
    private readonly platformAccess: PlatformAccessService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  access(auth: AuthenticatedUser) {
    this.platformAccess.assertPlatformAdmin(auth);

    return { platformAdmin: true };
  }

  async listOrganizations(auth: AuthenticatedUser) {
    this.platformAccess.assertPlatformAdmin(auth);
    const organizations = await this.findOrganizations();

    return {
      organizations: organizations.map((organization) =>
        this.serializeOrganization(organization),
      ),
    };
  }

  async createOrganization(
    auth: AuthenticatedUser,
    dto: CreatePlatformOrganizationDto,
  ) {
    this.platformAccess.assertPlatformAdmin(auth);

    const ownerEmail = normalizeEmail(dto.ownerEmail);
    const slug = dto.organizationSlug ?? slugify(dto.organizationName);

    if (!slug) {
      throw new BadRequestException('Organization slug is required.');
    }

    const [existingOrganization, existingOwner] = await Promise.all([
      this.prisma.organization.findUnique({ where: { slug } }),
      this.prisma.user.findUnique({
        where: { email: ownerEmail },
        include: { memberships: true },
      }),
    ]);

    if (existingOrganization) {
      throw new ConflictException('An organization with this slug already exists.');
    }

    if (
      existingOwner &&
      existingOwner.status !== UserStatus.ACTIVE &&
      existingOwner.status !== UserStatus.PENDING
    ) {
      throw new BadRequestException('Owner user is not active.');
    }

    let ownerPasswordHash = '';

    if (!existingOwner) {
      ownerPasswordHash = await this.passwordService.hash(dto.ownerPassword);
    }

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.organizationName.trim(),
            slug,
          },
        });

        const owner =
          existingOwner ??
          (await tx.user.create({
            data: {
              email: ownerEmail,
              firstName: dto.ownerFirstName.trim(),
              lastName: dto.ownerLastName?.trim() || null,
              passwordHash: ownerPasswordHash,
              status: UserStatus.ACTIVE,
            },
          }));

        const activeOwner =
          owner.status === UserStatus.PENDING
            ? await tx.user.update({
                where: { id: owner.id },
                data: { status: UserStatus.ACTIVE },
              })
            : owner;

        const membership = await tx.membership.create({
          data: {
            organizationId: organization.id,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            userId: activeOwner.id,
          },
          include: {
            organization: true,
            user: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'platform.organizations.create',
            actorUserId: auth.id,
            metadata: {
              ownerEmail,
              ownerUserId: activeOwner.id,
              source: 'platform_backoffice',
            },
            organizationId: organization.id,
            targetId: organization.id,
            targetType: 'organization',
          },
        });

        return { membership, organization };
      },
    );

    return {
      organization: this.serializeOrganization(
        await this.findOrganizationOrThrow(result.organization.id),
      ),
      owner: this.serializeMembership(result.membership),
    };
  }

  async listUsers(auth: AuthenticatedUser, organizationId: string) {
    this.platformAccess.assertPlatformAdmin(auth);
    await this.ensureOrganizationExists(organizationId);
    const memberships = await this.findMemberships(organizationId);

    return {
      users: memberships.map((membership) => this.serializeMembership(membership)),
    };
  }

  async createUser(
    auth: AuthenticatedUser,
    organizationId: string,
    dto: CreatePlatformUserDto,
  ) {
    this.platformAccess.assertPlatformAdmin(auth);
    await this.ensureOrganizationExists(organizationId);

    const email = normalizeEmail(dto.email);
    const startActive = dto.startActive ?? true;
    const passwordHash = await this.passwordService.hash(dto.password);

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existingUser = await tx.user.findUnique({
          where: { email },
          include: { memberships: true },
        });

        if (
          existingUser?.memberships.some(
            (membership: { organizationId: string }) =>
              membership.organizationId === organizationId,
          )
        ) {
          throw new ConflictException('User already belongs to this organization.');
        }

        if (
          existingUser &&
          existingUser.status !== UserStatus.ACTIVE &&
          existingUser.status !== UserStatus.PENDING
        ) {
          throw new BadRequestException('User is not active.');
        }

        const user =
          existingUser ??
          (await tx.user.create({
            data: {
              email,
              firstName: dto.firstName.trim(),
              lastName: dto.lastName?.trim() || null,
              passwordHash,
              status: startActive ? UserStatus.ACTIVE : UserStatus.PENDING,
            },
          }));

        const normalizedUser =
          existingUser && startActive && existingUser.status === UserStatus.PENDING
            ? await tx.user.update({
                where: { id: existingUser.id },
                data: { status: UserStatus.ACTIVE },
              })
            : user;

        const membership = await tx.membership.create({
          data: {
            organizationId,
            role: dto.role,
            status: startActive ? MembershipStatus.ACTIVE : MembershipStatus.INVITED,
            userId: normalizedUser.id,
          },
          include: {
            organization: true,
            user: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'platform.users.create',
            actorUserId: auth.id,
            metadata: {
              role: membership.role,
              source: 'platform_backoffice',
              status: membership.status,
            },
            organizationId,
            targetId: membership.id,
            targetType: 'membership',
          },
        });

        return membership;
      },
    );

    return { user: this.serializeMembership(result) };
  }

  async updateMembershipStatus(
    auth: AuthenticatedUser,
    membershipId: string,
    status: MembershipStatus,
  ) {
    this.platformAccess.assertPlatformAdmin(auth);
    const membership = await this.findMembershipOrThrow(membershipId);

    if (membership.status === status) {
      return { user: this.serializeMembership(membership) };
    }

    if (status === MembershipStatus.SUSPENDED) {
      await this.assertNotLastActiveOwner(membership.id, membership.organizationId);
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const result = await tx.membership.update({
          where: { id: membership.id },
          data: { status },
          include: {
            organization: true,
            user: true,
          },
        });

        const user =
          status === MembershipStatus.ACTIVE && result.user.status === UserStatus.PENDING
            ? await tx.user.update({
                where: { id: result.userId },
                data: { status: UserStatus.ACTIVE },
              })
            : result.user;

        await tx.auditLog.create({
          data: {
            action: 'platform.users.update_status',
            actorUserId: auth.id,
            metadata: {
              previousStatus: membership.status,
              source: 'platform_backoffice',
              status,
            },
            organizationId: result.organizationId,
            targetId: result.id,
            targetType: 'membership',
          },
        });

        return { ...result, user };
      },
    );

    return { user: this.serializeMembership(updated) };
  }

  async updateMembershipRole(
    auth: AuthenticatedUser,
    membershipId: string,
    role: MembershipRole,
  ) {
    this.platformAccess.assertPlatformAdmin(auth);
    const membership = await this.findMembershipOrThrow(membershipId);

    if (membership.role === role) {
      return { user: this.serializeMembership(membership) };
    }

    if (membership.role === MembershipRole.OWNER) {
      await this.assertNotLastActiveOwner(membership.id, membership.organizationId);
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const result = await tx.membership.update({
          where: { id: membership.id },
          data: { role },
          include: {
            organization: true,
            user: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'platform.users.update_role',
            actorUserId: auth.id,
            metadata: {
              previousRole: membership.role,
              role,
              source: 'platform_backoffice',
            },
            organizationId: result.organizationId,
            targetId: result.id,
            targetType: 'membership',
          },
        });

        return result;
      },
    );

    return { user: this.serializeMembership(updated) };
  }

  private async findOrganizations(): Promise<OrganizationWithCounts[]> {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            businesses: true,
            clients: true,
            memberships: true,
            properties: true,
          },
        },
        memberships: {
          include: { user: true },
          orderBy: { createdAt: 'asc' },
          where: { role: MembershipRole.OWNER },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOrganizationOrThrow(
    organizationId: string,
  ): Promise<OrganizationWithCounts> {
    const organization = await this.prisma.organization.findUnique({
      include: {
        _count: {
          select: {
            businesses: true,
            clients: true,
            memberships: true,
            properties: true,
          },
        },
        memberships: {
          include: { user: true },
          orderBy: { createdAt: 'asc' },
          where: { role: MembershipRole.OWNER },
        },
      },
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization was not found.');
    }

    return organization;
  }

  private async ensureOrganizationExists(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      select: { id: true, status: true },
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization was not found.');
    }

    if (organization.status === OrganizationStatus.ARCHIVED) {
      throw new BadRequestException('Organization is archived.');
    }
  }

  private async findMemberships(
    organizationId: string,
  ): Promise<MembershipWithUserAndOrganization[]> {
    return this.prisma.membership.findMany({
      include: {
        organization: true,
        user: true,
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      where: { organizationId },
    });
  }

  private async findMembershipOrThrow(
    membershipId: string,
  ): Promise<MembershipWithUserAndOrganization> {
    const membership = await this.prisma.membership.findUnique({
      include: {
        organization: true,
        user: true,
      },
      where: { id: membershipId },
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
        id: { not: membershipId },
        organizationId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (activeOwners === 0) {
      throw new BadRequestException(
        'An organization must keep at least one active owner.',
      );
    }
  }

  private serializeOrganization(organization: OrganizationWithCounts) {
    const owners = organization.memberships.map(
      (membership: OrganizationWithCounts['memberships'][number]) => ({
        email: membership.user.email,
        firstName: membership.user.firstName,
        id: membership.user.id,
        lastName: membership.user.lastName,
        membershipId: membership.id,
        status: membership.status,
      }),
    );

    return {
      businessCount: organization._count.businesses,
      clientCount: organization._count.clients,
      createdAt: organization.createdAt,
      id: organization.id,
      memberCount: organization._count.memberships,
      name: organization.name,
      owners,
      propertyCount: organization._count.properties,
      slug: organization.slug,
      status: organization.status,
      updatedAt: organization.updatedAt,
    };
  }

  private serializeMembership(membership: MembershipWithUserAndOrganization) {
    return {
      createdAt: membership.createdAt,
      email: membership.user.email,
      firstName: membership.user.firstName,
      id: membership.user.id,
      lastLoginAt: membership.user.lastLoginAt,
      lastName: membership.user.lastName,
      membershipId: membership.id,
      membershipStatus: membership.status,
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      role: membership.role,
      updatedAt: membership.updatedAt,
      userStatus: membership.user.status,
    };
  }
}
