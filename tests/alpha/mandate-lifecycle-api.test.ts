import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  BusinessOperationType,
  createPrismaClient,
  DocumentEntityType,
  DocumentStatus,
  ListingStatus,
  MandateStatus,
  MandateType,
} from '@soyre/database';
import { ensureApiServer, type ApiServer } from '../helpers/api-server.ts';
import { cleanupMandateFixtures } from '../helpers/mandate-fixtures.ts';
import {
  assertStatus,
  extractSessionCookie,
  requestJson,
} from '../helpers/http.ts';

type MandateResponse = {
  mandate: {
    id: string;
    previousMandateId: string | null;
    status: MandateStatus;
  };
};

type RegisteredUser = {
  id: string;
  memberships: Array<{ organizationId: string }>;
};

const enabled = process.env.MANDATE_LIFECYCLE_API_MUTATING === 'true';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prisma = createPrismaClient();
let server: ApiServer | null = null;

before(async () => {
  if (enabled) server = await ensureApiServer();
});

after(async () => {
  await server?.stop();
  if (enabled) await cleanupMandateFixtures(prisma, runId);
  await prisma.$disconnect();
});

test(
  'mandate lifecycle is isolated, idempotent, exclusive and gates listings',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const ownerA = await register(
      server.baseUrl,
      `mandates-a-${runId}@example.com`,
      `mandates-a-${runId}`,
    );
    const ownerB = await register(
      server.baseUrl,
      `mandates-b-${runId}@example.com`,
      `mandates-b-${runId}`,
    );
    const contextA = await createContext(ownerA, 'A');
    const contextB = await createContext(ownerB, 'B');
    const dates = validityDates();

    const primary = await createMandate(server.baseUrl, ownerA, contextA, {
      ...dates,
      exclusive: true,
      key: 'primary',
    });

    const crossOrganizationRead = await requestJson(
      server.baseUrl,
      `/mandates/${primary.id}?organizationId=${ownerB.organizationId}`,
      { cookie: ownerB.cookie },
    );
    assertStatus(crossOrganizationRead, 404);

    const crossOrganizationCreate = await requestJson(
      server.baseUrl,
      '/mandates',
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          propertyId: contextB.propertyId,
          ownerClientId: contextB.clientId,
          assignedUserId: ownerA.userId,
          type: MandateType.SALE,
        },
      },
    );
    assertStatus(crossOrganizationCreate, 400);

    await completeSignatureAndActivate(server.baseUrl, ownerA, primary.id);
    const repeatedActivation = await transition(
      server.baseUrl,
      ownerA,
      primary.id,
      'ACTIVATE',
      'primary-activate',
    );
    assertStatus(repeatedActivation, 201);
    assert.equal(repeatedActivation.body.mandate.status, MandateStatus.ACTIVE);

    const conflicting = await createMandate(server.baseUrl, ownerA, contextA, {
      ...dates,
      exclusive: true,
      key: 'conflict',
    });
    await completeSignature(server.baseUrl, ownerA, conflicting.id, 'conflict');
    const conflictActivation = await transition(
      server.baseUrl,
      ownerA,
      conflicting.id,
      'ACTIVATE',
      'conflict-activate',
    );
    assertStatus(conflictActivation, 409);

    const renewal = await requestJson<MandateResponse & { created: boolean }>(
      server.baseUrl,
      `/mandates/${primary.id}/renewals`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          idempotencyKey: `${runId}:primary-renew`,
        },
      },
    );
    assertStatus(renewal, 201);
    assert.equal(renewal.body.created, true);
    assert.equal(renewal.body.mandate.previousMandateId, primary.id);

    const repeatedRenewal = await requestJson<
      MandateResponse & { created: boolean }
    >(server.baseUrl, `/mandates/${primary.id}/renewals`, {
      cookie: ownerA.cookie,
      method: 'POST',
      body: {
        organizationId: ownerA.organizationId,
        idempotencyKey: `${runId}:primary-renew`,
      },
    });
    assertStatus(repeatedRenewal, 201);
    assert.equal(repeatedRenewal.body.created, false);
    assert.equal(repeatedRenewal.body.mandate.id, renewal.body.mandate.id);

    const updatedRenewal = await requestJson<MandateResponse>(
      server.baseUrl,
      `/mandates/${renewal.body.mandate.id}`,
      {
        cookie: ownerA.cookie,
        method: 'PATCH',
        body: {
          organizationId: ownerA.organizationId,
          idempotencyKey: `${runId}:renewal-terms`,
          authorizedPriceCents: '25500000',
          commissionBps: 300,
          startsAt: dates.startsAt,
          endsAt: addUtcDays(90),
        },
      },
    );
    assertStatus(updatedRenewal, 200);

    await completeSignatureAndActivate(
      server.baseUrl,
      ownerA,
      renewal.body.mandate.id,
      'renewal',
    );

    const previousAfterRenewal = await requestJson<MandateResponse>(
      server.baseUrl,
      `/mandates/${primary.id}?organizationId=${ownerA.organizationId}`,
      { cookie: ownerA.cookie },
    );
    assertStatus(previousAfterRenewal, 200);
    assert.equal(
      previousAfterRenewal.body.mandate.status,
      MandateStatus.SUPERSEDED,
    );

    const incompatibleListing = await createListing(
      server.baseUrl,
      ownerA,
      contextA.propertyId,
      renewal.body.mandate.id,
      BusinessOperationType.RENT,
      'rent-mismatch',
    );
    assertStatus(incompatibleListing, 409);

    const readyListing = await createListing(
      server.baseUrl,
      ownerA,
      contextA.propertyId,
      renewal.body.mandate.id,
      BusinessOperationType.SALE,
      'sale-ready',
    );
    assertStatus(readyListing, 201);

    const history = await requestJson<{
      events: Array<{ action: string; idempotencyKey: string }>;
    }>(
      server.baseUrl,
      `/mandates/${primary.id}/history?organizationId=${ownerA.organizationId}`,
      { cookie: ownerA.cookie },
    );
    assertStatus(history, 200);
    assert.deepEqual(
      history.body.events.map((event) => event.action),
      [
        'CREATED',
        'SUBMIT_FOR_SIGNATURE',
        'REGISTER_SIGNATURE',
        'ACTIVATE',
        'RENEW',
        'SUPERSEDE',
      ],
    );
    assert.equal(
      history.body.events.filter(
        (event) => event.idempotencyKey === `${runId}:primary-activate`,
      ).length,
      1,
    );
  },
);

