import { Inject, Injectable } from '@nestjs/common';
import {
  BusinessOperationType,
  BusinessStatus,
  ClientStatus,
  CommissionAllocationStatus,
  PaymentScheduleLineStatus,
  PropertyStatus,
  ScheduledActionStatus,
  ScheduledActionType,
} from '@soyre/database';
import { calculateBusinessDraftProgress } from '@soyre/shared';
import { READ_ROLES } from '../auth/authorization.constants.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';

type DashboardRecentBusiness = {
  id: string;
  code: string;
  title: string;
  status: BusinessStatus;
  operationType: BusinessOperationType;
  currency: string;
  draftData: unknown;
  totalContractAmountCents: bigint | null;
  expectedClosingDate: Date | null;
  primaryClient: { displayName: string } | null;
  property: { title: string; city: string; zone: string } | null;
  updatedAt: Date;
};

type DashboardAction = {
  id: string;
  eventType: ScheduledActionType;
  scheduledFor: Date;
  status: ScheduledActionStatus;
  businessId: string;
  business: {
    code: string;
    title: string;
    status: BusinessStatus;
    property: { title: string } | null;
    primaryClient: { displayName: string } | null;
  };
};

type DashboardAuditLog = {
  id: string;
  action: string;
  targetType: string;
  createdAt: Date;
  actorUser: {
    firstName: string;
    lastName: string | null;
    email: string;
  } | null;
};

