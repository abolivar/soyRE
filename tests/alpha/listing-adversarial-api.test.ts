import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  BusinessOperationType,
  createPrismaClient,
  ListingStatus,
  MandateType,
  MembershipRole,
  PropertyOperation,
} from '@soyre/database';
import { ensureApiServer, type ApiServer } from '../helpers/api-server.ts';
import {
  addCoverFixture,
  createActiveListingContext,
  createListing,
  getListing,
  getListingHistory,
  transitionListing,
  type ListingContext,
} from '../helpers/listing-fixtures.ts';
import {
  assertOneStatus,
  cleanupMandateFixtures,
  createFixtureUser,
  registerFixtureOwner,
  type FixtureActor,
} from '../helpers/mandate-fixtures.ts';
import { assertStatus, requestFormData, requestJson } from '../helpers/http.ts';

const enabled = process.env.LISTING_ADVERSARIAL_API_MUTATING === 'true';
const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let prisma: ReturnType<typeof createPrismaClient>;
let server: ApiServer | null = null;
let ownerA: FixtureActor;
let ownerB: FixtureActor;
let agentA: FixtureActor;
let otherAgentA: FixtureActor;
let readonlyA: FixtureActor;
let financeA: FixtureActor;
let operationsA: FixtureActor;
let saleContext: ListingContext;
let bothContext: ListingContext;
let agentContext: ListingContext;

before(async () => {
  if (!enabled) return;
  prisma = createPrismaClient();
  server = await ensureApiServer();
  ownerA = await registerFixtureOwner(server.baseUrl, marker, 'listing-a');
  ownerB = await registerFixtureOwner(server.baseUrl, marker, 'listing-b');
  agentA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.AGENT,
    'listing-agent',
  );
  otherAgentA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.AGENT,
    'listing-other-agent',
  );
  readonlyA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.READONLY,
    'listing-readonly',
  );
  financeA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.FINANCE,
    'listing-finance',
  );
  operationsA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.OPERATIONS,
    'listing-operations',
  );
  saleContext = await createActiveListingContext(
    prisma,
    server.baseUrl,
    ownerA,
    marker,
    'sale',
    [PropertyOperation.SALE],
    MandateType.SALE,
  );
  bothContext = await createActiveListingContext(
    prisma,
    server.baseUrl,
    ownerA,
    marker,
    'both',
    [PropertyOperation.SALE, PropertyOperation.RENT],
    MandateType.BOTH,
  );
  agentContext = await createActiveListingContext(
    prisma,
    server.baseUrl,
    ownerA,
    marker,
    'agent',
    [PropertyOperation.SALE],
    MandateType.SALE,
    agentA.userId,
  );
});

after(async () => {
  await server?.stop();
  if (enabled) {
    await cleanupMandateFixtures(prisma, marker);
    await prisma.$disconnect();
  }
});

test(
  'enforces readiness and the complete publication lifecycle without partial writes',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const created = await createListing(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      { idempotencyKey: `${marker}:lifecycle:create` },
    );
    assertStatus(created, 201);
    assert.equal(created.body.listing.status, ListingStatus.DRAFT);
    assert.ok(
      created.body.listing.readiness.blockers.some(
        (blocker) => blocker.code === 'MATERIAL_COVER',
      ),
    );

    const invalidPublish = await transitionListing(
      server.baseUrl,
      ownerA,
      created.body.listing.id,
      'PUBLISH',
    );
    assertStatus(invalidPublish, 409);
    const blockedReady = await transitionListing(
      server.baseUrl,
      ownerA,
      created.body.listing.id,
      'DECLARE_READY',
    );
    assertStatus(blockedReady, 409);
    assert.equal(
      (await getListing(server.baseUrl, ownerA, created.body.listing.id)).body
        .listing.status,
      ListingStatus.DRAFT,
    );

    await addCoverFixture(prisma, ownerA, created.body.listing.id, marker);
    const path: Array<{
      action: string;
      expected: ListingStatus;
      reason?: string;
    }> = [
      { action: 'DECLARE_READY', expected: ListingStatus.READY },
      { action: 'APPROVE', expected: ListingStatus.APPROVED },
      { action: 'PUBLISH', expected: ListingStatus.PUBLISHED },
      {
        action: 'PAUSE',
        expected: ListingStatus.PAUSED,
        reason: 'Pausa comercial de prueba.',
      },
      { action: 'RESUME', expected: ListingStatus.PUBLISHED },
      {
        action: 'WITHDRAW',
        expected: ListingStatus.WITHDRAWN,
        reason: 'Retiro definitivo de prueba.',
      },
      {
        action: 'ARCHIVE',
        expected: ListingStatus.ARCHIVED,
        reason: 'Archivo final de prueba.',
      },
    ];
    for (const step of path) {
      const response = await transitionListing(
        server.baseUrl,
        ownerA,
        created.body.listing.id,
        step.action,
        { reason: step.reason },
      );
      assertStatus(response, 201);
      assert.equal(response.body.listing.status, step.expected);
    }
    const history = await getListingHistory(
      server.baseUrl,
      ownerA,
      created.body.listing.id,
    );
    assertStatus(history, 200);
    assert.deepEqual(
      history.body.events.map((event) => event.action),
      ['CREATED', ...path.map((step) => step.action)],
    );
  },
);

