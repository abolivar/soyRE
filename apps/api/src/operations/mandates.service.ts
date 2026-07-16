import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessOperationType,
  DocumentEntityType,
  DocumentStatus,
  MandateStatus,
  MandateTransitionAction,
  MandateType,
  MembershipRole,
  MembershipStatus,
  Prisma,
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
import { CreateMandateDto } from './dto/create-operational.dto.js';
import { ListMandatesQueryDto } from './dto/list-operational-query.dto.js';
import {
  MandateTransitionCommand,
  RenewMandateDto,
  TransitionMandateDto,
  UpdateMandateDto,
} from './dto/mandate.dto.js';
import {
  findExclusiveMandateConflict,
  isBlockingMandateDocumentStatus,
  mandateMatchesProperty,
  mandateReadinessBlockers,
} from './mandate-domain.js';

const MANDATE_INCLUDE = {
  assignedUser: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  documents: {
    where: { entityType: DocumentEntityType.MANDATE },
    select: {
      id: true,
      documentType: true,
      name: true,
      status: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  ownerClient: {
    select: { id: true, displayName: true, email: true, phone: true },
  },
  previousMandate: {
    select: { id: true, status: true, endsAt: true },
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
      assignedUserId: true,
      operations: true,
    },
  },
  renewal: {
    select: { id: true, status: true, startsAt: true, endsAt: true },
  },
} satisfies Prisma.MandateInclude;

type MandateWithDetails = Prisma.MandateGetPayload<{
  include: typeof MANDATE_INCLUDE;
}>;

type MandateDocument = MandateWithDetails['documents'][number];
type MandateEventWithActor = Prisma.MandateEventGetPayload<{
  include: {
    actorUser: {
      select: { id: true; email: true; firstName: true; lastName: true };
    };
  };
}>;

type MandateTransaction = Prisma.TransactionClient;

const TERMINAL_FOR_ARCHIVE = new Set<MandateStatus>([
  MandateStatus.EXPIRED,
  MandateStatus.CANCELLED,
  MandateStatus.SUPERSEDED,
]);

const CANCELLABLE = new Set<MandateStatus>([
  MandateStatus.DRAFT,
  MandateStatus.PENDING_SIGNATURE,
  MandateStatus.PENDING_DOCUMENTS,
  MandateStatus.ACTIVE,
]);

@Injectable()
export class MandatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async list(auth: AuthenticatedUser, query: ListMandatesQueryDto) {
    const membership = this.resolveReadableMembership(
      auth,
      query.organizationId,
    );
    const search = query.search?.trim();
    const assignedScope = this.isAssignedOnlyRole(membership.role)
      ? auth.id
      : query.assignedUserId;

    const mandates: MandateWithDetails[] = await this.prisma.mandate.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.propertyId ? { propertyId: query.propertyId } : {}),
        ...(assignedScope ? { assignedUserId: assignedScope } : {}),
        ...(query.expiringBefore
          ? { endsAt: { lte: toDate(query.expiringBefore) } }
          : {}),
        ...(search
          ? {
              OR: [
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
                {
                  ownerClient: {
                    displayName: { contains: search, mode: 'insensitive' },
                  },
                },
                { notes: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: MANDATE_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      mandates: mandates.map((mandate) => this.serializeMandate(mandate)),
    };
  }

  async get(
    auth: AuthenticatedUser,
    mandateId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveReadableMembership(auth, organizationId);
    const mandate = await this.findMandate(
      this.prisma,
      membership.organizationId,
      mandateId,
    );
    this.assertAssignedRead(auth, membership, mandate);
    return { mandate: this.serializeMandate(mandate) };
  }

  async history(
    auth: AuthenticatedUser,
    mandateId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveReadableMembership(auth, organizationId);
    const mandate = await this.findMandate(
      this.prisma,
      membership.organizationId,
      mandateId,
    );
    this.assertAssignedRead(auth, membership, mandate);
    const events: MandateEventWithActor[] =
      await this.prisma.mandateEvent.findMany({
        where: { organizationId: membership.organizationId, mandateId },
        include: {
          actorUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    return {
      mandateId,
      events: events.map((event: MandateEventWithActor) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  async create(auth: AuthenticatedUser, dto: CreateMandateDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    if (dto.status && dto.status !== MandateStatus.DRAFT) {
      throw new BadRequestException('A mandate must be created as a draft.');
    }
    if (dto.signedAt) {
      throw new BadRequestException(
        'A signature must be registered through a mandate transition.',
      );
    }

    const mandate = await this.prisma.$transaction(
      async (tx: MandateTransaction) => {
        const context = await this.validateContext(tx, {
          organizationId: membership.organizationId,
          propertyId: dto.propertyId,
          ownerClientId: dto.ownerClientId,
          assignedUserId: dto.assignedUserId ?? auth.id,
          type: dto.type,
        });
        this.assertAgentCanWrite(
          auth,
          membership,
          context.property.assignedUserId,
          context.assignedUserId,
        );
        const startsAt = toOptionalDate(dto.startsAt);
        const endsAt = toOptionalDate(dto.endsAt);
        assertDateOrder(startsAt, endsAt);

        const created = await tx.mandate.create({
          data: {
            organizationId: membership.organizationId,
            propertyId: dto.propertyId,
            ownerClientId: context.ownerClientId,
            assignedUserId: context.assignedUserId,
            type: dto.type,
            status: MandateStatus.DRAFT,
            exclusive: dto.exclusive ?? false,
            authorizedPriceCents: parseOptionalCents(dto.authorizedPriceCents),
            currency: normalizeCurrency(dto.currency),
            commissionBps: dto.commissionBps,
            startsAt,
            endsAt,
            notes: cleanText(dto.notes),
            metadata: dto.metadata as Prisma.InputJsonObject | undefined,
          },
          include: MANDATE_INCLUDE,
        });
        await this.recordEvent(tx, {
          action: MandateTransitionAction.CREATED,
          actorUserId: auth.id,
          idempotencyKey: `created:${created.id}`,
          mandateId: created.id,
          organizationId: membership.organizationId,
          toStatus: created.status,
        });
        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'mandates.create',
          mandate: created,
        });
        return created;
      },
    );

    return { mandate: this.serializeMandate(mandate) };
  }

  async update(
    auth: AuthenticatedUser,
    mandateId: string,
    dto: UpdateMandateDto,
  ) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const mandate = await this.prisma.$transaction(
      async (tx: MandateTransaction) => {
        const current = await this.lockMandate(
          tx,
          membership.organizationId,
          mandateId,
        );
        this.assertAgentCanWrite(
          auth,
          membership,
          current.property.assignedUserId,
          dto.assignedUserId ?? current.assignedUserId,
        );
        const existingEvent = await this.findIdempotentEvent(
          tx,
          membership.organizationId,
          dto.idempotencyKey,
          mandateId,
          MandateTransitionAction.UPDATED,
        );
        if (existingEvent) return current;
        if (current.status !== MandateStatus.DRAFT) {
          throw new ConflictException(
            'Material mandate terms can only be edited while the mandate is a draft.',
          );
        }

        const context = await this.validateContext(tx, {
          organizationId: membership.organizationId,
          propertyId: current.propertyId,
          ownerClientId:
            dto.ownerClientId ?? current.ownerClientId ?? undefined,
          assignedUserId:
            dto.assignedUserId ?? current.assignedUserId ?? auth.id,
          type: dto.type ?? current.type,
        });
        const startsAt =
          dto.startsAt === undefined ? current.startsAt : toDate(dto.startsAt);
        const endsAt =
          dto.endsAt === undefined ? current.endsAt : toDate(dto.endsAt);
        assertDateOrder(startsAt, endsAt);
        const changedFields = Object.entries(dto)
          .filter(
            ([key, value]) =>
              key !== 'organizationId' &&
              key !== 'idempotencyKey' &&
              value !== undefined,
          )
          .map(([key]) => key);

        const updated = await tx.mandate.update({
          where: { id: mandateId },
          data: {
            ownerClientId: context.ownerClientId,
            assignedUserId: context.assignedUserId,
            type: dto.type,
            exclusive: dto.exclusive,
            authorizedPriceCents:
              dto.authorizedPriceCents === undefined
                ? undefined
                : parseOptionalCents(dto.authorizedPriceCents),
            currency:
              dto.currency === undefined
                ? undefined
                : normalizeCurrency(dto.currency),
            commissionBps: dto.commissionBps,
            startsAt,
            endsAt,
            notes: dto.notes === undefined ? undefined : cleanText(dto.notes),
          },
          include: MANDATE_INCLUDE,
        });
        await this.recordEvent(tx, {
          action: MandateTransitionAction.UPDATED,
          actorUserId: auth.id,
          fromStatus: current.status,
          idempotencyKey: dto.idempotencyKey,
          mandateId,
          metadata: { changedFields },
          organizationId: membership.organizationId,
          toStatus: updated.status,
        });
        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'mandates.update',
          mandate: updated,
          metadata: { changedFields },
        });
        return updated;
      },
    );
    return { mandate: this.serializeMandate(mandate) };
  }

  async transition(
    auth: AuthenticatedUser,
    mandateId: string,
    dto: TransitionMandateDto,
  ) {
    const membership = this.resolveTransitionMembership(
      auth,
      dto.organizationId,
      dto.action,
    );
    const mandate = await this.prisma.$transaction(
      async (tx: MandateTransaction) => {
        const current = await this.lockMandate(
          tx,
          membership.organizationId,
          mandateId,
        );
        this.assertTransitionAssignment(auth, membership, current, dto.action);
        const eventAction = transitionEventAction(dto.action);
        const existingEvent = await this.findIdempotentEvent(
          tx,
          membership.organizationId,
          dto.idempotencyKey,
          mandateId,
          eventAction,
        );
        if (existingEvent) return current;

        if (
          dto.action === MandateTransitionCommand.ACTIVATE ||
          dto.action === MandateTransitionCommand.EXPIRE
        ) {
          await this.lockPropertyScope(
            tx,
            membership.organizationId,
            current.propertyId,
          );
        }

        const change = await this.resolveTransition(tx, current, dto);
        const updated = await tx.mandate.update({
          where: { id: mandateId },
          data: change.data,
          include: MANDATE_INCLUDE,
        });

        if (
          dto.action === MandateTransitionCommand.ACTIVATE &&
          current.previousMandateId
        ) {
          await this.supersedePrevious(
            tx,
            current,
            auth.id,
            dto.idempotencyKey,
          );
        }

        await this.recordEvent(tx, {
          action: eventAction,
          actorUserId: auth.id,
          fromStatus: current.status,
          idempotencyKey: dto.idempotencyKey,
          mandateId,
          metadata: change.metadata,
          organizationId: membership.organizationId,
          reason: cleanText(dto.reason),
          toStatus: change.toStatus,
        });
        await this.audit(tx, membership.organizationId, auth.id, {
          action: `mandates.${dto.action.toLowerCase()}`,
          mandate: updated,
          metadata: {
            fromStatus: current.status,
            reason: cleanText(dto.reason),
          },
        });
        return updated;
      },
    );
    return { mandate: this.serializeMandate(mandate) };
  }

  async renew(
    auth: AuthenticatedUser,
    mandateId: string,
    dto: RenewMandateDto,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      dto.organizationId,
      { permission: 'Mandate renewal', roles: COMMIT_ROLES },
    );
    const result = await this.prisma.$transaction(
      async (tx: MandateTransaction) => {
        const current = await this.lockMandate(
          tx,
          membership.organizationId,
          mandateId,
        );
        await this.lockPropertyScope(
          tx,
          membership.organizationId,
          current.propertyId,
        );
        if (
          current.status !== MandateStatus.ACTIVE &&
          current.status !== MandateStatus.EXPIRED
        ) {
          throw new ConflictException(
            'Only an active or expired mandate can be renewed.',
          );
        }
        const existing = await tx.mandate.findFirst({
          where: {
            organizationId: membership.organizationId,
            previousMandateId: mandateId,
          },
          include: MANDATE_INCLUDE,
        });
        if (existing) return { created: false, mandate: existing };

        await this.findIdempotentEvent(
          tx,
          membership.organizationId,
          dto.idempotencyKey,
          mandateId,
          MandateTransitionAction.RENEW,
        );
        const renewal = await tx.mandate.create({
          data: {
            organizationId: membership.organizationId,
            previousMandateId: current.id,
            propertyId: current.propertyId,
            ownerClientId: current.ownerClientId,
            assignedUserId: current.assignedUserId,
            type: current.type,
            status: MandateStatus.DRAFT,
            exclusive: current.exclusive,
            authorizedPriceCents: current.authorizedPriceCents,
            currency: current.currency,
            commissionBps: current.commissionBps,
            notes: current.notes,
          },
          include: MANDATE_INCLUDE,
        });
        await this.recordEvent(tx, {
          action: MandateTransitionAction.RENEW,
          actorUserId: auth.id,
          fromStatus: current.status,
          idempotencyKey: dto.idempotencyKey,
          mandateId: current.id,
          metadata: { renewalMandateId: renewal.id },
          organizationId: membership.organizationId,
          toStatus: current.status,
        });
        await this.recordEvent(tx, {
          action: MandateTransitionAction.CREATED,
          actorUserId: auth.id,
          idempotencyKey: `renewal-created:${dto.idempotencyKey}`,
          mandateId: renewal.id,
          metadata: { previousMandateId: current.id },
          organizationId: membership.organizationId,
          toStatus: renewal.status,
        });
        await this.audit(tx, membership.organizationId, auth.id, {
          action: 'mandates.renew',
          mandate: current,
          metadata: { renewalMandateId: renewal.id },
        });
        return { created: true, mandate: renewal };
      },
    );
    return {
      created: result.created,
      mandate: this.serializeMandate(result.mandate),
    };
  }

  async assertListingReadiness(
    tx: MandateTransaction,
    input: {
      organizationId: string;
      propertyId: string;
      mandateId?: string;
      operationType?: BusinessOperationType;
    },
  ) {
    if (!input.mandateId) {
      throw new ConflictException(
        'An active mandate is required before commercial preparation.',
      );
    }
    if (!input.operationType) {
      throw new ConflictException(
        'Listing operation type is required before commercial preparation.',
      );
    }
    const mandate = await tx.mandate.findFirst({
      where: {
        id: input.mandateId,
        organizationId: input.organizationId,
        propertyId: input.propertyId,
      },
      include: { documents: true },
    });
    if (!mandate) {
      throw new NotFoundException('Mandate not found.');
    }
    const blockers = mandateReadinessBlockers(mandate, input.operationType);
    if (blockers.length > 0) {
      throw new ConflictException({
        message: 'Mandate does not satisfy commercial readiness.',
        blockers,
      });
    }
    return { allowed: true, blockers: [] as string[] };
  }

  private async resolveTransition(
    tx: MandateTransaction,
    current: MandateWithDetails,
    dto: TransitionMandateDto,
  ) {
    switch (dto.action) {
      case MandateTransitionCommand.SUBMIT_FOR_SIGNATURE:
        assertStatus(current, MandateStatus.DRAFT);
        assertCompleteTerms(current, false);
        return {
          data: { status: MandateStatus.PENDING_SIGNATURE },
          toStatus: MandateStatus.PENDING_SIGNATURE,
        };
      case MandateTransitionCommand.RETURN_TO_DRAFT:
        assertStatus(current, MandateStatus.PENDING_SIGNATURE);
        requireReason(dto.reason);
        return {
          data: { status: MandateStatus.DRAFT },
          toStatus: MandateStatus.DRAFT,
        };
      case MandateTransitionCommand.REGISTER_SIGNATURE: {
        assertStatus(current, MandateStatus.PENDING_SIGNATURE);
        if (!dto.documentId || !dto.signedAt) {
          throw new BadRequestException(
            'Signature date and approved signed document are required.',
          );
        }
        const signedAt = toDate(dto.signedAt);
        const today = todayUtc();
        // The record can be created after an existing mandate was signed.
        // Comparing a date-only value with its UTC creation day also rejects
        // the user's current day in western time zones after midnight UTC.
        if (signedAt > today) {
          throw new BadRequestException('Mandate signature date is invalid.');
        }
        const evidence = await tx.document.findFirst({
          where: {
            id: dto.documentId,
            organizationId: current.organizationId,
            mandateId: current.id,
            entityType: DocumentEntityType.MANDATE,
            documentType: 'SIGNED_MANDATE',
            status: DocumentStatus.APPROVED,
          },
          select: { id: true },
        });
        if (!evidence) {
          throw new ConflictException(
            'Approved signed mandate evidence is required.',
          );
        }
        return {
          data: {
            signedAt,
            status: MandateStatus.PENDING_DOCUMENTS,
          },
          metadata: {
            documentId: evidence.id,
            signedAt: toDateString(signedAt),
          },
          toStatus: MandateStatus.PENDING_DOCUMENTS,
        };
      }
      case MandateTransitionCommand.ACTIVATE:
        assertStatus(current, MandateStatus.PENDING_DOCUMENTS);
        await this.assertActivation(tx, current);
        return {
          data: { status: MandateStatus.ACTIVE },
          toStatus: MandateStatus.ACTIVE,
        };
      case MandateTransitionCommand.EXPIRE:
        assertStatus(current, MandateStatus.ACTIVE);
        if (!current.endsAt || todayUtc() <= current.endsAt) {
          throw new ConflictException(
            'An active mandate can expire only after its end date.',
          );
        }
        return {
          data: { status: MandateStatus.EXPIRED },
          toStatus: MandateStatus.EXPIRED,
        };
      case MandateTransitionCommand.CANCEL: {
        if (!CANCELLABLE.has(current.status)) {
          throw invalidTransition(current.status, MandateStatus.CANCELLED);
        }
        requireReason(dto.reason);
        if (current.status === MandateStatus.ACTIVE && !dto.effectiveAt) {
          throw new BadRequestException(
            'An effective date is required to cancel an active mandate.',
          );
        }
        const effectiveAt = dto.effectiveAt
          ? toDate(dto.effectiveAt)
          : new Date();
        if (effectiveAt > new Date()) {
          throw new BadRequestException(
            'Mandate cancellation cannot take effect in the future.',
          );
        }
        return {
          data: {
            cancelledAt: effectiveAt,
            cancellationReason: cleanText(dto.reason),
            status: MandateStatus.CANCELLED,
          },
          toStatus: MandateStatus.CANCELLED,
        };
      }
      case MandateTransitionCommand.ARCHIVE:
        if (!TERMINAL_FOR_ARCHIVE.has(current.status)) {
          throw invalidTransition(current.status, MandateStatus.ARCHIVED);
        }
        return {
          data: { archivedAt: new Date(), status: MandateStatus.ARCHIVED },
          toStatus: MandateStatus.ARCHIVED,
        };
    }
  }

  private async assertActivation(
    tx: MandateTransaction,
    mandate: MandateWithDetails,
  ) {
    assertCompleteTerms(mandate, true);
    const today = todayUtc();
    if (!mandate.signedAt) {
      throw new ConflictException('Mandate signature is required.');
    }
    if (!mandate.startsAt || !mandate.endsAt) {
      throw new ConflictException('Mandate validity dates are required.');
    }
    if (today < mandate.startsAt || today > mandate.endsAt) {
      throw new ConflictException('Mandate is outside its validity period.');
    }
    const assignedMembership = await tx.membership.findFirst({
      where: {
        organizationId: mandate.organizationId,
        userId: mandate.assignedUserId ?? undefined,
        status: MembershipStatus.ACTIVE,
      },
      select: { id: true },
    });
    if (!assignedMembership) {
      throw new ConflictException(
        'Mandate assignee must have an active organization membership.',
      );
    }
    const signedEvidence = mandate.documents.some(
      (document: MandateDocument) =>
        document.documentType === 'SIGNED_MANDATE' &&
        document.status === DocumentStatus.APPROVED,
    );
    if (!signedEvidence) {
      throw new ConflictException(
        'Approved signed mandate evidence is required.',
      );
    }
    const documentBlockers = mandate.documents.filter(
      (document: MandateDocument) =>
        isBlockingMandateDocumentStatus(document.status),
    );
    if (documentBlockers.length > 0) {
      throw new ConflictException({
        message: 'Mandate has blocking document requirements.',
        blockers: documentBlockers.map((item: MandateDocument) => item.id),
      });
    }

    const activeMandates = await tx.mandate.findMany({
      where: {
        id: {
          notIn: [mandate.id, mandate.previousMandateId].filter(
            (id): id is string => Boolean(id),
          ),
        },
        organizationId: mandate.organizationId,
        propertyId: mandate.propertyId,
        status: MandateStatus.ACTIVE,
      },
      select: {
        id: true,
        type: true,
        exclusive: true,
        startsAt: true,
        endsAt: true,
      },
    });
    const conflict = findExclusiveMandateConflict(mandate, activeMandates);
    if (conflict) {
      throw new ConflictException(
        'This property has an overlapping active exclusive mandate.',
      );
    }
  }

  private async supersedePrevious(
    tx: MandateTransaction,
    current: MandateWithDetails,
    actorUserId: string,
    idempotencyKey: string,
  ) {
    const previous = await tx.mandate.findFirst({
      where: {
        id: current.previousMandateId ?? undefined,
        organizationId: current.organizationId,
        propertyId: current.propertyId,
      },
      include: MANDATE_INCLUDE,
    });
    if (!previous || previous.status !== MandateStatus.ACTIVE) return;
    await tx.mandate.update({
      where: { id: previous.id },
      data: { status: MandateStatus.SUPERSEDED },
    });
    await this.recordEvent(tx, {
      action: MandateTransitionAction.SUPERSEDE,
      actorUserId,
      fromStatus: previous.status,
      idempotencyKey: `supersede:${idempotencyKey}`,
      mandateId: previous.id,
      metadata: { renewalMandateId: current.id },
      organizationId: current.organizationId,
      toStatus: MandateStatus.SUPERSEDED,
    });
  }

  private async validateContext(
    tx: MandateTransaction,
    input: {
      organizationId: string;
      propertyId: string;
      ownerClientId?: string;
      assignedUserId: string;
      type: MandateType;
    },
  ) {
    const property = await tx.property.findFirst({
      where: { id: input.propertyId, organizationId: input.organizationId },
      select: {
        id: true,
        ownerClientId: true,
        assignedUserId: true,
        operations: true,
      },
    });
    if (!property) throw new BadRequestException('Property not found.');
    if (!mandateMatchesProperty(input.type, property.operations)) {
      throw new BadRequestException(
        'Mandate type is not compatible with property operations.',
      );
    }
    const ownerClientId = input.ownerClientId ?? property.ownerClientId;
    if (ownerClientId) {
      const owner = await tx.client.findFirst({
        where: { id: ownerClientId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!owner) {
        throw new BadRequestException(
          'Mandate owner must belong to this organization.',
        );
      }
    }
    const membership = await tx.membership.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.assignedUserId,
        status: MembershipStatus.ACTIVE,
      },
      select: { userId: true },
    });
    if (!membership) {
      throw new BadRequestException(
        'Mandate assignee must have an active organization membership.',
      );
    }
    return {
      assignedUserId: membership.userId,
      ownerClientId,
      property,
    };
  }

  private async findMandate(
    prisma: Pick<PrismaService, 'mandate'>,
    organizationId: string,
    mandateId: string,
  ) {
    const mandate = await prisma.mandate.findFirst({
      where: { id: mandateId, organizationId },
      include: MANDATE_INCLUDE,
    });
    if (!mandate) throw new NotFoundException('Mandate not found.');
    return mandate;
  }

  private async lockMandate(
    tx: MandateTransaction,
    organizationId: string,
    mandateId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM mandates
      WHERE id = ${mandateId}::uuid
        AND organization_id = ${organizationId}::uuid
      FOR UPDATE
    `);
    if (rows.length === 0) throw new NotFoundException('Mandate not found.');
    const mandate = await tx.mandate.findFirst({
      where: { id: mandateId, organizationId },
      include: MANDATE_INCLUDE,
    });
    if (!mandate) throw new NotFoundException('Mandate not found.');
    return mandate;
  }

  private async lockPropertyScope(
    tx: MandateTransaction,
    organizationId: string,
    propertyId: string,
  ) {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`${organizationId}:${propertyId}`}, 0)
      )
    `);
  }

  private async findIdempotentEvent(
    tx: MandateTransaction,
    organizationId: string,
    idempotencyKey: string,
    mandateId: string,
    action: MandateTransitionAction,
  ) {
    const event = await tx.mandateEvent.findUnique({
      where: {
        organizationId_idempotencyKey: { organizationId, idempotencyKey },
      },
    });
    if (!event) return null;
    if (event.mandateId !== mandateId || event.action !== action) {
      throw new ConflictException(
        'Idempotency key was already used for another mandate action.',
      );
    }
    return event;
  }

  private recordEvent(
    tx: MandateTransaction,
    input: {
      action: MandateTransitionAction;
      actorUserId: string;
      fromStatus?: MandateStatus;
      idempotencyKey: string;
      mandateId: string;
      metadata?: Record<string, unknown>;
      organizationId: string;
      reason?: string;
      toStatus: MandateStatus;
    },
  ) {
    return tx.mandateEvent.create({
      data: {
        action: input.action,
        actorUserId: input.actorUserId,
        fromStatus: input.fromStatus,
        idempotencyKey: input.idempotencyKey,
        mandateId: input.mandateId,
        metadata: input.metadata as Prisma.InputJsonObject | undefined,
        organizationId: input.organizationId,
        reason: input.reason,
        toStatus: input.toStatus,
      },
    });
  }

  private audit(
    tx: MandateTransaction,
    organizationId: string,
    actorUserId: string,
    input: {
      action: string;
      mandate: { id: string; propertyId: string; status: MandateStatus };
      metadata?: Record<string, unknown>;
    },
  ) {
    return tx.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: input.action,
        targetType: 'mandate',
        targetId: input.mandate.id,
        metadata: {
          propertyId: input.mandate.propertyId,
          status: input.mandate.status,
          ...input.metadata,
        } as Prisma.InputJsonObject,
      },
    });
  }

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Mandate read',
      roles: READ_ROLES,
    });
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Mandate draft write',
      roles: WRITE_ROLES,
    });
  }

  private resolveTransitionMembership(
    auth: AuthenticatedUser,
    organizationId: string | undefined,
    action: MandateTransitionCommand,
  ) {
    const roles =
      action === MandateTransitionCommand.ARCHIVE
        ? MANAGER_ROLES
        : action === MandateTransitionCommand.SUBMIT_FOR_SIGNATURE
          ? WRITE_ROLES
          : COMMIT_ROLES;
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: `Mandate ${action.toLowerCase()}`,
      roles,
    });
  }

  private assertAssignedRead(
    auth: AuthenticatedUser,
    membership: AuthenticatedMembership,
    mandate: { assignedUserId: string | null },
  ) {
    if (
      this.isAssignedOnlyRole(membership.role) &&
      mandate.assignedUserId !== auth.id
    ) {
      throw new NotFoundException('Mandate not found.');
    }
  }

  private assertAgentCanWrite(
    auth: AuthenticatedUser,
    membership: AuthenticatedMembership,
    propertyAssignedUserId: string | null,
    mandateAssignedUserId: string | null,
  ) {
    if (
      membership.role === MembershipRole.AGENT &&
      (propertyAssignedUserId !== auth.id || mandateAssignedUserId !== auth.id)
    ) {
      throw new ForbiddenException(
        'Agent must be assigned to both the property and the mandate.',
      );
    }
  }

  private assertTransitionAssignment(
    auth: AuthenticatedUser,
    membership: AuthenticatedMembership,
    mandate: MandateWithDetails,
    action: MandateTransitionCommand,
  ) {
    if (
      action === MandateTransitionCommand.SUBMIT_FOR_SIGNATURE &&
      membership.role === MembershipRole.AGENT &&
      mandate.assignedUserId !== auth.id
    ) {
      throw new ForbiddenException('Agent must be assigned to the mandate.');
    }
  }

  private isAssignedOnlyRole(role: MembershipRole) {
    return (
      role === MembershipRole.AGENT || role === MembershipRole.EXTERNAL_AGENT
    );
  }

  private serializeMandate(mandate: MandateWithDetails) {
    const blockers = mandateReadinessBlockers(mandate);
    return {
      ...mandate,
      authorizedPriceCents: mandate.authorizedPriceCents?.toString() ?? null,
      startsAt: toDateString(mandate.startsAt),
      endsAt: toDateString(mandate.endsAt),
      signedAt: toDateString(mandate.signedAt),
      cancelledAt: mandate.cancelledAt?.toISOString() ?? null,
      archivedAt: mandate.archivedAt?.toISOString() ?? null,
      createdAt: mandate.createdAt.toISOString(),
      updatedAt: mandate.updatedAt.toISOString(),
      documents: mandate.documents.map((document: MandateDocument) => ({
        ...document,
        expiresAt: toDateString(document.expiresAt),
        createdAt: document.createdAt.toISOString(),
      })),
      readiness: { allowed: blockers.length === 0, blockers },
    };
  }
}

