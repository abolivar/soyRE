import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  Client,
  ClientIdentityDocumentType,
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
import {
  CreateClientDto,
  CreateClientIdentityDocumentDto,
} from './dto/create-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';

const CLIENT_WRITE_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
]);

const IDENTITY_DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
const IDENTITY_DOCUMENT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const CLIENT_SERIALIZE_INCLUDE = {
  assignedUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  identityDocuments: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      type: true,
      documentNumber: true,
      fileName: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ClientInclude;

type SerializableIdentityDocument = {
  id: string;
  type: ClientIdentityDocumentType;
  documentNumber: string | null;
  fileName: string;
  createdAt: Date;
};

type SerializableClient = Client & {
  assignedUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
  identityDocuments: SerializableIdentityDocument[];
};

type PreparedIdentityDocument = {
  type: ClientIdentityDocumentType;
  documentNumber: string | null;
  issuingCountry: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  expirationDate: Date | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  content: Buffer;
  ocrText: string | null;
  extractedData?: Prisma.InputJsonValue;
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
    const phone = cleanText(dto.phone);
    const whatsapp = cleanText(dto.whatsapp);
    const identityDocument = dto.identityDocument
      ? this.prepareIdentityDocument(dto.identityDocument)
      : null;
    const roles = normalizeEnumArray(dto.roles);

    if (roles.length === 0) {
      throw new BadRequestException('At least one commercial role is required.');
    }

    if (!email && !phone && !whatsapp) {
      throw new BadRequestException(
        'At least one contact method is required for the client.',
      );
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
            legalId: cleanText(dto.legalId) ?? identityDocument?.documentNumber,
            email,
            phone,
            alternatePhone: cleanText(dto.alternatePhone),
            whatsapp,
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
          include: CLIENT_SERIALIZE_INCLUDE,
        });

        if (identityDocument) {
          const document = await tx.clientIdentityDocument.create({
            data: {
              ...identityDocument,
              organizationId: membership.organizationId,
              clientId: client.id,
              createdByUserId: auth.id,
            },
          });

          await tx.auditLog.create({
            data: {
              organizationId: membership.organizationId,
              actorUserId: auth.id,
              action: 'clients.identity_document.create',
              targetType: 'client',
              targetId: client.id,
              metadata: {
                documentId: document.id,
                documentNumber: document.documentNumber,
                fileName: document.fileName,
                fileSize: document.fileSize,
                type: document.type,
                kyc: false,
              },
            },
          });
        }

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
              identityDocumentType: identityDocument?.type ?? null,
            },
          },
        });

        return tx.client.findUniqueOrThrow({
          where: { id: client.id },
          include: CLIENT_SERIALIZE_INCLUDE,
        });
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
    const identityDocument = client.identityDocuments[0] ?? null;

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
      identityDocument: identityDocument
        ? {
            id: identityDocument.id,
            type: identityDocument.type,
            documentNumber: identityDocument.documentNumber,
            fileName: identityDocument.fileName,
            validatedAt: identityDocument.createdAt.toISOString(),
          }
        : null,
      identityDocumentValidated: Boolean(identityDocument),
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  private prepareIdentityDocument(dto: CreateClientIdentityDocumentDto) {
    const fileName = cleanText(dto.fileName);
    const mimeType = cleanText(dto.mimeType)?.toLowerCase();

    if (!fileName) {
      throw new BadRequestException('Identity document file name is required.');
    }

    if (!mimeType || !IDENTITY_DOCUMENT_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        'Identity document must be a JPEG, PNG, or WebP image.',
      );
    }

    const fileBase64 = stripDataUrl(dto.fileBase64).replace(/\s/g, '');

    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(fileBase64)) {
      throw new BadRequestException('Identity document file is not valid base64.');
    }

    const content = Buffer.from(fileBase64, 'base64');

    if (content.length === 0 || content.length > IDENTITY_DOCUMENT_MAX_BYTES) {
      throw new BadRequestException(
        'Identity document file must be between 1 byte and 5 MB.',
      );
    }

    if (content.length !== dto.fileSize) {
      throw new BadRequestException('Identity document file size does not match.');
    }

    return {
      type: dto.type,
      documentNumber: cleanText(dto.documentNumber),
      issuingCountry: cleanText(dto.issuingCountry),
      firstName: cleanText(dto.firstName),
      lastName: cleanText(dto.lastName),
      birthDate: toDate(dto.birthDate),
      expirationDate: toDate(dto.expirationDate),
      fileName,
      mimeType,
      fileSize: content.length,
      content,
      ocrText: cleanText(dto.ocrText),
      extractedData: toJson(dto.extractedData),
    } satisfies PreparedIdentityDocument;
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

function stripDataUrl(value: string) {
  return value.replace(/^data:[^;]+;base64,/, '');
}

function toJson(value?: Record<string, unknown>) {
  if (!value) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