test(
  'supports separate sale and rent listings and rejects concurrent duplicates',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const sale = await createListing(
      server.baseUrl,
      ownerA,
      bothContext,
      `${marker}-both-sale`,
      { operationType: BusinessOperationType.SALE },
    );
    const rent = await createListing(
      server.baseUrl,
      ownerA,
      bothContext,
      `${marker}-both-rent`,
      { operationType: BusinessOperationType.RENT },
    );
    assertStatus(sale, 201);
    assertStatus(rent, 201);
    assert.notEqual(sale.body.listing.id, rent.body.listing.id);
    const invalidOperation = await createListing(
      server.baseUrl,
      ownerA,
      bothContext,
      `${marker}-invalid-operation`,
      { operationType: BusinessOperationType.RESERVATION },
    );
    assertStatus(invalidOperation, 400);

    const concurrentContext = await createActiveListingContext(
      prisma,
      server.baseUrl,
      ownerA,
      marker,
      'concurrent',
      [PropertyOperation.SALE],
      MandateType.SALE,
    );
    const attempts = await Promise.all([
      createListing(server.baseUrl, ownerA, concurrentContext, marker, {
        idempotencyKey: `${marker}:concurrent:a`,
      }),
      createListing(server.baseUrl, ownerA, concurrentContext, marker, {
        idempotencyKey: `${marker}:concurrent:b`,
      }),
    ]);
    assertOneStatus(attempts, 201);
    assertOneStatus(attempts, 409);
  },
);

test(
  'enforces roles, assignment and organization isolation on every listing relation',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const agentListing = await createListing(
      server.baseUrl,
      agentA,
      agentContext,
      `${marker}-agent`,
      { assignedUserId: agentA.userId },
    );
    assertStatus(agentListing, 201);
    const hiddenFromOtherAgent = await getListing(
      server.baseUrl,
      otherAgentA,
      agentListing.body.listing.id,
    );
    assertStatus(hiddenFromOtherAgent, 404);

    const readonlyCreate = await createListing(
      server.baseUrl,
      readonlyA,
      saleContext,
      `${marker}-readonly`,
    );
    const financeCreate = await createListing(
      server.baseUrl,
      financeA,
      saleContext,
      `${marker}-finance`,
    );
    assertStatus(readonlyCreate, 403);
    assertStatus(financeCreate, 403);

    const foreignRead = await requestJson(
      server.baseUrl,
      `/listings/${agentListing.body.listing.id}?organizationId=${ownerB.organizationId}`,
      { cookie: ownerB.cookie },
    );
    assertStatus(foreignRead, 404);

    const foreignContext = await createActiveListingContext(
      prisma,
      server.baseUrl,
      ownerB,
      marker,
      'foreign',
      [PropertyOperation.SALE],
      MandateType.SALE,
    );
    const crossMandate = await createListing(
      server.baseUrl,
      ownerA,
      saleContext,
      `${marker}-cross-mandate`,
      { mandateId: foreignContext.mandateId },
    );
    assertStatus(crossMandate, 404);

    const operationsContext = await createActiveListingContext(
      prisma,
      server.baseUrl,
      ownerA,
      marker,
      'operations',
      [PropertyOperation.RENT],
      MandateType.RENT,
    );
    const operationsCreate = await createListing(
      server.baseUrl,
      operationsA,
      operationsContext,
      `${marker}-operations`,
      { operationType: BusinessOperationType.RENT },
    );
    assertStatus(operationsCreate, 201);
  },
);