function transitionEventAction(command: MandateTransitionCommand) {
  return {
    [MandateTransitionCommand.SUBMIT_FOR_SIGNATURE]:
      MandateTransitionAction.SUBMIT_FOR_SIGNATURE,
    [MandateTransitionCommand.RETURN_TO_DRAFT]:
      MandateTransitionAction.RETURN_TO_DRAFT,
    [MandateTransitionCommand.REGISTER_SIGNATURE]:
      MandateTransitionAction.REGISTER_SIGNATURE,
    [MandateTransitionCommand.ACTIVATE]: MandateTransitionAction.ACTIVATE,
    [MandateTransitionCommand.EXPIRE]: MandateTransitionAction.EXPIRE,
    [MandateTransitionCommand.CANCEL]: MandateTransitionAction.CANCEL,
    [MandateTransitionCommand.ARCHIVE]: MandateTransitionAction.ARCHIVE,
  }[command];
}

function assertStatus(
  mandate: { status: MandateStatus },
  expected: MandateStatus,
) {
  if (mandate.status !== expected) {
    throw invalidTransition(mandate.status, expected);
  }
}

function invalidTransition(from: MandateStatus, to: MandateStatus) {
  return new ConflictException(
    `Mandate cannot transition from ${from} to ${to}.`,
  );
}