async function register(baseUrl: string, email: string, slug: string) {
  const response = await requestJson<{ user: RegisteredUser }>(
    baseUrl,
    '/auth/register',
    {
      method: 'POST',
      body: {
        organizationName: `Mandates ${slug}`,
        organizationSlug: slug,
        firstName: 'Mandate',
        lastName: 'Owner',
        email,
        password: `Mandates-${runId}!`,
      },
    },
  );
  assertStatus(response, 201);
  const organizationId = response.body.user.memberships[0]?.organizationId;
  assert.ok(organizationId);
  return {
    cookie: extractSessionCookie(response.headers),
    organizationId,
    userId: response.body.user.id,
  };
}

async function createContext(
  owner: { organizationId: string; userId: string },
  suffix: string,
) {
  const client = await prisma.client.create({
    data: {
      organizationId: owner.organizationId,
      displayName: `Mandate client ${suffix} ${runId}`,
      email: `mandate-client-${suffix}-${runId}@example.com`,
    },
  });
  const property = await prisma.property.create({
    data: {
      organizationId: owner.organizationId,
      ownerClientId: client.id,
      assignedUserId: owner.userId,
      title: `Mandate property ${suffix} ${runId}`,
      type: 'APARTMENT',
      operations: ['SALE'],
      salePrice: 250_000,
      country: 'PA',
      city: 'Panamá',
      zone: 'Beta mandate',
    },
  });
  return { clientId: client.id, propertyId: property.id };
}

