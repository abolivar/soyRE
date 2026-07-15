import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentRequirementSource,
  DocumentRequirementStatus,
  MembershipRole,
  Prisma,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreateCustomDocumentRequirementDto,
  InstantiateBusinessDocumentChecklistDto,
} from './dto/business-document-checklist.dto.js';

const DEFAULT_READ_ROLES = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.OPERATIONS,
  MembershipRole.AGENT,
];
const DEFAULT_UPLOAD_ROLES = DEFAULT_READ_ROLES;
const DEFAULT_REVIEW_ROLES = [
  MembershipRole.OWNER,
  MembershipRole.ADMIN,
  MembershipRole.BROKER,
  MembershipRole.OPERATIONS,
];

const COMPLETE_STATUSES = new Set<DocumentRequirementStatus>([
  DocumentRequirementStatus.APPROVED,
  DocumentRequirementStatus.NOT_APPLICABLE,
  DocumentRequirementStatus.REPLACED,
]);

const CHECKLIST_INCLUDE = {
  requirements: {
    include: {
      businessContract: {
        select: { id: true, contractNumber: true, status: true, version: true },
      },
      client: { select: { id: true, displayName: true } },
      participant: {
        select: { id: true, displayName: true, role: true, isPrimary: true },
      },
      property: { select: { id: true, title: true, internalCode: true } },
    },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.BusinessDocumentChecklistInclude;

type ChecklistWithRequirements = Prisma.BusinessDocumentChecklistGetPayload<{
  include: typeof CHECKLIST_INCLUDE;
}>;

const BUSINESS_CONTEXT_INCLUDE = {
  property: {
    select: { id: true, organizationId: true, country: true, type: true },
  },
} satisfies Prisma.BusinessInclude;

type BusinessContext = Prisma.BusinessGetPayload<{
  include: typeof BUSINESS_CONTEXT_INCLUDE;
}>;

@Injectable()
export class BusinessDocumentChecklistsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async list(
    auth: AuthenticatedUser,
    businessId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveReadable(auth, organizationId);
    const business = await this.loadBusiness(
      businessId,
      membership.organizationId,
    );
    const checklists = await this.prisma.businessDocumentChecklist.findMany({
      where: { organizationId: membership.organizationId, businessId },
      include: CHECKLIST_INCLUDE,
      orderBy: [{ instantiatedAt: 'asc' }, { createdAt: 'asc' }],
    });

    return this.serializeCollection(membership, business, checklists);
  }

  async instantiate(
    auth: AuthenticatedUser,
    businessId: string,
    dto: InstantiateBusinessDocumentChecklistDto,
  ) {
    const membership = this.resolveWritable(auth, dto.organizationId);
    const business = await this.loadBusiness(
      businessId,
      membership.organizationId,
    );
    const template = await this.prisma.documentChecklistTemplate.findFirst({
      where: {
        id: dto.templateId,
        organizationId: membership.organizationId,
        isActive: true,
      },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!template) {
      throw new NotFoundException(
        'An active document checklist template was not found.',
      );
    }
    this.assertApplicable(template, business);

    const existing = await this.findFamilyChecklist(
      membership.organizationId,
      businessId,
      template.familyKey,
    );
    if (existing) {
      return {
        checklist: this.serializeChecklist(existing, membership.role),
        created: false,
      };
    }

    const instantiatedAt = new Date();
    try {
      const checklist = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const created = await tx.businessDocumentChecklist.create({
            data: {
              organizationId: membership.organizationId,
              businessId,
              templateId: template.id,
              templateFamilyKey: template.familyKey,
              templateName: template.name,
              templateVersion: template.version,
              applicabilitySnapshot: applicabilitySnapshot(template, business),
              createdByUserId: auth.id,
              instantiatedAt,
            },
          });

          if (template.items.length > 0) {
            await tx.businessDocumentRequirement.createMany({
              data: template.items.map(
                (
                  item: Parameters<typeof templateItemSnapshot>[0] & {
                    id: string;
                  },
                ) => ({
                  organizationId: membership.organizationId,
                  checklistId: created.id,
                  businessId,
                  templateId: template.id,
                  templateItemId: item.id,
                  source: DocumentRequirementSource.TEMPLATE,
                  key: item.key,
                  name: item.name,
                  category: item.category,
                  description: item.description,
                  required: item.required,
                  requiresReview: item.requiresReview,
                  allowsMultipleFiles: item.allowsMultipleFiles,
                  blocksTransition: item.blocksTransition,
                  requiredAtStatus: item.requiredAtStatus,
                  requiredBy: relativeDate(
                    instantiatedAt,
                    item.dueDaysAfterInstantiation,
                  ),
                  expiresAt: relativeDate(
                    instantiatedAt,
                    item.expiresAfterDays,
                  ),
                  participantRole: item.participantRole,
                  readRoles: item.readRoles,
                  uploadRoles: item.uploadRoles,
                  reviewRoles: item.reviewRoles,
                  sortOrder: item.sortOrder,
                  itemSnapshot: templateItemSnapshot(item),
                  createdByUserId: auth.id,
                }),
              ),
            });
          }

          await this.audit(tx, {
            action: 'business_document_checklists.instantiate',
            actorUserId: auth.id,
            organizationId: membership.organizationId,
            targetType: 'business_document_checklist',
            targetId: created.id,
            metadata: {
              businessId,
              templateId: template.id,
              templateFamilyKey: template.familyKey,
              templateVersion: template.version,
              requirementCount: template.items.length,
            },
          });

          return tx.businessDocumentChecklist.findUniqueOrThrow({
            where: { id: created.id },
            include: CHECKLIST_INCLUDE,
          });
        },
      );

      return {
        checklist: this.serializeChecklist(checklist, membership.role),
        created: true,
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      const concurrent = await this.findFamilyChecklist(
        membership.organizationId,
        businessId,
        template.familyKey,
      );
      if (!concurrent) throw error;
      return {
        checklist: this.serializeChecklist(concurrent, membership.role),
        created: false,
      };
    }
  }

  async addCustomRequirement(
    auth: AuthenticatedUser,
    businessId: string,
    checklistId: string,
    dto: CreateCustomDocumentRequirementDto,
  ) {
    const membership = this.resolveWritable(auth, dto.organizationId);
    const business = await this.loadBusiness(
      businessId,
      membership.organizationId,
    );
    const checklist = await this.prisma.businessDocumentChecklist.findFirst({
      where: {
        id: checklistId,
        organizationId: membership.organizationId,
        businessId,
      },
    });
    if (!checklist) {
      throw new NotFoundException('Business document checklist was not found.');
    }

    await this.validateCustomRelations(
      membership.organizationId,
      business,
      dto,
    );
    const requiredBy = dateOnly(dto.requiredBy);
    const expiresAt = dateOnly(dto.expiresAt);
    if (requiredBy && expiresAt && expiresAt < requiredBy) {
      throw new BadRequestException(
        'Document expiration cannot be earlier than its required date.',
      );
    }

    const requirement = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const maxSortOrder = await tx.businessDocumentRequirement.aggregate({
          where: {
            organizationId: membership.organizationId,
            checklistId,
          },
          _max: { sortOrder: true },
        });
        const created = await tx.businessDocumentRequirement.create({
          data: {
            organizationId: membership.organizationId,
            checklistId,
            businessId,
            templateId: checklist.templateId,
            source: DocumentRequirementSource.CUSTOM,
            key: `custom-${randomUUID()}`,
            name: dto.name.trim(),
            category: dto.category.trim(),
            description: cleanText(dto.description),
            required: dto.required ?? false,
            requiresReview: dto.requiresReview ?? false,
            allowsMultipleFiles: dto.allowsMultipleFiles ?? true,
            blocksTransition: dto.blocksTransition ?? false,
            requiredAtStatus: dto.requiredAtStatus,
            requiredBy,
            expiresAt,
            participantRole: dto.participantRole,
            participantId: dto.participantId,
            clientId: dto.clientId,
            propertyId: dto.propertyId,
            businessContractId: dto.businessContractId,
            readRoles: unique(dto.readRoles ?? DEFAULT_READ_ROLES),
            uploadRoles: unique(dto.uploadRoles ?? DEFAULT_UPLOAD_ROLES),
            reviewRoles: unique(dto.reviewRoles ?? DEFAULT_REVIEW_ROLES),
            sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
            itemSnapshot: customRequirementSnapshot(dto),
            customReason: dto.reason.trim(),
            createdByUserId: auth.id,
          },
          include: CHECKLIST_INCLUDE.requirements.include,
        });

        await this.audit(tx, {
          action: 'business_document_requirements.create_custom',
          actorUserId: auth.id,
          organizationId: membership.organizationId,
          targetType: 'business_document_requirement',
          targetId: created.id,
          metadata: {
            businessId,
            checklistId,
            category: created.category,
            clientId: created.clientId,
            propertyId: created.propertyId,
            businessContractId: created.businessContractId,
            participantId: created.participantId,
          },
        });
        return created;
      },
    );

    if (!canRead(requirement.readRoles, membership.role)) {
      return { requirementId: requirement.id, created: true };
    }
    return { requirement, created: true };
  }

  private async validateCustomRelations(
    organizationId: string,
    business: BusinessContext,
    dto: CreateCustomDocumentRequirementDto,
  ) {
    if (dto.propertyId) {
      const property = await this.prisma.property.findFirst({
        where: { id: dto.propertyId, organizationId },
        select: { id: true },
      });
      if (!property || business.propertyId !== dto.propertyId) {
        throw new BadRequestException(
          'Property must belong to this organization and business.',
        );
      }
    }

    if (dto.participantId) {
      const participant = await this.prisma.businessParticipant.findFirst({
        where: {
          id: dto.participantId,
          organizationId,
          businessId: business.id,
        },
        select: { id: true },
      });
      if (!participant) {
        throw new BadRequestException(
          'Participant must belong to this organization and business.',
        );
      }
    }

    if (dto.businessContractId) {
      const contract = await this.prisma.businessContract.findFirst({
        where: { id: dto.businessContractId, businessId: business.id },
        select: { id: true },
      });
      if (!contract) {
        throw new BadRequestException('Contract must belong to this business.');
      }
    }

    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, organizationId },
        select: { id: true },
      });
      const participant = client
        ? await this.prisma.businessParticipant.findFirst({
            where: {
              organizationId,
              businessId: business.id,
              clientId: dto.clientId,
            },
            select: { id: true },
          })
        : null;
      if (
        !client ||
        (business.primaryClientId !== dto.clientId && !participant)
      ) {
        throw new BadRequestException(
          'Client must belong to this organization and participate in the business.',
        );
      }
    }
  }

  private assertApplicable(
    template: {
      operationTypes: BusinessContext['operationType'][];
      countries: string[];
      propertyTypes: string[];
      contractTypeIds: string[];
      businessStatuses: BusinessContext['status'][];
    },
    business: BusinessContext,
  ) {
    const failures: string[] = [];
    if (
      template.operationTypes.length > 0 &&
      !template.operationTypes.includes(business.operationType)
    ) {
      failures.push('operation type');
    }
    if (
      template.businessStatuses.length > 0 &&
      !template.businessStatuses.includes(business.status)
    ) {
      failures.push('business status');
    }
    if (
      template.contractTypeIds.length > 0 &&
      (!business.contractTypeId ||
        !template.contractTypeIds.includes(business.contractTypeId))
    ) {
      failures.push('contract type');
    }
    if (
      template.countries.length > 0 &&
      (!business.property ||
        !template.countries.includes(business.property.country.toUpperCase()))
    ) {
      failures.push('country');
    }
    if (
      template.propertyTypes.length > 0 &&
      (!business.property ||
        !template.propertyTypes.includes(business.property.type))
    ) {
      failures.push('property type');
    }
    if (
      business.property &&
      business.property.organizationId !== business.organizationId
    ) {
      failures.push('property organization');
    }
    if (failures.length > 0) {
      throw new ConflictException(
        `Document template is not applicable by ${failures.join(', ')}.`,
      );
    }
  }

  private async loadBusiness(id: string, organizationId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id, organizationId },
      include: BUSINESS_CONTEXT_INCLUDE,
    });
    if (!business) {
      throw new NotFoundException('Business was not found.');
    }
    return business;
  }

  private findFamilyChecklist(
    organizationId: string,
    businessId: string,
    templateFamilyKey: string,
  ) {
    return this.prisma.businessDocumentChecklist.findFirst({
      where: { organizationId, businessId, templateFamilyKey },
      include: CHECKLIST_INCLUDE,
    });
  }

  private resolveReadable(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Business document checklist read',
      roles: READ_ROLES,
    });
  }

  private resolveWritable(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Business document checklist write',
      roles: WRITE_ROLES,
    });
  }

  private serializeCollection(
    membership: ReturnType<OrganizationAccessService['resolveMembership']>,
    business: BusinessContext,
    checklists: ChecklistWithRequirements[],
  ) {
    const serialized = checklists.map((checklist) =>
      this.serializeChecklist(checklist, membership.role),
    );
    const requirements = serialized.flatMap(
      (checklist) => checklist.requirements,
    );
    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      business: {
        id: business.id,
        code: business.code,
        title: business.title,
        status: business.status,
        operationType: business.operationType,
      },
      summary: requirementSummary(requirements),
      checklists: serialized,
    };
  }

  private serializeChecklist(
    checklist: ChecklistWithRequirements,
    role: MembershipRole,
  ) {
    const requirements = checklist.requirements.filter(
      (requirement: { readRoles: MembershipRole[] }) =>
        canRead(requirement.readRoles, role),
    );
    return {
      ...checklist,
      requirements,
      summary: requirementSummary(requirements),
    };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    entry: {
      action: string;
      actorUserId: string;
      organizationId: string;
      targetType: string;
      targetId: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    await tx.auditLog.create({
      data: entry,
    });
  }
}

