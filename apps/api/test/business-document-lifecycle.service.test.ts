import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  BusinessStatus,
  DocumentRequirementStatus,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '@soyre/database';
import type { AuthenticatedUser } from '../src/auth/auth.types.js';
import { BusinessDocumentLifecycleService } from '../src/operations/business-document-lifecycle.service.js';

const ids = {
  organization: '11111111-1111-4111-8111-111111111111',
  business: '22222222-2222-4222-8222-222222222222',
  checklist: '33333333-3333-4333-8333-333333333333',
  requirement: '44444444-4444-4444-8444-444444444444',
  document: '55555555-5555-4555-8555-555555555555',
  user: '66666666-6666-4666-8666-666666666666',
};

const auth: AuthenticatedUser = {
  id: ids.user,
  email: 'reviewer@example.com',
  firstName: 'Reviewer',
  lastName: null,
  status: UserStatus.ACTIVE,
  memberships: [
    {
      id: '77777777-7777-4777-8777-777777777777',
      organizationId: ids.organization,
      organizationName: 'Organization',
      organizationSlug: 'organization',
      organizationStatus: OrganizationStatus.ACTIVE,
      role: MembershipRole.OPERATIONS,
      status: MembershipStatus.ACTIVE,
    },
  ],
};

function setup(options: {
  status: DocumentRequirementStatus;
  requiresReview?: boolean;
  documents?: Array<{ id: string }>;
  blockers?: Array<{
    id: string;
    checklistId: string;
    name: string;
    category: string;
    status: DocumentRequirementStatus;
    requiredAtStatus: BusinessStatus | null;
    readRoles: MembershipRole[];
  }>;
}) {
  const calls = {
    requirementUpdates: 0,
    documentUpdates: 0,
    events: 0,
    audits: 0,
  };
  const requirement = {
    id: ids.requirement,
    organizationId: ids.organization,
    businessId: ids.business,
    checklistId: ids.checklist,
    name: 'Reserva',
    category: 'RESERVATION',
    businessContractId: null,
    status: options.status,
    requiresReview: options.requiresReview ?? true,
    reviewRoles: [MembershipRole.OPERATIONS],
    readRoles: [MembershipRole.OPERATIONS],
  };
  const tx = {
    businessDocumentRequirement: {
      findFirst: async () => requirement,
      updateMany: async () => {
        calls.requirementUpdates += 1;
        return { count: 1 };
      },
    },
    document: {
      findMany: async () => options.documents ?? [{ id: ids.document }],
      updateMany: async () => {
        calls.documentUpdates += 1;
        return { count: 1 };
      },
    },
    businessDocumentRequirementEvent: {
      create: async (args: {
        data: {
          fromStatus: DocumentRequirementStatus;
          toStatus: DocumentRequirementStatus;
          reason?: string;
        };
      }) => {
        calls.events += 1;
        return {
          id: '88888888-8888-4888-8888-888888888888',
          documentId: ids.document,
          fromStatus: args.data.fromStatus,
          toStatus: args.data.toStatus,
          reason: args.data.reason ?? null,
          actorUserId: auth.id,
          metadata: null,
          createdAt: new Date('2026-07-15T12:00:00.000Z'),
        };
      },
    },
    auditLog: {
      create: async () => {
        calls.audits += 1;
      },
    },
  };
  const prisma = {
    $transaction: async (callback: (client: object) => Promise<unknown>) =>
      callback(tx),
    businessDocumentRequirement: {
      findFirst: async () => ({
        ...requirement,
        documents: [],
        events: [],
      }),
      findMany: async () => options.blockers ?? [],
    },
    business: { findFirst: async () => ({ id: ids.business }) },
  };
  const access = { resolveMembership: () => auth.memberships[0] };
  return {
    calls,
    service: new BusinessDocumentLifecycleService(
      prisma as never,
      access as never,
    ),
  };
}

