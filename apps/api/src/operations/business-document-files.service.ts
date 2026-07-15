import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentEntityType,
  DocumentStatus,
  Prisma,
} from '@soyre/database';
import { READ_ROLES, WRITE_ROLES } from '../auth/authorization.constants.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  BUSINESS_DOCUMENTS_BUCKET,
  SupabaseDocumentStorageService,
} from './supabase-document-storage.service.js';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_FILE_TYPES = new Map<string, ReadonlySet<string>>([
  ['application/pdf', new Set(['.pdf'])],
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['application/msword', new Set(['.doc'])],
  [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    new Set(['.docx']),
  ],
]);

export type UploadedBusinessDocumentFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class BusinessDocumentFilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
    @Inject(SupabaseDocumentStorageService)
    private readonly storage: SupabaseDocumentStorageService,
  ) {}

  async upload(
    auth: AuthenticatedUser,
    businessId: string,
    checklistId: string,
    requirementId: string,
    organizationId: string | undefined,
    file: UploadedBusinessDocumentFile | undefined,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      organizationId,
      {
        permission: 'Business document upload',
        roles: WRITE_ROLES,
      },
    );
    const requirement = await this.loadRequirement(
      membership.organizationId,
      businessId,
      checklistId,
      requirementId,
    );
    if (!requirement.uploadRoles.includes(membership.role)) {
      throw new ForbiddenException('Document upload role is not allowed.');
    }
    this.validateFile(file);

    if (!requirement.allowsMultipleFiles) {
      const existing = await this.prisma.document.findFirst({
        where: {
          organizationId: membership.organizationId,
          businessId,
          requirementId,
          status: { not: DocumentStatus.ARCHIVED },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          'This requirement already has a file. Use the replacement flow.',
        );
      }
    }

    const path = storagePath(
      membership.organizationId,
      businessId,
      checklistId,
      requirementId,
      file.originalname,
    );
    await this.storage.upload(path, file.buffer, file.mimetype);

    try {
      const document = await this.prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
          const created = await tx.document.create({
            data: {
              organizationId: membership.organizationId,
              entityType: DocumentEntityType.BUSINESS,
              businessId,
              requirementId,
              clientId: requirement.clientId,
              propertyId: requirement.propertyId,
              businessContractId: requirement.businessContractId,
              name: requirement.name,
              documentType: requirement.category,
              status: DocumentStatus.UPLOADED,
              fileName: file.originalname,
              mimeType: file.mimetype,
              fileSize: file.size,
              storagePath: path,
              expiresAt: requirement.expiresAt,
              uploadedByUserId: auth.id,
              metadata: {
                bucket: BUSINESS_DOCUMENTS_BUCKET,
                checklistId,
                requirementKey: requirement.key,
              },
            },
          });
          await tx.auditLog.create({
            data: {
              action: 'business_documents.upload',
              actorUserId: auth.id,
              organizationId: membership.organizationId,
              targetType: 'document',
              targetId: created.id,
              metadata: {
                businessId,
                checklistId,
                requirementId,
                mimeType: file.mimetype,
                fileSize: file.size,
              },
            },
          });
          return created;
        },
      );
      return { document: serializeDocument(document), uploaded: true };
    } catch (error) {
      await this.storage.remove(path);
      throw error;
    }
  }

  async download(
    auth: AuthenticatedUser,
    businessId: string,
    checklistId: string,
    requirementId: string,
    documentId: string,
    organizationId?: string,
  ) {
    const membership = this.organizationAccess.resolveMembership(
      auth,
      organizationId,
      {
        permission: 'Business document read',
        roles: READ_ROLES,
      },
    );
    const requirement = await this.loadRequirement(
      membership.organizationId,
      businessId,
      checklistId,
      requirementId,
    );
    if (!requirement.readRoles.includes(membership.role)) {
      throw new ForbiddenException('Document read role is not allowed.');
    }
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: membership.organizationId,
        businessId,
        requirementId,
      },
    });
    if (!document?.storagePath || !document.fileName) {
      throw new NotFoundException('Stored business document was not found.');
    }
    const expectedPrefix = `${membership.organizationId}/businesses/${businessId}/checklists/${checklistId}/requirements/${requirementId}/`;
    if (!document.storagePath.startsWith(expectedPrefix)) {
      throw new ForbiddenException(
        'Stored document path is outside its scope.',
      );
    }
    const signed = await this.storage.createSignedDownload(
      document.storagePath,
      document.fileName,
    );
    await this.prisma.auditLog.create({
      data: {
        action: 'business_documents.download_signed',
        actorUserId: auth.id,
        organizationId: membership.organizationId,
        targetType: 'document',
        targetId: document.id,
        metadata: { businessId, checklistId, requirementId },
      },
    });
    return { document: serializeDocument(document), ...signed };
  }

  private async loadRequirement(
    organizationId: string,
    businessId: string,
    checklistId: string,
    requirementId: string,
  ) {
    const requirement = await this.prisma.businessDocumentRequirement.findFirst(
      {
        where: {
          id: requirementId,
          organizationId,
          businessId,
          checklistId,
        },
      },
    );
    if (!requirement) {
      throw new NotFoundException(
        'Business document requirement was not found.',
      );
    }
    return requirement;
  }

  private validateFile(
    file: UploadedBusinessDocumentFile | undefined,
  ): asserts file is UploadedBusinessDocumentFile {
    if (!file?.buffer || file.size <= 0) {
      throw new BadRequestException('A non-empty document file is required.');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Document file exceeds the 15 MB limit.');
    }
    const allowedExtensions = ALLOWED_FILE_TYPES.get(file.mimetype);
    const extension = extname(file.originalname).toLowerCase();
    if (
      !allowedExtensions?.has(extension) ||
      !hasExpectedFileSignature(file.mimetype, file.buffer)
    ) {
      throw new BadRequestException(
        'Document content, MIME type, and extension are not allowed.',
      );
    }
  }
}

function hasExpectedFileSignature(mimeType: string, content: Buffer) {
  if (mimeType === 'application/pdf')
    return content.subarray(0, 5).equals(Buffer.from('%PDF-'));
  if (mimeType === 'image/jpeg')
    return content.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimeType === 'image/png') {
    return content
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'application/msword') {
    return content
      .subarray(0, 8)
      .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  return content.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}

function storagePath(
  organizationId: string,
  businessId: string,
  checklistId: string,
  requirementId: string,
  originalName: string,
) {
  const extension = extname(originalName).toLowerCase();
  const baseName =
    originalName
      .slice(0, Math.max(0, originalName.length - extension.length))
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'document';
  return `${organizationId}/businesses/${businessId}/checklists/${checklistId}/requirements/${requirementId}/${randomUUID()}-${baseName}${extension}`;
}

function serializeDocument(document: {
  id: string;
  requirementId: string | null;
  name: string;
  documentType: string;
  status: DocumentStatus;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return document;
}
