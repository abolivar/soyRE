import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingStatus,
  ListingTransitionAction,
  MembershipRole,
  MembershipStatus,
  Prisma,
  PropertyStatus,
} from '@soyre/database';
import {
  COMMIT_ROLES,
  MANAGER_ROLES,
  READ_ROLES,
  WRITE_ROLES,
} from '../auth/authorization.constants.js';
import type {
  AuthenticatedMembership,
  AuthenticatedUser,
} from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateListingDto } from './dto/create-operational.dto.js';
import { ListListingsQueryDto } from './dto/list-operational-query.dto.js';
import { TransitionListingDto, UpdateListingDto } from './dto/listing.dto.js';
import {
  ListingTransitionCommand,
  isListingOperation,
  listingReadinessBlockers,
  listingTransitionNeedsReason,
  listingTransitionTarget,
} from './listing-domain.js';
import { mandateReadinessBlockers } from './mandate-domain.js';

const LISTING_INCLUDE = {
  approvedByUser: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  assignedUser: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  mandate: {
    include: {
      documents: {
        select: {
          documentType: true,
          status: true,
        },
      },
    },
  },
  materials: {
    where: { isCurrent: true },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  property: {
    select: {
      id: true,
      title: true,
      internalCode: true,
      assignedUserId: true,
      status: true,
      operations: true,
      country: true,
      city: true,
      zone: true,
      type: true,
      salePrice: true,
      rentPrice: true,
      currency: true,
      availableFrom: true,
    },
  },
} satisfies Prisma.ListingInclude;

type ListingWithDetails = Prisma.ListingGetPayload<{
  include: typeof LISTING_INCLUDE;
}>;
type ListingTransaction = Prisma.TransactionClient;

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 20_000,
} as const;

