import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  Client,
  ClientStatus,
  ClientTemperature,
  ClientType,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  Prisma,
} from '@soyre/database';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';

const CLIENT_WRITE_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
]);

type SerializableClient = Client & {
  assignedUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
};

@Injectable()
export class ClientsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(auth: AuthenticatedUser, query: ListClientsQueryDto) {
    const membership = this.resolveMembership(auth, query.organizationId);
    const search = query.search?.trim();
    const where: Prisma.ClientWhereInput = {
      organizationId: membership.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { roles: { has: query.role } } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { whatsapp: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const clients = await this.prisma.client.findMany({
      where,
      include: {
        assignedUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { nextFollowUpAt: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    return {
      organization: {
        id: membership.organizationId,
        name: membership.organizationName,
        slug: membership.organizationSlug,
      },
      clients: clients.map((client: SerializableClient) =>
        this.serializeClient(client),
      ),
    };
  }

  async create(auth: AuthenticatedUser, dto: CreateClientDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const type = dto.type ?? ClientType.PERSON;
    const displayName = this.resolveDisplayName(dto, type);
    const email = normalizeEmail(dto.email);
    const roles = normalizeEnumArray(dto.roles);

    if (roles.length === 0) {
      throw new BadRequestException('At least one commercial role is required.');
    }

    if (
      dto.budgetMin !== undefined &&
      dto.budgetMax !== undefined &&
      dto.budgetMin > dto.budgetMax
    ) {
      throw new BadRequestException('Minimum budget cannot exceed maximum budget.');
    }

    if (
      dto.areaMin !== undefined &&
      dto.areaMax !== undefined &&
      dto.areaMin > dto.areaMax
    ) {
      throw new BadRequestException('Minimum area cannot exceed maximum area.');
    }

    const assignedUserId = dto.assignedUserId ?? auth.id;

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const assignedMembership = await tx.membership.findFirst({
          where: {
            organizationId: membership.organizationId,
            userId: assignedUserId,
            status: MembershipStatus.ACTIVE,
          },
          include: { user: true },
        });

        if (!assignedMembership) {
          throw new BadRequestException(
            'Assigned user must be active in this organization.',
          );
        }

        if (email) {
          const existingClient = await tx.client.findFirst({
            where: {
              organizationId: membership.organizationId,
              email,
            },
            select: { id: true },
          });

          if (existingClient) {
            throw new ConflictException(
              'A client with this email already exists in this organization.',
            );
          }
        }

        const client = await tx.client.create({
          data: {
            organizationId: membership.organizationId,
            assignedUserId,
            type,
            roles,
            status: dto.status ?? ClientStatus.NEW,
            temperature: dto.temperature ?? ClientTemperature.WARM,
            firstName: cleanText(dto.firstName),
            lastName: cleanText(dto.lastName),
            companyName: cleanText(dto.companyName),
            displayName,
            legalId: cleanText(dto.legalId),
            email,
            phone: cleanText(dto.phone),
            alternatePhone: cleanText(dto.alternatePhone),
            whatsapp: cleanText(dto.whatsapp),
            preferredContactMethod: dto.preferredContactMethod,
            country: cleanText(dto.country),
            city: cleanText(dto.city),
            zone: cleanText(dto.zone),
            address: cleanText(dto.address),
            source: cleanText(dto.source),
            interestType: dto.interestType,
            budgetMin: dto.budgetMin,
            budgetMax: dto.budgetMax,
            currency: cleanText(dto.currency)?.toUpperCase() ?? 'USD',
            preferredZones: normalizeStringArray(dto.preferredZones),
            propertyTypes: normalizeStringArray(dto.propertyTypes),
            bedroomsMin: dto.bedroomsMin,
            bathroomsMin: dto.bathroomsMin,
            parkingMin: dto.parkingMin,
            areaMin: dto.areaMin,
            areaMax: dto.areaMax,
            timeline: dto.timeline,
            financingStatus: dto.financingStatus,
            lastContactAt: toDate(dto.lastContactAt),
            nextFollowUpAt: toDate(dto.nextFollowUpAt),
            notes: cleanText(dto.notes),
            tags: normalizeStringArray(dto.tags),
            marketingConsent: dto.marketingConsent ?? false,
            dataConsent: dto.dataConsent ?? false,
          },
          include: {
            assignedUser: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: auth.id,
            action: 'clients.create',
            targetType: 'client',
            targetId: client.id,
            metadata: {
              displayName: client.displayName,
              roles: client.roles,
              status: client.status,
              assignedUserId: client.assignedUserId,
            },
          },
        });

        return client;
      },
    );

    return { client: this.serializeClient(result) };
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

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    const membership = this.resolveMembership(auth, organizationId);

    if (!CLIENT_WRITE_ROLES.has(membership.role)) {
      throw new ForbiddenException('Client write permission is required.');
    }

    return membership;
  }

  private resolveDisplayName(dto: CreateClientDto, type: ClientType) {
    const companyName = cleanText(dto.companyName);
    const firstName = cleanText(dto.firstName);
    const lastName = cleanText(dto.lastName);
    const personName = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (type === ClientType.COMPANY) {
      if (!companyName) {
        throw new BadRequestException('Company name is required.');
      }

      return companyName;
    }

    if (personName) {
      return personName;
    }

    if (companyName) {
      return companyName;
    }

    throw new BadRequestException('Client name is required.');
  }

  private serializeClient(client: SerializableClient) {
    return {
      id: client.id,
      organizationId: client.organizationId,
      assignedUserId: client.assignedUserId,
      assignedUser: client.assignedUser
        ? {
            id: client.assignedUser.id,
            email: client.assignedUser.email,
            firstName: client.assignedUser.firstName,
            lastName: client.assignedUser.lastName,
          }
        : null,
      type: client.type,
      roles: client.roles,
      status: client.status,
      temperature: client.temperature,
      firstName: client.firstName,
      lastName: client.lastName,
      companyName: client.companyName,
      displayName: client.displayName,
      legalId: client.legalId,
      email: client.email,
      phone: client.phone,
      alternatePhone: client.alternatePhone,
      whatsapp: client.whatsapp,
      preferredContactMethod: client.preferredContactMethod,
      country: client.country,
      city: client.city,
      zone: client.zone,
      address: client.address,
      source: client.source,
      interestType: client.interestType,
      budgetMin: client.budgetMin,
      budgetMax: client.budgetMax,
      currency: client.currency,
      preferredZones: client.preferredZones,
      propertyTypes: client.propertyTypes,
      bedroomsMin: client.bedroomsMin,
      bathroomsMin: client.bathroomsMin,
      parkingMin: client.parkingMin,
      areaMin: client.areaMin,
      areaMax: client.areaMax,
      timeline: client.timeline,
      financingStatus: client.financingStatus,
      lastContactAt: client.lastContactAt?.toISOString() ?? null,
      nextFollowUpAt: client.nextFollowUpAt?.toISOString() ?? null,
      notes: client.notes,
      tags: client.tags,
      marketingConsent: client.marketingConsent,
      dataConsent: client.dataConsent,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }
}

function cleanText(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeEmail(value?: string) {
  const normalized = value?.trim().toLowerCase();

  return normalized ? normalized : null;
}

function normalizeEnumArray<T extends string>(values: readonly T[]) {
  return Array.from(new Set(values));
}

function normalizeStringArray(values?: readonly string[]) {
  return Array.from(
    new Set(
      values
        ?.map((value) => value.trim())
        .filter((value) => value.length > 0) ?? [],
    ),
  );
}

function toDate(value?: string) {
  return value ? new Date(value) : null;
}
