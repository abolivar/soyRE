import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingMaterialStatus,
  ListingMaterialType,
  ListingStatus,
  ListingTransitionAction,
  MembershipRole,
  Prisma,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  ChangeListingMaterialDto,
  CreateListingMaterialDto,
  ListingMaterialChange,
} from './dto/listing-material.dto.js';
import { ListingMaterialStorageService } from './listing-material-storage.service.js';

export type CommercialMaterialFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FILE_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);
const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 20_000,
} as const;

@Injectable()
export class ListingMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccess: OrganizationAccessService,
    private readonly storage: ListingMaterialStorageService,
  ) {}

  async create(
    auth: AuthenticatedUser,
    listingId: string,
    dto: CreateListingMaterialDto,
    file?: CommercialMaterialFile,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      dto.organizationId,
      { permission: 'Listing material write', roles: WRITE_ROLES },
    );
    const existing = await this.prisma.listingEvent.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: membership.organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
      select: { listingId: true, metadata: true },
    });
    if (existing) {
      if (existing.listingId !== listingId) {
        throw new ConflictException(
          'Idempotency key was already used for another listing.',
        );
      }
      const materialId = materialIdFromMetadata(existing.metadata);
      if (!materialId) {
        throw new ConflictException(
          'Idempotency key was already used for another listing action.',
        );
      }
      return this.response(
        await this.findMaterial(
          membership.organizationId,
          listingId,
          materialId,
        ),
      );
    }
    const listing = await this.findEditableListing(
      membership.organizationId,
      listingId,
    );
    this.assertAgent(auth, membership.role, listing);
    this.assertEditable(listing.status, dto.reason);
    const source = validateCommercialMaterialSource(
      dto.type,
      dto.externalUrl,
      file,
    );
    if (dto.type === ListingMaterialType.COVER_IMAGE) {
      const currentCover = await this.prisma.listingMaterial.findFirst({
        where: {
          organizationId: membership.organizationId,
          listingId,
          type: ListingMaterialType.COVER_IMAGE,
          isCurrent: true,
        },
        select: { id: true },
      });
      if (currentCover) {
        throw new ConflictException(
          'Replace the current cover instead of adding a second cover.',
        );
      }
    }
    let storagePath: string | undefined;
    if (file) {
      storagePath = await this.storage.upload({
        organizationId: membership.organizationId,
        listingId,
        fileName: file.originalname,
        mimeType: source.mimeType!,
        contents: file.buffer,
      });
    }
    try {
      const material = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const current = await tx.listing.findFirst({
            where: { id: listingId, organizationId: membership.organizationId },
            select: { id: true, propertyId: true, status: true },
          });
          if (!current) throw new NotFoundException('Listing not found.');
          this.assertEditable(current.status, dto.reason);
          const created = await tx.listingMaterial.create({
            data: {
              organizationId: membership.organizationId,
              listingId,
              type: dto.type,
              name: dto.name.trim(),
              altText: cleanText(dto.altText),
              externalUrl: source.externalUrl,
              storagePath,
              mimeType: source.mimeType,
              fileSize: source.fileSize,
              sortOrder: dto.sortOrder ?? 0,
              createdByUserId: auth.id,
            },
          });
          const nextStatus =
            current.status === ListingStatus.READY
              ? ListingStatus.DRAFT
              : current.status;
          if (nextStatus !== current.status) {
            await tx.listing.update({
              where: { id: listingId },
              data: { status: nextStatus, readiness: Prisma.DbNull },
            });
          }
          await tx.listingEvent.create({
            data: {
              organizationId: membership.organizationId,
              listingId,
              actorUserId: auth.id,
              action: ListingTransitionAction.MATERIAL_ADDED,
              fromStatus: current.status,
              toStatus: nextStatus,
              reason: cleanText(dto.reason),
              idempotencyKey: dto.idempotencyKey,
              metadata: { materialId: created.id, type: created.type },
            },
          });
          await this.audit(tx, membership.organizationId, auth.id, current, {
            action: 'listings.material_added',
            materialId: created.id,
          });
          return created;
        },
        TX_OPTIONS,
      );
      return this.response(material);
    } catch (error) {
      if (storagePath) await this.storage.remove(storagePath);
      throwMaterialConflict(error);
      throw error;
    }
  }

  async change(
    auth: AuthenticatedUser,
    listingId: string,
    materialId: string,
    dto: ChangeListingMaterialDto,
    file?: CommercialMaterialFile,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      dto.organizationId,
      { permission: 'Listing material write', roles: WRITE_ROLES },
    );
    const listing = await this.findEditableListing(
      membership.organizationId,
      listingId,
    );
    this.assertAgent(auth, membership.role, listing);
    this.assertEditable(listing.status, dto.reason);
    const repeated = await this.prisma.listingEvent.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: membership.organizationId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
      select: { listingId: true, metadata: true },
    });
    if (repeated) {
      if (repeated.listingId !== listingId) {
        throw new ConflictException(
          'Idempotency key was already used for another listing.',
        );
      }
      const repeatedMaterialId = materialIdFromMetadata(repeated.metadata);
      if (!repeatedMaterialId) {
        throw new ConflictException(
          'Idempotency key was already used for another listing action.',
        );
      }
      return this.response(
        await this.findMaterial(
          membership.organizationId,
          listingId,
          repeatedMaterialId,
        ),
      );
    }
    const currentMaterial = await this.findMaterial(
      membership.organizationId,
      listingId,
      materialId,
    );
    if (!currentMaterial.isCurrent) {
      throw new ConflictException('Only a current material can be changed.');
    }
    if (
      dto.change !== ListingMaterialChange.REORDER &&
      !cleanText(dto.reason)
    ) {
      throw new BadRequestException(
        'A reason is required to archive or replace a material.',
      );
    }
    if (dto.change === ListingMaterialChange.REORDER) {
      if (dto.sortOrder === undefined || file || dto.externalUrl) {
        throw new BadRequestException(
          'Reordering requires only a valid sort order.',
        );
      }
      return this.applySimpleChange(
        auth,
        membership.organizationId,
        listingId,
        currentMaterial,
        dto,
      );
    }
    if (dto.change === ListingMaterialChange.ARCHIVE) {
      if (file || dto.externalUrl) {
        throw new BadRequestException(
          'Archiving does not accept a new source.',
        );
      }
      return this.applySimpleChange(
        auth,
        membership.organizationId,
        listingId,
        currentMaterial,
        dto,
      );
    }
    if (!dto.type || !dto.name?.trim()) {
      throw new BadRequestException(
        'Replacing a material requires its type and name.',
      );
    }
    const replacementType = dto.type;
    const replacementName = dto.name.trim();
    const source = validateCommercialMaterialSource(
      replacementType,
      dto.externalUrl,
      file,
    );
    if (
      replacementType === ListingMaterialType.COVER_IMAGE &&
      currentMaterial.type !== ListingMaterialType.COVER_IMAGE
    ) {
      const currentCover = await this.prisma.listingMaterial.findFirst({
        where: {
          organizationId: membership.organizationId,
          listingId,
          type: ListingMaterialType.COVER_IMAGE,
          isCurrent: true,
        },
        select: { id: true },
      });
      if (currentCover) {
        throw new ConflictException(
          'Archive or replace the current cover before assigning another one.',
        );
      }
    }
    let storagePath: string | undefined;
    if (file) {
      storagePath = await this.storage.upload({
        organizationId: membership.organizationId,
        listingId,
        fileName: file.originalname,
        mimeType: source.mimeType!,
        contents: file.buffer,
      });
    }
    try {
      const replacement = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const now = new Date();
          const changed = await tx.listingMaterial.updateMany({
            where: {
              id: materialId,
              organizationId: membership.organizationId,
              listingId,
              isCurrent: true,
            },
            data: {
              status: ListingMaterialStatus.REPLACED,
              isCurrent: false,
              replacedAt: now,
              replacedByUserId: auth.id,
              replacementReason: dto.reason!.trim(),
            },
          });
          if (changed.count !== 1) {
            throw new ConflictException('Material changed concurrently.');
          }
          const created = await tx.listingMaterial.create({
            data: {
              organizationId: membership.organizationId,
              listingId,
              type: replacementType,
              name: replacementName,
              altText: cleanText(dto.altText),
              externalUrl: source.externalUrl,
              storagePath,
              mimeType: source.mimeType,
              fileSize: source.fileSize,
              sortOrder: dto.sortOrder ?? currentMaterial.sortOrder,
              replacesMaterialId: materialId,
              createdByUserId: auth.id,
            },
          });
          await this.materialEvent(tx, {
            organizationId: membership.organizationId,
            listingId,
            actorUserId: auth.id,
            status: listing.status,
            action: ListingTransitionAction.MATERIAL_REPLACED,
            idempotencyKey: dto.idempotencyKey,
            reason: dto.reason,
            materialId: created.id,
            previousMaterialId: materialId,
          });
          await this.invalidateReady(tx, listingId, listing.status);
          await this.audit(tx, membership.organizationId, auth.id, listing, {
            action: 'listings.material_replaced',
            materialId: created.id,
          });
          return created;
        },
        TX_OPTIONS,
      );
      return this.response(replacement);
    } catch (error) {
      if (storagePath) await this.storage.remove(storagePath);
      throwMaterialConflict(error);
      throw error;
    }
  }

  async preview(
    auth: AuthenticatedUser,
    listingId: string,
    materialId: string,
    organizationId?: string,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      organizationId,
      { permission: 'Listing material read', roles: READ_ROLES },
    );
    const listing = await this.findEditableListing(
      membership.organizationId,
      listingId,
    );
    if (
      (membership.role === MembershipRole.AGENT ||
        membership.role === MembershipRole.EXTERNAL_AGENT) &&
      listing.assignedUserId !== auth.id
    ) {
      throw new NotFoundException('Material not found.');
    }
    const material = await this.findMaterial(
      membership.organizationId,
      listingId,
      materialId,
    );
    if (material.externalUrl)
      return { url: material.externalUrl, expiresIn: null };
    if (!material.storagePath)
      throw new NotFoundException('Material source not found.');
    return {
      url: await this.storage.signedUrl(material.storagePath),
      expiresIn: 60,
    };
  }

  private async applySimpleChange(
    auth: AuthenticatedUser,
    organizationId: string,
    listingId: string,
    material: Awaited<ReturnType<ListingMaterialsService['findMaterial']>>,
    dto: ChangeListingMaterialDto,
  ) {
    const isArchive = dto.change === ListingMaterialChange.ARCHIVE;
    const action = isArchive
      ? ListingTransitionAction.MATERIAL_ARCHIVED
      : ListingTransitionAction.MATERIAL_REORDERED;
    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const listing = await tx.listing.findFirst({
          where: { id: listingId, organizationId },
          select: { propertyId: true, status: true },
        });
        if (!listing) throw new NotFoundException('Listing not found.');
        const changed = await tx.listingMaterial.updateMany({
          where: {
            id: material.id,
            organizationId,
            listingId,
            isCurrent: true,
          },
          data: isArchive
            ? {
                status: ListingMaterialStatus.ARCHIVED,
                isCurrent: false,
                replacedAt: new Date(),
                replacedByUserId: auth.id,
                replacementReason: dto.reason!.trim(),
              }
            : { sortOrder: dto.sortOrder },
        });
        if (changed.count !== 1)
          throw new ConflictException('Material changed concurrently.');
        await this.materialEvent(tx, {
          organizationId,
          listingId,
          actorUserId: auth.id,
          status: listing.status,
          action,
          idempotencyKey: dto.idempotencyKey,
          reason: dto.reason,
          materialId: material.id,
        });
        await this.invalidateReady(tx, listingId, listing.status);
        await this.audit(
          tx,
          organizationId,
          auth.id,
          {
            id: listingId,
            propertyId: listing.propertyId,
            status: listing.status,
          },
          {
            action: isArchive
              ? 'listings.material_archived'
              : 'listings.material_reordered',
            materialId: material.id,
          },
        );
        return tx.listingMaterial.findUniqueOrThrow({
          where: { id: material.id },
        });
      },
      TX_OPTIONS,
    );
    return this.response(updated);
  }

  private materialEvent(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      listingId: string;
      actorUserId: string;
      status: ListingStatus;
      action: ListingTransitionAction;
      idempotencyKey: string;
      reason?: string;
      materialId: string;
      previousMaterialId?: string;
    },
  ) {
    const nextStatus =
      input.status === ListingStatus.READY ? ListingStatus.DRAFT : input.status;
    return tx.listingEvent.create({
      data: {
        organizationId: input.organizationId,
        listingId: input.listingId,
        actorUserId: input.actorUserId,
        action: input.action,
        fromStatus: input.status,
        toStatus: nextStatus,
        idempotencyKey: input.idempotencyKey,
        reason: cleanText(input.reason),
        metadata: {
          materialId: input.materialId,
          previousMaterialId: input.previousMaterialId,
        },
      },
    });
  }

  private async invalidateReady(
    tx: Prisma.TransactionClient,
    listingId: string,
    status: ListingStatus,
  ) {
    if (status === ListingStatus.READY) {
      await tx.listing.update({
        where: { id: listingId },
        data: { status: ListingStatus.DRAFT, readiness: Prisma.DbNull },
      });
    }
  }

  private findEditableListing(organizationId: string, listingId: string) {
    return this.prisma.listing
      .findFirst({
        where: { id: listingId, organizationId },
        select: {
          id: true,
          assignedUserId: true,
          propertyId: true,
          status: true,
          property: { select: { assignedUserId: true } },
        },
      })
      .then(
        (
          listing: {
            id: string;
            assignedUserId: string | null;
            propertyId: string;
            status: ListingStatus;
            property: { assignedUserId: string | null };
          } | null,
        ) => {
          if (!listing) throw new NotFoundException('Listing not found.');
          return listing;
        },
      );
  }

  private findMaterial(
    organizationId: string,
    listingId: string,
    materialId: string,
  ) {
    return this.prisma.listingMaterial
      .findFirst({ where: { id: materialId, organizationId, listingId } })
      .then(
        (
          material: {
            id: string;
            organizationId: string;
            listingId: string;
            type: ListingMaterialType;
            status: ListingMaterialStatus;
            name: string;
            altText: string | null;
            externalUrl: string | null;
            storagePath: string | null;
            mimeType: string | null;
            fileSize: number | null;
            sortOrder: number;
            isCurrent: boolean;
            replacesMaterialId: string | null;
            createdByUserId: string | null;
            replacedByUserId: string | null;
            replacedAt: Date | null;
            replacementReason: string | null;
            createdAt: Date;
            updatedAt: Date;
          } | null,
        ) => {
          if (!material) throw new NotFoundException('Material not found.');
          return material;
        },
      );
  }

  private assertEditable(status: ListingStatus, reason?: string) {
    if (status !== ListingStatus.DRAFT && status !== ListingStatus.READY) {
      throw new ConflictException(
        'Approved or published listings must return to draft before material changes.',
      );
    }
    if (status === ListingStatus.READY && !cleanText(reason)) {
      throw new BadRequestException(
        'A reason is required to change materials on a ready listing.',
      );
    }
  }

  private assertAgent(
    auth: AuthenticatedUser,
    role: MembershipRole,
    listing: {
      assignedUserId: string | null;
      property: { assignedUserId: string | null };
    },
  ) {
    if (
      role === MembershipRole.AGENT &&
      (listing.assignedUserId !== auth.id ||
        listing.property.assignedUserId !== auth.id)
    ) {
      throw new ForbiddenException(
        'Agent must be assigned to both the property and the listing.',
      );
    }
  }

  private audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    actorUserId: string,
    listing: { id: string; propertyId: string; status: ListingStatus },
    input: { action: string; materialId: string },
  ) {
    return tx.auditLog.create({
      data: {
        organizationId,
        actorUserId,
        action: input.action,
        targetType: 'listing',
        targetId: listing.id,
        metadata: {
          materialId: input.materialId,
          propertyId: listing.propertyId,
          status: listing.status,
        },
      },
    });
  }

  private response(material: {
    storagePath: string | null;
    createdAt: Date;
    updatedAt: Date;
    [key: string]: unknown;
  }) {
    const { storagePath, ...safe } = material;
    void storagePath;
    return {
      material: {
        ...safe,
        createdAt: material.createdAt.toISOString(),
        updatedAt: material.updatedAt.toISOString(),
      },
    };
  }
}

