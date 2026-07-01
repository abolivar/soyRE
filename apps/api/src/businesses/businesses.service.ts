import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessContractStatus,
  BusinessMode,
  BusinessOperationType,
  BusinessParticipantRole,
  BusinessPartyType,
  BusinessStatus,
  BusinessTriggerEvent,
  CalculationSnapshotType,
  ClauseAppliesTo,
  ClauseCalculationType,
  CommissionAllocationStatus,
  CommissionBase,
  CommissionCalculationType,
  CommissionPlanMode,
  CommissionPlanStatus,
  CommissionRecipientType,
  CommissionReleasePolicy,
  CommissionReleaseTrigger,
  ContractClauseType,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  PaymentFrequency,
  PaymentPlanStatus,
  PaymentPlanType,
  PaymentScheduleLineSource,
  PaymentScheduleLineStatus,
  PaymentScheduleLineType,
  Prisma,
  PropertyStatus,
  RoundingStrategy,
  ScheduledActionStatus,
  ScheduledActionType,
} from '@soyre/database';
import {
  calculateCommissionPlan,
  calculatePaymentPlan,
  centsToString,
  toCents,
  type CommissionPlanInput,
  type PaymentPlanInput,
  type PaymentPlanPreset,
} from '@soyre/shared';
import { createHash } from 'node:crypto';
import type { AuthenticatedMembership, AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  BusinessCalculationRequestDto,
  BusinessCommitDto,
  CreateBusinessDraftDto,
  UpdateBusinessDraftDto,
} from './dto/business-draft.dto.js';
import { ListBusinessesQueryDto } from './dto/list-businesses-query.dto.js';

const BUSINESS_READ_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
  MembershipRole.FINANCE,
  MembershipRole.EXTERNAL_AGENT,
  MembershipRole.READONLY,
]);

const BUSINESS_WRITE_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
]);

const BUSINESS_COMMIT_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.OPERATIONS,
]);

const BUSINESS_COMMISSION_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.FINANCE,
]);

