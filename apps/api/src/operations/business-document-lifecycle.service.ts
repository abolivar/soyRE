import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentRequirementStatus,
  DocumentStatus,
  Prisma,
  type BusinessStatus,
  type MembershipRole,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  COMPLETE_DOCUMENT_REQUIREMENT_STATUSES,
  documentRoleAllows,
} from './business-document.constants.js';
import type {
  TransitionBusinessDocumentRequirementDto,
  ValidateBusinessDocumentTransitionDto,
} from './dto/business-document-checklist.dto.js';

const REASON_REQUIRED = new Set<DocumentRequirementStatus>([
  DocumentRequirementStatus.OBSERVED,
  DocumentRequirementStatus.REJECTED,
  DocumentRequirementStatus.EXPIRED,
  DocumentRequirementStatus.NOT_APPLICABLE,
]);

const DOCUMENT_REQUIRED = new Set<DocumentRequirementStatus>([
  DocumentRequirementStatus.UNDER_REVIEW,
  DocumentRequirementStatus.APPROVED,
  DocumentRequirementStatus.OBSERVED,
  DocumentRequirementStatus.REJECTED,
]);

const DOCUMENT_STATUS = new Map<DocumentRequirementStatus, DocumentStatus>([
  [DocumentRequirementStatus.UNDER_REVIEW, DocumentStatus.IN_REVIEW],
  [DocumentRequirementStatus.APPROVED, DocumentStatus.APPROVED],
  [DocumentRequirementStatus.OBSERVED, DocumentStatus.REJECTED],
  [DocumentRequirementStatus.REJECTED, DocumentStatus.REJECTED],
  [DocumentRequirementStatus.EXPIRED, DocumentStatus.EXPIRED],
]);

