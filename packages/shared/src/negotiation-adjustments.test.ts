import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateNegotiationAdjustments } from './negotiation-adjustments.js';

describe('calculateNegotiationAdjustments', () => {
  it('summarizes reference increases and decreases without changing other totals', () => {
    const result = calculateNegotiationAdjustments({
      currency: 'usd',
      adjustments: [
        {
          category: 'MATERIALS',
          label: 'Diferencia de acabados',
          amountCents: '125000',
          direction: 'INCREASE',
          appliesTo: 'BUYER',
        },
        {
          category: 'IMPROVEMENTS',
          label: 'Crédito por mobiliario',
          amountCents: '25000',
          direction: 'DECREASE',
        },
      ],
    });

    assert.equal(result.currency, 'USD');
    assert.equal(result.increaseTotalCents, '125000');
    assert.equal(result.decreaseTotalCents, '25000');
    assert.equal(result.netReferenceCents, '100000');
    assert.equal(result.items[0]?.effect, 'REFERENCE_ONLY');
    assert.equal(result.errors.length, 0);
    assert.equal(result.warnings.length, 1);
  });

  it('rejects empty concepts and non-positive amounts', () => {
    const result = calculateNegotiationAdjustments({
      adjustments: [
        {
          category: 'OTHER',
          label: '',
          amountCents: '100',
          direction: 'INCREASE',
        },
        {
          category: 'MATERIALS',
          label: 'Materiales',
          amountCents: '0',
          direction: 'INCREASE',
        },
      ],
    });

    assert.equal(result.items.length, 0);
    assert.equal(result.errors.length, 2);
  });

  it('rejects unsupported categories and directions at runtime', () => {
    const result = calculateNegotiationAdjustments({
      adjustments: [
        {
          category: 'UNKNOWN' as 'OTHER',
          label: 'Ajuste extraño',
          amountCents: '100',
          direction: 'SIDEWAYS' as 'INCREASE',
        },
      ],
    });

    assert.equal(result.items.length, 0);
    assert.equal(result.errors.length, 1);
  });
});