function applicabilitySnapshot(
  template: {
    operationTypes: unknown[];
    countries: string[];
    propertyTypes: string[];
    contractTypeIds: string[];
    businessStatuses: unknown[];
  },
  business: BusinessContext,
) {
  return jsonObject({
    criteria: {
      operationTypes: template.operationTypes,
      countries: template.countries,
      propertyTypes: template.propertyTypes,
      contractTypeIds: template.contractTypeIds,
      businessStatuses: template.businessStatuses,
    },
    business: {
      operationType: business.operationType,
      status: business.status,
      contractTypeId: business.contractTypeId,
      propertyId: business.propertyId,
      country: business.property?.country,
      propertyType: business.property?.type,
    },
  });
}

function templateItemSnapshot(item: {
  key: string;
  name: string;
  category: string;
  description: string | null;
  required: boolean;
  requiresReview: boolean;
  allowsMultipleFiles: boolean;
  blocksTransition: boolean;
  requiredAtStatus: unknown;
  dueDaysAfterInstantiation: number | null;
  expiresAfterDays: number | null;
  participantRole: unknown;
  readRoles: unknown[];
  uploadRoles: unknown[];
  reviewRoles: unknown[];
  sortOrder: number;
  metadata: unknown;
}) {
  return jsonObject({
    key: item.key,
    name: item.name,
    category: item.category,
    description: item.description,
    required: item.required,
    requiresReview: item.requiresReview,
    allowsMultipleFiles: item.allowsMultipleFiles,
    blocksTransition: item.blocksTransition,
    requiredAtStatus: item.requiredAtStatus,
    dueDaysAfterInstantiation: item.dueDaysAfterInstantiation,
    expiresAfterDays: item.expiresAfterDays,
    participantRole: item.participantRole,
    readRoles: item.readRoles,
    uploadRoles: item.uploadRoles,
    reviewRoles: item.reviewRoles,
    sortOrder: item.sortOrder,
    metadata: item.metadata,
  });
}

