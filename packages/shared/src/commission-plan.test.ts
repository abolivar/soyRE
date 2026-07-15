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

    assert.ok(result.errors.some((error) => error.includes('duplicada')));
  });

  it('supports a registered client as a commission recipient', () => {
    const result = calculateCommissionPlan({
      baseAmountCents: '10000000',
      commissionBase: 'NEGOTIATED_PRICE',
      currency: 'USD',
      mode: 'ADVANCED',
      rules: [
        {
          calculationType: 'PERCENTAGE_OF_COMMISSION',
          label: 'Cliente referido',
          participantKey: 'client-1',
          percentageBasisPoints: 2000,
          recipientType: 'REFERRER',
          releaseTrigger: 'ON_COLLECTION',
        },
      ],
      simpleCommissionBasisPoints: 300,
    });

    assert.equal(result.errors.length, 0);
    assert.equal(result.allocations[0]?.participantKey, 'client-1');
    assert.equal(result.allocations[0]?.percentageBasisPoints, 2000);
    assert.equal(result.allocations[0]?.payableAmountCents, '60000');
    assert.equal(result.allocations[0]?.status, 'PENDING');
  });

  it('rejects duplicate recipients even when calculation types differ', () => {
    const result = calculateCommissionPlan({
      baseAmountCents: '10000000',
      commissionBase: 'NEGOTIATED_PRICE',
      mode: 'ADVANCED',
      rules: [
        {
          calculationType: 'PERCENTAGE_OF_COMMISSION',
          label: 'Cliente referido',
          participantKey: 'client-1',
          percentageBasisPoints: 1000,
          recipientType: 'REFERRER',
        },
        {
          calculationType: 'FIXED_AMOUNT',
          fixedAmountCents: '25000',
          label: 'Cliente referido duplicado',
          participantKey: 'client-1',
          recipientType: 'REFERRER',
        },
      ],
      simpleCommissionBasisPoints: 300,
    });

    assert.match(result.errors.join(' '), /duplicada/);
  });
});
