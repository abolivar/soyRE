import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateBusinessDraftProgress } from './business-progress.js';

describe('calculateBusinessDraftProgress', () => {
  it('handles empty draft data', () => {
    const progress = calculateBusinessDraftProgress(null);

    assert.equal(progress.completedSteps, 0);
    assert.equal(progress.percent, 0);
    assert.equal(progress.nextStepLabel, 'Tipo');
  });

  it('calculates completed wizard sections from draft data', () => {
    const progress = calculateBusinessDraftProgress({
      automations: { paymentReminders: true },
      contractTypeId: 'contract-1',
      currency: 'USD',
      financial: { totalContractAmountCents: '25000000' },
      operationType: 'SALE',
      participants: [{ clientId: 'client-1', role: 'BUYER' }],
      paymentPlan: { preset: 'CASH', totalAmountCents: '25000000' },
    });

    assert.equal(progress.completedSteps, 6);
    assert.equal(progress.totalSteps, 8);
    assert.equal(progress.percent, 75);
    assert.equal(progress.nextStepLabel, 'Inmueble');
  });
});