@Injectable()
export class ListingsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async list(auth: AuthenticatedUser, query: ListListingsQueryDto) {
    const membership = this.resolveRead(auth, query.organizationId);
    const assignedUserId = this.isAssignedOnly(membership.role)
      ? auth.id
      : query.assignedUserId;
    const search = query.search?.trim();
    const listings: ListingWithDetails[] = await this.prisma.listing.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.operationType ? { operationType: query.operationType } : {}),
        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
        ...(assignedUserId ? { assignedUserId } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { publicCopy: { contains: search, mode: 'insensitive' } },
                {
                  property: {
                    title: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  property: {
                    internalCode: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: LISTING_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      listings: listings.map((listing) => this.serialize(listing)),
    };
  }

  async get(
    auth: AuthenticatedUser,
    listingId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveRead(auth, organizationId);
    const listing = await this.findListing(
      this.prisma,
      membership.organizationId,
      listingId,
    );
    this.assertAssignedRead(auth, membership, listing);
    return { listing: this.serialize(listing) };
  }

  async history(
    auth: AuthenticatedUser,
    listingId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveRead(auth, organizationId);
    const listing = await this.findListing(
      this.prisma,
      membership.organizationId,
      listingId,
    );
    this.assertAssignedRead(auth, membership, listing);
    const events = await this.prisma.listingEvent.findMany({
      where: { organizationId: membership.organizationId, listingId },
      include: {
        actorUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return {
      listingId,
      events: events.map((event: (typeof events)[number]) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async create(auth: AuthenticatedUser, dto: CreateListingDto) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    if (!isListingOperation(dto.operationType)) {
      throw new BadRequestException(
        'A listing operation must be SALE or RENT.',
      );
    }
    if (dto.status && dto.status !== ListingStatus.DRAFT) {
      throw new BadRequestException('A listing must be created as a draft.');
    }
    if (dto.readiness) {
      throw new BadRequestException(
        'Listing readiness is calculated by the server.',
      );
    }
    const idempotencyKey = dto.idempotencyKey;
    const listing = await this.prisma.$transaction(
      async (tx: ListingTransaction) => {
        const existingEvent = await tx.listingEvent.findUnique({
          where: {
            organizationId_idempotencyKey: {
              organizationId: membership.organizationId,
              idempotencyKey,
            },
          },
          select: { action: true, listingId: true },
        });
        if (existingEvent) {
          if (existingEvent.action !== ListingTransitionAction.CREATED) {
            throw new ConflictException(
              'Idempotency key was already used for another listing action.',
            );
          }
          return this.findListing(
            tx,
            membership.organizationId,
            existingEvent.listingId,
          );
        }
        const property = await tx.property.findFirst({
          where: {
            id: dto.propertyId,
            organizationId: membership.organizationId,
          },
          select: { assignedUserId: true, operations: true },
        });
        if (!property) throw new NotFoundException('Property not found.');
        const assignedUserId =
          dto.assignedUserId ?? property.assignedUserId ?? auth.id;
        await this.assertActiveAssignee(
          tx,
          membership.organizationId,
          assignedUserId,
        );
        this.assertAgentWrite(
          auth,
          membership,
          property.assignedUserId,
          assignedUserId,
        );
        if (dto.mandateId) {
          const mandate = await tx.mandate.findFirst({
            where: {
              id: dto.mandateId,
              organizationId: membership.organizationId,
              propertyId: dto.propertyId,
            },
            select: { id: true },
          });
          if (!mandate) throw new NotFoundException('Mandate not found.');
        }
        const open = await tx.listing.findFirst({
          where: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            operationType: dto.operationType,
            status: {
              notIn: [ListingStatus.WITHDRAWN, ListingStatus.ARCHIVED],
            },
          },
          select: { id: true },
        });
        if (open) {
          throw new ConflictException(
            'An operational listing already exists for this property and operation.',
          );
        }
        const created = await tx.listing.create({
          data: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            mandateId: dto.mandateId,
            assignedUserId,
            operationType: dto.operationType,
            status: ListingStatus.DRAFT,
            title: requiredText(dto.title, 'Listing title is required.'),
            publicCopy: cleanText(dto.publicCopy),
            channels: normalizeChannels(dto.channels),
            notes: cleanText(dto.notes),
          },
          include: LISTING_INCLUDE,
        });
        await this.recordEvent(tx, {
          action: ListingTransitionAction.CREATED,
          actorUserId: auth.id,
          idempotencyKey,
          listingId: created.id,
          organizationId: membership.organizationId,
          toStatus: created.status,
        });
        await this.audit(tx, membership.organizationId, auth.id, created, {
          action: 'listings.create',
        });
        return created;
      },
      TRANSACTION_OPTIONS,
    );
    return { listing: this.serialize(listing) };
  }

  async update(
    auth: AuthenticatedUser,
    listingId: string,
    dto: UpdateListingDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const listing = await this.prisma.$transaction(
      async (tx: ListingTransaction) => {
        const current = await this.findListing(
          tx,
          membership.organizationId,
          listingId,
        );
        this.assertAgentWrite(
          auth,
          membership,
          current.property.assignedUserId,
          dto.assignedUserId ?? current.assignedUserId,
        );
        const existing = await this.idempotentEvent(
          tx,
          membership.organizationId,
          dto.idempotencyKey,
          listingId,
        );
        if (existing) return current;
        if (
          current.status !== ListingStatus.DRAFT &&
          current.status !== ListingStatus.READY
        ) {
          throw new ConflictException(
            'Approved or published content must be returned to draft before editing.',
          );
        }
        if (current.status === ListingStatus.READY && !dto.reason?.trim()) {
          throw new BadRequestException(
            'A reason is required to edit a ready listing.',
          );
        }
        const operationType = dto.operationType ?? current.operationType;
        if (!isListingOperation(operationType)) {
          throw new BadRequestException(
            'A listing operation must be SALE or RENT.',
          );
        }
        const assignedUserId = dto.assignedUserId ?? current.assignedUserId;
        if (assignedUserId) {
          await this.assertActiveAssignee(
            tx,
            membership.organizationId,
            assignedUserId,
          );
        }
        const mandateId = dto.mandateId ?? current.mandateId;
        if (mandateId) {
          const mandate = await tx.mandate.findFirst({
            where: {
              id: mandateId,
              organizationId: membership.organizationId,
              propertyId: current.propertyId,
            },
            select: { id: true },
          });
          if (!mandate) throw new NotFoundException('Mandate not found.');
        }
        const toStatus =
          current.status === ListingStatus.READY
            ? ListingStatus.DRAFT
            : current.status;
        const updated = await tx.listing.update({
          where: { id: listingId },
          data: {
            mandateId: dto.mandateId,
            assignedUserId: dto.assignedUserId,
            operationType: dto.operationType,
            title: dto.title?.trim(),
            publicCopy:
              dto.publicCopy === undefined
                ? undefined
                : cleanText(dto.publicCopy),
            channels:
              dto.channels === undefined
                ? undefined
                : normalizeChannels(dto.channels),
            notes: dto.notes === undefined ? undefined : cleanText(dto.notes),
            status: toStatus,
            readiness: Prisma.DbNull,
          },
          include: LISTING_INCLUDE,
        });
        const changedFields = Object.entries(dto)
          .filter(
            ([key, value]) =>
              !['organizationId', 'idempotencyKey', 'reason'].includes(key) &&
              value !== undefined,
          )
          .map(([key]) => key);
        await this.recordEvent(tx, {
          action: ListingTransitionAction.UPDATED,
          actorUserId: auth.id,
          fromStatus: current.status,
          idempotencyKey: dto.idempotencyKey,
          listingId,
          metadata: { changedFields },
          organizationId: membership.organizationId,
          reason: cleanText(dto.reason),
          toStatus,
        });
        await this.audit(tx, membership.organizationId, auth.id, updated, {
          action: 'listings.update',
          metadata: { changedFields },
        });
        return updated;
      },
      TRANSACTION_OPTIONS,
    );
    return { listing: this.serialize(listing) };
  }

  async transition(
    auth: AuthenticatedUser,
    listingId: string,
    dto: TransitionListingDto,
  ) {
    const membership = this.resolveTransition(
      auth,
      dto.organizationId,
      dto.action,
    );
    const reason = cleanText(dto.reason);
    if (listingTransitionNeedsReason(dto.action) && !reason) {
      throw new BadRequestException(
        'A reason is required for this listing transition.',
      );
    }
    const listing = await this.prisma.$transaction(
      async (tx: ListingTransaction) => {
        const current = await this.findListing(
          tx,
          membership.organizationId,
          listingId,
        );
        const existing = await this.idempotentEvent(
          tx,
          membership.organizationId,
          dto.idempotencyKey,
          listingId,
        );
        if (existing) return current;
        const target = listingTransitionTarget(current.status, dto.action);
        if (!target) {
          throw new ConflictException(
            `Listing cannot execute ${dto.action} from ${current.status}.`,
          );
        }
        const requiresReadiness = [
          ListingTransitionCommand.DECLARE_READY,
          ListingTransitionCommand.APPROVE,
          ListingTransitionCommand.PUBLISH,
          ListingTransitionCommand.RESUME,
        ].includes(dto.action);
        const readiness = requiresReadiness
          ? this.readiness(current, {
              requireChannel:
                dto.action === ListingTransitionCommand.PUBLISH ||
                dto.action === ListingTransitionCommand.RESUME,
            })
          : null;
        if (readiness && !readiness.ready) {
          throw new ConflictException({
            message: 'Listing does not satisfy commercial readiness.',
            blockers: readiness.blockers,
          });
        }
        const now = new Date();
        const changed = await tx.listing.updateMany({
          where: { id: listingId, status: current.status },
          data: {
            status: target,
            readiness: readiness
              ? (readiness as unknown as Prisma.InputJsonValue)
              : undefined,
            approvedAt:
              dto.action === ListingTransitionCommand.APPROVE
                ? now
                : dto.action === ListingTransitionCommand.RETURN_TO_DRAFT
                  ? null
                  : undefined,
            approvedByUserId:
              dto.action === ListingTransitionCommand.APPROVE
                ? auth.id
                : dto.action === ListingTransitionCommand.RETURN_TO_DRAFT
                  ? null
                  : undefined,
            publishedAt:
              dto.action === ListingTransitionCommand.PUBLISH ? now : undefined,
            pausedAt:
              dto.action === ListingTransitionCommand.PAUSE
                ? now
                : dto.action === ListingTransitionCommand.RESUME
                  ? null
                  : undefined,
            withdrawnAt:
              dto.action === ListingTransitionCommand.WITHDRAW
                ? now
                : undefined,
            archivedAt:
              dto.action === ListingTransitionCommand.ARCHIVE ? now : undefined,
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException(
            'Listing changed concurrently. Reload before transitioning it.',
          );
        }
        if (dto.action === ListingTransitionCommand.PUBLISH) {
          await tx.property.updateMany({
            where: {
              id: current.propertyId,
              organizationId: membership.organizationId,
              status: PropertyStatus.ACTIVE,
            },
            data: { status: PropertyStatus.PUBLISHED },
          });
        }
        const action = transitionAction(dto.action);
        await this.recordEvent(tx, {
          action,
          actorUserId: auth.id,
          fromStatus: current.status,
          idempotencyKey: dto.idempotencyKey,
          listingId,
          metadata: readiness ? { readiness } : undefined,
          organizationId: membership.organizationId,
          reason,
          toStatus: target,
        });
        const updated = await this.findListing(
          tx,
          membership.organizationId,
          listingId,
        );
        await this.audit(tx, membership.organizationId, auth.id, updated, {
          action: `listings.${dto.action.toLowerCase()}`,
          metadata: { fromStatus: current.status, reason },
        });
        return updated;
      },
      TRANSACTION_OPTIONS,
    );
    return { listing: this.serialize(listing) };
  }

  private readiness(
    listing: ListingWithDetails,
    options: { requireChannel?: boolean } = {},
  ) {
    const mandateReady = Boolean(
      listing.mandate &&
      mandateReadinessBlockers(listing.mandate, listing.operationType)
        .length === 0,
    );
    const blockers = listingReadinessBlockers({
      channels: listing.channels,
      mandateReady,
      materials: listing.materials,
      operationType: listing.operationType,
      property: listing.property,
      publicCopy: listing.publicCopy,
      requireChannel: options.requireChannel,
      title: listing.title,
    });
    return {
      ready: blockers.length === 0,
      checkedAt: new Date().toISOString(),
      blockers,
    };
  }

  private serialize(listing: ListingWithDetails) {
    return {
      ...listing,
      readiness: this.readiness(listing),
      approvedAt: listing.approvedAt?.toISOString() ?? null,
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      pausedAt: listing.pausedAt?.toISOString() ?? null,
      withdrawnAt: listing.withdrawnAt?.toISOString() ?? null,
      archivedAt: listing.archivedAt?.toISOString() ?? null,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      materials: listing.materials.map(
        (source: ListingWithDetails['materials'][number]) => {
          const { storagePath, ...material } = source;
          void storagePath;
          return {
            ...material,
            createdAt: material.createdAt.toISOString(),
            updatedAt: material.updatedAt.toISOString(),
          };
        },
      ),
    };
  }

  private async findListing(
    tx: ListingTransaction | PrismaService,
    organizationId: string,
    listingId: string,
  ) {
    const listing = await tx.listing.findFirst({
      where: { id: listingId, organizationId },
      include: LISTING_INCLUDE,
    });
    if (!listing) throw new NotFoundException('Listing not found.');
    return listing;
  }

  private idempotentEvent(
    tx: ListingTransaction,
    organizationId: string,
    idempotencyKey: string,
    listingId: string,
  ) {
    return tx.listingEvent
      .findUnique({
        where: {
          organizationId_idempotencyKey: { organizationId, idempotencyKey },
        },
        select: { listingId: true },
      })
      .then((event: { listingId: string } | null) => {
        if (event && event.listingId !== listingId) {
          throw new ConflictException(
            'Idempotency key was already used for another listing.',
          );
        }
        return event;
      });
  }

  private recordEvent(
    tx: ListingTransaction,
    input: {
      action: ListingTransitionAction;
      actorUserId: string;
      fromStatus?: ListingStatus;
      idempotencyKey: string;
      listingId: string;
      metadata?: Record<string, unknown>;
      organizationId: string;
      reason?: string | null;
      toStatus: ListingStatus;
    },
  ) {
    return tx.listingEvent.create({
      data: {
        ...input,
        metadata: input.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  private audit(
    tx: ListingTransaction,
    organizationId: string,
    actorUserId: string,
    listing: { id: string; propertyId: string; status: ListingStatus },
    input: { action: string; metadata?: Record<string, unknown> },
  ) {
    return tx.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: input.action,
        targetType: 'listing',
        targetId: listing.id,
        metadata: {
          propertyId: listing.propertyId,
          status: listing.status,
          ...input.metadata,
        } as Prisma.InputJsonObject,
      },
    });
  }

  private resolveRead(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Listing read',
      roles: READ_ROLES,
    });
  }

  private resolveWrite(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Listing preparation write',
      roles: WRITE_ROLES,
    });
  }

  private resolveTransition(
    auth: AuthenticatedUser,
    organizationId: string | undefined,
    action: ListingTransitionCommand,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: `Listing ${action.toLowerCase()}`,
      roles:
        action === ListingTransitionCommand.ARCHIVE
          ? MANAGER_ROLES
          : COMMIT_ROLES,
    });
  }

  private assertAssignedRead(
    auth: AuthenticatedUser,
    membership: AuthenticatedMembership,
    listing: { assignedUserId: string | null },
  ) {
    if (
      this.isAssignedOnly(membership.role) &&
      listing.assignedUserId !== auth.id
    ) {
      throw new NotFoundException('Listing not found.');
    }
  }

  private assertAgentWrite(
    auth: AuthenticatedUser,
    membership: AuthenticatedMembership,
    propertyAssignedUserId: string | null,
    listingAssignedUserId: string | null,
  ) {
    if (
      membership.role === MembershipRole.AGENT &&
      (propertyAssignedUserId !== auth.id || listingAssignedUserId !== auth.id)
    ) {
      throw new ForbiddenException(
        'Agent must be assigned to both the property and the listing.',
      );
    }
  }

  private async assertActiveAssignee(
    tx: ListingTransaction,
    organizationId: string,
    userId: string,
  ) {
    const membership = await tx.membership.findFirst({
      where: {
        organizationId,
        userId,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new BadRequestException(
        'Listing assignee must have an active organization membership.',
      );
    }
  }

  private isAssignedOnly(role: MembershipRole) {
    return (
      role === MembershipRole.AGENT || role === MembershipRole.EXTERNAL_AGENT
    );
  }
}

function transitionAction(action: ListingTransitionCommand) {
  return ListingTransitionAction[action];
}

function cleanText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new BadRequestException(message);
  return normalized;
}

function normalizeChannels(values?: string[]) {
  return [
    ...new Set((values ?? []).map((item) => item.trim()).filter(Boolean)),
  ];
}