const BUSINESS_DETAIL_INCLUDE = {
  contractType: true,
  primaryClient: {
    select: {
      id: true,
      displayName: true,
      email: true,
      phone: true,
      roles: true,
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
      salePrice: true,
      rentPrice: true,
      currency: true,
    },
  },
  participants: {
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
  contracts: {
    include: {
      clauses: {
        orderBy: { createdAt: 'asc' },
      },
      contractType: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  paymentPlans: {
    include: {
      lines: {
        orderBy: { sequence: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  commissionPlans: {
    include: {
      allocations: {
        include: {
          participant: true,
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  fees: {
    orderBy: { createdAt: 'asc' },
  },
  calculationSnapshots: {
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
  scheduledActions: {
    orderBy: { scheduledFor: 'asc' },
    take: 50,
  },
} satisfies Prisma.BusinessInclude;

const PAYMENT_PLAN_TYPE_BY_PRESET: Record<PaymentPlanPreset, PaymentPlanType> = {
  CASH: PaymentPlanType.CASH,
  CUSTOM: PaymentPlanType.CUSTOM,
  MILESTONE_BASED: PaymentPlanType.MILESTONE_BASED,
  REGULAR_INSTALLMENTS: PaymentPlanType.REGULAR_INSTALLMENTS,
  RESERVATION_SIGNATURE_BALANCE: PaymentPlanType.CASH,
  SIGNATURE_INSTALLMENTS: PaymentPlanType.SIGNATURE_PLUS_INSTALLMENTS,
};

const REMOTE_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 30_000,
};

const UNAVAILABLE_PROPERTY_STATUSES = new Set<PropertyStatus>([
  PropertyStatus.RESERVED,
  PropertyStatus.UNDER_CONTRACT,
  PropertyStatus.CLOSED,
  PropertyStatus.WITHDRAWN,
  PropertyStatus.ARCHIVED,
]);

const PROPERTY_BLOCKING_BUSINESS_STATUSES: BusinessStatus[] = [
  BusinessStatus.PENDING_REVIEW,
  BusinessStatus.APPROVED,
  BusinessStatus.CONTRACT_GENERATED,
  BusinessStatus.PENDING_SIGNATURE,
  BusinessStatus.ACTIVE,
];

const DEFAULT_CONTRACT_TYPES = [
  {
    name: 'Promesa de compraventa',
    operationType: BusinessOperationType.SALE,
    description: 'Contrato preliminar para operaciones de venta.',
    requiresProperty: true,
    requiresPaymentPlan: true,
    requiresCommissionPlan: true,
  },
  {
    name: 'Contrato de compraventa',
    operationType: BusinessOperationType.SALE,
    description: 'Contrato final de venta de inmueble.',
    requiresProperty: true,
    requiresPaymentPlan: true,
    requiresCommissionPlan: true,
  },
  {
    name: 'Contrato de arrendamiento',
    operationType: BusinessOperationType.RENT,
    description: 'Contrato para operaciones de alquiler.',
    requiresProperty: true,
    requiresPaymentPlan: true,
    requiresCommissionPlan: true,
  },
  {
    name: 'Reserva / separación',
    operationType: BusinessOperationType.RESERVATION,
    description: 'Documento para reservar o separar una unidad.',
    requiresProperty: false,
    requiresPaymentPlan: true,
    requiresCommissionPlan: false,
  },
  {
    name: 'Cesión',
    operationType: BusinessOperationType.ASSIGNMENT,
    description: 'Contrato o condición para cesión de derechos.',
    requiresProperty: false,
    requiresPaymentPlan: true,
    requiresCommissionPlan: true,
  },
] satisfies Array<{
  name: string;
  operationType: BusinessOperationType;
  description: string;
  requiresProperty: boolean;
  requiresPaymentPlan: boolean;
  requiresCommissionPlan: boolean;
}>;

type BusinessWithDetails = Prisma.BusinessGetPayload<{
  include: typeof BUSINESS_DETAIL_INCLUDE;
}>;

const BUSINESS_LIST_INCLUDE = {
  primaryClient: {
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
  participants: {
    where: {
      role: {
        in: [
          BusinessParticipantRole.PRIMARY_AGENT,
          BusinessParticipantRole.CO_AGENT,
          BusinessParticipantRole.REFERRER,
          BusinessParticipantRole.BROKER,
        ],
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      displayName: true,
      role: true,
      isPrimary: true,
    },
  },
  paymentScheduleLines: {
    where: {
      status: {
        in: [
          PaymentScheduleLineStatus.PENDING,
          PaymentScheduleLineStatus.INVOICED,
          PaymentScheduleLineStatus.PARTIALLY_PAID,
          PaymentScheduleLineStatus.OVERDUE,
        ],
      },
    },
    orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
    take: 1,
    select: {
      id: true,
      label: true,
      amountCents: true,
      dueDate: true,
      status: true,
    },
  },
  scheduledActions: {
    where: { status: ScheduledActionStatus.PENDING },
    orderBy: [{ scheduledFor: 'asc' }],
    take: 1,
    select: {
      id: true,
      eventType: true,
      scheduledFor: true,
      status: true,
    },
  },
} satisfies Prisma.BusinessInclude;

type BusinessListItem = Prisma.BusinessGetPayload<{
  include: typeof BUSINESS_LIST_INCLUDE;
}>;

type ValidationLevel = 'ERROR' | 'WARNING' | 'INFO';

type ValidationItem = {
  level: ValidationLevel;
  code: string;
  message: string;
};

type DraftParticipant = {
  participantKey?: string;
  clientId?: string;
  userId?: string;
  realEstateAgentId?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  documentId?: string;
  role?: string;
  partyType?: string;
  isPrimary?: boolean;
  ownershipPercentageBps?: number;
  commissionEligible?: boolean;
  receivesNotifications?: boolean;
  metadata?: unknown;
};

type DraftClause = {
  clauseType?: string;
  title?: string;
  description?: string;
  calculationType?: string;
  amountCents?: unknown;
  percentageBps?: number;
  appliesTo?: string;
  triggerEvent?: string;
  createsReceivable?: boolean;
  requiresApproval?: boolean;
  metadata?: unknown;
};

type DraftFee = {
  name?: string;
  feeType?: string;
  amountCents?: unknown;
  percentageBps?: number;
  calculationBaseCents?: unknown;
  currency?: string;
  payerRole?: string;
  includedInContractTotal?: boolean;
  includedInPaymentPlan?: boolean;
  triggerEvent?: string;
  metadata?: unknown;
};

@Injectable()
export class BusinessesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async context(auth: AuthenticatedUser, organizationId?: string) {
    const membership = this.resolveWritableMembership(auth, organizationId);
    await this.ensureDefaultContractTypes(membership.organizationId);

    const [contractTypes, clients, properties, agents, memberships] =
      await Promise.all([
        this.prisma.contractType.findMany({
          where: {
            organizationId: membership.organizationId,
            isActive: true,
          },
          orderBy: [{ operationType: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.client.findMany({
          where: { organizationId: membership.organizationId },
          orderBy: [{ updatedAt: 'desc' }],
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
            roles: true,
            legalId: true,
            identityDocuments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true },
            },
          },
          take: 100,
        }),
        this.prisma.property.findMany({
          where: { organizationId: membership.organizationId },
          orderBy: [{ updatedAt: 'desc' }],
          select: {
            id: true,
            title: true,
            internalCode: true,
            status: true,
            city: true,
            zone: true,
            salePrice: true,
            rentPrice: true,
            currency: true,
          },
          take: 100,
        }),
        this.prisma.realEstateAgent.findMany({
          where: {
            organizationId: membership.organizationId,
            isActive: true,
          },
          orderBy: [{ displayName: 'asc' }],
          select: {
            id: true,
            category: true,
            displayName: true,
            email: true,
            phone: true,
          },
          take: 100,
        }),
        this.prisma.membership.findMany({
          where: {
            organizationId: membership.organizationId,
            status: MembershipStatus.ACTIVE,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ user: { firstName: 'asc' } }],
        }),
      ]);
    const contextClients = clients as Array<{
      id: string;
      displayName: string;
      email: string | null;
      phone: string | null;
      roles: string[];
      legalId: string | null;
      identityDocuments: unknown[];
    }>;
    const contextProperties = properties as Array<{
      id: string;
      title: string;
      internalCode: string | null;
      status: PropertyStatus;
      city: string;
      zone: string;
      salePrice: number | null;
      rentPrice: number | null;
      currency: string;
    }>;
    const contextMemberships = memberships as Array<{
      role: MembershipRole;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string | null;
      };
    }>;

    return {
      organization: this.serializeOrganization(membership),
      operationTypes: Object.values(BusinessOperationType),
      modes: Object.values(BusinessMode),
      currencies: ['USD', 'PAB'],
      participantRoles: Object.values(BusinessParticipantRole),
      contractTypes: (contractTypes as unknown[]).map((contractType) =>
        toSerializable(contractType),
      ),
      clients: contextClients.map((client) => ({
        id: client.id,
        displayName: client.displayName,
        email: client.email,
        phone: client.phone,
        roles: client.roles,
        legalId: client.legalId,
        identityDocumentValidated: client.identityDocuments.length > 0,
      })),
      properties: contextProperties.map((property) => ({
        ...property,
        suggestedPriceCents: property.salePrice
          ? String(property.salePrice * 100)
          : property.rentPrice
            ? String(property.rentPrice * 100)
            : null,
      })),
      agents,
      users: contextMemberships.map((item) => ({
        id: item.user.id,
        email: item.user.email,
        firstName: item.user.firstName,
        lastName: item.user.lastName,
        role: item.role,
      })),
      paymentPresets: [
        'CASH',
        'RESERVATION_SIGNATURE_BALANCE',
        'SIGNATURE_INSTALLMENTS',
        'REGULAR_INSTALLMENTS',
        'MILESTONE_BASED',
        'CUSTOM',
      ],
      commissionDefaults: {
        simpleBasisPoints: 300,
        releaseTrigger: CommissionReleaseTrigger.ON_CLOSING,
        commissionBase: CommissionBase.NEGOTIATED_PRICE,
      },
      permissionHints: {
        canViewCommissions: BUSINESS_COMMISSION_ROLES.has(membership.role),
        canCommit: BUSINESS_COMMIT_ROLES.has(membership.role),
      },
    };
  }

  async get(
    auth: AuthenticatedUser,
    businessId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveReadableMembership(auth, organizationId);
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        organizationId: membership.organizationId,
      },
      include: BUSINESS_DETAIL_INCLUDE,
    });

    if (!business) {
      throw new NotFoundException('Business was not found in this organization.');
    }

    return { business: this.serializeBusiness(business, membership) };
  }

  async list(auth: AuthenticatedUser, query: ListBusinessesQueryDto) {
    const membership = this.resolveReadableMembership(auth, query.organizationId);
    const search = query.search?.trim();
    const where: Prisma.BusinessWhereInput = {
      organizationId: membership.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.operationType ? { operationType: query.operationType } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { primaryClient: { displayName: { contains: search, mode: 'insensitive' } } },
              { property: { title: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const businesses = await this.prisma.business.findMany({
      where,
      include: BUSINESS_LIST_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    const businessItems = businesses as BusinessListItem[];

    return {
      organization: this.serializeOrganization(membership),
      businesses: businessItems.map((business: BusinessListItem) =>
        this.serializeBusinessListItem(business, membership),
      ),
      permissionHints: {
        canViewCommissions: BUSINESS_COMMISSION_ROLES.has(membership.role),
        canCommit: BUSINESS_COMMIT_ROLES.has(membership.role),
      },
    };
  }

  async createDraft(auth: AuthenticatedUser, dto: CreateBusinessDraftDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const currency = normalizeCurrency(dto.currency);
    const mode = dto.mode ?? BusinessMode.SIMPLE;
    const initialData = sanitizeJson({
      mode,
      operationType: dto.operationType,
      currency,
      title: cleanText(dto.title),
      participants: [],
      clauses: [],
      paymentPlan: {
        preset: 'CASH',
        totalAmountCents: '0',
        frequency: PaymentFrequency.NONE,
        roundingStrategy: RoundingStrategy.LAST_INSTALLMENT,
      },
      commissionPlan: {
        commissionBase: CommissionBase.NEGOTIATED_PRICE,
        simpleCommissionBasisPoints: 300,
        rules: [],
      },
      automations: {
        paymentReminders: true,
        signatureTask: true,
        reviewTask: true,
        commissionReminders: true,
      },
    });

    const business = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.business.create({
          data: {
            code: await this.nextBusinessCode(tx, membership.organizationId),
            createdByUserId: auth.id,
            currency,
            draftData: initialData,
            mode,
            operationType: dto.operationType,
            organizationId: membership.organizationId,
            title: cleanText(dto.title),
            updatedByUserId: auth.id,
          },
          include: BUSINESS_DETAIL_INCLUDE,
        });

        await tx.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: auth.id,
            action: 'businesses.draft.create',
            targetType: 'business',
            targetId: created.id,
            metadata: {
              mode,
              operationType: dto.operationType,
              title: cleanText(dto.title),
            },
          },
        });

        return created;
      },
      REMOTE_TRANSACTION_OPTIONS,
    );

    return { business: this.serializeBusiness(business, membership) };
  }

  async updateDraft(
    auth: AuthenticatedUser,
    businessId: string,
    dto: UpdateBusinessDraftDto,
  ) {
    const business = await this.loadDraftForWrite(auth, businessId);

    if (dto.version !== undefined && dto.version !== business.version) {
      throw new ConflictException('Business draft has changed. Reload before saving.');
    }

    const currentData = objectValue(business.draftData);
    const nextData = sanitizeJson(deepMerge(currentData, dto.data));
    const updateData = this.businessUpdateFromDraft(nextData, auth.id);

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.business.update({
          where: { id: business.id },
          data: {
            ...updateData,
            draftData: nextData,
            updatedByUserId: auth.id,
            version: { increment: 1 },
          },
          include: BUSINESS_DETAIL_INCLUDE,
        });

        await tx.auditLog.create({
          data: {
            organizationId: business.organizationId,
            actorUserId: auth.id,
            action: 'businesses.draft.update',
            targetType: 'business',
            targetId: business.id,
            metadata: {
              previousVersion: business.version,
              nextVersion: updated.version,
            },
          },
        });

        return updated;
      },
      REMOTE_TRANSACTION_OPTIONS,
    );

    const membership = this.resolveReadableMembership(auth, result.organizationId);

    return { business: this.serializeBusiness(result, membership) };
  }

  async calculatePaymentPlan(
    auth: AuthenticatedUser,
    businessId: string,
    dto: BusinessCalculationRequestDto,
  ) {
    const business = await this.loadBusinessForRead(auth, businessId);
    const data = this.resolveCalculationData(business, dto.data);

    return {
      paymentPlan: this.calculatePaymentPlanFromData(data),
    };
  }

  async calculateCommissions(
    auth: AuthenticatedUser,
    businessId: string,
    dto: BusinessCalculationRequestDto,
  ) {
    const business = await this.loadBusinessForRead(auth, businessId);
    const data = this.resolveCalculationData(business, dto.data);

    return {
      commissionPlan: this.calculateCommissionPlanFromData(data),
    };
  }

  async validateDraft(
    auth: AuthenticatedUser,
    businessId: string,
    dto: BusinessCalculationRequestDto,
  ) {
    const business = await this.loadBusinessForRead(auth, businessId);
    const data = this.resolveCalculationData(business, dto.data);
    const validation = await this.validateData(business, data, { forCommit: false });

    return { validation };
  }

  async preview(
    auth: AuthenticatedUser,
    businessId: string,
    dto: BusinessCalculationRequestDto,
  ) {
    const business = await this.loadDraftForWrite(auth, businessId);
    const data = this.resolveCalculationData(business, dto.data);
    const preview = await this.buildPreview(business, data, { forCommit: false });

    await this.prisma.business.update({
      where: { id: business.id },
      data: {
        lastPreview: sanitizeJson(preview),
        updatedByUserId: auth.id,
      },
    });

    return { preview };
  }

  async commit(
    auth: AuthenticatedUser,
    businessId: string,
    dto: BusinessCommitDto,
  ) {
    const membership = this.resolveCommitMembership(auth);

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const business = await tx.business.findFirst({
          where: {
            id: businessId,
            organizationId: membership.organizationId,
          },
          include: BUSINESS_DETAIL_INCLUDE,
        });

        if (!business) {
          throw new NotFoundException('Business draft was not found.');
        }

        if (dto.idempotencyKey && business.idempotencyKey === dto.idempotencyKey) {
          return { business: this.serializeBusiness(business, membership) };
        }

        if (business.status !== BusinessStatus.DRAFT) {
          throw new ConflictException('Only draft businesses can be committed.');
        }

        if (dto.version !== undefined && dto.version !== business.version) {
          throw new ConflictException('Business draft has changed. Reload before committing.');
        }

        const data = objectValue(business.draftData);
        const preview = await this.buildPreview(business, data, {
          forCommit: true,
          tx,
        });
        const blockingErrors = preview.validation.filter(
          (item) => item.level === 'ERROR',
        );

        if (blockingErrors.length > 0) {
          throw new BadRequestException({
            message: 'Business cannot be committed with blocking validation errors.',
            validation: blockingErrors,
          });
        }

        await this.verifyPropertyAvailability(tx, business, data);
        await this.clearDraftChildren(tx, business.id);

        const participants = await this.createParticipants(tx, business, data);
        const contract = await this.createContract(tx, business, data);
        const paymentPlan = await this.createPaymentPlan(
          tx,
          business,
          data,
          preview.paymentPlan,
        );
        const commissionPlan = await this.createCommissionPlan(
          tx,
          business,
          data,
          preview.commissionPlan,
          participants.keyToId,
        );
        await this.createFees(tx, business, data);
        await this.createScheduledActions(tx, business, data, {
          contractId: contract?.id ?? null,
          paymentLineIds: paymentPlan.lineIds,
        });
        await this.createSnapshots(tx, business, data, preview, auth.id);

        const nextStatus =
          business.mode === BusinessMode.ADVANCED ||
          preview.validation.some(
            (item) =>
              item.level === 'WARNING' &&
              ['material_approval', 'contract_review'].includes(item.code),
          )
            ? BusinessStatus.PENDING_REVIEW
            : BusinessStatus.APPROVED;

        const updateData = this.businessUpdateFromDraft(data, auth.id);
        const updated = await tx.business.update({
          where: { id: business.id },
          data: {
            ...updateData,
            idempotencyKey: cleanText(dto.idempotencyKey),
            lastPreview: sanitizeJson(preview),
            status: nextStatus,
            committedAt: new Date(),
            updatedByUserId: auth.id,
            version: { increment: 1 },
          },
          include: BUSINESS_DETAIL_INCLUDE,
        });

        await tx.auditLog.create({
          data: {
            organizationId: business.organizationId,
            actorUserId: auth.id,
            action: 'businesses.commit',
            targetType: 'business',
            targetId: business.id,
            metadata: {
              nextStatus,
              paymentPlanId: paymentPlan.id,
              commissionPlanId: commissionPlan?.id ?? null,
              contractId: contract?.id ?? null,
              validation: preview.validation,
            },
          },
        });

        return {
          business: this.serializeBusiness(updated, membership),
          preview,
        };
      },
      REMOTE_TRANSACTION_OPTIONS,
    );
  }

  private async ensureDefaultContractTypes(organizationId: string) {
    for (const contractType of DEFAULT_CONTRACT_TYPES) {
      const existing = await this.prisma.contractType.findFirst({
        where: {
          organizationId,
          name: contractType.name,
          operationType: contractType.operationType,
        },
        select: { id: true },
      });

      if (!existing) {
        await this.prisma.contractType.create({
          data: {
            organizationId,
            ...contractType,
          },
        });
      }
    }
  }

  private async buildPreview(
    business: BusinessWithDetails,
    data: Record<string, unknown>,
    options: { forCommit: boolean; tx?: Prisma.TransactionClient },
  ) {
    const paymentPlan = this.calculatePaymentPlanFromData(data);
    const commissionPlan = this.calculateCommissionPlanFromData(data);
    const validation = await this.validateData(business, data, {
      forCommit: options.forCommit,
      paymentPlan,
      commissionPlan,
      tx: options.tx,
    });
    const participants = participantDraftsFromData(data);
    const clauses = clauseDraftsFromData(data);
    const fees = feeDraftsFromData(data);
    const scheduledActionsCount =
      paymentPlan.lines.filter((line) => line.dueDate).length +
      (asBoolean(objectValue(data.automations).signatureTask, true) ? 1 : 0) +
      clauses.filter((clause) => clause.requiresApproval).length;

    return {
      entitiesToCreate: [
        { entity: 'business', count: 1 },
        { entity: 'business_participants', count: participants.length },
        { entity: 'business_contracts', count: cleanText(stringValue(data.contractTypeId)) ? 1 : 0 },
        { entity: 'business_contract_clauses', count: clauses.length },
        { entity: 'payment_plans', count: 1 },
        { entity: 'payment_schedule_lines', count: paymentPlan.lines.length },
        { entity: 'commission_plans', count: commissionPlan.allocations.length > 0 ? 1 : 0 },
        { entity: 'commission_allocations', count: commissionPlan.allocations.length },
        { entity: 'business_fees', count: fees.length },
        { entity: 'scheduled_actions', count: scheduledActionsCount },
        { entity: 'calculation_snapshots', count: 3 },
      ],
      impactReports: [
        'Negocios por estado',
        'Cobranza futura',
        'Comisiones pendientes',
        'Ventas por agente',
        'Contratos pendientes',
      ],
      paymentPlan,
      commissionPlan,
      validation,
    };
  }

  private async validateData(
    business: BusinessWithDetails,
    data: Record<string, unknown>,
    options: {
      forCommit: boolean;
      paymentPlan?: ReturnType<typeof calculatePaymentPlan>;
      commissionPlan?: ReturnType<typeof calculateCommissionPlan>;
      tx?: Prisma.TransactionClient;
    },
  ): Promise<ValidationItem[]> {
    const validation: ValidationItem[] = [];
    const paymentPlan =
      options.paymentPlan ?? this.calculatePaymentPlanFromData(data);
    const commissionPlan =
      options.commissionPlan ?? this.calculateCommissionPlanFromData(data);
    const participants = participantDraftsFromData(data);
    const clientRoles: BusinessParticipantRole[] = [
        BusinessParticipantRole.BUYER,
        BusinessParticipantRole.TENANT,
        BusinessParticipantRole.LANDLORD,
        BusinessParticipantRole.SELLER,
    ];
    const clientParticipants = participants.filter((participant) =>
      clientRoles.includes(
        enumValue(BusinessParticipantRole, participant.role, BusinessParticipantRole.OTHER),
      ),
    );
    const currency = normalizeCurrency(stringValue(data.currency));
    const contractTypeId = cleanText(stringValue(data.contractTypeId));
    const propertyId = cleanText(stringValue(data.propertyId));
    const financial = objectValue(data.financial);
    const payableAmount = centsFromUnknown(
      financial.payableAmountCents ?? data.payableAmountCents,
    );

    if (options.forCommit && clientParticipants.length === 0) {
      validation.push({
        level: 'ERROR',
        code: 'missing_client',
        message: 'Debe existir al menos un cliente para confirmar el negocio.',
      });
    } else if (clientParticipants.length === 0) {
      validation.push({
        level: 'WARNING',
        code: 'missing_client_draft',
        message: 'El borrador aun no tiene cliente principal.',
      });
    }

    if (options.forCommit && !contractTypeId) {
      validation.push({
        level: 'ERROR',
        code: 'missing_contract_type',
        message: 'El tipo de contrato es obligatorio para confirmar.',
      });
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      validation.push({
        level: 'ERROR',
        code: 'invalid_currency',
        message: 'La moneda debe usar codigo ISO de 3 letras.',
      });
    }

    if (options.forCommit && (!payableAmount || payableAmount <= 0n)) {
      validation.push({
        level: 'ERROR',
        code: 'missing_payable_amount',
        message: 'El monto pagable debe ser mayor que cero.',
      });
    }

    for (const error of paymentPlan.errors) {
      validation.push({
        level: 'ERROR',
        code: 'payment_plan_error',
        message: error,
      });
    }

    for (const warning of paymentPlan.warnings) {
      validation.push({
        level: 'WARNING',
        code: 'payment_plan_warning',
        message: warning,
      });
    }

    for (const error of commissionPlan.errors) {
      validation.push({
        level: 'ERROR',
        code: 'commission_error',
        message: error,
      });
    }

    for (const warning of commissionPlan.warnings) {
      validation.push({
        level: 'WARNING',
        code: 'commission_warning',
        message: warning,
      });
    }

    const expectedSignatureDate = stringValue(data.expectedSignatureDate);
    const expectedClosingDate = stringValue(data.expectedClosingDate);

    if (
      expectedSignatureDate &&
      expectedClosingDate &&
      expectedClosingDate < expectedSignatureDate
    ) {
      validation.push({
        level: 'ERROR',
        code: 'invalid_dates',
        message: 'La fecha de cierre no puede ser anterior a la firma.',
      });
    }

    const contractType = contractTypeId
      ? await (options.tx ?? this.prisma).contractType.findFirst({
          where: {
            id: contractTypeId,
            organizationId: business.organizationId,
            isActive: true,
          },
        })
      : null;

    if (contractType?.requiresProperty && !propertyId) {
      validation.push({
        level: 'ERROR',
        code: 'contract_requires_property',
        message: 'Este tipo de contrato requiere seleccionar un inmueble.',
      });
    } else if (!propertyId) {
      validation.push({
        level: 'WARNING',
        code: 'missing_property',
        message: 'El negocio se guardara sin inmueble definido.',
      });
    }

    if (contractType?.requiresCommissionPlan && commissionPlan.allocations.length === 0) {
      validation.push({
        level: 'ERROR',
        code: 'missing_commission_plan',
        message: 'Este contrato requiere un plan de comisiones.',
      });
    }

    if (propertyId) {
      const availability = await this.propertyAvailability(
        options.tx ?? this.prisma,
        business,
        propertyId,
      );

      if (!availability.available) {
        validation.push({
          level: 'ERROR',
          code: 'property_unavailable',
          message: availability.message,
        });
      }
    }

    const duplicateParticipants = duplicateParticipantKeys(participants);

    for (const label of duplicateParticipants) {
      validation.push({
        level: 'ERROR',
        code: 'duplicate_participant',
        message: `Participante duplicado en el mismo rol: ${label}.`,
      });
    }

    for (const participant of clientParticipants) {
      if (!participant.clientId && !participant.documentId) {
        validation.push({
          level: 'WARNING',
          code: 'client_without_document',
          message: `${participant.displayName ?? 'Cliente'} no tiene documento asociado.`,
        });
      }
    }

    for (const clause of clauseDraftsFromData(data)) {
      if (clause.requiresApproval) {
        validation.push({
          level: 'WARNING',
          code: clause.clauseType === ContractClauseType.MATERIAL_ESCALATION
            ? 'material_approval'
            : 'contract_review',
          message: `${clause.title ?? 'Condicion contractual'} requiere aprobacion.`,
        });
      }

      if (
        clause.clauseType === ContractClauseType.ASSIGNMENT_FEE &&
        !clause.createsReceivable
      ) {
        validation.push({
          level: 'WARNING',
          code: 'assignment_fee_without_charge',
          message: 'El costo de cesion queda como condicion, pero no crea cargo inmediato.',
        });
      }
    }

    validation.push({
      level: 'INFO',
      code: 'scheduled_payment_actions',
      message: `Se generaran ${paymentPlan.lines.filter((line) => line.dueDate).length} recordatorios de pago.`,
    });

    return validation;
  }

  private calculatePaymentPlanFromData(data: Record<string, unknown>) {
    const financial = objectValue(data.financial);
    const plan = objectValue(data.paymentPlan);
    const totalAmount =
      plan.totalAmountCents ??
      financial.payableAmountCents ??
      financial.totalContractAmountCents ??
      data.payableAmountCents ??
      '0';
    const input: PaymentPlanInput = {
      preset: enumLike<PaymentPlanPreset>(
        [
          'CASH',
          'RESERVATION_SIGNATURE_BALANCE',
          'SIGNATURE_INSTALLMENTS',
          'REGULAR_INSTALLMENTS',
          'MILESTONE_BASED',
          'CUSTOM',
        ],
        plan.preset,
        'CASH',
      ),
      totalAmountCents: totalAmount as string,
      closingDate: stringValue(plan.closingDate) ?? stringValue(data.expectedClosingDate),
      currency: normalizeCurrency(stringValue(data.currency)),
      dueDay: numberValue(plan.dueDay),
      finalAmountCents: plan.finalAmountCents as string | undefined,
      frequency: enumValue(PaymentFrequency, plan.frequency, PaymentFrequency.NONE),
      installmentCount: numberValue(plan.installmentCount),
      milestones: lineArray(plan.milestones),
      reservationAmountCents: plan.reservationAmountCents as string | undefined,
      roundingStrategy: enumValue(
        RoundingStrategy,
        plan.roundingStrategy,
        RoundingStrategy.LAST_INSTALLMENT,
      ),
      signatureAmountCents: plan.signatureAmountCents as string | undefined,
      signatureDate: stringValue(plan.signatureDate) ?? stringValue(data.expectedSignatureDate),
      specialLines: lineArray(plan.specialLines),
      startDate: stringValue(plan.startDate),
    };

    return calculatePaymentPlan(input);
  }

  private calculateCommissionPlanFromData(data: Record<string, unknown>) {
    const financial = objectValue(data.financial);
    const plan = objectValue(data.commissionPlan);
    const participants = participantDraftsFromData(data);
    const baseAmount =
      plan.baseAmountCents ??
      financial.commissionBaseAmountCents ??
      financial.negotiatedPriceCents ??
      financial.totalContractAmountCents ??
      financial.payableAmountCents ??
      '0';
    const primaryAgent = participants.find(
      (participant) =>
        enumValue(BusinessParticipantRole, participant.role, BusinessParticipantRole.OTHER) ===
        BusinessParticipantRole.PRIMARY_AGENT,
    );
    const rules = ruleArray(plan.rules);

    if (
      enumValue(BusinessMode, data.mode, BusinessMode.SIMPLE) === BusinessMode.SIMPLE &&
      rules.length === 0 &&
      primaryAgent
    ) {
      rules.push({
        appliesAfterDeductions: false,
        capAmountCents: undefined,
        participantKey: participantKey(primaryAgent, 0),
        recipientType: CommissionRecipientType.AGENT,
        label: primaryAgent.displayName ?? 'Agente principal',
        calculationType: CommissionCalculationType.PERCENTAGE_OF_SALE,
        fixedAmountCents: undefined,
        percentageBasisPoints: numberValue(plan.simpleCommissionBasisPoints) ?? 300,
        releaseTrigger:
          enumValue(
            CommissionReleaseTrigger,
            plan.releaseTrigger,
            CommissionReleaseTrigger.ON_CLOSING,
          ),
      });
    }

    const input: CommissionPlanInput = {
      baseAmountCents: baseAmount as string,
      collectedAmountCents: plan.collectedAmountCents as string | undefined,
      commissionBase: enumValue(
        CommissionBase,
        plan.commissionBase,
        CommissionBase.NEGOTIATED_PRICE,
      ),
      currency: normalizeCurrency(stringValue(data.currency)),
      mode: enumValue(BusinessMode, data.mode, BusinessMode.SIMPLE),
      rules,
      simpleCommissionBasisPoints: numberValue(plan.simpleCommissionBasisPoints),
    };

    return calculateCommissionPlan(input);
  }

  private async createParticipants(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
  ) {
    const keyToId = new Map<string, string>();
    const participants = participantDraftsFromData(data);

    for (const [index, participant] of participants.entries()) {
      const hydrated = await this.hydrateParticipant(tx, business, participant);
      const created = await tx.businessParticipant.create({
        data: {
          businessId: business.id,
          clientId: hydrated.clientId,
          commissionEligible: hydrated.commissionEligible,
          displayName: hydrated.displayName,
          documentId: hydrated.documentId,
          email: hydrated.email,
          isPrimary: hydrated.isPrimary,
          metadata: sanitizeJson(hydrated.metadata),
          organizationId: business.organizationId,
          ownershipPercentageBps: hydrated.ownershipPercentageBps,
          partyType: hydrated.partyType,
          phone: hydrated.phone,
          realEstateAgentId: hydrated.realEstateAgentId,
          receivesNotifications: hydrated.receivesNotifications,
          role: hydrated.role,
          userId: hydrated.userId,
        },
      });

      keyToId.set(participantKey(participant, index), created.id);
    }

    return { keyToId };
  }

  private async hydrateParticipant(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    participant: DraftParticipant,
  ) {
    const role = enumValue(
      BusinessParticipantRole,
      participant.role,
      BusinessParticipantRole.OTHER,
    );
    let partyType = enumValue(
      BusinessPartyType,
      participant.partyType,
      BusinessPartyType.EXTERNAL,
    );
    let displayName = cleanText(participant.displayName);
    let email = cleanText(participant.email);
    let phone = cleanText(participant.phone);

    if (participant.clientId) {
      const client = await tx.client.findFirst({
        where: {
          id: participant.clientId,
          organizationId: business.organizationId,
        },
        select: {
          displayName: true,
          email: true,
          phone: true,
          legalId: true,
        },
      });

      if (!client) {
        throw new BadRequestException('Client participant does not belong to this organization.');
      }

      partyType = BusinessPartyType.CLIENT;
      displayName = displayName ?? client.displayName;
      email = email ?? client.email;
      phone = phone ?? client.phone;
      participant.documentId = participant.documentId ?? client.legalId ?? undefined;
    }

    if (participant.realEstateAgentId) {
      const agent = await tx.realEstateAgent.findFirst({
        where: {
          id: participant.realEstateAgentId,
          organizationId: business.organizationId,
          isActive: true,
        },
        select: {
          displayName: true,
          email: true,
          phone: true,
        },
      });

      if (!agent) {
        throw new BadRequestException('Agent participant does not belong to this organization.');
      }

      partyType = BusinessPartyType.REAL_ESTATE_AGENT;
      displayName = displayName ?? agent.displayName;
      email = email ?? agent.email;
      phone = phone ?? agent.phone;
    }

    if (participant.userId) {
      const membership = await tx.membership.findFirst({
        where: {
          organizationId: business.organizationId,
          userId: participant.userId,
          status: MembershipStatus.ACTIVE,
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!membership) {
        throw new BadRequestException('User participant is not active in this organization.');
      }

      partyType = BusinessPartyType.USER;
      displayName =
        displayName ??
        [membership.user.firstName, membership.user.lastName].filter(Boolean).join(' ');
      email = email ?? membership.user.email;
    }

    if (!displayName) {
      throw new BadRequestException('Participant display name is required.');
    }

    return {
      clientId: cleanText(participant.clientId),
      commissionEligible:
        participant.commissionEligible ??
        ([
          BusinessParticipantRole.PRIMARY_AGENT,
          BusinessParticipantRole.CO_AGENT,
          BusinessParticipantRole.REFERRER,
          BusinessParticipantRole.BROKER,
        ] as BusinessParticipantRole[]).includes(role),
      displayName,
      documentId: cleanText(participant.documentId),
      email,
      isPrimary: participant.isPrimary ?? role === BusinessParticipantRole.PRIMARY_AGENT,
      metadata: participant.metadata ?? {},
      organizationId: business.organizationId,
      ownershipPercentageBps: numberValue(participant.ownershipPercentageBps),
      partyType,
      phone,
      realEstateAgentId: cleanText(participant.realEstateAgentId),
      receivesNotifications: participant.receivesNotifications ?? true,
      role,
      userId: cleanText(participant.userId),
    };
  }

  private async createContract(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
  ) {
    const contractTypeId = cleanText(stringValue(data.contractTypeId));

    if (!contractTypeId) {
      return null;
    }

    const contractData = objectValue(data.contract);
    const clauses = clauseDraftsFromData(data);
    const contract = await tx.businessContract.create({
      data: {
        businessId: business.id,
        contractTypeId,
        createdByUserId: business.createdByUserId,
        customConditions: sanitizeJson(contractData.customConditions ?? {}),
        legalNotes: cleanText(stringValue(contractData.legalNotes)),
        selectedClauses: sanitizeJson(clauses),
        status: BusinessContractStatus.DRAFT,
        templateId: cleanText(stringValue(contractData.templateId)),
        updatedByUserId: business.updatedByUserId,
        version: 1,
      },
    });

    for (const clause of clauses) {
      await tx.businessContractClause.create({
        data: {
          amountCents: centsFromUnknown(clause.amountCents),
          appliesTo: enumValue(ClauseAppliesTo, clause.appliesTo, ClauseAppliesTo.OTHER),
          businessContractId: contract.id,
          calculationType: enumValue(
            ClauseCalculationType,
            clause.calculationType,
            ClauseCalculationType.NONE,
          ),
          clauseType: enumValue(
            ContractClauseType,
            clause.clauseType,
            ContractClauseType.OTHER,
          ),
          createsReceivable: clause.createsReceivable ?? false,
          description: cleanText(clause.description),
          metadata: sanitizeJson(clause.metadata ?? {}),
          percentageBps: numberValue(clause.percentageBps),
          requiresApproval: clause.requiresApproval ?? false,
          title: requiredText(clause.title, 'Contract clause title is required.'),
          triggerEvent: enumValue(
            BusinessTriggerEvent,
            clause.triggerEvent,
            BusinessTriggerEvent.MANUAL,
          ),
        },
      });
    }

    return contract;
  }

  private async createPaymentPlan(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
    calculation: ReturnType<typeof calculatePaymentPlan>,
  ) {
    const planData = objectValue(data.paymentPlan);
    const preset = enumLike<PaymentPlanPreset>(
      [
        'CASH',
        'RESERVATION_SIGNATURE_BALANCE',
        'SIGNATURE_INSTALLMENTS',
        'REGULAR_INSTALLMENTS',
        'MILESTONE_BASED',
        'CUSTOM',
      ],
      planData.preset,
      'CASH',
    );
    const paymentPlan = await tx.paymentPlan.create({
      data: {
        businessId: business.id,
        createdByUserId: business.createdByUserId,
        currency: calculation.currency,
        differenceCents: toCents(calculation.differenceCents),
        dueDay: numberValue(planData.dueDay),
        endDate: toDate(planData.endDate),
        frequency: enumValue(PaymentFrequency, planData.frequency, PaymentFrequency.NONE),
        generatedTotalCents: toCents(calculation.generatedTotalCents),
        graceDays: numberValue(planData.graceDays),
        notes: cleanText(stringValue(planData.notes)),
        numberOfInstallments: numberValue(planData.installmentCount),
        planType: PAYMENT_PLAN_TYPE_BY_PRESET[preset],
        roundingStrategy: enumValue(
          RoundingStrategy,
          calculation.roundingStrategy,
          RoundingStrategy.LAST_INSTALLMENT,
        ),
        startDate: toDate(planData.startDate),
        status: PaymentPlanStatus.ACTIVE,
        totalAmountCents: toCents(calculation.totalAmountCents),
        updatedByUserId: business.updatedByUserId,
      },
    });
    const lineIds: string[] = [];

    for (const line of calculation.lines) {
      const created = await tx.paymentScheduleLine.create({
        data: {
          amountCents: toCents(line.amountCents),
          businessId: business.id,
          dueDate: toDate(line.dueDate),
          dueEvent: cleanText(line.dueEvent),
          isManual: line.isManual,
          label: line.label,
          lineType: enumValue(
            PaymentScheduleLineType,
            line.lineType,
            PaymentScheduleLineType.OTHER,
          ),
          metadata: sanitizeJson({ source: line.source }),
          paymentPlanId: paymentPlan.id,
          percentageBps: numberValue(line.percentageBasisPoints),
          sequence: line.sequence,
          source: enumValue(
            PaymentScheduleLineSource,
            line.source,
            PaymentScheduleLineSource.GENERATED,
          ),
          status: PaymentScheduleLineStatus.PENDING,
        },
      });

      lineIds.push(created.id);
    }

    return { id: paymentPlan.id, lineIds };
  }

  private async createCommissionPlan(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
    calculation: ReturnType<typeof calculateCommissionPlan>,
    participantIds: Map<string, string>,
  ) {
    if (calculation.allocations.length === 0) {
      return null;
    }

    const planData = objectValue(data.commissionPlan);
    const rules = ruleArray(planData.rules);
    const commissionPlan = await tx.commissionPlan.create({
      data: {
        baseAmountCents: toCents(calculation.baseAmountCents),
        businessId: business.id,
        commissionBase: enumValue(
          CommissionBase,
          planData.commissionBase,
          CommissionBase.NEGOTIATED_PRICE,
        ),
        createdByUserId: business.createdByUserId,
        currency: calculation.currency,
        mode: enumValue(CommissionPlanMode, data.mode, CommissionPlanMode.SIMPLE),
        releasePolicy: releasePolicyFromTrigger(
          enumValue(
            CommissionReleaseTrigger,
            planData.releaseTrigger,
            CommissionReleaseTrigger.ON_CLOSING,
          ),
        ),
        status: CommissionPlanStatus.ACTIVE,
        totalCommissionAmountCents: toCents(calculation.totalCommissionAmountCents),
        updatedByUserId: business.updatedByUserId,
      },
    });

    for (const [index, allocation] of calculation.allocations.entries()) {
      const rule = rules.find(
        (item) =>
          item.participantKey === allocation.participantKey &&
          item.label === allocation.label &&
          item.calculationType === allocation.calculationType,
      );

      await tx.commissionAllocation.create({
        data: {
          appliesAfterDeductions: rule?.appliesAfterDeductions ?? false,
          businessId: business.id,
          calculationType: enumValue(
            CommissionCalculationType,
            allocation.calculationType,
            CommissionCalculationType.FIXED_AMOUNT,
          ),
          capAmountCents: centsFromUnknown(rule?.capAmountCents),
          commissionPlanId: commissionPlan.id,
          fixedAmountCents: centsFromUnknown(rule?.fixedAmountCents),
          label: allocation.label,
          metadata: sanitizeJson({ participantKey: allocation.participantKey }),
          paidAmountCents: 0n,
          participantId: participantIds.get(allocation.participantKey) ?? null,
          payableAmountCents: toCents(allocation.payableAmountCents),
          percentageBps: numberValue(rule?.percentageBasisPoints),
          priority: index,
          recipientType: enumValue(
            CommissionRecipientType,
            allocation.recipientType,
            CommissionRecipientType.OTHER,
          ),
          releaseTrigger: enumValue(
            CommissionReleaseTrigger,
            allocation.releaseTrigger,
            CommissionReleaseTrigger.ON_CLOSING,
          ),
          status: CommissionAllocationStatus.PENDING,
        },
      });
    }

    return { id: commissionPlan.id };
  }

  private async createFees(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
  ) {
    for (const fee of feeDraftsFromData(data)) {
      await tx.businessFee.create({
        data: {
          amountCents: centsFromUnknown(fee.amountCents) ?? 0n,
          businessId: business.id,
          calculationBaseCents: centsFromUnknown(fee.calculationBaseCents),
          currency: normalizeCurrency(fee.currency),
          feeType: enumValueString(fee.feeType, 'OTHER'),
          includedInContractTotal: fee.includedInContractTotal ?? false,
          includedInPaymentPlan: fee.includedInPaymentPlan ?? false,
          metadata: sanitizeJson(fee.metadata ?? {}),
          name: requiredText(fee.name, 'Fee name is required.'),
          payerRole: enumValueString(fee.payerRole, 'OTHER'),
          percentageBps: numberValue(fee.percentageBps),
          triggerEvent: enumValue(
            BusinessTriggerEvent,
            fee.triggerEvent,
            BusinessTriggerEvent.MANUAL,
          ),
        },
      });
    }
  }

  private async createScheduledActions(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
    created: { contractId: string | null; paymentLineIds: string[] },
  ) {
    const automations = objectValue(data.automations);
    const paymentPlan = this.calculatePaymentPlanFromData(data);

    if (asBoolean(automations.paymentReminders, true)) {
      for (const [index, line] of paymentPlan.lines.entries()) {
        if (!line.dueDate) {
          continue;
        }

        await tx.scheduledAction.create({
          data: {
            businessId: business.id,
            eventType: ScheduledActionType.PAYMENT_DUE,
            metadata: sanitizeJson({ label: line.label, sequence: line.sequence }),
            relatedEntityId: created.paymentLineIds[index] ?? null,
            relatedEntityType: 'payment_schedule_line',
            scheduledFor: scheduledAt(line.dueDate),
            status: ScheduledActionStatus.PENDING,
          },
        });
      }
    }

    const expectedSignatureDate = stringValue(data.expectedSignatureDate);

    if (asBoolean(automations.signatureTask, true) && expectedSignatureDate) {
      await tx.scheduledAction.create({
        data: {
          businessId: business.id,
          eventType: ScheduledActionType.SIGNATURE_DUE,
          metadata: sanitizeJson({ contractId: created.contractId }),
          relatedEntityId: created.contractId,
          relatedEntityType: 'business_contract',
          scheduledFor: scheduledAt(expectedSignatureDate),
          status: ScheduledActionStatus.PENDING,
        },
      });
    }

    for (const clause of clauseDraftsFromData(data).filter(
      (item) => item.requiresApproval,
    )) {
      await tx.scheduledAction.create({
        data: {
          businessId: business.id,
          eventType: ScheduledActionType.APPROVAL_REQUIRED,
          metadata: sanitizeJson({
            clauseType: clause.clauseType,
            title: clause.title,
          }),
          relatedEntityId: created.contractId,
          relatedEntityType: 'business_contract',
          scheduledFor: new Date(),
          status: ScheduledActionStatus.PENDING,
        },
      });
    }
  }

  private async createSnapshots(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
    preview: Awaited<ReturnType<BusinessesService['buildPreview']>>,
    userId: string,
  ) {
    const snapshots = [
      {
        snapshotType: CalculationSnapshotType.PAYMENT_PLAN,
        inputJson: this.paymentPlanInputForSnapshot(data),
        outputJson: preview.paymentPlan,
      },
      {
        snapshotType: CalculationSnapshotType.COMMISSION_PLAN,
        inputJson: this.commissionPlanInputForSnapshot(data),
        outputJson: preview.commissionPlan,
      },
      {
        snapshotType: CalculationSnapshotType.FULL_PREVIEW,
        inputJson: data,
        outputJson: preview,
      },
    ];

    for (const snapshot of snapshots) {
      await tx.calculationSnapshot.create({
        data: {
          businessId: business.id,
          createdByUserId: userId,
          engineVersion: 'business-engine-v1',
          hash: snapshotHash(snapshot.inputJson, snapshot.outputJson),
          inputJson: sanitizeJson(snapshot.inputJson),
          outputJson: sanitizeJson(snapshot.outputJson),
          snapshotType: snapshot.snapshotType,
        },
      });
    }
  }

  private paymentPlanInputForSnapshot(data: Record<string, unknown>) {
    return {
      currency: normalizeCurrency(stringValue(data.currency)),
      paymentPlan: objectValue(data.paymentPlan),
      financial: objectValue(data.financial),
    };
  }

  private commissionPlanInputForSnapshot(data: Record<string, unknown>) {
    return {
      currency: normalizeCurrency(stringValue(data.currency)),
      commissionPlan: objectValue(data.commissionPlan),
      financial: objectValue(data.financial),
      participants: participantDraftsFromData(data),
    };
  }

  private async verifyPropertyAvailability(
    tx: Prisma.TransactionClient,
    business: BusinessWithDetails,
    data: Record<string, unknown>,
  ) {
    const propertyId = cleanText(stringValue(data.propertyId));

    if (!propertyId) {
      return;
    }

    const availability = await this.propertyAvailability(tx, business, propertyId);

    if (!availability.available) {
      throw new ConflictException(availability.message);
    }
  }

  private async propertyAvailability(
    client: Prisma.TransactionClient | PrismaService,
    business: BusinessWithDetails,
    propertyId: string,
  ) {
    const property = await client.property.findFirst({
      where: {
        id: propertyId,
        organizationId: business.organizationId,
      },
      select: { id: true, status: true },
    });

    if (!property) {
      return {
        available: false,
        message: 'El inmueble no pertenece a esta organizacion.',
      };
    }

    if (UNAVAILABLE_PROPERTY_STATUSES.has(property.status)) {
      return {
        available: false,
        message: `El inmueble no esta disponible. Estado actual: ${property.status}.`,
      };
    }

    const blockingBusiness = await client.business.findFirst({
      where: {
        id: { not: business.id },
        organizationId: business.organizationId,
        propertyId,
        status: { in: PROPERTY_BLOCKING_BUSINESS_STATUSES },
      },
      select: { id: true, code: true, status: true },
    });

    if (blockingBusiness) {
      return {
        available: false,
        message: `El inmueble ya esta bloqueado por el negocio ${blockingBusiness.code ?? blockingBusiness.id}.`,
      };
    }

    return { available: true, message: 'Disponible' };
  }

  private async clearDraftChildren(
    tx: Prisma.TransactionClient,
    businessId: string,
  ) {
    const contracts = await tx.businessContract.findMany({
      where: { businessId },
      select: { id: true },
    });
    const contractIds = (contracts as Array<{ id: string }>).map(
      (contract) => contract.id,
    );

    await tx.commissionAllocation.deleteMany({ where: { businessId } });
    await tx.commissionPlan.deleteMany({ where: { businessId } });
    await tx.paymentScheduleLine.deleteMany({ where: { businessId } });
    await tx.paymentPlan.deleteMany({ where: { businessId } });
    await tx.businessFee.deleteMany({ where: { businessId } });
    await tx.scheduledAction.deleteMany({ where: { businessId } });
    await tx.calculationSnapshot.deleteMany({ where: { businessId } });

    if (contractIds.length > 0) {
      await tx.businessContractClause.deleteMany({
        where: { businessContractId: { in: contractIds } },
      });
      await tx.businessContract.deleteMany({ where: { businessId } });
    }

    await tx.businessParticipant.deleteMany({ where: { businessId } });
  }

  private businessUpdateFromDraft(
    data: Record<string, unknown>,
    userId: string,
  ): Prisma.BusinessUncheckedUpdateInput {
    const financial = objectValue(data.financial);
    const title = cleanText(stringValue(data.title));
    const propertyId = cleanText(stringValue(data.propertyId));
    const contractTypeId = cleanText(stringValue(data.contractTypeId));
    const primaryClientId =
      cleanText(stringValue(data.primaryClientId)) ??
      participantDraftsFromData(data).find((participant) => participant.clientId && participant.isPrimary)
        ?.clientId ??
      participantDraftsFromData(data).find((participant) => participant.clientId)
        ?.clientId ??
      null;

    return {
      basePriceCents: centsFromUnknown(financial.basePriceCents),
      commissionBaseAmountCents: centsFromUnknown(
        financial.commissionBaseAmountCents,
      ),
      contractTypeId,
      currency: normalizeCurrency(stringValue(data.currency)),
      effectiveDate: toDate(data.effectiveDate),
      expectedClosingDate: toDate(data.expectedClosingDate),
      expectedSignatureDate: toDate(data.expectedSignatureDate),
      mode: enumValue(BusinessMode, data.mode, BusinessMode.SIMPLE),
      negotiatedPriceCents: centsFromUnknown(financial.negotiatedPriceCents),
      notes: cleanText(stringValue(data.notes)),
      operationType: enumValue(
        BusinessOperationType,
        data.operationType,
        BusinessOperationType.SALE,
      ),
      payableAmountCents: centsFromUnknown(financial.payableAmountCents),
      primaryClientId,
      propertyId,
      title,
      totalContractAmountCents: centsFromUnknown(
        financial.totalContractAmountCents,
      ),
      updatedByUserId: userId,
    };
  }

  private async loadDraftForWrite(
    auth: AuthenticatedUser,
    businessId: string,
  ) {
    const business = await this.loadBusinessForRead(auth, businessId);
    this.resolveWritableMembership(auth, business.organizationId);

    if (business.status !== BusinessStatus.DRAFT) {
      throw new ConflictException('Only draft businesses can be edited.');
    }

    return business;
  }

  private async loadBusinessForRead(auth: AuthenticatedUser, businessId: string) {
    const organizationIds = this.readableOrganizationIds(auth);
    const business = await this.prisma.business.findFirst({
      where: {
        id: businessId,
        organizationId: { in: organizationIds },
      },
      include: BUSINESS_DETAIL_INCLUDE,
    });

    if (!business) {
      throw new NotFoundException('Business was not found in this organization.');
    }

    return business;
  }

  private resolveCalculationData(
    business: BusinessWithDetails,
    patchData: Record<string, unknown>,
  ) {
    return sanitizeJson(deepMerge(objectValue(business.draftData), patchData));
  }

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    const membership = this.resolveMembership(auth, organizationId);

    if (!BUSINESS_READ_ROLES.has(membership.role)) {
      throw new ForbiddenException('Business read permission is required.');
    }

    return membership;
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    const membership = this.resolveReadableMembership(auth, organizationId);

    if (!BUSINESS_WRITE_ROLES.has(membership.role)) {
      throw new ForbiddenException('Business write permission is required.');
    }

    return membership;
  }

  private resolveCommitMembership(auth: AuthenticatedUser) {
    const membership = auth.memberships.find(
      (item) =>
        item.status === MembershipStatus.ACTIVE &&
        item.organizationStatus === OrganizationStatus.ACTIVE &&
        BUSINESS_COMMIT_ROLES.has(item.role),
    );

    if (!membership) {
      throw new ForbiddenException('Business commit permission is required.');
    }

    return membership;
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

  private readableOrganizationIds(auth: AuthenticatedUser) {
    const organizationIds = auth.memberships
      .filter(
        (membership) =>
          membership.status === MembershipStatus.ACTIVE &&
          membership.organizationStatus === OrganizationStatus.ACTIVE &&
          BUSINESS_READ_ROLES.has(membership.role),
      )
      .map((membership) => membership.organizationId);

    if (organizationIds.length === 0) {
      throw new ForbiddenException('No active membership for this organization.');
    }

    return organizationIds;
  }

  private async nextBusinessCode(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ) {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await tx.business.count({ where: { organizationId } });

    return `NEG-${date}-${String(count + 1).padStart(4, '0')}`;
  }

  private serializeBusiness(
    business: BusinessWithDetails,
    membership: AuthenticatedMembership,
  ) {
    const serialized = toSerializable(business) as Record<string, unknown>;

    if (!BUSINESS_COMMISSION_ROLES.has(membership.role)) {
      serialized.commissionPlans = [];
      serialized.commissionAllocations = [];
    }

    return serialized;
  }

  private serializeBusinessListItem(
    business: BusinessListItem,
    membership: AuthenticatedMembership,
  ) {
    const participants = business.participants as Array<{
      displayName: string | null;
      isPrimary: boolean;
      role: BusinessParticipantRole;
    }>;
    const primaryAgent =
      participants.find(
        (participant) => participant.role === BusinessParticipantRole.PRIMARY_AGENT,
      ) ??
      participants.find((participant) => participant.isPrimary) ??
      participants[0] ??
      null;
    const nextPayment = business.paymentScheduleLines[0] ?? null;
    const nextAction = business.scheduledActions[0] ?? null;

    return {
      id: business.id,
      organizationId: business.organizationId,
      code: business.code,
      title: business.title,
      status: business.status,
      mode: business.mode,
      operationType: business.operationType,
      currency: business.currency,
      totalContractAmountCents: centsToString(business.totalContractAmountCents),
      expectedClosingDate:
        business.expectedClosingDate?.toISOString().slice(0, 10) ?? null,
      updatedAt: business.updatedAt.toISOString(),
      createdAt: business.createdAt.toISOString(),
      clientName: business.primaryClient?.displayName ?? null,
      propertyTitle: business.property?.title ?? null,
      propertyLocation: business.property
        ? [business.property.city, business.property.zone].filter(Boolean).join(' / ')
        : null,
      primaryAgentName: primaryAgent?.displayName ?? null,
      nextPayment: nextPayment
        ? {
            id: nextPayment.id,
            label: nextPayment.label,
            amountCents: centsToString(nextPayment.amountCents),
            dueDate: nextPayment.dueDate?.toISOString().slice(0, 10) ?? null,
            status: nextPayment.status,
          }
        : null,
      nextAction: nextAction
        ? {
            id: nextAction.id,
            eventType: nextAction.eventType,
            scheduledFor: nextAction.scheduledFor.toISOString(),
            status: nextAction.status,
          }
        : null,
      permissionHints: {
        canViewCommissions: BUSINESS_COMMISSION_ROLES.has(membership.role),
      },
    };
  }

  private serializeOrganization(membership: AuthenticatedMembership) {
    return {
      id: membership.organizationId,
      name: membership.organizationName,
      slug: membership.organizationSlug,
    };
  }
}

function participantDraftsFromData(data: Record<string, unknown>) {
  const participants = [
    ...arrayValue(data.participants),
    ...arrayValue(data.clients),
    ...arrayValue(data.agents),
  ];

  return participants
    .map((item) => objectValue(item) as DraftParticipant)
    .filter(
      (participant) =>
        participant.clientId ||
        participant.userId ||
        participant.realEstateAgentId ||
        cleanText(participant.displayName),
    );
}

function clauseDraftsFromData(data: Record<string, unknown>) {
  const contract = objectValue(data.contract);
  const clauses = [...arrayValue(data.clauses), ...arrayValue(contract.clauses)];

  return clauses.map((item) => objectValue(item) as DraftClause);
}

function feeDraftsFromData(data: Record<string, unknown>) {
  return arrayValue(data.fees).map((item) => objectValue(item) as DraftFee);
}

function ruleArray(value: unknown) {
  return arrayValue(value).map((item) => {
    const rule = objectValue(item);

    return {
      appliesAfterDeductions: asBoolean(rule.appliesAfterDeductions, false),
      calculationType: enumValue(
        CommissionCalculationType,
        rule.calculationType,
        CommissionCalculationType.PERCENTAGE_OF_SALE,
      ),
      capAmountCents: rule.capAmountCents as string | undefined,
      fixedAmountCents: rule.fixedAmountCents as string | undefined,
      label: requiredText(stringValue(rule.label), 'Commission label is required.'),
      participantKey: requiredText(
        stringValue(rule.participantKey),
        'Commission participant is required.',
      ),
      percentageBasisPoints: numberValue(rule.percentageBasisPoints),
      recipientType: enumValue(
        CommissionRecipientType,
        rule.recipientType,
        CommissionRecipientType.AGENT,
      ),
      releaseTrigger: enumValue(
        CommissionReleaseTrigger,
        rule.releaseTrigger,
        CommissionReleaseTrigger.ON_CLOSING,
      ),
    };
  });
}

function lineArray(value: unknown) {
  return arrayValue(value).map((item) => {
    const line = objectValue(item);

    return {
      amountCents: line.amountCents as string | undefined,
      dueDate: stringValue(line.dueDate),
      dueEvent: stringValue(line.dueEvent),
      isManual: asBoolean(line.isManual, true),
      label: requiredText(stringValue(line.label), 'Payment line label is required.'),
      lineType: enumValue(
        PaymentScheduleLineType,
        line.lineType,
        PaymentScheduleLineType.OTHER,
      ),
      percentageBasisPoints: numberValue(line.percentageBasisPoints),
    };
  });
}

function duplicateParticipantKeys(participants: DraftParticipant[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  participants.forEach((participant, index) => {
    const role = enumValue(
      BusinessParticipantRole,
      participant.role,
      BusinessParticipantRole.OTHER,
    );
    const key = [
      participant.clientId,
      participant.userId,
      participant.realEstateAgentId,
      normalizeEmail(participant.email),
      cleanText(participant.displayName)?.toLocaleLowerCase('es-PA'),
      role,
    ]
      .filter(Boolean)
      .join(':');
    const safeKey = key || `participant:${index}:${role}`;

    if (seen.has(safeKey)) {
      duplicates.add(participant.displayName ?? safeKey);
    }

    seen.add(safeKey);
  });

  return Array.from(duplicates);
}

function participantKey(participant: DraftParticipant, index: number) {
  return (
    cleanText(participant.participantKey) ??
    cleanText(participant.clientId) ??
    cleanText(participant.userId) ??
    cleanText(participant.realEstateAgentId) ??
    `${cleanText(participant.displayName) ?? 'participant'}:${participant.role ?? 'OTHER'}:${index}`
  );
}

function releasePolicyFromTrigger(trigger: CommissionReleaseTrigger) {
  switch (trigger) {
    case CommissionReleaseTrigger.ON_SIGNATURE:
      return CommissionReleasePolicy.ON_SIGNATURE;
    case CommissionReleaseTrigger.ON_COLLECTION:
      return CommissionReleasePolicy.ON_COLLECTION;
    case CommissionReleaseTrigger.BY_PAYMENT_LINE:
      return CommissionReleasePolicy.BY_PAYMENT_MILESTONE;
    case CommissionReleaseTrigger.MANUAL_APPROVAL:
      return CommissionReleasePolicy.MANUAL;
    case CommissionReleaseTrigger.ON_CLOSING:
    default:
      return CommissionReleasePolicy.ON_CLOSING;
  }
}

function enumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown,
  fallback: T[keyof T],
) {
  if (typeof value === 'string' && Object.values(enumObject).includes(value)) {
    return value as T[keyof T];
  }

  return fallback;
}

function enumLike<T extends string>(
  values: readonly T[],
  value: unknown,
  fallback: T,
) {
  if (typeof value === 'string' && values.includes(value as T)) {
    return value as T;
  }

  return fallback;
}

function enumValueString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return undefined;
}

function centsFromUnknown(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    return toCents(value as string | number | bigint);
  } catch {
    return null;
  }
}

function normalizeCurrency(value?: string | null) {
  const currency = value?.trim().toUpperCase();

  return currency && /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

function cleanText(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function normalizeEmail(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  return normalized ? normalized : null;
}

function requiredText(value: unknown, message: string) {
  const normalized = cleanText(typeof value === 'string' ? value : undefined);

  if (!normalized) {
    throw new BadRequestException(message);
  }

  return normalized;
}

function toDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function scheduledAt(value: string) {
  return new Date(`${value.slice(0, 10)}T09:00:00.000Z`);
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    const current = output[key];

    if (
      current &&
      value &&
      typeof current === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(current) &&
      !Array.isArray(value)
    ) {
      output[key] = deepMerge(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      output[key] = value;
    }
  }

  return output;
}

function sanitizeJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    return centsToString(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJson(item)) as Prisma.InputJsonArray;
  }

  if (value && typeof value === 'object') {
    const output: Prisma.InputJsonObject = {};

    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        output[key] = sanitizeJson(child);
      }
    }

    return output;
  }

  return value as Prisma.InputJsonValue;
}

function toSerializable(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return centsToString(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value)) {
      output[key] = toSerializable(child);
    }

    return output;
  }

  return value;
}

function snapshotHash(input: unknown, output: unknown) {
  return createHash('sha256')
    .update(stableStringify({ input, output }))
    .digest('hex');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
