import {
  BusinessOperationType,
  ListingMaterialType,
  ListingStatus,
  PropertyOperation,
  PropertyStatus,
} from '@soyre/database';

export enum ListingTransitionCommand {
  DECLARE_READY = 'DECLARE_READY',
  RETURN_TO_DRAFT = 'RETURN_TO_DRAFT',
  APPROVE = 'APPROVE',
  PUBLISH = 'PUBLISH',
  PAUSE = 'PAUSE',
  RESUME = 'RESUME',
  WITHDRAW = 'WITHDRAW',
  ARCHIVE = 'ARCHIVE',
}

export type ListingReadinessBlocker = {
  code: string;
  scope: 'LISTING' | 'MANDATE' | 'MATERIAL' | 'PROPERTY';
};

export function isListingOperation(value: BusinessOperationType) {
  return (
    value === BusinessOperationType.SALE || value === BusinessOperationType.RENT
  );
}

export function listingReadinessBlockers(input: {
  operationType: BusinessOperationType;
  title: string;
  publicCopy: string | null;
  channels: string[];
  property: {
    status: PropertyStatus;
    operations: PropertyOperation[];
    country: string;
    city: string;
    zone: string;
    type: string;
    salePrice: number | null;
    rentPrice: number | null;
    currency: string;
    availableFrom: Date | null;
  };
  mandateReady: boolean;
  materials: Array<{ type: ListingMaterialType; isCurrent: boolean }>;
  requireChannel?: boolean;
}) {
  const blockers: ListingReadinessBlocker[] = [];
  const add = (
    code: string,
    scope: ListingReadinessBlocker['scope'],
    blocked: boolean,
  ) => {
    if (blocked) blockers.push({ code, scope });
  };
  add(
    'PROPERTY_STATUS',
    'PROPERTY',
    input.property.status !== PropertyStatus.ACTIVE &&
      input.property.status !== PropertyStatus.PUBLISHED,
  );
  const expectedOperation =
    input.operationType === BusinessOperationType.SALE
      ? PropertyOperation.SALE
      : PropertyOperation.RENT;
  add(
    'PROPERTY_OPERATION',
    'PROPERTY',
    !isListingOperation(input.operationType) ||
      !input.property.operations.includes(expectedOperation),
  );
  add(
    'PROPERTY_PRICE',
    'PROPERTY',
    input.operationType === BusinessOperationType.SALE
      ? !input.property.salePrice || input.property.salePrice <= 0
      : !input.property.rentPrice || input.property.rentPrice <= 0,
  );
  add(
    'PROPERTY_AVAILABILITY',
    'PROPERTY',
    input.operationType === BusinessOperationType.RENT &&
      !input.property.availableFrom,
  );
  add(
    'PROPERTY_LOCATION',
    'PROPERTY',
    [
      input.property.country,
      input.property.city,
      input.property.zone,
      input.property.type,
    ].some((value) => value.trim().length < 2),
  );
  add(
    'PROPERTY_CURRENCY',
    'PROPERTY',
    !/^[A-Z]{3}$/.test(input.property.currency),
  );
  add('MANDATE_NOT_READY', 'MANDATE', !input.mandateReady);
  add('LISTING_TITLE', 'LISTING', input.title.trim().length < 5);
  add(
    'LISTING_COPY',
    'LISTING',
    !input.publicCopy || input.publicCopy.trim().length < 30,
  );
  const currentMaterials = input.materials.filter((item) => item.isCurrent);
  add(
    'MATERIAL_COVER',
    'MATERIAL',
    !currentMaterials.some(
      (item) => item.type === ListingMaterialType.COVER_IMAGE,
    ),
  );
  add('MATERIAL_EMPTY', 'MATERIAL', currentMaterials.length === 0);
  add(
    'LISTING_CHANNEL',
    'LISTING',
    Boolean(input.requireChannel) && input.channels.length === 0,
  );
  return blockers;
}

export function listingTransitionTarget(
  status: ListingStatus,
  action: ListingTransitionCommand,
) {
  const transitions = new Map<string, ListingStatus>([
    [
      `${ListingStatus.DRAFT}:${ListingTransitionCommand.DECLARE_READY}`,
      ListingStatus.READY,
    ],
    [
      `${ListingStatus.READY}:${ListingTransitionCommand.RETURN_TO_DRAFT}`,
      ListingStatus.DRAFT,
    ],
    [
      `${ListingStatus.READY}:${ListingTransitionCommand.APPROVE}`,
      ListingStatus.APPROVED,
    ],
    [
      `${ListingStatus.APPROVED}:${ListingTransitionCommand.RETURN_TO_DRAFT}`,
      ListingStatus.DRAFT,
    ],
    [
      `${ListingStatus.APPROVED}:${ListingTransitionCommand.PUBLISH}`,
      ListingStatus.PUBLISHED,
    ],
    [
      `${ListingStatus.PUBLISHED}:${ListingTransitionCommand.PAUSE}`,
      ListingStatus.PAUSED,
    ],
    [
      `${ListingStatus.PAUSED}:${ListingTransitionCommand.RESUME}`,
      ListingStatus.PUBLISHED,
    ],
    [
      `${ListingStatus.APPROVED}:${ListingTransitionCommand.WITHDRAW}`,
      ListingStatus.WITHDRAWN,
    ],
    [
      `${ListingStatus.PUBLISHED}:${ListingTransitionCommand.WITHDRAW}`,
      ListingStatus.WITHDRAWN,
    ],
    [
      `${ListingStatus.PAUSED}:${ListingTransitionCommand.WITHDRAW}`,
      ListingStatus.WITHDRAWN,
    ],
    [
      `${ListingStatus.DRAFT}:${ListingTransitionCommand.ARCHIVE}`,
      ListingStatus.ARCHIVED,
    ],
    [
      `${ListingStatus.WITHDRAWN}:${ListingTransitionCommand.ARCHIVE}`,
      ListingStatus.ARCHIVED,
    ],
  ]);
  return transitions.get(`${status}:${action}`) ?? null;
}

export function listingTransitionNeedsReason(action: ListingTransitionCommand) {
  return [
    ListingTransitionCommand.RETURN_TO_DRAFT,
    ListingTransitionCommand.PAUSE,
    ListingTransitionCommand.WITHDRAW,
    ListingTransitionCommand.ARCHIVE,
  ].includes(action);
}
