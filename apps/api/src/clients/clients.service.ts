import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Client,
  ClientIdentityDocumentType,
  ClientStatus,
  ClientTemperature,
  ClientType,
  MembershipStatus,
  Prisma,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreateClientDto,
  CreateClientIdentityDocumentDto,
} from './dto/create-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';
import { validateNationalId } from './identity-document-validation.js';

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

const CLIENT_DETAIL_INCLUDE = {
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
    select: {
      id: true,
      type: true,
      documentNumber: true,
      issuingCountry: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      expirationDate: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      ocrText: true,
      extractedData: true,
      createdAt: true,
      createdByUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
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

type SerializableClientIdentityDocumentDetail = SerializableIdentityDocument & {
  issuingCountry: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: Date | null;
  expirationDate: Date | null;
  mimeType: string;
  fileSize: number;
  ocrText: string | null;
  extractedData: Prisma.JsonValue | null;
  createdByUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
  } | null;
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

type SerializableClientDetail = Omit<SerializableClient, 'identityDocuments'> & {
  identityDocuments: SerializableClientIdentityDocumentDetail[];
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
  constructor(
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(auth: AuthenticatedUser, query: ListClientsQueryDto) {
    const membership = this.resolveReadableMembership(auth, query.organizationId);
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
      include: CLIENT_SERIALIZE_INCLUDE,
      orderBy: [
        { nextFollowUpAt: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      clients: clients.map((client: SerializableClient) =>
        this.serializeClient(client),
      ),
    };
  }

  async get(
    auth: AuthenticatedUser,
    clientId: string,
    organizationId?: string,
  ) {
    const where = this.resolveClientAccessWhere(auth, clientId, organizationId);
    const client = await this.prisma.client.findFirst({
      where,
      include: CLIENT_DETAIL_INCLUDE,
    });

    if (!client) {
      throw new NotFoundException('Client was not found in this organization.');
    }

    return { client: this.serializeClientDetail(client) };
  }

  async downloadIdentityDocument(
    auth: AuthenticatedUser,
    clientId: string,
    documentId: string,
    organizationId?: string,
  ) {
    const where = this.resolveClientAccessWhere(auth, clientId, organizationId);
    const document = await this.prisma.clientIdentityDocument.findFirst({
      where: {
        id: documentId,
        clientId,
        client: where,
      },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        type: true,
        documentNumber: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        content: true,
        client: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(
        'Identity document was not found in this organization.',
      );
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: document.organizationId,
        actorUserId: auth.id,
        action: 'clients.identity_document.download',
        targetType: 'client',
        targetId: document.clientId,
        metadata: {
          clientDisplayName: document.client.displayName,
          documentId: document.id,
          documentNumber: document.documentNumber,
          fileName: document.fileName,
          fileSize: document.fileSize,
          type: document.type,
          kyc: false,
        },
      },
    });

    return {
      document: {
        id: document.id,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
      },
      content: Buffer.from(document.content),
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
            firstName: cleanPersonName(dto.firstName),
            lastName: cleanPersonName(dto.lastName),
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

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Client read',
      roles: READ_ROLES,
    });
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Client write',
      roles: WRITE_ROLES,
    });
  }

  private resolveClientAccessWhere(
    auth: AuthenticatedUser,
    clientId: string,
    organizationId?: string,
  ): Prisma.ClientWhereInput {
    if (organizationId) {
      const membership = this.resolveReadableMembership(auth, organizationId);

      return {
        id: clientId,
        organizationId: membership.organizationId,
      };
    }

    const organizationIds = this.organizationAccess.organizationIds(
      auth,
      READ_ROLES,
    );

    return {
      id: clientId,
      organizationId: { in: organizationIds },
    };
  }

  private resolveDisplayName(dto: CreateClientDto, type: ClientType) {
    const companyName = cleanText(dto.companyName);
    const firstName = cleanPersonName(dto.firstName);
    const lastName = cleanPersonName(dto.lastName);
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

  private serializeClientDetail(client: SerializableClientDetail) {
    return {
      ...this.serializeClient({
        ...client,
        identityDocuments: client.identityDocuments.slice(0, 1),
      }),
      identityDocuments: client.identityDocuments.map((document) => ({
        id: document.id,
        type: document.type,
        documentNumber: document.documentNumber,
        issuingCountry: document.issuingCountry,
        firstName: document.firstName,
        lastName: document.lastName,
        birthDate: document.birthDate?.toISOString().slice(0, 10) ?? null,
        expirationDate:
          document.expirationDate?.toISOString().slice(0, 10) ?? null,
        fileName: document.fileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        ocrText: document.ocrText,
        extractedData: document.extractedData,
        validatedAt: document.createdAt.toISOString(),
        createdByUser: document.createdByUser
          ? {
              id: document.createdByUser.id,
              email: document.createdByUser.email,
              firstName: document.createdByUser.firstName,
              lastName: document.createdByUser.lastName,
            }
          : null,
      })),
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

    const nationalId =
      dto.type === ClientIdentityDocumentType.NATIONAL_ID
        ? validateNationalId(dto.issuingCountry, dto.documentNumber)
        : null;

    if (nationalId && !nationalId.valid) {
      throw new BadRequestException(nationalId.message);
    }

    return {
      type: dto.type,
      documentNumber: nationalId?.documentNumber ?? cleanText(dto.documentNumber),
      issuingCountry: nationalId?.issuingCountry ?? cleanText(dto.issuingCountry),
      firstName: cleanPersonName(dto.firstName),
      lastName: cleanPersonName(dto.lastName),
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

function cleanPersonName(value?: string) {
  const normalized = cleanText(value);

  if (!normalized) {
    return null;
  }

  return normalized
    .toLocaleLowerCase('es-PA')
    .replace(/(^|[\s'-])(\p{L})/gu, (_match, prefix: string, letter: string) =>
      `${prefix}${letter.toLocaleUpperCase('es-PA')}`,
    );
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