describe('BusinessDocumentLifecycleService', () => {
  it('requires review before approving a reviewable requirement', async () => {
    const { service, calls } = setup({
      status: DocumentRequirementStatus.UPLOADED,
      requiresReview: true,
    });
    await assert.rejects(
      service.transition(auth, ids.business, ids.checklist, ids.requirement, {
        organizationId: ids.organization,
        status: DocumentRequirementStatus.APPROVED,
        documentId: ids.document,
      }),
      ConflictException,
    );
    assert.equal(calls.requirementUpdates, 0);
  });

  it('records an observed transition with its mandatory reason', async () => {
    const { service, calls } = setup({
      status: DocumentRequirementStatus.UNDER_REVIEW,
    });
    const result = await service.transition(
      auth,
      ids.business,
      ids.checklist,
      ids.requirement,
      {
        organizationId: ids.organization,
        status: DocumentRequirementStatus.OBSERVED,
        documentId: ids.document,
        reason: 'Falta la firma del comprador.',
      },
    );
    assert.equal(result.requirement.status, DocumentRequirementStatus.OBSERVED);
    assert.equal(result.event.reason, 'Falta la firma del comprador.');
    assert.deepEqual(calls, {
      requirementUpdates: 1,
      documentUpdates: 1,
      events: 1,
      audits: 1,
    });
  });

  it('rejects observed, rejected, expired and not-applicable states without a reason', async () => {
    const { service, calls } = setup({
      status: DocumentRequirementStatus.UNDER_REVIEW,
    });
    await assert.rejects(
      service.transition(auth, ids.business, ids.checklist, ids.requirement, {
        organizationId: ids.organization,
        status: DocumentRequirementStatus.REJECTED,
        documentId: ids.document,
      }),
      BadRequestException,
    );
    assert.equal(calls.requirementUpdates, 0);
  });

  it('does not mark a requirement with current files as not applicable', async () => {
    const { service, calls } = setup({
      status: DocumentRequirementStatus.REQUIRED,
      documents: [{ id: ids.document }],
    });
    await assert.rejects(
      service.transition(auth, ids.business, ids.checklist, ids.requirement, {
        organizationId: ids.organization,
        status: DocumentRequirementStatus.NOT_APPLICABLE,
        reason: 'Las partes acordaron excluirlo.',
      }),
      ConflictException,
    );
    assert.equal(calls.events, 0);
  });

  it('rejects a document id outside the current requirement', async () => {
    const { service, calls } = setup({
      status: DocumentRequirementStatus.UNDER_REVIEW,
      documents: [{ id: ids.document }],
    });
    await assert.rejects(
      service.transition(auth, ids.business, ids.checklist, ids.requirement, {
        organizationId: ids.organization,
        status: DocumentRequirementStatus.APPROVED,
        documentId: '99999999-9999-4999-8999-999999999999',
      }),
      NotFoundException,
    );
    assert.equal(calls.requirementUpdates, 0);
  });

  it('blocks a business transition while a configured document is incomplete', async () => {
    const { service } = setup({
      status: DocumentRequirementStatus.REQUIRED,
      blockers: [
        {
          id: ids.requirement,
          checklistId: ids.checklist,
          name: 'Reserva firmada',
          category: 'RESERVATION',
          status: DocumentRequirementStatus.REQUIRED,
          requiredAtStatus: BusinessStatus.ACTIVE,
          readRoles: [MembershipRole.OPERATIONS],
        },
      ],
    });
    await assert.rejects(
      service.assertBusinessTransition(auth, ids.business, {
        organizationId: ids.organization,
        targetStatus: BusinessStatus.ACTIVE,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ConflictException);
        const response = error.getResponse() as {
          blockers: Array<{ name?: string }>;
        };
        assert.equal(response.blockers[0]?.name, 'Reserva firmada');
        return true;
      },
    );
  });

  it('allows a business transition when no document blocker applies', async () => {
    const { service } = setup({
      status: DocumentRequirementStatus.APPROVED,
      blockers: [],
    });
    assert.deepEqual(
      await service.assertBusinessTransition(auth, ids.business, {
        organizationId: ids.organization,
        targetStatus: BusinessStatus.ACTIVE,
      }),
      { allowed: true, targetStatus: BusinessStatus.ACTIVE, blockers: [] },
    );
  });
});
