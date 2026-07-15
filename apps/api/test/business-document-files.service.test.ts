import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DocumentRequirementStatus,
  DocumentStatus,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '@soyre/database';
import type { AuthenticatedUser } from '../src/auth/auth.types.js';
import {
  BusinessDocumentFilesService,
  type UploadedBusinessDocumentFile,
} from '../src/operations/business-document-files.service.js';

const ids = {
  organization: '11111111-1111-4111-8111-111111111111',
  otherOrganization: '22222222-2222-4222-8222-222222222222',
  business: '33333333-3333-4333-8333-333333333333',
  checklist: '44444444-4444-4444-8444-444444444444',
  requirement: '55555555-5555-4555-8555-555555555555',
  document: '66666666-6666-4666-8666-666666666666',
  user: '77777777-7777-4777-8777-777777777777',
};

const auth: AuthenticatedUser = {
  id: ids.user,
  email: 'owner@example.com',
  firstName: 'Owner',
  lastName: null,
  status: UserStatus.ACTIVE,
  memberships: [
    {
      id: '88888888-8888-4888-8888-888888888888',
      organizationId: ids.organization,
      organizationName: 'Organization A',
      organizationSlug: 'organization-a',
      organizationStatus: OrganizationStatus.ACTIVE,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
    },
  ],
};

const pdfFile: UploadedBusinessDocumentFile = {
  buffer: Buffer.from('%PDF-1.7\n%%EOF'),
  mimetype: 'application/pdf',
  originalname: 'Reserva firmada.pdf',
  size: 14,
};

function setup(
  overrides: { transactionError?: unknown; storagePath?: string } = {},
) {
  const calls = {
    uploads: [] as string[],
    removals: [] as string[],
    signed: [] as string[],
    transactions: 0,
    audits: 0,
  };
  const requirement = {
    id: ids.requirement,
    organizationId: ids.organization,
    businessId: ids.business,
    checklistId: ids.checklist,
    clientId: null,
    propertyId: null,
    businessContractId: null,
    name: 'Reserva',
    key: 'reservation',
    category: 'RESERVATION',
    uploadRoles: [MembershipRole.OWNER],
    readRoles: [MembershipRole.OWNER],
    allowsMultipleFiles: false,
    expiresAt: null,
    status: DocumentRequirementStatus.REQUIRED,
  };
  const created = {
    id: ids.document,
    requirementId: ids.requirement,
    name: requirement.name,
    documentType: requirement.category,
    status: DocumentStatus.UPLOADED,
    fileName: pdfFile.originalname,
    mimeType: pdfFile.mimetype,
    fileSize: pdfFile.size,
    createdAt: new Date('2026-07-15T12:00:00.000Z'),
    updatedAt: new Date('2026-07-15T12:00:00.000Z'),
    lineageId: '99999999-9999-4999-8999-999999999999',
    version: 1,
    isCurrent: true,
    replacesDocumentId: null,
    replacementReason: null,
    replacedAt: null,
    replacedByUserId: null,
  };
  const prisma = {
    businessDocumentRequirement: { findFirst: async () => requirement },
    document: {
      findFirst: async (args: { where: { id?: string } }) =>
        args.where.id
          ? {
              ...created,
              storagePath:
                overrides.storagePath ??
                `${ids.organization}/businesses/${ids.business}/checklists/${ids.checklist}/requirements/${ids.requirement}/stored.pdf`,
            }
          : null,
    },
    auditLog: {
      create: async () => {
        calls.audits += 1;
      },
    },
    $transaction: async (callback: (tx: object) => Promise<unknown>) => {
      calls.transactions += 1;
      if (overrides.transactionError) throw overrides.transactionError;
      return callback({
        document: {
          create: async (args: {
            data?: { version?: number; replacesDocumentId?: string };
          }) => ({
            ...created,
            version: args.data?.version ?? 1,
            replacesDocumentId: args.data?.replacesDocumentId ?? null,
          }),
          updateMany: async () => ({ count: 1 }),
        },
        businessDocumentRequirement: { update: async () => undefined },
        businessDocumentRequirementEvent: { create: async () => undefined },
        auditLog: { create: async () => undefined },
      });
    },
  };
  const organizationAccess = {
    resolveMembership: () => auth.memberships[0],
  };
  const storage = {
    upload: async (path: string) => calls.uploads.push(path),
    remove: async (path: string) => calls.removals.push(path),
    createSignedDownload: async (path: string) => {
      calls.signed.push(path);
      return { signedUrl: 'https://storage.example/signed', expiresIn: 60 };
    },
  };
  return {
    calls,
    service: new BusinessDocumentFilesService(
      prisma as never,
      organizationAccess as never,
      storage as never,
    ),
  };
}

