import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  documentRequirementReviewTargets,
  documentRequirementStatusLabel,
} from './business-documents';

describe('documentRequirementReviewTargets', () => {
  it('forces review before approval when the requirement requires it', () => {
    assert.deepEqual(
      documentRequirementReviewTargets({
        documents: [{} as never],
        requiresReview: true,
        status: 'UPLOADED',
      }),
      ['UNDER_REVIEW', 'EXPIRED'],
    );
  });

  it('allows direct approval for requirements that do not require review', () => {
    assert.deepEqual(
      documentRequirementReviewTargets({
        documents: [{} as never],
        requiresReview: false,
        status: 'UPLOADED',
      }),
      ['APPROVED', 'UNDER_REVIEW', 'EXPIRED'],
    );
  });

  it('only offers not applicable before a file exists', () => {
    assert.deepEqual(
      documentRequirementReviewTargets({
        documents: [],
        requiresReview: false,
        status: 'REQUIRED',
      }),
      ['NOT_APPLICABLE'],
    );
    assert.deepEqual(
      documentRequirementReviewTargets({
        documents: [{} as never],
        requiresReview: false,
        status: 'REQUIRED',
      }),
      [],
    );
  });
});

describe('documentRequirementStatusLabel', () => {
  it('uses operational Spanish for every lifecycle state', () => {
    assert.deepEqual(
      [
        'REQUIRED',
        'UPLOADED',
        'UNDER_REVIEW',
        'APPROVED',
        'OBSERVED',
        'REJECTED',
        'EXPIRED',
        'NOT_APPLICABLE',
      ].map((status) => documentRequirementStatusLabel(status as never)),
      [
        'Requerido',
        'Cargado',
        'En revisión',
        'Aprobado',
        'Observado',
        'Rechazado',
        'Vencido',
        'No aplica',
      ],
    );
  });
});