async function createMandate(
  baseUrl: string,
  owner: { cookie: string; organizationId: string; userId: string },
  context: { clientId: string; propertyId: string },
  input: {
    endsAt: string;
    exclusive: boolean;
    key: string;
    startsAt: string;
  },
) {
  const response = await requestJson<MandateResponse>(baseUrl, '/mandates', {
    cookie: owner.cookie,
    method: 'POST',
    body: {
      organizationId: owner.organizationId,
      propertyId: context.propertyId,
      ownerClientId: context.clientId,
      assignedUserId: owner.userId,
      type: MandateType.SALE,
      exclusive: input.exclusive,
      authorizedPriceCents: '25000000',
      currency: 'USD',
      commissionBps: 300,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      notes: `fixture:${runId}:${input.key}`,
    },
  });
  assertStatus(response, 201);
  assert.equal(response.body.mandate.status, MandateStatus.DRAFT);
  return response.body.mandate;
}

async function completeSignatureAndActivate(
  baseUrl: string,
  owner: { cookie: string; organizationId: string },
  mandateId: string,
  key = 'primary',
) {
  await completeSignature(baseUrl, owner, mandateId, key);
  const activated = await transition(
    baseUrl,
    owner,
    mandateId,
    'ACTIVATE',
    `${key}-activate`,
  );
  assertStatus(activated, 201);
  assert.equal(activated.body.mandate.status, MandateStatus.ACTIVE);
}

async function completeSignature(
  baseUrl: string,
  owner: { cookie: string; organizationId: string },
  mandateId: string,
  key: string,
) {
  const submitted = await transition(
    baseUrl,
    owner,
    mandateId,
    'SUBMIT_FOR_SIGNATURE',
    `${key}-submit`,
  );
  assertStatus(submitted, 201);
  const document = await requestJson<{ document: { id: string } }>(
    baseUrl,
    '/documents',
    {
      cookie: owner.cookie,
      method: 'POST',
      body: {
        organizationId: owner.organizationId,
        entityType: DocumentEntityType.MANDATE,
        mandateId,
        name: `Mandato firmado ${key}`,
        documentType: 'SIGNED_MANDATE',
        status: DocumentStatus.APPROVED,
        fileName: `${key}-${runId}.pdf`,
        mimeType: 'application/pdf',
        storagePath: `beta-mandates/${runId}/${key}.pdf`,
        notes: `fixture:${runId}`,
      },
    },
  );
  assertStatus(document, 201);
  const signed = await transition(
    baseUrl,
    owner,
    mandateId,
    'REGISTER_SIGNATURE',
    `${key}-signature`,
    {
      documentId: document.body.document.id,
      signedAt: utcDate(new Date(Date.now() - 86_400_000)),
    },
  );
  assertStatus(signed, 201);
}

function transition(
  baseUrl: string,
  owner: { cookie: string; organizationId: string },
  mandateId: string,
  action: string,
  key: string,
  extra: Record<string, unknown> = {},
) {
  return requestJson<MandateResponse>(
    baseUrl,
    `/mandates/${mandateId}/transitions`,
    {
      cookie: owner.cookie,
      method: 'POST',
      body: {
        organizationId: owner.organizationId,
        action,
        idempotencyKey: `${runId}:${key}`,
        ...extra,
      },
    },
  );
}

function createListing(
  baseUrl: string,
  owner: { cookie: string; organizationId: string },
  propertyId: string,
  mandateId: string,
  operationType: BusinessOperationType,
  key: string,
) {
  return requestJson(baseUrl, '/listings', {
    cookie: owner.cookie,
    method: 'POST',
    body: {
      organizationId: owner.organizationId,
      propertyId,
      mandateId,
      operationType,
      status: ListingStatus.READY,
      title: `Listing ${key} ${runId}`,
    },
  });
}

function validityDates() {
  return { startsAt: addUtcDays(-1), endsAt: addUtcDays(60) };
}

function addUtcDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDate(date);
}

function utcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
