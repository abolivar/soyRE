import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  DocumentEntityType,
  DocumentStatus,
  ListingStatus,
  MandateStatus,
  MembershipStatus,
  OfferStatus,
  Prisma,
  ShowingStatus,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreateDocumentDto,
  CreateListingDto,
  CreateMandateDto,
  CreateOfferDto,
  CreateShowingDto,
  CreateWorkflowStageDto,
} from './dto/create-operational.dto.js';
import {
  ListDocumentsQueryDto,
  ListListingsQueryDto,
  ListMandatesQueryDto,
  ListOffersQueryDto,
  ListShowingsQueryDto,
  ListWorkflowStagesQueryDto,
} from './dto/list-operational-query.dto.js';

const DOCUMENT_INCLUDE = {
  business: {
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
    },
  },
  businessContract: {
    select: {
      id: true,
      contractNumber: true,
      status: true,
    },
  },
  client: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
    },
  },
  property: {
    select: {
      id: true,
      title: true,
      internalCode: true,
      status: true,
      city: true,
      zone: true,
    },
  },
  reviewedByUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  uploadedByUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.DocumentInclude;

const MANDATE_INCLUDE = {
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
    },
  },
  property: {
    select: {
      id: true,
      title: true,
      internalCode: true,
      status: true,
      city: true,
      zone: true,
      ownerClientId: true,
    },
  },
} satisfies Prisma.MandateInclude;

const LISTING_INCLUDE = {
  mandate: {
    select: {
      id: true,
      status: true,
      type: true,
      endsAt: true,
    },
  },
  property: {
    select: {
      id: true,
      title: true,
      internalCode: true,
      status: true,
      city: true,
      zone: true,
      currency: true,
      salePrice: true,
      rentPrice: true,
    },
  },
} satisfies Prisma.ListingInclude;

const SHOWING_INCLUDE = {
  assignedUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  business: {
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
    },
  },
  client: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
    },
  },
  property: {
    select: {
      id: true,
      title: true,
      internalCode: true,
      status: true,
      city: true,
      zone: true,
    },
  },
  realEstateAgent: {
    select: {
      id: true,
      displayName: true,
      category: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.ShowingInclude;

const OFFER_INCLUDE = {
  assignedUser: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  business: {
    select: {
      id: true,
      code: true,
      title: true,
      status: true,
    },
  },
  client: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
    },
  },
  property: {
    select: {
      id: true,
      title: true,
      internalCode: true,
      status: true,
      city: true,
      zone: true,
    },
  },
} satisfies Prisma.OfferInclude;

type DocumentWithDetails = Prisma.DocumentGetPayload<{
  include: typeof DOCUMENT_INCLUDE;
}>;

type MandateWithDetails = Prisma.MandateGetPayload<{
  include: typeof MANDATE_INCLUDE;
}>;

type ListingWithDetails = Prisma.ListingGetPayload<{
  include: typeof LISTING_INCLUDE;
}>;

type ShowingWithDetails = Prisma.ShowingGetPayload<{
  include: typeof SHOWING_INCLUDE;
}>;

type OfferWithDetails = Prisma.OfferGetPayload<{
  include: typeof OFFER_INCLUDE;
}>;