@Injectable()
export class BusinessDocumentLifecycleService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async assertBusinessTransition(
    auth: AuthenticatedUser,
    businessId: string,
    dto: ValidateBusinessDocumentTransitionDto,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      dto.organizationId,
      {
        permission: 'Business document blocker validation',
        roles: WRITE_ROLES,
      },
    );
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, organizationId: membership.organizationId },
      select: { id: true },
    });
    if (!business) {
      throw new NotFoundException(
        'Business was not found in this organization.',
      );
    }
    const blockers: Array<{
      id: string;
      checklistId: string;
      name: string;
      category: string;
      status: DocumentRequirementStatus;
      requiredAtStatus: BusinessStatus | null;
      readRoles: MembershipRole[];
    }> = await this.prisma.businessDocumentRequirement.findMany({
      where: {
        organizationId: membership.organizationId,
        businessId,
        blocksTransition: true,
        status: {
          notIn: Array.from(COMPLETE_DOCUMENT_REQUIREMENT_STATUSES),
        },
        OR: [
          { requiredAtStatus: null },
          { requiredAtStatus: dto.targetStatus },
        ],
      },
      select: {
        id: true,
        checklistId: true,
        name: true,
        category: true,
        status: true,
        requiredAtStatus: true,
        readRoles: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (blockers.length > 0) {
      throw new ConflictException({
        message: 'Business transition is blocked by document requirements.',
        targetStatus: dto.targetStatus,
        blockers: blockers.map((item) => ({
          id: item.id,
          checklistId: item.checklistId,
          status: item.status,
          requiredAtStatus: item.requiredAtStatus,
          ...(documentRoleAllows(item.readRoles, membership.role)
            ? { name: item.name, category: item.category }
            : {}),
        })),
      });
    }
    return { allowed: true, targetStatus: dto.targetStatus, blockers: [] };
  }

  async history(
    auth: AuthenticatedUser,
    businessId: string,
    checklistId: string,
    requirementId: string,
    organizationId?: string,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      organizationId,
      { permission: 'Business document history read', roles: READ_ROLES },
    );
    const requirement = await this.prisma.businessDocumentRequirement.findFirst(
      {
        where: {
          id: requirementId,
          organizationId: membership.organizationId,
          businessId,
          checklistId,
        },
        include: {
          documents: {
            select: DOCUMENT_HISTORY_SELECT,
            orderBy: [{ lineageId: 'asc' }, { version: 'desc' }],
          },
          events: {
            select: EVENT_HISTORY_SELECT,
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      },
    );
    if (!requirement) {
      throw new NotFoundException(
        'Business document requirement was not found.',
      );
    }
    if (!requirement.readRoles.includes(membership.role)) {
      throw new ForbiddenException('Document read role is not allowed.');
    }
    return {
      requirement: {
        id: requirement.id,
        status: requirement.status,
        name: requirement.name,
        category: requirement.category,
        businessContractId: requirement.businessContractId,
      },
      documents: requirement.documents,
      events: requirement.events,
    };
  }

  async transition(
    auth: AuthenticatedUser,
    businessId: string,
    checklistId: string,
    requirementId: string,
    dto: TransitionBusinessDocumentRequirementDto,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      dto.organizationId,
      { permission: 'Business document review', roles: WRITE_ROLES },
    );
    const reason = dto.reason?.trim();
    if (REASON_REQUIRED.has(dto.status) && !reason) {
      throw new BadRequestException(
        'A reason is required for this document transition.',
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const requirement = await tx.businessDocumentRequirement.findFirst({
        where: {
          id: requirementId,
          organizationId: membership.organizationId,
          businessId,
          checklistId,
        },
      });
      if (!requirement) {
        throw new NotFoundException(
          'Business document requirement was not found.',
        );
      }
      if (!requirement.reviewRoles.includes(membership.role)) {
        throw new ForbiddenException('Document review role is not allowed.');
      }
      this.assertTransition(
        requirement.status,
        dto.status,
        requirement.requiresReview,
      );

      const currentDocuments: Array<{ id: string }> =
        await tx.document.findMany({
          where: {
            organizationId: membership.organizationId,
            businessId,
            requirementId,
            isCurrent: true,
          },
        });
      if (
        dto.status === DocumentRequirementStatus.NOT_APPLICABLE &&
        currentDocuments.length > 0
      ) {
        throw new ConflictException(
          'A requirement with uploaded files cannot be marked not applicable.',
        );
      }
      const document = dto.documentId
        ? currentDocuments.find((item) => item.id === dto.documentId)
        : undefined;
      if (dto.documentId && !document) {
        throw new NotFoundException(
          'Current document was not found in this requirement.',
        );
      }
      if (DOCUMENT_REQUIRED.has(dto.status) && !document) {
        throw new BadRequestException(
          'A current documentId is required for this transition.',
        );
      }

      const changed = await tx.businessDocumentRequirement.updateMany({
        where: { id: requirement.id, status: requirement.status },
        data: { status: dto.status },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          'Document requirement changed. Reload before transitioning it.',
        );
      }

      const targetDocumentStatus = DOCUMENT_STATUS.get(dto.status);
      if (targetDocumentStatus) {
        const ids =
          dto.status === DocumentRequirementStatus.EXPIRED
            ? currentDocuments.map((item) => item.id)
            : [document!.id];
        if (ids.length > 0) {
          await tx.document.updateMany({
            where: { id: { in: ids }, isCurrent: true },
            data: {
              status: targetDocumentStatus,
              reviewedAt:
                dto.status === DocumentRequirementStatus.UNDER_REVIEW
                  ? undefined
                  : new Date(),
              reviewedByUserId: auth.id,
              notes: reason,
            },
          });
        }
      }

      const event = await tx.businessDocumentRequirementEvent.create({
        data: {
          organizationId: membership.organizationId,
          businessId,
          checklistId,
          requirementId,
          documentId: document?.id,
          fromStatus: requirement.status,
          toStatus: dto.status,
          reason,
          actorUserId: auth.id,
          metadata: { requiresReview: requirement.requiresReview },
        },
        select: EVENT_HISTORY_SELECT,
      });
      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          actorUserId: auth.id,
          action: 'business_documents.transition',
          targetType: 'business_document_requirement',
          targetId: requirement.id,
          metadata: {
            businessId,
            checklistId,
            documentId: document?.id,
            fromStatus: requirement.status,
            toStatus: dto.status,
            reason,
          },
        },
      });
      return {
        requirement: { id: requirement.id, status: dto.status },
        event,
      };
    });
  }

  private assertTransition(
    from: DocumentRequirementStatus,
    to: DocumentRequirementStatus,
    requiresReview: boolean,
  ) {
    const allowed = allowedTargets(from, requiresReview);
    if (!allowed.has(to)) {
      throw new ConflictException(
        `Document requirement cannot transition from ${from} to ${to}.`,
      );
    }
  }
}

const DOCUMENT_HISTORY_SELECT = {
  id: true,
  lineageId: true,
  version: true,
  isCurrent: true,
  replacesDocumentId: true,
  replacementReason: true,
  replacedAt: true,
  replacedByUserId: true,
  status: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  uploadedByUserId: true,
  reviewedByUserId: true,
  reviewedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect;

const EVENT_HISTORY_SELECT = {
  id: true,
  documentId: true,
  fromStatus: true,
  toStatus: true,
  reason: true,
  actorUserId: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.BusinessDocumentRequirementEventSelect;

function allowedTargets(
  from: DocumentRequirementStatus,
  requiresReview: boolean,
) {
  const targets = new Set<DocumentRequirementStatus>();
  if (from === DocumentRequirementStatus.REQUIRED) {
    targets.add(DocumentRequirementStatus.NOT_APPLICABLE);
  }
  if (from === DocumentRequirementStatus.UPLOADED) {
    targets.add(DocumentRequirementStatus.UNDER_REVIEW);
    targets.add(DocumentRequirementStatus.EXPIRED);
    if (!requiresReview) targets.add(DocumentRequirementStatus.APPROVED);
  }
  if (from === DocumentRequirementStatus.UNDER_REVIEW) {
    targets.add(DocumentRequirementStatus.APPROVED);
    targets.add(DocumentRequirementStatus.OBSERVED);
    targets.add(DocumentRequirementStatus.REJECTED);
    targets.add(DocumentRequirementStatus.EXPIRED);
  }
  if (from === DocumentRequirementStatus.APPROVED) {
    targets.add(DocumentRequirementStatus.EXPIRED);
  }
  return targets;
}