describe('BusinessDocumentFilesService', () => {
  it('uploads first, then atomically creates safe metadata and audit data', async () => {
    const { service, calls } = setup();
    const result = await service.upload(
      auth,
      ids.business,
      ids.checklist,
      ids.requirement,
      ids.organization,
      pdfFile,
    );

    assert.equal(calls.uploads.length, 1);
    assert.match(
      calls.uploads[0]!,
      new RegExp(
        `^${ids.organization}/businesses/${ids.business}/checklists/${ids.checklist}/requirements/${ids.requirement}/`,
      ),
    );
    assert.equal(calls.transactions, 1);
    assert.equal(calls.removals.length, 0);
    assert.equal('storagePath' in result.document, false);
  });

  it('removes the private object if database metadata cannot be committed', async () => {
    const databaseError = new Error('transaction failed');
    const { service, calls } = setup({ transactionError: databaseError });

    await assert.rejects(
      service.upload(
        auth,
        ids.business,
        ids.checklist,
        ids.requirement,
        ids.organization,
        pdfFile,
      ),
      databaseError,
    );
    assert.deepEqual(calls.removals, calls.uploads);
  });

  it('rejects a spoofed file before Storage or database writes', async () => {
    const { service, calls } = setup();
    await assert.rejects(
      service.upload(
        auth,
        ids.business,
        ids.checklist,
        ids.requirement,
        ids.organization,
        { ...pdfFile, buffer: Buffer.from('not a pdf') },
      ),
      BadRequestException,
    );
    assert.equal(calls.uploads.length, 0);
    assert.equal(calls.transactions, 0);
  });

  it('does not sign a document whose stored path escapes its organization scope', async () => {
    const { service, calls } = setup({
      storagePath: `${ids.otherOrganization}/businesses/${ids.business}/stolen.pdf`,
    });
    await assert.rejects(
      service.download(
        auth,
        ids.business,
        ids.checklist,
        ids.requirement,
        ids.document,
        ids.organization,
      ),
      ForbiddenException,
    );
    assert.equal(calls.signed.length, 0);
    assert.equal(calls.audits, 0);
  });

  it('does not create metadata when private Storage rejects the upload', async () => {
    const { service, calls } = setup();
    const storage = (
      service as unknown as { storage: { upload: () => Promise<void> } }
    ).storage;
    storage.upload = async () => {
      throw new ServiceUnavailableException('storage unavailable');
    };
    await assert.rejects(
      service.upload(
        auth,
        ids.business,
        ids.checklist,
        ids.requirement,
        ids.organization,
        pdfFile,
      ),
      ServiceUnavailableException,
    );
    assert.equal(calls.transactions, 0);
  });

  it('replaces a current file with a new immutable version', async () => {
    const { service, calls } = setup();
    const result = await service.replace(
      auth,
      ids.business,
      ids.checklist,
      ids.requirement,
      ids.document,
      ids.organization,
      'Documento corregido y firmado.',
      pdfFile,
    );

    assert.equal(result.replaced, true);
    assert.equal(result.replacedDocumentId, ids.document);
    assert.equal(result.document.version, 2);
    assert.equal(result.document.replacesDocumentId, ids.document);
    assert.equal(calls.uploads.length, 1);
    assert.equal(calls.removals.length, 0);
    assert.equal(calls.transactions, 1);
  });

  it('maps a concurrent current-version collision to a conflict and cleans Storage', async () => {
    const { service, calls } = setup({ transactionError: { code: 'P2002' } });
    await assert.rejects(
      service.upload(
        auth,
        ids.business,
        ids.checklist,
        ids.requirement,
        ids.organization,
        pdfFile,
      ),
      ConflictException,
    );
    assert.deepEqual(calls.removals, calls.uploads);
  });
});