function requireReason(reason?: string) {
  if (!cleanText(reason)) {
    throw new BadRequestException('Mandate transition reason is required.');
  }
}

function assertCompleteTerms(
  mandate: {
    assignedUserId: string | null;
    authorizedPriceCents: bigint | null;
    commissionBps: number | null;
    currency: string;
    endsAt: Date | null;
    ownerClientId: string | null;
    startsAt: Date | null;
  },
  requireCommission: boolean,
) {
  if (!mandate.ownerClientId) {
    throw new ConflictException('Mandate owner is required.');
  }
  if (!mandate.assignedUserId) {
    throw new ConflictException('Mandate assignee is required.');
  }
  if (!mandate.authorizedPriceCents || mandate.authorizedPriceCents <= 0n) {
    throw new ConflictException('Mandate authorized price must be positive.');
  }
  if (!/^[A-Z]{3}$/.test(mandate.currency)) {
    throw new ConflictException(
      'Mandate currency must be a three-letter code.',
    );
  }
  if (!mandate.startsAt || !mandate.endsAt) {
    throw new ConflictException('Mandate validity dates are required.');
  }
  assertDateOrder(mandate.startsAt, mandate.endsAt);
  if (requireCommission && mandate.commissionBps === null) {
    throw new ConflictException('Mandate commission is required.');
  }
}

function normalizeCurrency(value?: string) {
  const currency = (value ?? 'USD').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequestException('Currency must use a three-letter code.');
  }
  return currency;
}

function parseOptionalCents(value?: string) {
  if (value === undefined || value.trim() === '') return undefined;
  if (!/^\d+$/.test(value.trim())) {
    throw new BadRequestException('authorizedPriceCents must be an integer.');
  }
  const amount = BigInt(value.trim());
  if (amount <= 0n) {
    throw new BadRequestException('authorizedPriceCents must be positive.');
  }
  return amount;
}

function assertDateOrder(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && endsAt && endsAt < startsAt) {
    throw new BadRequestException(
      'Mandate end date cannot be before start date.',
    );
  }
}

function toDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date value.');
  }
  return dateOnly(date);
}

function toOptionalDate(value?: string) {
  return value ? toDate(value) : null;
}

function dateOnly(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function todayUtc() {
  return dateOnly(new Date());
}

function toDateString(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function cleanText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}
