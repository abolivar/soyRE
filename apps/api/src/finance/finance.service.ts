import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessStatus,
  CommissionAllocationStatus,
  CompensationApplicationStatus,
  DisbursementMode,
  DisbursementStatus,
  MembershipStatus,
  PayoutMethodStatus,
  PayoutMethodType,
  PayoutProfileStatus,
  Prisma,
} from '@soyre/database';
import {
  applyCompensation as calculateCompensation,
  assertSameCurrency,
  calculateDisbursementBalance,
  reverseCompensation as calculateReversal,
  toCents,
} from '@soyre/shared';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import {
  FINANCE_READ_ROLES,
  FINANCE_WRITE_ROLES,
} from '../auth/authorization.constants.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  ApplyCompensationDto,
  CreateDisbursementDto,
  CreatePayoutMethodDto,
  CreatePayoutProfileDto,
  FinanceOrganizationDto,
  ReverseCompensationDto,
} from './dto/finance.dto.js';

const INVALID_SOURCE_STATUSES = new Set<BusinessStatus>([
  BusinessStatus.DRAFT,
  BusinessStatus.CANCELLED,
  BusinessStatus.REJECTED,
]);

type PayoutProfileWithMethods = Prisma.PayoutProfileGetPayload<{
  include: { methods: true };
}>;

type DisbursementListItem = Prisma.DisbursementGetPayload<{
  include: {
    applications: true;
    payoutMethod: true;
    recipientProfile: true;
    sourceBusiness: {
      select: {
        code: true;
        currency: true;
        id: true;
        primaryClientId: true;
        status: true;
        title: true;
      };
    };
  };
}>;
type CompensationApplicationRecord = Prisma.CompensationApplicationGetPayload<Record<string, never>>;

