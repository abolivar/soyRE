import {
  BusinessOperationType,
  DocumentStatus,
  MandateStatus,
  MandateType,
  PropertyOperation,
} from '@soyre/database';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateRangesOverlap,
  findExclusiveMandateConflict,
  mandateMatchesProperty,
  mandateReadinessBlockers,
  mandateSupportsOperation,
} from '../src/operations/mandate-domain.js';

const today = new Date('2026-07-15T00:00:00.000Z');

describe('mandate domain', () => {
  it('matches sale, rent and both against property operations exactly', () => {
    assert.equal(
      mandateMatchesProperty(MandateType.SALE, [PropertyOperation.SALE]),
      true,
    );
    assert.equal(
      mandateMatchesProperty(MandateType.RENT, [PropertyOperation.SALE]),
      false,
    );
    assert.equal(
      mandateMatchesProperty(MandateType.BOTH, [PropertyOperation.SALE]),
      false,
    );
    assert.equal(
      mandateMatchesProperty(MandateType.BOTH, [
        PropertyOperation.SALE,
        PropertyOperation.RENT,
      ]),
      true,
    );
  });

  it('treats BOTH as compatible with either listing operation', () => {
    assert.equal(
      mandateSupportsOperation(MandateType.BOTH, BusinessOperationType.SALE),
      true,
    );
    assert.equal(
      mandateSupportsOperation(MandateType.BOTH, BusinessOperationType.RENT),
      true,
    );
    assert.equal(
      mandateSupportsOperation(MandateType.SALE, BusinessOperationType.RENT),
      false,
    );
  });

  it('uses inclusive validity ranges for exclusivity', () => {
    assert.equal(
      dateRangesOverlap(
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-15T00:00:00.000Z'),
        new Date('2026-07-15T00:00:00.000Z'),
        new Date('2026-08-01T00:00:00.000Z'),
      ),
      true,
    );
    assert.equal(
      dateRangesOverlap(
        new Date('2026-07-01T00:00:00.000Z'),
        new Date('2026-07-14T00:00:00.000Z'),
        new Date('2026-07-15T00:00:00.000Z'),
        new Date('2026-08-01T00:00:00.000Z'),
      ),
      false,
    );
  });

  it('detects exclusive overlap only for intersecting operations and dates', () => {
    const candidate = {
      id: 'candidate',
      type: MandateType.SALE,
      exclusive: false,
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
    };
    const conflict = findExclusiveMandateConflict(candidate, [
      {
        id: 'rent-exclusive',
        type: MandateType.RENT,
        exclusive: true,
        startsAt: candidate.startsAt,
        endsAt: candidate.endsAt,
      },
      {
        id: 'sale-exclusive',
        type: MandateType.SALE,
        exclusive: true,
        startsAt: candidate.startsAt,
        endsAt: candidate.endsAt,
      },
    ]);
    assert.equal(conflict?.id, 'sale-exclusive');
  });

  it('returns no blockers only for an active, signed and approved mandate', () => {
    const mandate = {
      status: MandateStatus.ACTIVE,
      type: MandateType.SALE,
      startsAt: new Date('2026-07-01T00:00:00.000Z'),
      endsAt: new Date('2026-12-31T00:00:00.000Z'),
      signedAt: new Date('2026-06-30T00:00:00.000Z'),
      documents: [
        {
          documentType: 'SIGNED_MANDATE',
          status: DocumentStatus.APPROVED,
        },
      ],
    };
    assert.deepEqual(
      mandateReadinessBlockers(mandate, BusinessOperationType.SALE, today),
      [],
    );
    assert.deepEqual(
      mandateReadinessBlockers(mandate, BusinessOperationType.RENT, today),
      ['OPERATION_MISMATCH'],
    );
  });

  it('reports exact independent blockers without duplicates', () => {
    assert.deepEqual(
      mandateReadinessBlockers(
        {
          status: MandateStatus.PENDING_DOCUMENTS,
          type: MandateType.RENT,
          startsAt: null,
          endsAt: new Date('2026-07-14T00:00:00.000Z'),
          signedAt: null,
          documents: [
            {
              documentType: 'SIGNED_MANDATE',
              status: DocumentStatus.REJECTED,
            },
          ],
        },
        BusinessOperationType.RENT,
        today,
      ),
      [
        'MANDATE_NOT_ACTIVE',
        'NOT_STARTED',
        'EXPIRED',
        'SIGNATURE_MISSING',
        'SIGNED_EVIDENCE_MISSING',
        'DOCUMENT_BLOCKERS',
      ],
    );
  });
});