function customRequirementSnapshot(dto: CreateCustomDocumentRequirementDto) {
  return jsonObject({
    source: DocumentRequirementSource.CUSTOM,
    name: dto.name.trim(),
    category: dto.category.trim(),
    description: cleanText(dto.description),
    reason: dto.reason.trim(),
    required: dto.required ?? false,
    requiresReview: dto.requiresReview ?? false,
    allowsMultipleFiles: dto.allowsMultipleFiles ?? true,
    blocksTransition: dto.blocksTransition ?? false,
    requiredAtStatus: dto.requiredAtStatus,
    requiredBy: dto.requiredBy,
    expiresAt: dto.expiresAt,
    participantRole: dto.participantRole,
    participantId: dto.participantId,
    clientId: dto.clientId,
    propertyId: dto.propertyId,
    businessContractId: dto.businessContractId,
    readRoles: unique(dto.readRoles ?? DEFAULT_READ_ROLES),
    uploadRoles: unique(dto.uploadRoles ?? DEFAULT_UPLOAD_ROLES),
    reviewRoles: unique(dto.reviewRoles ?? DEFAULT_REVIEW_ROLES),
    metadata: dto.metadata,
  });
}

function requirementSummary(
  requirements: Array<{
    id: string;
    name: string;
    category: string;
    status: DocumentRequirementStatus;
    required: boolean;
    blocksTransition: boolean;
    requiredAtStatus: unknown;
  }>,
) {
  const completed = requirements.filter((item) =>
    COMPLETE_STATUSES.has(item.status),
  );
  const pending = requirements.filter(
    (item) => item.required && !COMPLETE_STATUSES.has(item.status),
  );
  const required = requirements.filter((item) => item.required);
  const completedRequired = required.filter((item) =>
    COMPLETE_STATUSES.has(item.status),
  );
  const blockers = requirements.filter(
    (item) => item.blocksTransition && !COMPLETE_STATUSES.has(item.status),
  );
  return {
    total: requirements.length,
    required: required.length,
    completed: completed.length,
    pending: pending.length,
    blockers: blockers.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      status: item.status,
      requiredAtStatus: item.requiredAtStatus,
    })),
    progressPercentage:
      required.length === 0
        ? 100
        : Math.round((completedRequired.length / required.length) * 100),
  };
}

function canRead(roles: MembershipRole[], role: MembershipRole) {
  return roles.includes(role);
}

function relativeDate(base: Date, days: number | null) {
  if (days === null) return undefined;
  const value = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()),
  );
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function dateOnly(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function cleanText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function jsonObject(value: object) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
