import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BusinessOperationType,
  ListingMaterialType,
  ListingStatus,
  PropertyOperation,
  PropertyStatus,
} from '@soyre/database';
import {
  ListingTransitionCommand,
  isListingOperation,
  listingReadinessBlockers,
  listingTransitionNeedsReason,
  listingTransitionTarget,
} from '../src/operations/listing-domain.ts';

const readyInput = {
  channels: ['Sitio propio'],
  mandateReady: true,
  materials: [{ isCurrent: true, type: ListingMaterialType.COVER_IMAGE }],
  operationType: BusinessOperationType.SALE,
  property: {
    availableFrom: null,
    city: 'Panamá',
    country: 'PA',
    currency: 'USD',
    operations: [PropertyOperation.SALE],
    rentPrice: null,
    salePrice: 250_000,
    status: PropertyStatus.ACTIVE,
    type: 'Apartamento',
    zone: 'Bella Vista',
  },
  publicCopy: 'Apartamento luminoso con ubicación central y acabados modernos.',
  title: 'Apartamento en Bella Vista',
};

describe('listing domain', () => {
  it('accepts only sale and rent as listing operations', () => {
    assert.equal(isListingOperation(BusinessOperationType.SALE), true);
    assert.equal(isListingOperation(BusinessOperationType.RENT), true);
    assert.equal(isListingOperation(BusinessOperationType.RESERVATION), false);
  });

  it('returns no blockers for a complete sale preparation', () => {
    assert.deepEqual(
      listingReadinessBlockers({ ...readyInput, requireChannel: true }),
      [],
    );
  });

  it('reports exact independent blockers without duplicates', () => {
    const blockers = listingReadinessBlockers({
      ...readyInput,
      channels: [],
      mandateReady: false,
      materials: [],
      publicCopy: null,
      requireChannel: true,
    });
    assert.deepEqual(
      blockers.map((item) => item.code),
      [
        'MANDATE_NOT_READY',
        'LISTING_COPY',
        'MATERIAL_COVER',
        'MATERIAL_EMPTY',
        'LISTING_CHANNEL',
      ],
    );
  });

  it('requires availability for rent but not sale', () => {
    const rent = listingReadinessBlockers({
      ...readyInput,
      operationType: BusinessOperationType.RENT,
      property: {
        ...readyInput.property,
        operations: [PropertyOperation.RENT],
        rentPrice: 1800,
      },
    });
    assert.deepEqual(
      rent.map((item) => item.code),
      ['PROPERTY_AVAILABILITY'],
    );
  });

  it('enforces the transition matrix and mandatory reasons', () => {
    assert.equal(
      listingTransitionTarget(
        ListingStatus.DRAFT,
        ListingTransitionCommand.DECLARE_READY,
      ),
      ListingStatus.READY,
    );
    assert.equal(
      listingTransitionTarget(
        ListingStatus.DRAFT,
        ListingTransitionCommand.PUBLISH,
      ),
      null,
    );
    assert.equal(
      listingTransitionNeedsReason(ListingTransitionCommand.WITHDRAW),
      true,
    );
    assert.equal(
      listingTransitionNeedsReason(ListingTransitionCommand.APPROVE),
      false,
    );
  });
});
