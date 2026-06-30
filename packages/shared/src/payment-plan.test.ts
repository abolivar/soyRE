import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculatePaymentPlan } from './payment-plan.js';

describe('calculatePaymentPlan', () => {
  it('creates a cash payment line', () => {
    const result = calculatePaymentPlan({
      closingDate: '2026-09-30',
      preset: 'CASH',
      totalAmountCents: '25000000',
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.lines.length, 1);
    assert.equal(result.lines[0]?.amountCents, '25000000');
    assert.equal(result.differenceCents, '0');
  });

  it('creates signature plus monthly installments with rounding on last line', () => {
    const result = calculatePaymentPlan({
      frequency: 'MONTHLY',
      installmentCount: 3,
      preset: 'SIGNATURE_INSTALLMENTS',
      signatureAmountCents: '10000',
      signatureDate: '2026-07-01',
      startDate: '2026-08-01',
      totalAmountCents: '100000',
    });

    assert.equal(result.errors.length, 0);
    assert.deepEqual(
      result.lines.map((line) => line.amountCents),
      ['10000', '30000', '30000', '30000'],
    );
  });

  it('detects difference for incomplete custom plan', () => {
    const result = calculatePaymentPlan({
      preset: 'CUSTOM',
      specialLines: [
        {
          amountCents: '90000',
          label: 'Pago manual',
          lineType: 'OTHER',
        },
      ],
      totalAmountCents: '100000',
    });

    assert.equal(result.differenceCents, '10000');
    assert.ok(result.errors.includes('Payment schedule does not match the payable amount.'));
  });

  it('rejects negative total amounts', () => {
    const result = calculatePaymentPlan({
      preset: 'CASH',
      totalAmountCents: '-1',
    });

    assert.ok(result.errors.some((error) => error.includes('cannot be negative')));
  });
});