@Injectable()
export class DashboardService {
  constructor(
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async summary(auth: AuthenticatedUser, organizationId?: string) {
    const membership = this.resolveMembership(auth, organizationId);
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    const [
      activeProperties,
      activeClients,
      openBusinesses,
      pendingActions,
      overduePaymentLines,
      upcomingPaymentLines,
      commissionAggregate,
      recentBusinesses,
      draftBusinesses,
      recentAuditLogs,
      myActions,
    ] = await Promise.all([
      this.prisma.property.count({
        where: {
          organizationId: membership.organizationId,
          status: {
            in: [
              PropertyStatus.ACTIVE,
              PropertyStatus.PUBLISHED,
              PropertyStatus.RESERVED,
              PropertyStatus.UNDER_CONTRACT,
            ],
          },
        },
      }),
      this.prisma.client.count({
        where: {
          organizationId: membership.organizationId,
          status: {
            in: [ClientStatus.NEW, ClientStatus.ACTIVE, ClientStatus.NURTURING],
          },
        },
      }),
      this.prisma.business.count({
        where: {
          organizationId: membership.organizationId,
          status: {
            in: [
              BusinessStatus.DRAFT,
              BusinessStatus.PENDING_REVIEW,
              BusinessStatus.APPROVED,
              BusinessStatus.CONTRACT_GENERATED,
              BusinessStatus.PENDING_SIGNATURE,
              BusinessStatus.ACTIVE,
            ],
          },
        },
      }),
      this.prisma.scheduledAction.count({
        where: {
          business: { organizationId: membership.organizationId },
          status: ScheduledActionStatus.PENDING,
        },
      }),
      this.prisma.paymentScheduleLine.aggregate({
        where: {
          business: { organizationId: membership.organizationId },
          status: {
            in: [
              PaymentScheduleLineStatus.PENDING,
              PaymentScheduleLineStatus.INVOICED,
              PaymentScheduleLineStatus.PARTIALLY_PAID,
              PaymentScheduleLineStatus.OVERDUE,
            ],
          },
          dueDate: { lt: today },
        },
        _count: { _all: true },
        _sum: { amountCents: true },
      }),
      this.prisma.paymentScheduleLine.aggregate({
        where: {
          business: { organizationId: membership.organizationId },
          status: {
            in: [
              PaymentScheduleLineStatus.PENDING,
              PaymentScheduleLineStatus.INVOICED,
              PaymentScheduleLineStatus.PARTIALLY_PAID,
            ],
          },
          dueDate: { gte: today, lt: nextWeek },
        },
        _count: { _all: true },
        _sum: { amountCents: true },
      }),
      this.prisma.commissionAllocation.aggregate({
        where: {
          business: { organizationId: membership.organizationId },
          status: {
            in: [
              CommissionAllocationStatus.PENDING,
              CommissionAllocationStatus.APPROVED,
              CommissionAllocationStatus.PAYABLE,
              CommissionAllocationStatus.PARTIALLY_PAID,
            ],
          },
        },
        _count: { _all: true },
        _sum: { payableAmountCents: true },
      }),
      this.prisma.business.findMany({
        where: { organizationId: membership.organizationId },
        orderBy: [{ updatedAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          operationType: true,
          currency: true,
          draftData: true,
          totalContractAmountCents: true,
          expectedClosingDate: true,
          primaryClient: { select: { displayName: true } },
          property: { select: { title: true, city: true, zone: true } },
          updatedAt: true,
        },
      }),
      this.prisma.business.findMany({
        where: {
          organizationId: membership.organizationId,
          status: BusinessStatus.DRAFT,
        },
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          operationType: true,
          currency: true,
          draftData: true,
          totalContractAmountCents: true,
          expectedClosingDate: true,
          primaryClient: { select: { displayName: true } },
          property: { select: { title: true, city: true, zone: true } },
          updatedAt: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: { organizationId: membership.organizationId },
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        select: {
          id: true,
          action: true,
          targetType: true,
          createdAt: true,
          actorUser: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.scheduledAction.findMany({
        where: {
          business: { organizationId: membership.organizationId },
          OR: [{ assignedToUserId: auth.id }, { assignedToUserId: null }],
          status: ScheduledActionStatus.PENDING,
        },
        include: {
          business: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              property: { select: { title: true } },
              primaryClient: { select: { displayName: true } },
            },
          },
        },
        orderBy: [{ scheduledFor: 'asc' }],
        take: 6,
      }),
    ]);
    const recentBusinessItems = recentBusinesses as DashboardRecentBusiness[];
    const draftBusinessItems = draftBusinesses as DashboardRecentBusiness[];
    const actionItems = myActions as DashboardAction[];
    const auditLogItems = recentAuditLogs as DashboardAuditLog[];

    return {
      organization: {
        ...this.organizationAccess.serializeOrganization(membership),
      },
      metrics: {
        activeProperties,
        activeClients,
        openBusinesses,
        pendingActions,
        overdueReceivables: {
          count: overduePaymentLines._count._all,
          amountCents: centsString(overduePaymentLines._sum.amountCents),
        },
        nextSevenDaysReceivables: {
          count: upcomingPaymentLines._count._all,
          amountCents: centsString(upcomingPaymentLines._sum.amountCents),
        },
        pendingCommissions: {
          count: commissionAggregate._count._all,
          amountCents: centsString(commissionAggregate._sum.payableAmountCents),
        },
      },
      recentBusinesses: recentBusinessItems.map((business) => ({
        id: business.id,
        code: business.code,
        title: business.title,
        status: business.status,
        operationType: business.operationType,
        currency: business.currency,
        draftProgress: calculateBusinessDraftProgress(
          objectRecord(business.draftData),
        ),
        totalContractAmountCents: centsString(business.totalContractAmountCents),
        expectedClosingDate:
          business.expectedClosingDate?.toISOString().slice(0, 10) ?? null,
        clientName: business.primaryClient?.displayName ?? null,
        propertyTitle: business.property?.title ?? null,
        propertyLocation: business.property
          ? [business.property.city, business.property.zone].filter(Boolean).join(' / ')
          : null,
        updatedAt: business.updatedAt.toISOString(),
      })),
      draftBusinesses: draftBusinessItems.map((business) => ({
        id: business.id,
        code: business.code,
        title: business.title,
        status: business.status,
        operationType: business.operationType,
        currency: business.currency,
        draftProgress: calculateBusinessDraftProgress(
          objectRecord(business.draftData),
        ),
        totalContractAmountCents: centsString(business.totalContractAmountCents),
        expectedClosingDate:
          business.expectedClosingDate?.toISOString().slice(0, 10) ?? null,
        clientName: business.primaryClient?.displayName ?? null,
        propertyTitle: business.property?.title ?? null,
        propertyLocation: business.property
          ? [business.property.city, business.property.zone].filter(Boolean).join(' / ')
          : null,
        updatedAt: business.updatedAt.toISOString(),
      })),
      myActions: actionItems.map((action) => ({
        id: action.id,
        eventType: action.eventType,
        scheduledFor: action.scheduledFor.toISOString(),
        status: action.status,
        businessId: action.businessId,
        businessCode: action.business.code,
        businessTitle: action.business.title,
        businessStatus: action.business.status,
        context:
          action.business.property?.title ??
          action.business.primaryClient?.displayName ??
          action.business.title ??
          action.business.code ??
          'Negocio sin referencia',
      })),
      activity: auditLogItems.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        createdAt: log.createdAt.toISOString(),
        actor:
          [log.actorUser?.firstName, log.actorUser?.lastName]
            .filter(Boolean)
            .join(' ') ||
          log.actorUser?.email ||
          'Sistema',
      })),
    };
  }

  private resolveMembership(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Dashboard read',
      roles: READ_ROLES,
    });
  }
}

function centsString(value: bigint | number | null | undefined) {
  return value === null || value === undefined ? '0' : value.toString();
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}
