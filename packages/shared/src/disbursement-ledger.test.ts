import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyCompensation,
  assertSameCurrency,
  calculateDisbursementBalance,
  reverseCompensation,
} from './disbursement-ledger.js';

describe('disbursement ledger', () => {
  it('preserves original, applied and remaining values', () => {
    const result = applyCompensation({
      amountCents: '25000',
      appliedAmountCents: '10000',
      originalAmountCents: '100000',
    });

    assert.deepEqual(result, {
      appliedAmountCents: '35000',
      appliedNowCents: '25000',
      remainingAmountCents: '65000',
      status: 'PARTIALLY_APPLIED',
    });
  });

  it('marks a credit as fully applied when the balance reaches zero', () => {
    const result = applyCompensation({
      amountCents: '90000',
      appliedAmountCents: '10000',
      originalAmountCents: '100000',
    });

    assert.equal(result.status, 'APPLIED');
    assert.equal(result.remainingAmountCents, '0');
  });

  it('rejects over-application and mixed currencies', () => {
    assert.throws(
      () =>
        applyCompensation({
          amountCents: '100001',
          originalAmountCents: '100000',
        }),
      /saldo disponible/,
    );
    assert.throws(() => assertSameCurrency('USD', 'PAB'), /misma moneda/);
  });

  it('reverses an application without changing the original value', () => {
    const result = reverseCompensation({
      amountCents: '25000',
      appliedAmountCents: '60000',
      originalAmountCents: '100000',
    });

    assert.equal(result.appliedAmountCents, '35000');
    assert.equal(result.remainingAmountCents, '65000');
    assert.equal(result.status, 'PARTIALLY_APPLIED');
    assert.equal(
      calculateDisbursementBalance({
        appliedAmountCents: result.appliedAmountCents,
        originalAmountCents: '100000',
      }).originalAmountCents,
      '100000',
    );
  });

  it('keeps exact balances across partial, full and reversed applications', () => {
    const first = applyCompensation({
      amountCents: '4000',
      originalAmountCents: '6500',
    });
    assert.deepEqual(first, {
      appliedAmountCents: '4000',
      appliedNowCents: '4000',
      remainingAmountCents: '2500',
      status: 'PARTIALLY_APPLIED',
    });

    const second = applyCompensation({
      amountCents: '2500',
      appliedAmountCents: first.appliedAmountCents,
      originalAmountCents: '6500',
    });
    assert.equal(second.appliedAmountCents, '6500');
    assert.equal(second.remainingAmountCents, '0');
    assert.equal(second.status, 'APPLIED');

    const reversed = reverseCompensation({
      amountCents: '4000',
      appliedAmountCents: second.appliedAmountCents,
      originalAmountCents: '6500',
    });
    assert.equal(reversed.appliedAmountCents, '2500');
    assert.equal(reversed.remainingAmountCents, '4000');
    assert.equal(reversed.status, 'PARTIALLY_APPLIED');
  });
});
