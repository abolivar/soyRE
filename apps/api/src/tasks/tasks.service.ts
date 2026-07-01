import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  Prisma,
  ScheduledActionStatus,
} from '@soyre/database';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto.js';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto.js';

const TASK_READ_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
  MembershipRole.FINANCE,
  MembershipRole.EXTERNAL_AGENT,
  MembershipRole.READONLY,
]);

const TASK_WRITE_ROLES = new Set<MembershipRole>([
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.AGENT,
  MembershipRole.OPERATIONS,
]);

const TASK_INCLUDE = {
  assignedToUser: {
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
      operationType: true,
      primaryClient: { select: { displayName: true } },
      property: { select: { title: true, city: true, zone: true } },
    },
  },
} satisfies Prisma.ScheduledActionInclude;

type TaskWithDetails = Prisma.ScheduledActionGetPayload<{
  include: typeof TASK_INCLUDE;
}>;

@Injectable()
export class TasksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(auth: AuthenticatedUser, query: ListTasksQueryDto) {
    const membership = this.resolveReadableMembership(auth, query.organizationId);
    const search = query.search?.trim();
    const where: Prisma.ScheduledActionWhereInput = {
      status: query.status ?? ScheduledActionStatus.PENDING,
      ...(query.eventType ? { eventType: query.eventType } : {}),
      business: {
        organizationId: membership.organizationId,
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
      },
    };

    const tasks = await this.prisma.scheduledAction.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    });
    const taskItems = tasks as TaskWithDetails[];

    return {
      organization: {
        id: membership.organizationId,
        name: membership.organizationName,
        slug: membership.organizationSlug,
      },
      tasks: taskItems.map((task: TaskWithDetails) => this.serializeTask(task)),
    };
  }

  async updateStatus(
    auth: AuthenticatedUser,
    taskId: string,
    dto: UpdateTaskStatusDto,
  ) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const existing = await this.prisma.scheduledAction.findFirst({
      where: {
        id: taskId,
        business: { organizationId: membership.organizationId },
      },
      include: TASK_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException('Task was not found in this organization.');
    }

    const task = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.scheduledAction.update({
        where: { id: existing.id },
        data: {
          status: dto.status,
          metadata: {
            ...objectValue(existing.metadata),
            statusNote: cleanText(dto.note),
            statusUpdatedAt: new Date().toISOString(),
            statusUpdatedByUserId: auth.id,
          } satisfies Prisma.InputJsonObject,
        },
        include: TASK_INCLUDE,
      });

      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          actorUserId: auth.id,
          action: 'tasks.update_status',
          targetType: 'scheduled_action',
          targetId: updated.id,
          metadata: {
            previousStatus: existing.status,
            status: updated.status,
            businessId: updated.businessId,
            note: cleanText(dto.note),
          },
        },
      });

      return updated;
    });

    return { task: this.serializeTask(task) };
  }

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    const membership = this.resolveMembership(auth, organizationId);

    if (!TASK_READ_ROLES.has(membership.role)) {
      throw new ForbiddenException('Task read permission is required.');
    }

    return membership;
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    const membership = this.resolveReadableMembership(auth, organizationId);

    if (!TASK_WRITE_ROLES.has(membership.role)) {
      throw new ForbiddenException('Task write permission is required.');
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

  private serializeTask(
    task: TaskWithDetails,
  ) {
    return {
      id: task.id,
      businessId: task.businessId,
      eventType: task.eventType,
      relatedEntityType: task.relatedEntityType,
      relatedEntityId: task.relatedEntityId,
      scheduledFor: task.scheduledFor.toISOString(),
      status: task.status,
      assignedToUserId: task.assignedToUserId,
      assignedToUser: task.assignedToUser
        ? {
            id: task.assignedToUser.id,
            email: task.assignedToUser.email,
            firstName: task.assignedToUser.firstName,
            lastName: task.assignedToUser.lastName,
          }
        : null,
      metadata: task.metadata,
      business: {
        id: task.business.id,
        code: task.business.code,
        title: task.business.title,
        status: task.business.status,
        operationType: task.business.operationType,
        clientName: task.business.primaryClient?.displayName ?? null,
        propertyTitle: task.business.property?.title ?? null,
        propertyLocation: task.business.property
          ? [task.business.property.city, task.business.property.zone]
              .filter(Boolean)
              .join(' / ')
          : null,
      },
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}

function cleanText(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}