@Injectable()
export class OperationsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async listDocuments(auth: AuthenticatedUser, query: ListDocumentsQueryDto) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const search = query.search?.trim();
    const where: Prisma.DocumentWhereInput = {
      organizationId: membership.organizationId,
      requirementId: null,
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { documentType: { contains: search, mode: 'insensitive' } },
              { fileName: { contains: search, mode: 'insensitive' } },
              {
                client: {
                  displayName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                property: { title: { contains: search, mode: 'insensitive' } },
              },
              {
                business: { title: { contains: search, mode: 'insensitive' } },
              },
            ],
          }
        : {}),
    };

    const documents = await this.prisma.document.findMany({
      where,
      include: DOCUMENT_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.serializeOrganization(membership),
      documents: documents.map((document: DocumentWithDetails) =>
        this.serializeDocument(document),
      ),
    };
  }

  async createDocument(auth: AuthenticatedUser, dto: CreateDocumentDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);

    if (
      dto.storagePath ||
      dto.fileName ||
      dto.mimeType ||
      dto.fileSize !== undefined
    ) {
      throw new BadRequestException(
        'File metadata must be created by an authorized private upload endpoint.',
      );
    }

    const document = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.validateDocumentRelations(
          tx,
          membership.organizationId,
          dto,
        );

        const created = await tx.document.create({
          data: {
            organizationId: membership.organizationId,
            entityType: dto.entityType,
            clientId: dto.clientId,
            propertyId: dto.propertyId,
            businessId: dto.businessId,
            businessContractId: dto.businessContractId,
            name: requiredText(dto.name, 'Document name is required.'),
            documentType: requiredText(
              dto.documentType,
              'Document type is required.',
            ),
            status: dto.status ?? DocumentStatus.REQUIRED,
            fileName: cleanText(dto.fileName),
            mimeType: cleanText(dto.mimeType),
            fileSize: dto.fileSize,
            storagePath: cleanText(dto.storagePath),
            requiredBy: toDate(dto.requiredBy),
            expiresAt: toDate(dto.expiresAt),
            uploadedByUserId:
              dto.fileName || dto.storagePath ? auth.id : undefined,
            notes: cleanText(dto.notes),
            metadata: dto.metadata as Prisma.InputJsonObject | undefined,
          },
          include: DOCUMENT_INCLUDE,
        });

        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'documents.create',
          targetType: 'document',
          targetId: created.id,
          metadata: {
            entityType: created.entityType,
            status: created.status,
            name: created.name,
          },
        });

        return created;
      },
    );

    return { document: this.serializeDocument(document) };
  }

  async listMandates(auth: AuthenticatedUser, query: ListMandatesQueryDto) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const search = query.search?.trim();
    const where: Prisma.MandateWhereInput = {
      organizationId: membership.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(search
        ? {
            OR: [
              {
                property: { title: { contains: search, mode: 'insensitive' } },
              },
              {
                property: {
                  internalCode: { contains: search, mode: 'insensitive' },
                },
              },
              {
                ownerClient: {
                  displayName: { contains: search, mode: 'insensitive' },
                },
              },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const mandates = await this.prisma.mandate.findMany({
      where,
      include: MANDATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.serializeOrganization(membership),
      mandates: mandates.map((mandate: MandateWithDetails) =>
        this.serializeMandate(mandate),
      ),
    };
  }

  async createMandate(auth: AuthenticatedUser, dto: CreateMandateDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const startsAt = toDate(dto.startsAt);
    const endsAt = toDate(dto.endsAt);
    const assignedUserId = dto.assignedUserId ?? auth.id;

    if (startsAt && endsAt && endsAt < startsAt) {
      throw new BadRequestException(
        'Mandate end date cannot be before start date.',
      );
    }

    const mandate = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const property = await this.ensureProperty(
          tx,
          membership.organizationId,
          dto.propertyId,
        );
        const ownerClientId = dto.ownerClientId ?? property.ownerClientId;

        if (ownerClientId) {
          await this.ensureClient(tx, membership.organizationId, ownerClientId);
        }

        if (assignedUserId) {
          await this.ensureAssignedUser(
            tx,
            membership.organizationId,
            assignedUserId,
          );
        }

        if (dto.exclusive && dto.status === MandateStatus.ACTIVE) {
          const existingExclusive = await tx.mandate.findFirst({
            where: {
              exclusive: true,
              organizationId: membership.organizationId,
              propertyId: dto.propertyId,
              status: MandateStatus.ACTIVE,
            },
            select: { id: true },
          });

          if (existingExclusive) {
            throw new ConflictException(
              'This property already has an active exclusive mandate.',
            );
          }
        }

        const created = await tx.mandate.create({
          data: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            ownerClientId,
            assignedUserId,
            type: dto.type,
            status: dto.status ?? MandateStatus.DRAFT,
            exclusive: dto.exclusive ?? false,
            authorizedPriceCents: parseOptionalCents(
              dto.authorizedPriceCents,
              'authorizedPriceCents',
            ),
            currency: normalizeCurrency(dto.currency),
            commissionBps: dto.commissionBps,
            startsAt,
            endsAt,
            signedAt: toDate(dto.signedAt),
            notes: cleanText(dto.notes),
            metadata: dto.metadata as Prisma.InputJsonObject | undefined,
          },
          include: MANDATE_INCLUDE,
        });

        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'mandates.create',
          targetType: 'mandate',
          targetId: created.id,
          metadata: {
            propertyId: created.propertyId,
            status: created.status,
            type: created.type,
          },
        });

        return created;
      },
    );

    return { mandate: this.serializeMandate(mandate) };
  }

  async listListings(auth: AuthenticatedUser, query: ListListingsQueryDto) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const search = query.search?.trim();
    const where: Prisma.ListingWhereInput = {
      organizationId: membership.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { publicCopy: { contains: search, mode: 'insensitive' } },
              {
                property: { title: { contains: search, mode: 'insensitive' } },
              },
              {
                property: {
                  internalCode: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const listings = await this.prisma.listing.findMany({
      where,
      include: LISTING_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.serializeOrganization(membership),
      listings: listings.map((listing: ListingWithDetails) =>
        this.serializeListing(listing),
      ),
    };
  }

  async createListing(auth: AuthenticatedUser, dto: CreateListingDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);

    const listing = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.ensureProperty(
          tx,
          membership.organizationId,
          dto.propertyId,
        );

        if (dto.mandateId) {
          const mandate = await tx.mandate.findFirst({
            where: {
              id: dto.mandateId,
              organizationId: membership.organizationId,
            },
            select: { id: true, propertyId: true },
          });

          if (!mandate) {
            throw new BadRequestException(
              'Mandate must belong to this organization.',
            );
          }

          if (mandate.propertyId !== dto.propertyId) {
            throw new BadRequestException(
              'Listing mandate must belong to the selected property.',
            );
          }
        }

        const status = dto.status ?? ListingStatus.DRAFT;
        const created = await tx.listing.create({
          data: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            mandateId: dto.mandateId,
            status,
            title: requiredText(dto.title, 'Listing title is required.'),
            publicCopy: cleanText(dto.publicCopy),
            channels: normalizeStringArray(dto.channels),
            readiness: dto.readiness as Prisma.InputJsonObject | undefined,
            approvedAt:
              status === ListingStatus.APPROVED ||
              status === ListingStatus.PUBLISHED
                ? new Date()
                : undefined,
            publishedAt:
              status === ListingStatus.PUBLISHED ? new Date() : undefined,
            notes: cleanText(dto.notes),
          },
          include: LISTING_INCLUDE,
        });

        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'listings.create',
          targetType: 'listing',
          targetId: created.id,
          metadata: {
            propertyId: created.propertyId,
            status: created.status,
            title: created.title,
          },
        });

        return created;
      },
    );

    return { listing: this.serializeListing(listing) };
  }

  async listShowings(auth: AuthenticatedUser, query: ListShowingsQueryDto) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const search = query.search?.trim();
    const where: Prisma.ShowingWhereInput = {
      organizationId: membership.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              {
                property: { title: { contains: search, mode: 'insensitive' } },
              },
              {
                client: {
                  displayName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                realEstateAgent: {
                  displayName: { contains: search, mode: 'insensitive' },
                },
              },
              { outcome: { contains: search, mode: 'insensitive' } },
              { feedback: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const showings = await this.prisma.showing.findMany({
      where,
      include: SHOWING_INCLUDE,
      orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.serializeOrganization(membership),
      showings: showings.map((showing: ShowingWithDetails) =>
        this.serializeShowing(showing),
      ),
    };
  }

  async createShowing(auth: AuthenticatedUser, dto: CreateShowingDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const assignedUserId = dto.assignedUserId ?? auth.id;

    const showing = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.ensureProperty(
          tx,
          membership.organizationId,
          dto.propertyId,
        );
        await this.ensureClient(tx, membership.organizationId, dto.clientId);
        await this.ensureBusiness(
          tx,
          membership.organizationId,
          dto.businessId,
        );
        await this.ensureAssignedUser(
          tx,
          membership.organizationId,
          assignedUserId,
        );
        await this.ensureRealEstateAgent(
          tx,
          membership.organizationId,
          dto.realEstateAgentId,
        );

        const status = dto.status ?? ShowingStatus.REQUESTED;
        const created = await tx.showing.create({
          data: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            clientId: dto.clientId,
            businessId: dto.businessId,
            assignedUserId,
            realEstateAgentId: dto.realEstateAgentId,
            status,
            scheduledFor: toRequiredDate(dto.scheduledFor, 'scheduledFor'),
            completedAt:
              toDate(dto.completedAt) ??
              (status === ShowingStatus.COMPLETED ? new Date() : null),
            outcome: cleanText(dto.outcome),
            feedback: cleanText(dto.feedback),
            nextActionAt: toDate(dto.nextActionAt),
            notes: cleanText(dto.notes),
            metadata: dto.metadata as Prisma.InputJsonObject | undefined,
          },
          include: SHOWING_INCLUDE,
        });

        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'showings.create',
          targetType: 'showing',
          targetId: created.id,
          metadata: {
            propertyId: created.propertyId,
            clientId: created.clientId,
            scheduledFor: created.scheduledFor.toISOString(),
            status: created.status,
          },
        });

        return created;
      },
    );

    return { showing: this.serializeShowing(showing) };
  }

  async listOffers(auth: AuthenticatedUser, query: ListOffersQueryDto) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const search = query.search?.trim();
    const where: Prisma.OfferWhereInput = {
      organizationId: membership.organizationId,
      ...(query.operationType ? { operationType: query.operationType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              {
                client: {
                  displayName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                property: { title: { contains: search, mode: 'insensitive' } },
              },
              {
                business: { title: { contains: search, mode: 'insensitive' } },
              },
              { terms: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const offers = await this.prisma.offer.findMany({
      where,
      include: OFFER_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.serializeOrganization(membership),
      offers: offers.map((offer: OfferWithDetails) =>
        this.serializeOffer(offer),
      ),
    };
  }

  async createOffer(auth: AuthenticatedUser, dto: CreateOfferDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const assignedUserId = dto.assignedUserId ?? auth.id;

    const offer = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await this.ensureClient(tx, membership.organizationId, dto.clientId);
        await this.ensureProperty(
          tx,
          membership.organizationId,
          dto.propertyId,
        );
        await this.ensureBusiness(
          tx,
          membership.organizationId,
          dto.businessId,
        );
        await this.ensureAssignedUser(
          tx,
          membership.organizationId,
          assignedUserId,
        );

        const status = dto.status ?? OfferStatus.DRAFT;
        const created = await tx.offer.create({
          data: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            clientId: dto.clientId,
            businessId: dto.businessId,
            assignedUserId,
            operationType: dto.operationType,
            status,
            amountCents: parseRequiredCents(dto.amountCents, 'amountCents'),
            currency: normalizeCurrency(dto.currency),
            terms: cleanText(dto.terms),
            expiresAt: toDate(dto.expiresAt),
            sentAt: status === OfferStatus.SENT ? new Date() : undefined,
            acceptedAt:
              status === OfferStatus.ACCEPTED ? new Date() : undefined,
            rejectedAt:
              status === OfferStatus.REJECTED ? new Date() : undefined,
            notes: cleanText(dto.notes),
            metadata: dto.metadata as Prisma.InputJsonObject | undefined,
          },
          include: OFFER_INCLUDE,
        });

        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'offers.create',
          targetType: 'offer',
          targetId: created.id,
          metadata: {
            clientId: created.clientId,
            propertyId: created.propertyId,
            status: created.status,
            amountCents: created.amountCents.toString(),
          },
        });

        return created;
      },
    );

    return { offer: this.serializeOffer(offer) };
  }

  async listWorkflowStages(
    auth: AuthenticatedUser,
    query: ListWorkflowStagesQueryDto,
  ) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const stages = await this.prisma.workflowStage.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(query.scope ? { scope: query.scope } : {}),
      },
      orderBy: [{ scope: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      take: 200,
    });

    return {
      organization: this.serializeOrganization(membership),
      workflowStages: stages.map(
        (stage: Prisma.WorkflowStageGetPayload<object>) => ({
          id: stage.id,
          organizationId: stage.organizationId,
          scope: stage.scope,
          name: stage.name,
          position: stage.position,
          tone: stage.tone,
          isActive: stage.isActive,
          appliesTo: stage.appliesTo,
          metadata: stage.metadata,
          createdAt: stage.createdAt.toISOString(),
          updatedAt: stage.updatedAt.toISOString(),
        }),
      ),
    };
  }

  async createWorkflowStage(
    auth: AuthenticatedUser,
    dto: CreateWorkflowStageDto,
  ) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);

    const stage = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existing = await tx.workflowStage.findUnique({
          where: {
            organizationId_scope_name: {
              organizationId: membership.organizationId,
              scope: dto.scope,
              name: requiredText(dto.name, 'Stage name is required.'),
            },
          },
          select: { id: true },
        });

        if (existing) {
          throw new ConflictException(
            'A workflow stage with this scope and name already exists.',
          );
        }

        const created = await tx.workflowStage.create({
          data: {
            organizationId: membership.organizationId,
            scope: dto.scope,
            name: requiredText(dto.name, 'Stage name is required.'),
            position: dto.position,
            tone: cleanText(dto.tone) ?? 'neutral',
            isActive: dto.isActive ?? true,
            appliesTo: normalizeStringArray(dto.appliesTo),
            metadata: dto.metadata as Prisma.InputJsonObject | undefined,
          },
        });

        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'workflow_stages.create',
          targetType: 'workflow_stage',
          targetId: created.id,
          metadata: {
            scope: created.scope,
            name: created.name,
            position: created.position,
          },
        });

        return created;
      },
    );

    return {
      workflowStage: {
        id: stage.id,
        organizationId: stage.organizationId,
        scope: stage.scope,
        name: stage.name,
        position: stage.position,
        tone: stage.tone,
        isActive: stage.isActive,
        appliesTo: stage.appliesTo,
        metadata: stage.metadata,
        createdAt: stage.createdAt.toISOString(),
        updatedAt: stage.updatedAt.toISOString(),
      },
    };
  }

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Operational read',
      roles: READ_ROLES,
    });
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Operational write',
      roles: WRITE_ROLES,
    });
  }

  private async validateDocumentRelations(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: CreateDocumentDto,
  ) {
    if (
      dto.entityType !== DocumentEntityType.OTHER &&
      !dto.clientId &&
      !dto.propertyId &&
      !dto.businessId &&
      !dto.businessContractId
    ) {
      throw new BadRequestException(
        'At least one document relation is required.',
      );
    }

    await this.ensureClient(tx, organizationId, dto.clientId);
    await this.ensureProperty(tx, organizationId, dto.propertyId);
    await this.ensureBusiness(tx, organizationId, dto.businessId);

    if (dto.businessContractId) {
      const contract = await tx.businessContract.findFirst({
        where: {
          id: dto.businessContractId,
          business: { organizationId },
        },
        select: { id: true, businessId: true },
      });

      if (!contract) {
        throw new BadRequestException(
          'Business contract must belong to this organization.',
        );
      }

      if (dto.businessId && contract.businessId !== dto.businessId) {
        throw new BadRequestException(
          'Document contract must belong to the selected business.',
        );
      }
    }
  }

  private async ensureProperty(
    tx: Prisma.TransactionClient,
    organizationId: string,
    propertyId?: string,
  ) {
    if (!propertyId) {
      return { ownerClientId: null };
    }

    const property = await tx.property.findFirst({
      where: { id: propertyId, organizationId },
      select: { id: true, ownerClientId: true },
    });

    if (!property) {
      throw new BadRequestException(
        'Property must belong to this organization.',
      );
    }

    return property;
  }

  private async ensureClient(
    tx: Prisma.TransactionClient,
    organizationId: string,
    clientId?: string,
  ) {
    if (!clientId) {
      return;
    }

    const client = await tx.client.findFirst({
      where: { id: clientId, organizationId },
      select: { id: true },
    });

    if (!client) {
      throw new BadRequestException('Client must belong to this organization.');
    }
  }

  private async ensureBusiness(
    tx: Prisma.TransactionClient,
    organizationId: string,
    businessId?: string,
  ) {
    if (!businessId) {
      return;
    }

    const business = await tx.business.findFirst({
      where: { id: businessId, organizationId },
      select: { id: true },
    });

    if (!business) {
      throw new BadRequestException(
        'Business must belong to this organization.',
      );
    }
  }

  private async ensureAssignedUser(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId?: string,
  ) {
    if (!userId) {
      return;
    }

    const membership = await tx.membership.findFirst({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        userId,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new BadRequestException(
        'Assigned user must be active in this organization.',
      );
    }
  }

  private async ensureRealEstateAgent(
    tx: Prisma.TransactionClient,
    organizationId: string,
    realEstateAgentId?: string,
  ) {
    if (!realEstateAgentId) {
      return;
    }

    const agent = await tx.realEstateAgent.findFirst({
      where: {
        id: realEstateAgentId,
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!agent) {
      throw new BadRequestException(
        'Real estate agent must be active in this organization.',
      );
    }
  }

  private async audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorUserId: string,
    event: {
      action: string;
      targetType: string;
      targetId: string;
      metadata: Prisma.InputJsonObject;
    },
  ) {
    await tx.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: event.metadata,
      },
    });
  }

  private serializeOrganization(membership: {
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
  }) {
    return this.organizationAccess.serializeOrganization(membership);
  }

  private serializeDocument(document: DocumentWithDetails) {
    return {
      id: document.id,
      organizationId: document.organizationId,
      entityType: document.entityType,
      clientId: document.clientId,
      propertyId: document.propertyId,
      businessId: document.businessId,
      businessContractId: document.businessContractId,
      name: document.name,
      documentType: document.documentType,
      status: document.status,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      storagePath: document.storagePath,
      requiredBy: toDateString(document.requiredBy),
      expiresAt: toDateString(document.expiresAt),
      reviewedAt: document.reviewedAt?.toISOString() ?? null,
      uploadedByUserId: document.uploadedByUserId,
      reviewedByUserId: document.reviewedByUserId,
      notes: document.notes,
      metadata: document.metadata,
      client: document.client,
      property: document.property,
      business: document.business,
      businessContract: document.businessContract,
      uploadedByUser: document.uploadedByUser,
      reviewedByUser: document.reviewedByUser,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }

  private serializeMandate(mandate: MandateWithDetails) {
    return {
      id: mandate.id,
      organizationId: mandate.organizationId,
      propertyId: mandate.propertyId,
      ownerClientId: mandate.ownerClientId,
      assignedUserId: mandate.assignedUserId,
      type: mandate.type,
      status: mandate.status,
      exclusive: mandate.exclusive,
      authorizedPriceCents: mandate.authorizedPriceCents?.toString() ?? null,
      currency: mandate.currency,
      commissionBps: mandate.commissionBps,
      startsAt: toDateString(mandate.startsAt),
      endsAt: toDateString(mandate.endsAt),
      signedAt: toDateString(mandate.signedAt),
      notes: mandate.notes,
      metadata: mandate.metadata,
      property: mandate.property,
      ownerClient: mandate.ownerClient,
      assignedUser: mandate.assignedUser,
      createdAt: mandate.createdAt.toISOString(),
      updatedAt: mandate.updatedAt.toISOString(),
    };
  }

  private serializeListing(listing: ListingWithDetails) {
    return {
      id: listing.id,
      organizationId: listing.organizationId,
      propertyId: listing.propertyId,
      mandateId: listing.mandateId,
      status: listing.status,
      title: listing.title,
      publicCopy: listing.publicCopy,
      channels: listing.channels,
      readiness: listing.readiness,
      approvedAt: listing.approvedAt?.toISOString() ?? null,
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      pausedAt: listing.pausedAt?.toISOString() ?? null,
      archivedAt: listing.archivedAt?.toISOString() ?? null,
      notes: listing.notes,
      property: listing.property,
      mandate: listing.mandate
        ? {
            ...listing.mandate,
            endsAt: toDateString(listing.mandate.endsAt),
          }
        : null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    };
  }

  private serializeShowing(showing: ShowingWithDetails) {
    return {
      id: showing.id,
      organizationId: showing.organizationId,
      propertyId: showing.propertyId,
      clientId: showing.clientId,
      businessId: showing.businessId,
      assignedUserId: showing.assignedUserId,
      realEstateAgentId: showing.realEstateAgentId,
      status: showing.status,
      scheduledFor: showing.scheduledFor.toISOString(),
      completedAt: showing.completedAt?.toISOString() ?? null,
      outcome: showing.outcome,
      feedback: showing.feedback,
      nextActionAt: showing.nextActionAt?.toISOString() ?? null,
      notes: showing.notes,
      metadata: showing.metadata,
      property: showing.property,
      client: showing.client,
      business: showing.business,
      assignedUser: showing.assignedUser,
      realEstateAgent: showing.realEstateAgent,
      createdAt: showing.createdAt.toISOString(),
      updatedAt: showing.updatedAt.toISOString(),
    };
  }

  private serializeOffer(offer: OfferWithDetails) {
    return {
      id: offer.id,
      organizationId: offer.organizationId,
      propertyId: offer.propertyId,
      clientId: offer.clientId,
      businessId: offer.businessId,
      assignedUserId: offer.assignedUserId,
      operationType: offer.operationType,
      status: offer.status,
      amountCents: offer.amountCents.toString(),
      currency: offer.currency,
      terms: offer.terms,
      expiresAt: offer.expiresAt?.toISOString() ?? null,
      sentAt: offer.sentAt?.toISOString() ?? null,
      acceptedAt: offer.acceptedAt?.toISOString() ?? null,
      rejectedAt: offer.rejectedAt?.toISOString() ?? null,
      notes: offer.notes,
      metadata: offer.metadata,
      property: offer.property,
      client: offer.client,
      business: offer.business,
      assignedUser: offer.assignedUser,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
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

function normalizeCurrency(value?: string) {
  const currency = cleanText(value)?.toUpperCase() ?? 'USD';

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequestException('Currency must use a three-letter code.');
  }

  return currency;
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

function parseRequiredCents(value: string, field: string) {
  const cents = parseOptionalCents(value, field);

  if (cents === null) {
    throw new BadRequestException(`${field} is required.`);
  }

  return cents;
}

function parseOptionalCents(value: string | undefined, field: string) {
  const normalized = cleanText(value);

  if (!normalized) {
    return null;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new BadRequestException(`${field} must be a non-negative integer.`);
  }

  return BigInt(normalized);
}

function toDate(value?: string) {
  return value ? new Date(value) : null;
}

function toRequiredDate(value: string, field: string) {
  const date = toDate(value);

  if (!date) {
    throw new BadRequestException(`${field} is required.`);
  }

  return date;
}

function toDateString(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}
