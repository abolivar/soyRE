import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  Property,
  PropertyOperation,
  PropertyStatus,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreatePropertyDto,
  WithdrawPropertyDto,
} from './dto/create-property.dto.js';
import { ListPropertiesQueryDto } from './dto/list-properties-query.dto.js';

const PROPERTY_INCLUDE = {
  assignedUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  ownerClient: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      roles: true,
    },
  },
} satisfies Prisma.PropertyInclude;

type SerializableProperty = Property & {
  assignedUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
  ownerClient: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    roles: string[];
  } | null;
};

@Injectable()
export class PropertiesService {
  constructor(
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(auth: AuthenticatedUser, query: ListPropertiesQueryDto) {
    const membership = this.resolveReadableMembership(auth, query.organizationId);
    const search = query.search?.trim();
    const where: Prisma.PropertyWhereInput = {
      organizationId: membership.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.operation ? { operations: { has: query.operation } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { internalCode: { contains: search, mode: 'insensitive' } },
              { type: { contains: search, mode: 'insensitive' } },
              { country: { contains: search, mode: 'insensitive' } },
              { city: { contains: search, mode: 'insensitive' } },
              { zone: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { buildingName: { contains: search, mode: 'insensitive' } },
              {
                ownerClient: {
                  displayName: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const properties = await this.prisma.property.findMany({
      where,
      include: PROPERTY_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      properties: properties.map((property: SerializableProperty) =>
        this.serializeProperty(property),
      ),
    };
  }

  async get(
    auth: AuthenticatedUser,
    propertyId: string,
    organizationId?: string,
  ) {
    const where = this.resolvePropertyAccessWhere(auth, propertyId, organizationId);
    const property = await this.prisma.property.findFirst({
      where,
      include: PROPERTY_INCLUDE,
    });

    if (!property) {
      throw new NotFoundException('Property was not found in this organization.');
    }

    return { property: this.serializeProperty(property) };
  }

  async create(auth: AuthenticatedUser, dto: CreatePropertyDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const operations = normalizeEnumArray(dto.operations);
    const assignedUserId = dto.assignedUserId ?? auth.id;
    const internalCode = cleanText(dto.internalCode);

    this.validateOperations(operations, dto);

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const assignedMembership = await tx.membership.findFirst({
          where: {
            organizationId: membership.organizationId,
            userId: assignedUserId,
            status: MembershipStatus.ACTIVE,
          },
          select: { id: true },
        });

        if (!assignedMembership) {
          throw new BadRequestException(
            'Assigned user must be active in this organization.',
          );
        }

        if (dto.ownerClientId) {
          const ownerClient = await tx.client.findFirst({
            where: {
              id: dto.ownerClientId,
              organizationId: membership.organizationId,
            },
            select: { id: true },
          });

          if (!ownerClient) {
            throw new BadRequestException(
              'Owner client must belong to this organization.',
            );
          }
        }

        if (internalCode) {
          const existingProperty = await tx.property.findFirst({
            where: {
              organizationId: membership.organizationId,
              internalCode,
            },
            select: { id: true },
          });

          if (existingProperty) {
            throw new ConflictException(
              'A property with this internal code already exists in this organization.',
            );
          }
        }

        const property = await tx.property.create({
          data: {
            organizationId: membership.organizationId,
            assignedUserId,
            ownerClientId: dto.ownerClientId,
            title: requiredText(dto.title, 'Property title is required.'),
            internalCode,
            type: requiredText(dto.type, 'Property type is required.'),
            operations,
            status: dto.status ?? PropertyStatus.DRAFT,
            country: requiredText(dto.country, 'Country is required.'),
            city: requiredText(dto.city, 'City is required.'),
            zone: requiredText(dto.zone, 'Zone is required.'),
            address: cleanText(dto.address),
            buildingName: cleanText(dto.buildingName),
            unitNumber: cleanText(dto.unitNumber),
            bedrooms: dto.bedrooms,
            bathrooms: dto.bathrooms,
            parkingSpaces: dto.parkingSpaces,
            builtArea: dto.builtArea,
            lotArea: dto.lotArea,
            floor: dto.floor,
            yearBuilt: dto.yearBuilt,
            salePrice: dto.salePrice,
            rentPrice: dto.rentPrice,
            currency: cleanText(dto.currency)?.toUpperCase() ?? 'USD',
            maintenanceFee: dto.maintenanceFee,
            rentalDeposit: dto.rentalDeposit,
            availableFrom: toDate(dto.availableFrom),
            source: cleanText(dto.source),
            publicDescription: cleanText(dto.publicDescription),
            privateNotes: cleanText(dto.privateNotes),
            listingConditions: cleanText(dto.listingConditions),
            amenities: normalizeStringArray(dto.amenities),
            tags: normalizeStringArray(dto.tags),
          },
          include: PROPERTY_INCLUDE,
        });

        await tx.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: auth.id,
            action: 'properties.create',
            targetType: 'property',
            targetId: property.id,
            metadata: {
              assignedUserId: property.assignedUserId,
              ownerClientId: property.ownerClientId,
              operations: property.operations,
              status: property.status,
              title: property.title,
            },
          },
        });

        return property;
      },
    );

    return { property: this.serializeProperty(result) };
  }

  async withdraw(
    auth: AuthenticatedUser,
    propertyId: string,
    dto: WithdrawPropertyDto,
  ) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const where = {
      id: propertyId,
      organizationId: membership.organizationId,
    };

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existingProperty = await tx.property.findFirst({
          where,
          select: { id: true, status: true, title: true },
        });

        if (!existingProperty) {
          throw new NotFoundException(
            'Property was not found in this organization.',
          );
        }

        if (existingProperty.status === PropertyStatus.WITHDRAWN) {
          throw new BadRequestException('Property is already withdrawn.');
        }

        const property = await tx.property.update({
          where: { id: existingProperty.id },
          data: {
            status: PropertyStatus.WITHDRAWN,
            withdrawnAt: new Date(),
          },
          include: PROPERTY_INCLUDE,
        });

        await tx.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: auth.id,
            action: 'properties.withdraw',
            targetType: 'property',
            targetId: property.id,
            metadata: {
              previousStatus: existingProperty.status,
              reason: cleanText(dto.reason),
              title: property.title,
            },
          },
        });

        return property;
      },
    );

    return { property: this.serializeProperty(result) };
  }

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Property read',
      roles: READ_ROLES,
    });
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Property write',
      roles: WRITE_ROLES,
    });
  }

  private resolvePropertyAccessWhere(
    auth: AuthenticatedUser,
    propertyId: string,
    organizationId?: string,
  ): Prisma.PropertyWhereInput {
    if (organizationId) {
      const membership = this.resolveReadableMembership(auth, organizationId);

      return {
        id: propertyId,
        organizationId: membership.organizationId,
      };
    }

    const organizationIds = this.organizationAccess.organizationIds(
      auth,
      READ_ROLES,
    );

    return {
      id: propertyId,
      organizationId: { in: organizationIds },
    };
  }

  private validateOperations(
    operations: PropertyOperation[],
    dto: CreatePropertyDto,
  ) {
    if (operations.length === 0) {
      throw new BadRequestException('At least one property operation is required.');
    }

    if (operations.includes(PropertyOperation.SALE) && dto.salePrice === undefined) {
      throw new BadRequestException(
        'Sale price is required for sale properties.',
      );
    }

    if (operations.includes(PropertyOperation.RENT) && dto.rentPrice === undefined) {
      throw new BadRequestException(
        'Rent price is required for rental properties.',
      );
    }
  }

  private serializeProperty(property: SerializableProperty) {
    return {
      id: property.id,
      organizationId: property.organizationId,
      assignedUserId: property.assignedUserId,
      assignedUser: property.assignedUser
        ? {
            id: property.assignedUser.id,
            email: property.assignedUser.email,
            firstName: property.assignedUser.firstName,
            lastName: property.assignedUser.lastName,
          }
        : null,
      ownerClientId: property.ownerClientId,
      ownerClient: property.ownerClient
        ? {
            id: property.ownerClient.id,
            displayName: property.ownerClient.displayName,
            email: property.ownerClient.email,
            phone: property.ownerClient.phone,
            roles: property.ownerClient.roles,
          }
        : null,
      title: property.title,
      internalCode: property.internalCode,
      type: property.type,
      operations: property.operations,
      status: property.status,
      country: property.country,
      city: property.city,
      zone: property.zone,
      address: property.address,
      buildingName: property.buildingName,
      unitNumber: property.unitNumber,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parkingSpaces: property.parkingSpaces,
      builtArea: property.builtArea,
      lotArea: property.lotArea,
      floor: property.floor,
      yearBuilt: property.yearBuilt,
      salePrice: property.salePrice,
      rentPrice: property.rentPrice,
      currency: property.currency,
      maintenanceFee: property.maintenanceFee,
      rentalDeposit: property.rentalDeposit,
      availableFrom: property.availableFrom?.toISOString().slice(0, 10) ?? null,
      source: property.source,
      publicDescription: property.publicDescription,
      privateNotes: property.privateNotes,
      listingConditions: property.listingConditions,
      amenities: property.amenities,
      tags: property.tags,
      withdrawnAt: property.withdrawnAt?.toISOString() ?? null,
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    };
  }
}

function cleanText(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function requiredText(value: string, message: string) {
  const normalized = cleanText(value);

  if (!normalized) {
    throw new BadRequestException(message);
  }

  return normalized;
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
