import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateCommissionPlan } from './commission-plan.js';

describe('calculateCommissionPlan', () => {
  it('calculates a simple 3 percent commission', () => {
    const result = calculateCommissionPlan({
      baseAmountCents: '10000000',
      commissionBase: 'SALE_PRICE',
      mode: 'SIMPLE',
      rules: [
        {
          calculationType: 'PERCENTAGE_OF_SALE',
          label: 'Agente principal',
          participantKey: 'agent-1',
          percentageBasisPoints: 300,
          recipientType: 'AGENT',
        },
      ],
      simpleCommissionBasisPoints: 300,
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.totalCommissionAmountCents, '300000');
  });

  it('calculates referrer percentage of commission', () => {
    const result = calculateCommissionPlan({
      baseAmountCents: '10000000',
      commissionBase: 'SALE_PRICE',
      mode: 'ADVANCED',
      rules: [
        {
          calculationType: 'PERCENTAGE_OF_SALE',
          label: 'Comision bruta',
          participantKey: 'agent-1',
          percentageBasisPoints: 300,
          recipientType: 'AGENT',
        },
        {
          appliesAfterDeductions: true,
          calculationType: 'PERCENTAGE_OF_COMMISSION',
          label: 'Referido',
          participantKey: 'referrer-1',
          percentageBasisPoints: 2500,
          recipientType: 'REFERRER',
        },
      ],
      simpleCommissionBasisPoints: 300,
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.allocations[1]?.payableAmountCents, '75000');
  });

  it('applies caps', () => {
    const result = calculateCommissionPlan({
      baseAmountCents: '10000000',
      commissionBase: 'SALE_PRICE',
      mode: 'ADVANCED',
      rules: [
        {
          calculationType: 'CAPPED',
          capAmountCents: '500000',
          label: 'Broker externo',
          participantKey: 'broker-1',
          percentageBasisPoints: 800,
          recipientType: 'BROKER',
        },
      ],
      simpleCommissionBasisPoints: 800,
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.allocations[0]?.payableAmountCents, '500000');
  });

  it('detects duplicate allocations', () => {
    const result = calculateCommissionPlan({
      baseAmountCents: '10000000',
      commissionBase: 'SALE_PRICE',
      mode: 'ADVANCED',
      rules: [
        {
          calculationType: 'PERCENTAGE_OF_SALE',
          label: 'Agente',
          participantKey: 'agent-1',
          percentageBasisPoints: 300,
          recipientType: 'AGENT',
        },
        {
          calculationType: 'PERCENTAGE_OF_SALE',
          label: 'Agente duplicado',
          participantKey: 'agent-1',
          percentageBasisPoints: 300,
          recipientType: 'AGENT',
        },
      ],
      simpleCommissionBasisPoints: 300,
    });

    assert.ok(result.errors.some((error) => error.includes('Duplicate')));
  });
});
