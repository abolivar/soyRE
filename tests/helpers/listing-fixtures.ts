import {
  BusinessOperationType,
  ListingMaterialType,
  ListingStatus,
  MandateType,
  PropertyOperation,
  PropertyStatus,
} from '@soyre/database';
import {
  activateMandate,
  createMandate,
  createMandateContext,
  submitAndSignMandate,
  type FixtureActor,
  type FixturePrisma,
} from './mandate-fixtures.ts';
import { assertStatus, requestJson } from './http.ts';

export type ListingContext = {
  clientId: string;
  mandateId: string;
  propertyId: string;
};

export type ListingSnapshot = {
  assignedUserId: string | null;
  channels: string[];
  id: string;
  materials: Array<{ id: string; name: string; type: ListingMaterialType }>;
  operationType: BusinessOperationType;
  readiness: { ready: boolean; blockers: Array<{ code: string }> };
  status: ListingStatus;
  title: string;
};

export async function createActiveListingContext(
  prisma: FixturePrisma,
  baseUrl: string,
  actor: FixtureActor,
  marker: string,
  suffix: string,
  operations: PropertyOperation[],
  mandateType: MandateType,
  assignedUserId = actor.userId,
) {
  const context = await createMandateContext(
    prisma,
    actor,
    marker,
    suffix,
    operations,
    assignedUserId,
  );
  await prisma.property.update({
    where: { id: context.propertyId },
    data: {
      availableFrom: operations.includes(PropertyOperation.RENT)
        ? new Date()
        : undefined,
      currency: 'USD',
      internalCode: `L-${suffix}-${marker}`.slice(0, 80),
      status: PropertyStatus.ACTIVE,
    },
  });
  const created = await createMandate(baseUrl, actor, context, marker, {
    assignedUserId,
    key: `listing-mandate-${suffix}`,
    type: mandateType,
  });
  assertStatus(created, 201);
  await submitAndSignMandate(baseUrl, actor, created.body.mandate.id, marker);
  await activateMandate(baseUrl, actor, created.body.mandate.id, marker);
  return {
    ...context,
    mandateId: created.body.mandate.id,
  } satisfies ListingContext;
}

export function createListing(
  baseUrl: string,
  actor: FixtureActor,
  context: ListingContext,
  marker: string,
  input: {
    assignedUserId?: string;
    channels?: string[];
    idempotencyKey?: string;
    mandateId?: string;
    operationType?: BusinessOperationType;
    publicCopy?: string;
    title?: string;
    [key: string]: unknown;
  } = {},
) {
  return requestJson<{ listing: ListingSnapshot }>(baseUrl, '/listings', {
    cookie: actor.cookie,
    method: 'POST',
    body: {
      assignedUserId: input.assignedUserId ?? actor.userId,
      channels: input.channels ?? ['Sitio propio'],
      idempotencyKey:
        input.idempotencyKey ?? `listing:${marker}:${crypto.randomUUID()}`,
      mandateId: input.mandateId ?? context.mandateId,
      operationType: input.operationType ?? BusinessOperationType.SALE,
      organizationId: actor.organizationId,
      propertyId: context.propertyId,
      publicCopy:
        input.publicCopy ??
        `Publicación verificada para las pruebas operativas ${marker}.`,
      title: input.title ?? `Listing ${marker}`,
      ...input,
    },
  });
}

export async function addCoverFixture(
  prisma: FixturePrisma,
  actor: FixtureActor,
  listingId: string,
  marker: string,
) {
  return prisma.listingMaterial.create({
    data: {
      createdByUserId: actor.userId,
      fileSize: 9,
      listingId,
      mimeType: 'image/png',
      name: `Portada ${marker}`,
      organizationId: actor.organizationId,
      sortOrder: 0,
      storagePath: `${actor.organizationId}/${listingId}/fixture-${marker}.png`,
      type: ListingMaterialType.COVER_IMAGE,
    },
  });
}

export function transitionListing(
  baseUrl: string,
  actor: FixtureActor,
  listingId: string,
  action: string,
  input: { idempotencyKey?: string; reason?: string } = {},
) {
  return requestJson<{ listing: ListingSnapshot }>(
    baseUrl,
    `/listings/${listingId}/transitions`,
    {
      cookie: actor.cookie,
      method: 'POST',
      body: {
        action,
        idempotencyKey:
          input.idempotencyKey ??
          `listing-transition:${action}:${crypto.randomUUID()}`,
        organizationId: actor.organizationId,
        reason: input.reason,
      },
    },
  );
}

export function getListing(
  baseUrl: string,
  actor: FixtureActor,
  listingId: string,
) {
  return requestJson<{ listing: ListingSnapshot }>(
    baseUrl,
    `/listings/${listingId}?organizationId=${actor.organizationId}`,
    { cookie: actor.cookie },
  );
}

export function getListingHistory(
  baseUrl: string,
  actor: FixtureActor,
  listingId: string,
) {
  return requestJson<{
    events: Array<{
      action: string;
      idempotencyKey: string;
      metadata: Record<string, unknown> | null;
      toStatus: ListingStatus;
    }>;
  }>(
    baseUrl,
    `/listings/${listingId}/history?organizationId=${actor.organizationId}`,
    { cookie: actor.cookie },
  );
}