test(
  'keeps idempotency stable and rejects adulterated material sources before Storage',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const idempotentContext = await createActiveListingContext(
      prisma,
      server.baseUrl,
      ownerA,
      marker,
      'idempotent',
      [PropertyOperation.RENT],
      MandateType.RENT,
    );
    const key = `${marker}:idempotent-create`;
    const first = await createListing(
      server.baseUrl,
      ownerA,
      idempotentContext,
      `${marker}-idempotent`,
      { idempotencyKey: key, operationType: BusinessOperationType.RENT },
    );
    const repeated = await createListing(
      server.baseUrl,
      ownerA,
      idempotentContext,
      `${marker}-idempotent`,
      { idempotencyKey: key, operationType: BusinessOperationType.RENT },
    );
    assertStatus(first, 201);
    assertStatus(repeated, 201);
    assert.equal(first.body.listing.id, repeated.body.listing.id);

    const badMaterial = new FormData();
    badMaterial.set('organizationId', ownerA.organizationId);
    badMaterial.set('type', 'COVER_IMAGE');
    badMaterial.set('idempotencyKey', `${marker}:bad-material`);
    badMaterial.set('name', 'Portada adulterada');
    badMaterial.set(
      'file',
      new File([Buffer.from('not-a-png')], 'cover.png', {
        type: 'image/png',
      }),
    );
    const rejected = await requestFormData(
      server.baseUrl,
      `/listings/${first.body.listing.id}/materials`,
      badMaterial,
      { cookie: ownerA.cookie },
    );
    assertStatus(rejected, 400);
    assert.equal(
      await prisma.listingMaterial.count({
        where: { listingId: first.body.listing.id },
      }),
      0,
    );

    const videoKey = `${marker}:video-material`;
    const video = materialLinkForm(ownerA, videoKey);
    const createdVideo = await requestFormData<{ material: { id: string } }>(
      server.baseUrl,
      `/listings/${first.body.listing.id}/materials`,
      video,
      { cookie: ownerA.cookie },
    );
    assertStatus(createdVideo, 201);
    const repeatedVideo = await requestFormData<{ material: { id: string } }>(
      server.baseUrl,
      `/listings/${first.body.listing.id}/materials`,
      materialLinkForm(ownerA, videoKey),
      { cookie: ownerA.cookie },
    );
    assertStatus(repeatedVideo, 201);
    assert.equal(createdVideo.body.material.id, repeatedVideo.body.material.id);

    const uploadKey = `${marker}:concurrent-cover`;
    const uploads = await Promise.all([
      requestFormData<{ material: { id: string } }>(
        server.baseUrl,
        `/listings/${first.body.listing.id}/materials`,
        coverForm(ownerA, uploadKey, 'cover-a.png'),
        { cookie: ownerA.cookie },
      ),
      requestFormData<{ material: { id: string } }>(
        server.baseUrl,
        `/listings/${first.body.listing.id}/materials`,
        coverForm(ownerA, uploadKey, 'cover-b.png'),
        { cookie: ownerA.cookie },
      ),
    ]);
    assert.equal(
      uploads.filter((response) => response.status === 201).length >= 1,
      true,
      uploads.map((response) => response.text).join(' | '),
    );
    assert.equal(
      uploads.every((response) => [201, 409].includes(response.status)),
      true,
    );
    const binaryMaterials = await prisma.listingMaterial.findMany({
      where: {
        listingId: first.body.listing.id,
        storagePath: { not: null },
      },
      select: { storagePath: true },
    });
    assert.equal(binaryMaterials.length, 1);
    const prefix = `${ownerA.organizationId}/${first.body.listing.id}`;
    try {
      assert.equal((await listStorageObjects(prefix)).length, 1);
    } finally {
      await Promise.all(
        binaryMaterials.flatMap((material: { storagePath: string | null }) =>
          material.storagePath
            ? [removeStorageObject(material.storagePath)]
            : [],
        ),
      );
    }
  },
);

function materialLinkForm(actor: FixtureActor, idempotencyKey: string) {
  const form = new FormData();
  form.set('organizationId', actor.organizationId);
  form.set('type', 'VIDEO_LINK');
  form.set('idempotencyKey', idempotencyKey);
  form.set('name', 'Recorrido de prueba');
  form.set('externalUrl', 'https://video.example.test/listing-beta');
  form.set('sortOrder', '2');
  return form;
}

function coverForm(
  actor: FixtureActor,
  idempotencyKey: string,
  fileName: string,
) {
  const form = new FormData();
  form.set('organizationId', actor.organizationId);
  form.set('type', 'COVER_IMAGE');
  form.set('idempotencyKey', idempotencyKey);
  form.set('name', 'Portada concurrente');
  form.set(
    'file',
    new File(
      [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
      fileName,
      { type: 'image/png' },
    ),
  );
  return form;
}

async function listStorageObjects(prefix: string) {
  const { secret, url } = storageEnvironment();
  const response = await fetch(
    `${url}/storage/v1/object/list/listing-materials`,
    {
      body: JSON.stringify({ limit: 100, prefix }),
      headers: {
        apikey: secret,
        authorization: `Bearer ${secret}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    },
  );
  if (!response.ok) {
    assert.fail(`Storage list failed: ${await response.text()}`);
  }
  return (await response.json()) as Array<{ name: string }>;
}

async function removeStorageObject(path: string) {
  const { secret, url } = storageEnvironment();
  const response = await fetch(
    `${url}/storage/v1/object/listing-materials/${path}`,
    {
      headers: { apikey: secret, authorization: `Bearer ${secret}` },
      method: 'DELETE',
    },
  );
  if (!response.ok) {
    assert.fail(`Storage cleanup failed: ${await response.text()}`);
  }
}

function storageEnvironment() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;
  assert.ok(url, 'SUPABASE_URL is required for mutating listing QA.');
  assert.ok(secret, 'SUPABASE_SECRET_KEY is required for mutating listing QA.');
  return { secret, url };
}
