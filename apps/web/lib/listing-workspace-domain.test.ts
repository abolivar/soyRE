import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { OperationalListing } from './api';
import {
  availableListingActions,
  listingBlockerLabel,
} from '../components/listing-workspace-domain';

const listing = {
  assignedUserId: 'agent-1',
  property: { assignedUserId: 'agent-1' },
  status: 'DRAFT',
} as OperationalListing;

describe('listing workspace domain', () => {
  it('limits an assigned agent to preparation actions', () => {
    assert.deepEqual(availableListingActions('AGENT', 'agent-1', listing), [
      'EDIT',
      'ADD_MATERIAL',
    ]);
    assert.deepEqual(availableListingActions('AGENT', 'agent-2', listing), []);
  });

  it('offers exact operational transitions by status', () => {
    assert.deepEqual(
      availableListingActions('BROKER', 'broker', {
        ...listing,
        status: 'PUBLISHED',
      }),
      ['PAUSE', 'WITHDRAW'],
    );
    assert.deepEqual(
      availableListingActions('ADMIN', 'admin', {
        ...listing,
        status: 'WITHDRAWN',
      }),
      ['ARCHIVE'],
    );
  });

  it('localizes known readiness blockers', () => {
    assert.equal(
      listingBlockerLabel({ code: 'MATERIAL_COVER', scope: 'MATERIAL' }),
      'Agrega una imagen de portada vigente.',
    );
  });
});
