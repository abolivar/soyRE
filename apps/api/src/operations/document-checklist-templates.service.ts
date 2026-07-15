import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MembershipRole,
  Prisma,
} from '@soyre/database';
import { MANAGER_ROLES } from '../auth/authorization.constants.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  CreateDocumentChecklistTemplateDto,
  DocumentChecklistTemplateItemDto,
  DocumentChecklistTemplateQueryDto,
  UpdateDocumentChecklistTemplateDto,
} from './dto/document-checklist-template.dto.js';

const TEMPLATE_INCLUDE = {
  items: { orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }] },
  previousVersion: {
    select: { id: true, version: true },
  },
  _count: {
    select: { checklists: true },
  },
} satisfies Prisma.DocumentChecklistTemplateInclude;

type TemplateWithDetails = Prisma.DocumentChecklistTemplateGetPayload<{
  include: typeof TEMPLATE_INCLUDE;
}>;

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

@Injectable()
export class DocumentChecklistTemplatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  async list(
    auth: AuthenticatedUser,
    query: DocumentChecklistTemplateQueryDto,
  ) {
    const membership = this.resolveManager(auth, query.organizationId);
    const templates = await this.prisma.documentChecklistTemplate.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(query.includeInactive ? {} : { isActive: true }),
      },
      include: TEMPLATE_INCLUDE,
      orderBy: [{ familyKey: 'asc' }, { version: 'desc' }],
    });

    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      templates: templates.map((template: TemplateWithDetails) =>
        this.serialize(template),
      ),
    };
  }

  async get(
    auth: AuthenticatedUser,
    templateId: string,
    organizationId?: string,
  ) {
    const membership = this.resolveManager(auth, organizationId);
    const template = await this.load(templateId, membership.organizationId);
    return { template: this.serialize(template) };
  }

  async create(
    auth: AuthenticatedUser,
    dto: CreateDocumentChecklistTemplateDto,
  ) {
    const membership = this.resolveManager(auth, dto.organizationId);
    this.assertUniqueItemKeys(dto.items);
    await this.assertContractTypes(
      membership.organizationId,
      dto.contractTypeIds ?? [],
    );

    const duplicate = await this.prisma.documentChecklistTemplate.findFirst({
      where: {
        organizationId: membership.organizationId,
        familyKey: dto.familyKey,
        version: 1,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('Template family already exists.');
    }

    const template = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (dto.isActive) {
          await this.assertNoActiveFamily(
            tx,
            membership.organizationId,
            dto.familyKey,
          );
        }

        const created = await tx.documentChecklistTemplate.create({
          data: {
            organizationId: membership.organizationId,
            familyKey: dto.familyKey,
            name: dto.name.trim(),
            description: cleanText(dto.description),
            version: 1,
            isActive: dto.isActive ?? false,
            operationTypes: unique(dto.operationTypes),
            countries: normalizeCodes(dto.countries),
            propertyTypes: normalizeTextArray(dto.propertyTypes),
            contractTypeIds: unique(dto.contractTypeIds),
            businessStatuses: unique(dto.businessStatuses),
            createdByUserId: auth.id,
            publishedAt: dto.isActive ? new Date() : undefined,
            items: {
              create: dto.items.map((item, index) =>
                this.itemData(item, index),
              ),
            },
          },
          include: TEMPLATE_INCLUDE,
        });

        await this.audit(tx, {
          action: 'document_templates.create',
          actorUserId: auth.id,
          organizationId: membership.organizationId,
          targetId: created.id,
          metadata: {
            familyKey: created.familyKey,
            version: created.version,
            isActive: created.isActive,
            itemCount: created.items.length,
          },
        });
        return created;
      },
    );

    return { template: this.serialize(template), versionCreated: false };
  }

  async update(
    auth: AuthenticatedUser,
    templateId: string,
    dto: UpdateDocumentChecklistTemplateDto,
  ) {
    const membership = this.resolveManager(auth, dto.organizationId);
    const existing = await this.load(templateId, membership.organizationId);
    if (dto.items) {
      this.assertUniqueItemKeys(dto.items);
    }
    const contractTypeIds = dto.contractTypeIds ?? existing.contractTypeIds;
    await this.assertContractTypes(membership.organizationId, contractTypeIds);

    if (existing.isActive || existing._count.checklists > 0) {
      return this.createNextVersion(auth, membership.organizationId, existing, dto);
    }

    const template = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const updated = await tx.documentChecklistTemplate.update({
          where: { id: existing.id },
          data: {
            name: dto.name?.trim(),
            description:
              dto.description === undefined
                ? undefined
                : cleanText(dto.description),
            operationTypes: dto.operationTypes
              ? unique(dto.operationTypes)
              : undefined,
            countries: dto.countries ? normalizeCodes(dto.countries) : undefined,
            propertyTypes: dto.propertyTypes
              ? normalizeTextArray(dto.propertyTypes)
              : undefined,
            contractTypeIds: dto.contractTypeIds
              ? unique(dto.contractTypeIds)
              : undefined,
            businessStatuses: dto.businessStatuses
              ? unique(dto.businessStatuses)
              : undefined,
            items: dto.items
              ? {
                  deleteMany: {},
                  create: dto.items.map((item, index) =>
                    this.itemData(item, index),
                  ),
                }
              : undefined,
          },
          include: TEMPLATE_INCLUDE,
        });

        await this.audit(tx, {
          action: 'document_templates.update_draft',
          actorUserId: auth.id,
          organizationId: membership.organizationId,
          targetId: updated.id,
          metadata: {
            familyKey: updated.familyKey,
            version: updated.version,
            itemCount: updated.items.length,
          },
        });
        return updated;
      },
    );

    return { template: this.serialize(template), versionCreated: false };
  }

  async setActive(
    auth: AuthenticatedUser,
    templateId: string,
    organizationId: string | undefined,
    isActive: boolean,
  ) {
    const membership = this.resolveManager(auth, organizationId);
    const existing = await this.load(templateId, membership.organizationId);

    const template = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (isActive) {
          await tx.documentChecklistTemplate.updateMany({
            where: {
              organizationId: membership.organizationId,
              familyKey: existing.familyKey,
              isActive: true,
              id: { not: existing.id },
            },
            data: { isActive: false },
          });
        }

        const updated = await tx.documentChecklistTemplate.update({
          where: { id: existing.id },
          data: {
            isActive,
            publishedAt:
              isActive && !existing.publishedAt ? new Date() : undefined,
          },
          include: TEMPLATE_INCLUDE,
        });

        await this.audit(tx, {
          action: isActive
            ? 'document_templates.activate'
            : 'document_templates.deactivate',
          actorUserId: auth.id,
          organizationId: membership.organizationId,
          targetId: updated.id,
          metadata: {
            familyKey: updated.familyKey,
            version: updated.version,
          },
        });
        return updated;
      },
    );

    return { template: this.serialize(template) };
  }

  private async createNextVersion(
    auth: AuthenticatedUser,
    organizationId: string,
    existing: TemplateWithDetails,
    dto: UpdateDocumentChecklistTemplateDto,
  ) {
    const version = await this.prisma.documentChecklistTemplate.aggregate({
      where: { organizationId, familyKey: existing.familyKey },
      _max: { version: true },
    });
    const nextVersion = (version._max.version ?? existing.version) + 1;
    const sourceItems = dto.items ?? existing.items;

    const template = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.documentChecklistTemplate.create({
          data: {
            organizationId,
            familyKey: existing.familyKey,
            name: dto.name?.trim() ?? existing.name,
            description:
              dto.description === undefined
                ? existing.description
                : cleanText(dto.description),
            version: nextVersion,
            isActive: false,
            operationTypes: dto.operationTypes
              ? unique(dto.operationTypes)
              : existing.operationTypes,
            countries: dto.countries
              ? normalizeCodes(dto.countries)
              : existing.countries,
            propertyTypes: dto.propertyTypes
              ? normalizeTextArray(dto.propertyTypes)
              : existing.propertyTypes,
            contractTypeIds: dto.contractTypeIds
              ? unique(dto.contractTypeIds)
              : existing.contractTypeIds,
            businessStatuses: dto.businessStatuses
              ? unique(dto.businessStatuses)
              : existing.businessStatuses,
            previousVersionId: existing.id,
            createdByUserId: auth.id,
            items: {
              create: sourceItems.map(
                (
                  item:
                    | DocumentChecklistTemplateItemDto
                    | TemplateWithDetails['items'][number],
                  index: number,
                ) => this.itemData(item, index),
              ),
            },
          },
          include: TEMPLATE_INCLUDE,
        });

        await this.audit(tx, {
          action: 'document_templates.create_version',
          actorUserId: auth.id,
          organizationId,
          targetId: created.id,
          metadata: {
            familyKey: created.familyKey,
            previousVersionId: existing.id,
            previousVersion: existing.version,
            version: created.version,
            itemCount: created.items.length,
          },
        });
        return created;
      },
    );

    return { template: this.serialize(template), versionCreated: true };
  }

  private async load(id: string, organizationId: string) {
    const template = await this.prisma.documentChecklistTemplate.findFirst({
      where: { id, organizationId },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) {
      throw new NotFoundException('Document checklist template was not found.');
    }
    return template;
  }

  private resolveManager(auth: AuthenticatedUser, organizationId?: string) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Document template management',
      roles: MANAGER_ROLES,
    });
  }

  private async assertContractTypes(
    organizationId: string,
    contractTypeIds: string[],
  ) {
    const ids = unique(contractTypeIds);
    if (ids.length === 0) return;
    const count = await this.prisma.contractType.count({
      where: {
        id: { in: ids },
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (count !== ids.length) {
      throw new BadRequestException(
        'Every contract type must belong to this organization or be global.',
      );
    }
  }

  private assertUniqueItemKeys(items: Array<{ key: string }>) {
    const keys = items.map((item) => item.key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Template item keys must be unique.');
    }
  }

  private async assertNoActiveFamily(
    tx: Prisma.TransactionClient,
    organizationId: string,
    familyKey: string,
  ) {
    const active = await tx.documentChecklistTemplate.findFirst({
      where: { organizationId, familyKey, isActive: true },
      select: { id: true },
    });
    if (active) {
      throw new ConflictException('An active version already exists.');
    }
  }

  private itemData(
    item: DocumentChecklistTemplateItemDto | TemplateWithDetails['items'][number],
    index: number,
  ): Prisma.DocumentChecklistTemplateItemCreateWithoutTemplateInput {
    return {
      key: item.key,
      name: item.name.trim(),
      category: item.category.trim(),
      description: cleanText(item.description),
      required: item.required ?? true,
      requiresReview: item.requiresReview ?? false,
      allowsMultipleFiles: item.allowsMultipleFiles ?? false,
      blocksTransition: item.blocksTransition ?? false,
      requiredAtStatus: item.requiredAtStatus,
      dueDaysAfterInstantiation: item.dueDaysAfterInstantiation,
      expiresAfterDays: item.expiresAfterDays,
      participantRole: item.participantRole,
      readRoles: unique(item.readRoles ?? DEFAULT_READ_ROLES),
      uploadRoles: unique(item.uploadRoles ?? DEFAULT_UPLOAD_ROLES),
      reviewRoles: unique(item.reviewRoles ?? DEFAULT_REVIEW_ROLES),
      sortOrder: item.sortOrder ?? index,
      metadata: inputJsonObject(item.metadata),
    };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    entry: {
      action: string;
      actorUserId: string;
      organizationId: string;
      targetId: string;
      metadata: Prisma.InputJsonValue;
    },
  ) {
    await tx.auditLog.create({
      data: { ...entry, targetType: 'document_checklist_template' },
    });
  }

  private serialize(template: TemplateWithDetails) {
    return {
      ...template,
      usedByBusinesses: template._count.checklists,
      _count: undefined,
    };
  }
}

function cleanText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function unique<T>(values?: T[]) {
  return [...new Set(values ?? [])];
}

function normalizeCodes(values?: string[]) {
  return unique(values?.map((value) => value.trim().toUpperCase()).filter(Boolean));
}

function normalizeTextArray(values?: string[]) {
  return unique(values?.map((value) => value.trim()).filter(Boolean));
}

function inputJsonObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Prisma.InputJsonObject)
    : undefined;
}