export function validateCommercialMaterialSource(
  type: ListingMaterialType,
  externalUrl?: string,
  file?: CommercialMaterialFile,
) {
  if (type === ListingMaterialType.VIDEO_LINK) {
    if (file || !externalUrl?.startsWith('https://')) {
      throw new BadRequestException('Video material requires an HTTPS URL.');
    }
    return { externalUrl: externalUrl.trim(), mimeType: null, fileSize: null };
  }
  if (!file || externalUrl) {
    throw new BadRequestException('This material type requires one file.');
  }
  if (
    file.size <= 0 ||
    file.size > MAX_FILE_SIZE ||
    !FILE_TYPES.has(file.mimetype)
  ) {
    throw new BadRequestException('Material file type or size is not allowed.');
  }
  if (
    (type === ListingMaterialType.COVER_IMAGE ||
      type === ListingMaterialType.GALLERY_IMAGE) &&
    !IMAGE_TYPES.has(file.mimetype)
  ) {
    throw new BadRequestException(
      'Cover and gallery materials must be images.',
    );
  }
  if (!signatureMatches(file.buffer, file.mimetype)) {
    throw new BadRequestException(
      'Material content does not match its MIME type.',
    );
  }
  return { externalUrl: null, mimeType: file.mimetype, fileSize: file.size };
}

function signatureMatches(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg')
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png')
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === 'image/webp')
    return (
      buffer.subarray(0, 4).toString() === 'RIFF' &&
      buffer.subarray(8, 12).toString() === 'WEBP'
    );
  if (mimeType === 'application/pdf')
    return buffer.subarray(0, 5).toString() === '%PDF-';
  return false;
}

function materialIdFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return null;
  const value = (metadata as Record<string, unknown>).materialId;
  return typeof value === 'string' ? value : null;
}

function cleanText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function throwMaterialConflict(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  ) {
    throw new ConflictException(
      error.code === 'P2034'
        ? 'Material changed concurrently. Retry with the same idempotency key.'
        : 'A conflicting current material already exists.',
    );
  }
}