@Injectable()
export class FinanceService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async listProfiles(auth: AuthenticatedUser, organizationId?: string) {
    const membership = this.resolveRead(auth, organizationId);
    const profiles = await this.prisma.payoutProfile.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        methods: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ displayName: 'asc' }],
    }) as PayoutProfileWithMethods[];

    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      profiles: profiles.map((profile) => ({
        ...profile,
        methods: profile.methods.map(
          (method: { providerReference: string | null; [key: string]: unknown }) =>
            this.serializeMethod(method),
        ),
      })),
    };
  }

  async createProfile(auth: AuthenticatedUser, dto: CreatePayoutProfileDto) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const identityCount = [dto.clientId, dto.userId, dto.realEstateAgentId].filter(
      Boolean,
    ).length;

    if (identityCount === 0) {
      throw new BadRequestException('El perfil pagable necesita una persona registrada.');
    }

    const identities = await this.loadRegisteredIdentities(
      membership.organizationId,
      dto,
    );
    const emails = Array.from(
      new Set(identities.map((item) => item.email?.trim().toLowerCase()).filter(Boolean)),
    );

    if (emails.length > 1 || (identityCount > 1 && emails.length !== 1)) {
      throw new BadRequestException(
        'Los identificadores suministrados no pertenecen a la misma persona.',
      );
    }

    const matchingProfiles = await this.prisma.payoutProfile.findMany({
      where: {
        organizationId: membership.organizationId,
        OR: [
          ...(dto.clientId ? [{ clientId: dto.clientId }] : []),
          ...(dto.userId ? [{ userId: dto.userId }] : []),
          ...(dto.realEstateAgentId
            ? [{ realEstateAgentId: dto.realEstateAgentId }]
            : []),
        ],
      },
    });

    if (matchingProfiles.length > 1) {
      throw new ConflictException(
        'La persona tiene perfiles pagables separados que deben reconciliarse antes de continuar.',
      );
    }
    const existing = matchingProfiles[0];

    const profile = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const saved = existing
        ? await tx.payoutProfile.update({
            where: { id: existing.id },
            data: {
              clientId: existing.clientId ?? dto.clientId,
              displayName: dto.displayName.trim(),
              realEstateAgentId:
                existing.realEstateAgentId ?? dto.realEstateAgentId,
              taxCountry: dto.taxCountry ?? existing.taxCountry,
              taxIdLast4: dto.taxIdLast4 ?? existing.taxIdLast4,
              updatedByUserId: auth.id,
              userId: existing.userId ?? dto.userId,
            },
          })
        : await tx.payoutProfile.create({
            data: {
              clientId: dto.clientId,
              createdByUserId: auth.id,
              displayName: dto.displayName.trim(),
              organizationId: membership.organizationId,
              realEstateAgentId: dto.realEstateAgentId,
              status: PayoutProfileStatus.REVIEW_REQUIRED,
              taxCountry: dto.taxCountry,
              taxIdLast4: dto.taxIdLast4,
              updatedByUserId: auth.id,
              userId: dto.userId,
            },
          });

      await this.audit(tx, {
        action: existing ? 'finance.payout_profile.merged' : 'finance.payout_profile.created',
        actorUserId: auth.id,
        metadata: {
          hasClient: Boolean(saved.clientId),
          hasUser: Boolean(saved.userId),
          hasAgent: Boolean(saved.realEstateAgentId),
          status: saved.status,
        },
        organizationId: membership.organizationId,
        targetId: saved.id,
        targetType: 'PayoutProfile',
      });

      return saved;
    });

    return { profile };
  }

  async createMethod(
    auth: AuthenticatedUser,
    profileId: string,
    dto: CreatePayoutMethodDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const profile = await this.prisma.payoutProfile.findFirst({
      where: { id: profileId, organizationId: membership.organizationId },
    });

    if (!profile) {
      throw new NotFoundException('El perfil pagable no existe en esta organización.');
    }

    if (
      dto.type === PayoutMethodType.BANK_TRANSFER &&
      (!dto.bankName ||
        !dto.accountHolderName ||
        !dto.accountLast4 ||
        !dto.providerReference)
    ) {
      throw new BadRequestException(
        'La transferencia bancaria requiere banco, titular, últimos cuatro dígitos y referencia segura del proveedor.',
      );
    }

    const method = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (dto.isDefault) {
        await tx.payoutMethod.updateMany({
          where: { payoutProfileId: profile.id, isDefault: true },
          data: { isDefault: false, updatedByUserId: auth.id },
        });
      }

      const created = await tx.payoutMethod.create({
        data: {
          accountHolderName: dto.accountHolderName?.trim(),
          accountLast4: dto.accountLast4,
          bankName: dto.bankName?.trim(),
          createdByUserId: auth.id,
          currency: dto.currency,
          isDefault: dto.isDefault ?? false,
          label: dto.label.trim(),
          organizationId: membership.organizationId,
          payoutProfileId: profile.id,
          providerReference: dto.providerReference,
          type: dto.type,
          updatedByUserId: auth.id,
        },
      });

      await this.audit(tx, {
        action: 'finance.payout_method.created',
        actorUserId: auth.id,
        metadata: {
          type: created.type,
          isDefault: created.isDefault,
          accountLast4: created.accountLast4,
        },
        organizationId: membership.organizationId,
        targetId: created.id,
        targetType: 'PayoutMethod',
      });

      return created;
    });

    return { method: this.serializeMethod(method) };
  }

  async activateProfile(
    auth: AuthenticatedUser,
    profileId: string,
    dto: FinanceOrganizationDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const profile = await this.prisma.payoutProfile.findFirst({
      where: { id: profileId, organizationId: membership.organizationId },
    });

    if (!profile) {
      throw new NotFoundException('El perfil pagable no existe en esta organización.');
    }
    if (profile.status === PayoutProfileStatus.ACTIVE) {
      return { profile };
    }

    const activated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.payoutProfile.updateMany({
        where: { id: profile.id, status: profile.status },
        data: { status: PayoutProfileStatus.ACTIVE, updatedByUserId: auth.id },
      });
      if (result.count !== 1) {
        throw new ConflictException('El perfil cambió mientras se revisaba.');
      }
      await this.audit(tx, {
        action: 'finance.payout_profile.activated',
        actorUserId: auth.id,
        metadata: { from: profile.status, to: PayoutProfileStatus.ACTIVE },
        organizationId: membership.organizationId,
        targetId: profile.id,
        targetType: 'PayoutProfile',
      });
      return tx.payoutProfile.findUniqueOrThrow({ where: { id: profile.id } });
    });

    return { profile: activated };
  }

  async listDisbursements(auth: AuthenticatedUser, organizationId?: string) {
    const membership = this.resolveRead(auth, organizationId);
    const disbursements = await this.prisma.disbursement.findMany({
      where: { organizationId: membership.organizationId },
      include: {
        applications: { orderBy: { createdAt: 'desc' } },
        payoutMethod: true,
        recipientProfile: true,
        sourceBusiness: {
          select: {
            code: true,
            currency: true,
            id: true,
            primaryClientId: true,
            status: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as DisbursementListItem[];

    return {
      disbursements: disbursements.map((item) => ({
        ...this.serializeDisbursement(item),
        applications: item.applications.map((application: CompensationApplicationRecord) =>
          this.serializeApplication(application),
        ),
      })),
      organization: this.organizationAccess.serializeOrganization(membership),
    };
  }

  async createDisbursement(auth: AuthenticatedUser, dto: CreateDisbursementDto) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const existing = await this.prisma.disbursement.findUnique({
      where: {
        organizationId_idempotencyKey: {
          idempotencyKey: dto.idempotencyKey,
          organizationId: membership.organizationId,
        },
      },
    });

    if (existing) {
      if (
        existing.sourceBusinessId !== dto.sourceBusinessId ||
        existing.recipientProfileId !== dto.recipientProfileId ||
        existing.payoutMethodId !== (dto.payoutMethodId ?? null) ||
        existing.commissionAllocationId !== (dto.commissionAllocationId ?? null) ||
        existing.concept !== dto.concept.trim() ||
        existing.mode !== dto.mode ||
        existing.originalAmountCents !== toCents(dto.originalAmountCents) ||
        existing.currency !== dto.currency
      ) {
        throw new ConflictException(
          'La clave idempotente ya fue usada con una erogación diferente.',
        );
      }
      return { disbursement: this.serializeDisbursement(existing) };
    }

    const [business, profile, method, allocation] = await Promise.all([
      this.prisma.business.findFirst({
        where: { id: dto.sourceBusinessId, organizationId: membership.organizationId },
      }),
      this.prisma.payoutProfile.findFirst({
        where: { id: dto.recipientProfileId, organizationId: membership.organizationId },
      }),
      dto.payoutMethodId
        ? this.prisma.payoutMethod.findFirst({
            where: {
              id: dto.payoutMethodId,
              organizationId: membership.organizationId,
              payoutProfileId: dto.recipientProfileId,
            },
          })
        : null,
      dto.commissionAllocationId
        ? this.prisma.commissionAllocation.findFirst({
            where: {
              id: dto.commissionAllocationId,
              business: { organizationId: membership.organizationId },
            },
            include: {
              disbursements: {
                where: {
                  status: {
                    in: [
                      DisbursementStatus.DRAFT,
                      DisbursementStatus.APPROVED,
                      DisbursementStatus.PROCESSING,
                    ],
                  },
                },
                select: { originalAmountCents: true },
              },
              participant: true,
            },
          })
        : null,
    ]);

    if (!business || INVALID_SOURCE_STATUSES.has(business.status)) {
      throw new BadRequestException('La operación origen no permite crear erogaciones.');
    }
    if (!profile) {
      throw new BadRequestException('El receptor no tiene un perfil pagable registrado.');
    }
    if (dto.payoutMethodId && !method) {
      throw new BadRequestException('El método de desembolso no pertenece al receptor.');
    }
    if (method?.currency) {
      this.ensureSameCurrency(method.currency, dto.currency);
    }
    if (dto.commissionAllocationId && !allocation) {
      throw new BadRequestException('La asignación de comisión no pertenece a la operación.');
    }
    if (allocation && allocation.businessId !== business.id) {
      throw new BadRequestException('La comisión y la erogación deben pertenecer a la misma operación.');
    }
    if (allocation?.participant && !this.profileMatchesParticipant(profile, allocation.participant)) {
      throw new BadRequestException('El perfil pagable no corresponde al receptor de la comisión.');
    }
    if (allocation) {
      const remainingCommission =
        allocation.payableAmountCents - allocation.paidAmountCents;
      const reservedCommission = allocation.disbursements.reduce(
        (total: bigint, item: { originalAmountCents: bigint }) =>
          total + item.originalAmountCents,
        0n,
      );
      if (
        toCents(dto.originalAmountCents) >
        remainingCommission - reservedCommission
      ) {
        throw new BadRequestException(
          'La erogación supera el saldo pendiente de la comisión.',
        );
      }
      if (
        ![
          CommissionAllocationStatus.APPROVED,
          CommissionAllocationStatus.PAYABLE,
          CommissionAllocationStatus.PARTIALLY_PAID,
        ].includes(allocation.status)
      ) {
        throw new BadRequestException(
          'La comisión debe estar aprobada o pagadera antes de crear la erogación.',
        );
      }
    }
    this.ensureSameCurrency(business.currency, dto.currency);

    const disbursement = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.disbursement.create({
        data: {
          commissionAllocationId: dto.commissionAllocationId,
          concept: dto.concept.trim(),
          createdByUserId: auth.id,
          currency: dto.currency,
          idempotencyKey: dto.idempotencyKey,
          mode: dto.mode,
          organizationId: membership.organizationId,
          originalAmountCents: toCents(dto.originalAmountCents),
          payoutMethodId: dto.payoutMethodId,
          recipientProfileId: dto.recipientProfileId,
          sourceBusinessId: dto.sourceBusinessId,
          updatedByUserId: auth.id,
        },
      });

      await this.audit(tx, {
        action: 'finance.disbursement.created',
        actorUserId: auth.id,
        metadata: {
          currency: created.currency,
          mode: created.mode,
          originalAmountCents: created.originalAmountCents.toString(),
        },
        organizationId: membership.organizationId,
        targetId: created.id,
        targetType: 'Disbursement',
      });

      return created;
    });

    return { disbursement: this.serializeDisbursement(disbursement) };
  }

  async approveDisbursement(
    auth: AuthenticatedUser,
    disbursementId: string,
    dto: FinanceOrganizationDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const disbursement = await this.loadDisbursement(
      disbursementId,
      membership.organizationId,
    );

    if (
      [
        DisbursementStatus.APPROVED,
        DisbursementStatus.AVAILABLE_FOR_COMPENSATION,
      ].includes(disbursement.status)
    ) {
      return { disbursement: this.serializeDisbursement(disbursement) };
    }
    if (disbursement.status !== DisbursementStatus.DRAFT) {
      throw new ConflictException('La erogación ya no está pendiente de aprobación.');
    }
    if (disbursement.recipientProfile.status !== PayoutProfileStatus.ACTIVE) {
      throw new BadRequestException('El perfil pagable debe estar activo para aprobar.');
    }
    if (
      disbursement.mode === DisbursementMode.DIRECT_PAYMENT &&
      (!disbursement.payoutMethod ||
        disbursement.payoutMethod.status !== PayoutMethodStatus.ACTIVE)
    ) {
      throw new BadRequestException('El pago directo necesita un método activo.');
    }

    const nextStatus =
      disbursement.mode === DisbursementMode.CREDIT_BALANCE
        ? DisbursementStatus.AVAILABLE_FOR_COMPENSATION
        : DisbursementStatus.APPROVED;
    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.disbursement.updateMany({
        where: { id: disbursement.id, status: DisbursementStatus.DRAFT },
        data: {
          approvedAt: new Date(),
          approvedByUserId: auth.id,
          status: nextStatus,
          updatedByUserId: auth.id,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException('La erogación cambió mientras se aprobaba.');
      }
      await this.audit(tx, {
        action: 'finance.disbursement.approved',
        actorUserId: auth.id,
        metadata: { from: DisbursementStatus.DRAFT, to: nextStatus },
        organizationId: membership.organizationId,
        targetId: disbursement.id,
        targetType: 'Disbursement',
      });
      if (
        nextStatus === DisbursementStatus.AVAILABLE_FOR_COMPENSATION &&
        disbursement.commissionAllocationId
      ) {
        await this.settleCommissionAllocation(
          tx,
          disbursement.commissionAllocationId,
          disbursement.originalAmountCents,
          auth.id,
          membership.organizationId,
          disbursement.id,
        );
      }
      return tx.disbursement.findUniqueOrThrow({ where: { id: disbursement.id } });
    });

    return { disbursement: this.serializeDisbursement(updated) };
  }

  async markPaid(
    auth: AuthenticatedUser,
    disbursementId: string,
    dto: FinanceOrganizationDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const disbursement = await this.loadDisbursement(
      disbursementId,
      membership.organizationId,
    );

    if (disbursement.status === DisbursementStatus.PAID) {
      return { disbursement: this.serializeDisbursement(disbursement) };
    }
    if (
      disbursement.mode !== DisbursementMode.DIRECT_PAYMENT ||
      disbursement.status !== DisbursementStatus.APPROVED
    ) {
      throw new ConflictException('Solo un pago directo aprobado puede marcarse pagado.');
    }

    const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.disbursement.updateMany({
        where: { id: disbursement.id, status: DisbursementStatus.APPROVED },
        data: {
          executedAt: new Date(),
          paidAmountCents: disbursement.originalAmountCents,
          status: DisbursementStatus.PAID,
          updatedByUserId: auth.id,
        },
      });
      if (result.count !== 1) {
        throw new ConflictException('La erogación cambió mientras se ejecutaba.');
      }
      await this.audit(tx, {
        action: 'finance.disbursement.paid',
        actorUserId: auth.id,
        metadata: { amountCents: disbursement.originalAmountCents.toString() },
        organizationId: membership.organizationId,
        targetId: disbursement.id,
        targetType: 'Disbursement',
      });
      if (disbursement.commissionAllocationId) {
        await this.settleCommissionAllocation(
          tx,
          disbursement.commissionAllocationId,
          disbursement.originalAmountCents,
          auth.id,
          membership.organizationId,
          disbursement.id,
        );
      }
      return tx.disbursement.findUniqueOrThrow({ where: { id: disbursement.id } });
    });

    return { disbursement: this.serializeDisbursement(updated) };
  }

  async applyCompensation(
    auth: AuthenticatedUser,
    disbursementId: string,
    dto: ApplyCompensationDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const existing = await this.prisma.compensationApplication.findUnique({
      where: {
        organizationId_idempotencyKey: {
          idempotencyKey: dto.idempotencyKey,
          organizationId: membership.organizationId,
        },
      },
    });

    if (existing) {
      if (
        existing.disbursementId !== disbursementId ||
        existing.destinationBusinessId !== dto.destinationBusinessId ||
        existing.amountCents !== toCents(dto.amountCents) ||
        existing.currency !== dto.currency
      ) {
        throw new ConflictException(
          'La clave idempotente ya fue usada con una compensación diferente.',
        );
      }
      return { application: this.serializeApplication(existing) };
    }

    const [disbursement, destination] = await Promise.all([
      this.loadDisbursement(disbursementId, membership.organizationId),
      this.prisma.business.findFirst({
        where: { id: dto.destinationBusinessId, organizationId: membership.organizationId },
      }),
    ]);

    if (disbursement.mode !== DisbursementMode.CREDIT_BALANCE) {
      throw new BadRequestException('Esta erogación no fue creada como saldo a favor.');
    }
    if (!destination || INVALID_SOURCE_STATUSES.has(destination.status)) {
      throw new BadRequestException('La operación destino no admite compensaciones.');
    }
    if (destination.id === disbursement.sourceBusinessId) {
      throw new BadRequestException('La operación destino debe ser diferente a la operación origen.');
    }
    if (
      !disbursement.recipientProfile.clientId ||
      destination.primaryClientId !== disbursement.recipientProfile.clientId
    ) {
      throw new BadRequestException(
        'La compensación solo puede aplicarse a otra operación del mismo cliente.',
      );
    }
    this.ensureSameCurrency(disbursement.currency, dto.currency);
    this.ensureSameCurrency(destination.currency, dto.currency);
    const ledger = calculateCompensation({
      amountCents: dto.amountCents,
      appliedAmountCents: disbursement.appliedAmountCents,
      originalAmountCents: disbursement.originalAmountCents,
      paidAmountCents: disbursement.paidAmountCents,
    });

    const application = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.disbursement.updateMany({
        where: {
          appliedAmountCents: disbursement.appliedAmountCents,
          id: disbursement.id,
          status: {
            in: [
              DisbursementStatus.AVAILABLE_FOR_COMPENSATION,
              DisbursementStatus.PARTIALLY_APPLIED,
            ],
          },
        },
        data: {
          appliedAmountCents: BigInt(ledger.appliedAmountCents),
          status: ledger.status,
          updatedByUserId: auth.id,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('El saldo cambió mientras se aplicaba la compensación.');
      }

      const created = await tx.compensationApplication.create({
        data: {
          amountCents: toCents(dto.amountCents),
          appliedAt: new Date(),
          appliedByUserId: auth.id,
          currency: dto.currency,
          destinationBusinessId: destination.id,
          disbursementId: disbursement.id,
          idempotencyKey: dto.idempotencyKey,
          organizationId: membership.organizationId,
          reason: dto.reason?.trim(),
          status: CompensationApplicationStatus.APPLIED,
        },
      });
      await this.audit(tx, {
        action: 'finance.compensation.applied',
        actorUserId: auth.id,
        metadata: {
          amountCents: created.amountCents.toString(),
          destinationBusinessId: destination.id,
          remainingAmountCents: ledger.remainingAmountCents,
        },
        organizationId: membership.organizationId,
        targetId: created.id,
        targetType: 'CompensationApplication',
      });
      return created;
    });

    return { application: this.serializeApplication(application) };
  }

  async reverseCompensation(
    auth: AuthenticatedUser,
    applicationId: string,
    dto: ReverseCompensationDto,
  ) {
    const membership = this.resolveWrite(auth, dto.organizationId);
    const application = await this.prisma.compensationApplication.findFirst({
      where: { id: applicationId, organizationId: membership.organizationId },
      include: { disbursement: true },
    });

    if (!application) {
      throw new NotFoundException('La aplicación de compensación no existe.');
    }
    if (application.status === CompensationApplicationStatus.REVERSED) {
      return { application: this.serializeApplication(application) };
    }
    if (application.status !== CompensationApplicationStatus.APPLIED) {
      throw new ConflictException('Solo una compensación aplicada puede reversarse.');
    }
    const ledger = calculateReversal({
      amountCents: application.amountCents,
      appliedAmountCents: application.disbursement.appliedAmountCents,
      originalAmountCents: application.disbursement.originalAmountCents,
      paidAmountCents: application.disbursement.paidAmountCents,
    });

    const reversed = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const disbursementUpdate = await tx.disbursement.updateMany({
        where: {
          appliedAmountCents: application.disbursement.appliedAmountCents,
          id: application.disbursement.id,
        },
        data: {
          appliedAmountCents: BigInt(ledger.appliedAmountCents),
          status: ledger.status,
          updatedByUserId: auth.id,
        },
      });
      const applicationUpdate = await tx.compensationApplication.updateMany({
        where: { id: application.id, status: CompensationApplicationStatus.APPLIED },
        data: {
          reason: dto.reason?.trim() ?? application.reason,
          reversedAt: new Date(),
          reversedByUserId: auth.id,
          status: CompensationApplicationStatus.REVERSED,
        },
      });
      if (disbursementUpdate.count !== 1 || applicationUpdate.count !== 1) {
        throw new ConflictException('La compensación cambió mientras se reversaba.');
      }
      await this.audit(tx, {
        action: 'finance.compensation.reversed',
        actorUserId: auth.id,
        metadata: {
          amountCents: application.amountCents.toString(),
          remainingAmountCents: ledger.remainingAmountCents,
        },
        organizationId: membership.organizationId,
        targetId: application.id,
        targetType: 'CompensationApplication',
      });
      return tx.compensationApplication.findUniqueOrThrow({
        where: { id: application.id },
      });
    });

    return { application: this.serializeApplication(reversed) };
  }

  private resolveRead(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'finance.read',
      roles: FINANCE_READ_ROLES,
    });
  }

  private resolveWrite(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'finance.write',
      roles: FINANCE_WRITE_ROLES,
    });
  }

  private async loadRegisteredIdentities(
    organizationId: string,
    dto: CreatePayoutProfileDto,
  ) {
    const [client, userMembership, agent] = await Promise.all([
      dto.clientId
        ? this.prisma.client.findFirst({
            where: { id: dto.clientId, organizationId },
            select: { email: true },
          })
        : null,
      dto.userId
        ? this.prisma.membership.findFirst({
            where: {
              organizationId,
              status: MembershipStatus.ACTIVE,
              userId: dto.userId,
            },
            select: { user: { select: { email: true } } },
          })
        : null,
      dto.realEstateAgentId
        ? this.prisma.realEstateAgent.findFirst({
            where: { id: dto.realEstateAgentId, isActive: true, organizationId },
            select: { email: true },
          })
        : null,
    ]);

    if (dto.clientId && !client) {
      throw new BadRequestException('El cliente no pertenece a esta organización.');
    }
    if (dto.userId && !userMembership) {
      throw new BadRequestException('El usuario no está activo en esta organización.');
    }
    if (dto.realEstateAgentId && !agent) {
      throw new BadRequestException('El agente no está activo en esta organización.');
    }

    return [
      ...(client ? [client] : []),
      ...(userMembership ? [userMembership.user] : []),
      ...(agent ? [agent] : []),
    ];
  }

  private async loadDisbursement(id: string, organizationId: string) {
    const disbursement = await this.prisma.disbursement.findFirst({
      where: { id, organizationId },
      include: { payoutMethod: true, recipientProfile: true },
    });

    if (!disbursement) {
      throw new NotFoundException('La erogación no existe en esta organización.');
    }

    return disbursement;
  }

  private profileMatchesParticipant(
    profile: { clientId: string | null; userId: string | null; realEstateAgentId: string | null },
    participant: {
      clientId: string | null;
      userId: string | null;
      realEstateAgentId: string | null;
    },
  ) {
    return Boolean(
      (profile.clientId && profile.clientId === participant.clientId) ||
        (profile.userId && profile.userId === participant.userId) ||
        (profile.realEstateAgentId &&
          profile.realEstateAgentId === participant.realEstateAgentId),
    );
  }

  private serializeMethod<T extends { providerReference: string | null }>(method: T) {
    const { providerReference, ...safe } = method;
    return { ...safe, hasProviderReference: Boolean(providerReference) };
  }

  private serializeDisbursement(disbursement: {
    appliedAmountCents: bigint;
    originalAmountCents: bigint;
    paidAmountCents: bigint;
    [key: string]: unknown;
  }) {
    const ledger = calculateDisbursementBalance(disbursement);
    const { payoutMethod, ...safe } = disbursement;
    return {
      ...safe,
      ...ledger,
      ...(payoutMethod && typeof payoutMethod === 'object'
        ? {
            payoutMethod: this.serializeMethod(
              payoutMethod as { providerReference: string | null },
            ),
          }
        : {}),
    };
  }

  private serializeApplication(application: {
    amountCents: bigint;
    [key: string]: unknown;
  }) {
    return { ...application, amountCents: application.amountCents.toString() };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    entry: {
      action: string;
      actorUserId: string;
      metadata: Prisma.InputJsonValue;
      organizationId: string;
      targetId: string;
      targetType: string;
    },
  ) {
    await tx.auditLog.create({ data: entry });
  }

  private async settleCommissionAllocation(
    tx: Prisma.TransactionClient,
    allocationId: string,
    amountCents: bigint,
    actorUserId: string,
    organizationId: string,
    disbursementId: string,
  ) {
    const allocation = await tx.commissionAllocation.findUniqueOrThrow({
      where: { id: allocationId },
    });
    const paidAmountCents = allocation.paidAmountCents + amountCents;

    if (paidAmountCents > allocation.payableAmountCents) {
      throw new ConflictException('La erogación supera el saldo vigente de la comisión.');
    }

    const status =
      paidAmountCents === allocation.payableAmountCents
        ? CommissionAllocationStatus.PAID
        : CommissionAllocationStatus.PARTIALLY_PAID;
    const updated = await tx.commissionAllocation.updateMany({
      where: {
        id: allocation.id,
        paidAmountCents: allocation.paidAmountCents,
      },
      data: { paidAmountCents, status },
    });
    if (updated.count !== 1) {
      throw new ConflictException('La comisión cambió mientras se registraba la erogación.');
    }

    await this.audit(tx, {
      action: 'finance.commission_allocation.settled',
      actorUserId,
      metadata: {
        amountCents: amountCents.toString(),
        disbursementId,
        paidAmountCents: paidAmountCents.toString(),
        status,
      },
      organizationId,
      targetId: allocation.id,
      targetType: 'CommissionAllocation',
    });
  }

  private ensureSameCurrency(source: string, destination: string) {
    try {
      assertSameCurrency(source, destination);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Las monedas no coinciden.',
      );
    }
  }
}
