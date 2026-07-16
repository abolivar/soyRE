import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OperationalMandate } from './api';
import {
  availableMandateActions,
  daysUntil,
  localDateValue,
  mandateBlockerLabel,
} from '../components/mandate-workspace-domain';

const baseMandate = {
  assignedUserId: 'agent-1',
  status: 'DRAFT',
} as OperationalMandate;

describe('mandate workspace domain', () => {
  it('never offers arbitrary workflow actions to readonly roles', () => {
    assert.deepEqual(
      availableMandateActions('READONLY', 'reader-1', baseMandate),
      [],
    );
  });

  it('limits an agent draft to their own assignment', () => {
    assert.deepEqual(availableMandateActions('AGENT', 'agent-2', baseMandate), [
      'ADD_DOCUMENT',
    ]);
    assert.deepEqual(availableMandateActions('AGENT', 'agent-1', baseMandate), [
      'EDIT',
      'SUBMIT_FOR_SIGNATURE',
      'ADD_DOCUMENT',
    ]);
  });

  it('derives manager actions from lifecycle state', () => {
    assert.deepEqual(
      availableMandateActions('ADMIN', 'admin-1', {
        ...baseMandate,
        endsAt: '2026-01-01',
        status: 'ACTIVE',
      }),
      ['EXPIRE', 'CANCEL', 'RENEW', 'ADD_DOCUMENT'],
    );
    assert.deepEqual(
      availableMandateActions('OWNER', 'owner-1', {
        ...baseMandate,
        status: 'SUPERSEDED',
      }),
      ['ARCHIVE', 'ADD_DOCUMENT'],
    );
  });

  it('localizes blockers and calculates inclusive calendar distance', () => {
    assert.equal(
      mandateBlockerLabel('SIGNATURE_EVIDENCE_REQUIRED'),
      'Agrega el mandato firmado y aprobado.',
    );
    assert.equal(
      mandateBlockerLabel('SIGNATURE_MISSING'),
      'Registra la fecha de firma.',
    );
    assert.equal(
      mandateBlockerLabel('SIGNED_EVIDENCE_MISSING'),
      'Agrega el mandato firmado y aprobado.',
    );
    assert.equal(
      mandateBlockerLabel('UNKNOWN'),
      'Existe una condición pendiente por resolver.',
    );
    assert.equal(daysUntil('2026-07-20', new Date('2026-07-15T18:00:00Z')), 5);
    assert.equal(localDateValue(new Date(2026, 6, 15, 21)), '2026-07-15');
  });
});
