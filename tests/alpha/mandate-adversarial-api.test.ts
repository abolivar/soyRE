import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  BusinessOperationType,
  createPrismaClient,
  DocumentStatus,
  ListingStatus,
  MandateStatus,
  MandateType,
  MembershipRole,
  PropertyOperation,
} from '@soyre/database';
import { ensureApiServer, type ApiServer } from '../helpers/api-server.ts';
import {
  activateMandate,
  addUtcDays,
  assertOneStatus,
  cleanupMandateFixtures,
  createFixtureUser,
  createMandate,
  createMandateContext,
  createMandateDocument,
  getMandate,
  getMandateHistory,
  registerFixtureOwner,
  submitAndSignMandate,
  transitionMandate,
  type FixtureActor,
  type MandateContext,
} from '../helpers/mandate-fixtures.ts';
import { assertStatus, requestJson } from '../helpers/http.ts';

const enabled = process.env.MANDATE_ADVERSARIAL_API_MUTATING === 'true';
const marker = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prisma = createPrismaClient();
let server: ApiServer | null = null;
let ownerA: FixtureActor;
let ownerB: FixtureActor;
let agentA: FixtureActor;
let otherAgentA: FixtureActor;
let externalAgentA: FixtureActor;
let readonlyA: FixtureActor;
let financeA: FixtureActor;
let operationsA: FixtureActor;
let saleContext: MandateContext;
let rentContext: MandateContext;
let bothContext: MandateContext;
let agentContext: MandateContext;

before(async () => {
  if (!enabled) return;
  server = await ensureApiServer();
  ownerA = await registerFixtureOwner(server.baseUrl, marker, 'adv-a');
  ownerB = await registerFixtureOwner(server.baseUrl, marker, 'adv-b');
  agentA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.AGENT,
    'agent-a',
  );
  otherAgentA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.AGENT,
    'agent-other',
  );
  externalAgentA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.EXTERNAL_AGENT,
    'external-a',
  );
  readonlyA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.READONLY,
    'readonly-a',
  );
  financeA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.FINANCE,
    'finance-a',
  );
  operationsA = await createFixtureUser(
    server.baseUrl,
    ownerA,
    marker,
    MembershipRole.OPERATIONS,
    'operations-a',
  );
  saleContext = await createMandateContext(prisma, ownerA, marker, 'sale', [
    PropertyOperation.SALE,
  ]);
  rentContext = await createMandateContext(prisma, ownerA, marker, 'rent', [
    PropertyOperation.RENT,
  ]);
  bothContext = await createMandateContext(prisma, ownerA, marker, 'both', [
    PropertyOperation.SALE,
    PropertyOperation.RENT,
  ]);
  agentContext = await createMandateContext(
    prisma,
    ownerA,
    marker,
    'agent',
    [PropertyOperation.SALE],
    agentA.userId,
  );
});

after(async () => {
  await server?.stop();
  if (enabled) await cleanupMandateFixtures(prisma, marker);
  await prisma.$disconnect();
});

test(
  'validates sale, rent, both, extreme terms, roles and every organization relation',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const sale = await createMandate(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      {
        authorizedPriceCents: '1',
        commissionBps: 0,
        endsAt: addUtcDays(0),
        key: 'sale-minimums',
        startsAt: addUtcDays(0),
      },
    );
    assertStatus(sale, 201);
    assert.equal(sale.body.mandate.type, MandateType.SALE);

    const rent = await createMandate(
      server.baseUrl,
      ownerA,
      rentContext,
      marker,
      {
        authorizedPriceCents: '999999999999',
        commissionBps: 10_000,
        key: 'rent-maximums',
        type: MandateType.RENT,
      },
    );
    assertStatus(rent, 201);
    assert.equal(rent.body.mandate.type, MandateType.RENT);

    const both = await createMandate(
      server.baseUrl,
      ownerA,
      bothContext,
      marker,
      { key: 'both', type: MandateType.BOTH },
    );
    assertStatus(both, 201);
    assert.equal(both.body.mandate.type, MandateType.BOTH);

    const typeMismatch = await createMandate(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      { key: 'type-mismatch', type: MandateType.BOTH },
    );
    assertStatus(typeMismatch, 400);
    const reversedDates = await createMandate(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      {
        endsAt: addUtcDays(1),
        key: 'reversed-dates',
        startsAt: addUtcDays(2),
      },
    );
    assertStatus(reversedDates, 400);
    const arbitraryStatus = await createMandate(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      { key: 'arbitrary-status', status: MandateStatus.ACTIVE },
    );
    assertStatus(arbitraryStatus, 400);
    const createWithSignature = await createMandate(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      { key: 'create-signature', signedAt: addUtcDays(-1) },
    );
    assertStatus(createWithSignature, 400);

    const contextB = await createMandateContext(
      prisma,
      ownerB,
      marker,
      'cross-b',
      [PropertyOperation.SALE],
    );
    const crossProperty = await createMandate(
      server.baseUrl,
      ownerA,
      contextB,
      marker,
      { assignedUserId: ownerA.userId, key: 'cross-property' },
    );
    assertStatus(crossProperty, 400);
    const crossOwner = await createMandate(
      server.baseUrl,
      ownerA,
      { clientId: contextB.clientId, propertyId: saleContext.propertyId },
      marker,
      { key: 'cross-owner' },
    );
    assertStatus(crossOwner, 400);
    const crossAssignee = await createMandate(
      server.baseUrl,
      ownerA,
      saleContext,
      marker,
      { assignedUserId: ownerB.userId, key: 'cross-assignee' },
    );
    assertStatus(crossAssignee, 400);

    const readonlyCreate = await createMandate(
      server.baseUrl,
      readonlyA,
      saleContext,
      marker,
      { assignedUserId: ownerA.userId, key: 'readonly-create' },
    );
    assertStatus(readonlyCreate, 403);
    const financeCreate = await createMandate(
      server.baseUrl,
      financeA,
      saleContext,
      marker,
      { assignedUserId: ownerA.userId, key: 'finance-create' },
    );
    assertStatus(financeCreate, 403);

    const agentMandate = await createMandate(
      server.baseUrl,
      agentA,
      agentContext,
      marker,
      { assignedUserId: agentA.userId, key: 'agent-owned' },
    );
    assertStatus(agentMandate, 201);
    const agentSubmit = await transitionMandate(
      server.baseUrl,
      agentA,
      agentMandate.body.mandate.id,
      marker,
      'SUBMIT_FOR_SIGNATURE',
    );
    assertStatus(agentSubmit, 201);
    const agentCommit = await transitionMandate(
      server.baseUrl,
      agentA,
      agentMandate.body.mandate.id,
      marker,
      'REGISTER_SIGNATURE',
      { signedAt: addUtcDays(-1) },
    );
    assertStatus(agentCommit, 403);
    const otherAgentRead = await getMandate(
      server.baseUrl,
      otherAgentA,
      agentMandate.body.mandate.id,
    );
    assertStatus(otherAgentRead, 404);

    const agentList = await requestJson<{ mandates: Array<{ id: string }> }>(
      server.baseUrl,
      `/mandates?organizationId=${ownerA.organizationId}`,
      { cookie: agentA.cookie },
    );
    assertStatus(agentList, 200);
    assert.deepEqual(
      agentList.body.mandates.map((item) => item.id),
      [agentMandate.body.mandate.id],
    );
    const externalList = await requestJson<{ mandates: unknown[] }>(
      server.baseUrl,
      `/mandates?organizationId=${ownerA.organizationId}`,
      { cookie: externalAgentA.cookie },
    );
    assertStatus(externalList, 200);
    assert.equal(externalList.body.mandates.length, 0);
    const readonlyList = await requestJson<{ mandates: unknown[] }>(
      server.baseUrl,
      `/mandates?organizationId=${ownerA.organizationId}`,
      { cookie: readonlyA.cookie },
    );
    assertStatus(readonlyList, 200);
    assert.ok(readonlyList.body.mandates.length >= 4);

    const crossRead = await getMandate(
      server.baseUrl,
      ownerB,
      sale.body.mandate.id,
    );
    assertStatus(crossRead, 404);
    const crossHistory = await getMandateHistory(
      server.baseUrl,
      ownerB,
      sale.body.mandate.id,
    );
    assertStatus(crossHistory, 404);
    const crossDocument = await createMandateDocument(
      server.baseUrl,
      ownerB,
      sale.body.mandate.id,
      marker,
    );
    assertStatus(crossDocument, 400);
    const crossRenewal = await renewMandate(
      server.baseUrl,
      ownerB,
      sale.body.mandate.id,
      'cross-renewal',
    );
    assertStatus(crossRenewal, 404);
  },
);

test(
  'covers every transition, evidence state, replacement and rollback on failure',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const context = await createMandateContext(
      prisma,
      ownerA,
      marker,
      'transition-matrix',
      [PropertyOperation.SALE],
    );
    const created = await createMandate(
      server.baseUrl,
      ownerA,
      context,
      marker,
      { key: 'transition-matrix' },
    );
    assertStatus(created, 201);
    const mandateId = created.body.mandate.id;

    const invalidActivate = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'ACTIVATE',
    );
    assertStatus(invalidActivate, 409);
    const invalidReturn = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'RETURN_TO_DRAFT',
      { reason: 'Estado incorrecto' },
    );
    assertStatus(invalidReturn, 409);
    await assertHistoryLength(server.baseUrl, ownerA, mandateId, 1);

    const submitted = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'SUBMIT_FOR_SIGNATURE',
    );
    assertStatus(submitted, 201);
    const editAfterSubmit = await requestJson(
      server.baseUrl,
      `/mandates/${mandateId}`,
      {
        cookie: ownerA.cookie,
        method: 'PATCH',
        body: {
          idempotencyKey: `${marker}:edit-after-submit`,
          notes: 'No debe persistir',
          organizationId: ownerA.organizationId,
        },
      },
    );
    assertStatus(editAfterSubmit, 409);
    const returnWithoutReason = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'RETURN_TO_DRAFT',
    );
    assertStatus(returnWithoutReason, 400);
    await assertHistoryLength(server.baseUrl, ownerA, mandateId, 2);
    const returned = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'RETURN_TO_DRAFT',
      { reason: 'Corregir términos antes de firmar' },
    );
    assertStatus(returned, 201);
    const resubmitted = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'SUBMIT_FOR_SIGNATURE',
    );
    assertStatus(resubmitted, 201);

    const missingEvidence = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'REGISTER_SIGNATURE',
      { signedAt: addUtcDays(-1) },
    );
    assertStatus(missingEvidence, 400);
    const rejected = await createMandateDocument(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      { name: 'Mandato observado', status: DocumentStatus.REJECTED },
    );
    assertStatus(rejected, 201);
    const rejectedEvidence = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'REGISTER_SIGNATURE',
      { documentId: rejected.body.document.id, signedAt: addUtcDays(-1) },
    );
    assertStatus(rejectedEvidence, 409);
    const futureSignature = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'REGISTER_SIGNATURE',
      { documentId: rejected.body.document.id, signedAt: addUtcDays(1) },
    );
    assertStatus(futureSignature, 400);
    await prisma.document.update({
      where: { id: rejected.body.document.id },
      data: { status: DocumentStatus.ARCHIVED },
    });

    const original = await createMandateDocument(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      { name: 'Mandato firmado original' },
    );
    assertStatus(original, 201);
    const replacement = await createMandateDocument(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      {
        metadata: { replacesDocumentId: original.body.document.id },
        name: 'Mandato firmado reemplazo',
      },
    );
    assertStatus(replacement, 201);
    assert.deepEqual(replacement.body.document.metadata, {
      replacesDocumentId: original.body.document.id,
    });
    const signed = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'REGISTER_SIGNATURE',
      {
        documentId: replacement.body.document.id,
        signedAt: addUtcDays(-1),
      },
    );
    assertStatus(signed, 201);
    const signatureHistory = await getMandateHistory(
      server.baseUrl,
      ownerA,
      mandateId,
    );
    assertStatus(signatureHistory, 200);
    assert.equal(
      signatureHistory.body.events.find(
        (event) => event.action === 'REGISTER_SIGNATURE',
      )?.metadata?.documentId,
      replacement.body.document.id,
    );

    for (const status of [
      DocumentStatus.REQUIRED,
      DocumentStatus.REJECTED,
      DocumentStatus.EXPIRED,
    ]) {
      const blocker = await createMandateDocument(
        server.baseUrl,
        ownerA,
        mandateId,
        marker,
        {
          documentType: `BLOCKER_${status}`,
          expiresAt:
            status === DocumentStatus.EXPIRED ? addUtcDays(-1) : undefined,
          name: `Bloqueante ${status}`,
          status,
        },
      );
      assertStatus(blocker, 201);
      const historyBefore = await eventCount(mandateId);
      const activation = await transitionMandate(
        server.baseUrl,
        ownerA,
        mandateId,
        marker,
        'ACTIVATE',
      );
      assertStatus(activation, 409);
      assert.equal(await eventCount(mandateId), historyBefore);
      const unchanged = await getMandate(server.baseUrl, ownerA, mandateId);
      assertStatus(unchanged, 200);
      assert.equal(
        unchanged.body.mandate.status,
        MandateStatus.PENDING_DOCUMENTS,
      );
      await prisma.document.update({
        where: { id: blocker.body.document.id },
        data: { status: DocumentStatus.ARCHIVED },
      });
    }

    const activated = await activateMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
    );
    assert.equal(activated.readiness.allowed, true);
    const earlyExpire = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'EXPIRE',
    );
    assertStatus(earlyExpire, 409);
    const archiveActive = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'ARCHIVE',
    );
    assertStatus(archiveActive, 409);
    const cancelWithoutEffectiveDate = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'CANCEL',
      { reason: 'Cancelación acordada' },
    );
    assertStatus(cancelWithoutEffectiveDate, 400);
    const futureCancellation = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'CANCEL',
      { effectiveAt: addUtcDays(1), reason: 'Cancelación futura' },
    );
    assertStatus(futureCancellation, 400);
    const cancelled = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'CANCEL',
      { effectiveAt: addUtcDays(0), reason: 'Cancelación confirmada' },
    );
    assertStatus(cancelled, 201);
    const archived = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'ARCHIVE',
    );
    assertStatus(archived, 201);
    const repeatedArchive = await transitionMandate(
      server.baseUrl,
      ownerA,
      mandateId,
      marker,
      'ARCHIVE',
    );
    assertStatus(repeatedArchive, 409);

    const expiryContext = await createMandateContext(
      prisma,
      ownerA,
      marker,
      'expiry',
      [PropertyOperation.SALE],
    );
    const expiryMandate = await createMandate(
      server.baseUrl,
      ownerA,
      expiryContext,
      marker,
      { endsAt: addUtcDays(0), key: 'expiry' },
    );
    assertStatus(expiryMandate, 201);
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      expiryMandate.body.mandate.id,
      marker,
    );
    await activateMandate(
      server.baseUrl,
      ownerA,
      expiryMandate.body.mandate.id,
      marker,
    );
    await prisma.mandate.update({
      where: { id: expiryMandate.body.mandate.id },
      data: { endsAt: new Date(`${addUtcDays(-1)}T00:00:00.000Z`) },
    });
    const expired = await transitionMandate(
      server.baseUrl,
      ownerA,
      expiryMandate.body.mandate.id,
      marker,
      'EXPIRE',
    );
    assertStatus(expired, 201);
    const archivedExpiry = await transitionMandate(
      server.baseUrl,
      ownerA,
      expiryMandate.body.mandate.id,
      marker,
      'ARCHIVE',
    );
    assertStatus(archivedExpiry, 201);

    const collision = await createMandate(
      server.baseUrl,
      ownerA,
      expiryContext,
      marker,
      { key: 'idempotency-collision' },
    );
    assertStatus(collision, 201);
    const collisionKey = `${marker}:shared-key`;
    const first = await rawTransition(
      server.baseUrl,
      ownerA,
      collision.body.mandate.id,
      'SUBMIT_FOR_SIGNATURE',
      collisionKey,
    );
    assertStatus(first, 201);
    const second = await rawTransition(
      server.baseUrl,
      ownerA,
      collision.body.mandate.id,
      'CANCEL',
      collisionKey,
      { reason: 'No debe persistir' },
    );
    assertStatus(second, 409);
    await assertHistoryLength(
      server.baseUrl,
      ownerA,
      collision.body.mandate.id,
      2,
    );
  },
);

test(
  'serializes exclusive activation and gates listing readiness exactly',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const concurrentContext = await createMandateContext(
      prisma,
      ownerA,
      marker,
      'concurrent',
      [PropertyOperation.SALE],
    );
    const first = await createMandate(
      server.baseUrl,
      ownerA,
      concurrentContext,
      marker,
      { exclusive: true, key: 'concurrent-a' },
    );
    const second = await createMandate(
      server.baseUrl,
      ownerA,
      concurrentContext,
      marker,
      { exclusive: true, key: 'concurrent-b' },
    );
    assertStatus(first, 201);
    assertStatus(second, 201);
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      first.body.mandate.id,
      marker,
    );
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      second.body.mandate.id,
      marker,
    );
    const activations = await Promise.all([
      transitionMandate(
        server.baseUrl,
        ownerA,
        first.body.mandate.id,
        marker,
        'ACTIVATE',
      ),
      transitionMandate(
        server.baseUrl,
        ownerA,
        second.body.mandate.id,
        marker,
        'ACTIVATE',
      ),
    ]);
    assertOneStatus(activations, 201);
    assertOneStatus(activations, 409);
    const mandatesAfter = await prisma.mandate.findMany({
      where: { id: { in: [first.body.mandate.id, second.body.mandate.id] } },
      select: { id: true, status: true },
    });
    assert.equal(
      mandatesAfter.filter(
        (item: { status: MandateStatus }) =>
          item.status === MandateStatus.ACTIVE,
      ).length,
      1,
    );
    assert.equal(
      mandatesAfter.filter(
        (item: { status: MandateStatus }) =>
          item.status === MandateStatus.PENDING_DOCUMENTS,
      ).length,
      1,
    );
    const activeMandateId = mandatesAfter.find(
      (item: { id: string; status: MandateStatus }) =>
        item.status === MandateStatus.ACTIVE,
    )?.id;
    const blockedMandateId = mandatesAfter.find(
      (item: { id: string; status: MandateStatus }) =>
        item.status === MandateStatus.PENDING_DOCUMENTS,
    )?.id;
    assert.ok(activeMandateId);
    assert.ok(blockedMandateId);
    assert.equal(
      await prisma.mandateEvent.count({
        where: { action: 'ACTIVATE', mandateId: blockedMandateId },
      }),
      0,
    );

    const draftListing = await createListing(
      server.baseUrl,
      ownerA,
      concurrentContext.propertyId,
      undefined,
      BusinessOperationType.SALE,
      ListingStatus.DRAFT,
      'draft-without-mandate',
    );
    assertStatus(draftListing, 201);
    const readyWithoutMandate = await createListing(
      server.baseUrl,
      ownerA,
      concurrentContext.propertyId,
      undefined,
      BusinessOperationType.SALE,
      ListingStatus.READY,
      'ready-without-mandate',
    );
    assertStatus(readyWithoutMandate, 409);
    const readyBlocked = await createListing(
      server.baseUrl,
      ownerA,
      concurrentContext.propertyId,
      blockedMandateId,
      BusinessOperationType.SALE,
      ListingStatus.READY,
      'ready-blocked',
    );
    assertStatus(readyBlocked, 409);
    const listingCountBeforeMismatch = await prisma.listing.count({
      where: { organizationId: ownerA.organizationId },
    });
    const mismatch = await createListing(
      server.baseUrl,
      ownerA,
      concurrentContext.propertyId,
      activeMandateId,
      BusinessOperationType.RENT,
      ListingStatus.READY,
      'operation-mismatch',
    );
    assertStatus(mismatch, 409);
    assert.equal(
      await prisma.listing.count({
        where: { organizationId: ownerA.organizationId },
      }),
      listingCountBeforeMismatch,
    );
    const ready = await createListing(
      server.baseUrl,
      ownerA,
      concurrentContext.propertyId,
      activeMandateId,
      BusinessOperationType.SALE,
      ListingStatus.READY,
      'ready-compatible',
    );
    assertStatus(ready, 201);

    const splitContext = await createMandateContext(
      prisma,
      ownerA,
      marker,
      'split-operations',
      [PropertyOperation.SALE, PropertyOperation.RENT],
    );
    const sale = await createMandate(
      server.baseUrl,
      ownerA,
      splitContext,
      marker,
      { exclusive: true, key: 'split-sale', type: MandateType.SALE },
    );
    const rent = await createMandate(
      server.baseUrl,
      ownerA,
      splitContext,
      marker,
      { exclusive: true, key: 'split-rent', type: MandateType.RENT },
    );
    assertStatus(sale, 201);
    assertStatus(rent, 201);
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      sale.body.mandate.id,
      marker,
    );
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      rent.body.mandate.id,
      marker,
    );
    await activateMandate(server.baseUrl, ownerA, sale.body.mandate.id, marker);
    await activateMandate(server.baseUrl, ownerA, rent.body.mandate.id, marker);
    const both = await createMandate(
      server.baseUrl,
      ownerA,
      splitContext,
      marker,
      { exclusive: true, key: 'split-both', type: MandateType.BOTH },
    );
    assertStatus(both, 201);
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      both.body.mandate.id,
      marker,
    );
    const bothActivation = await transitionMandate(
      server.baseUrl,
      ownerA,
      both.body.mandate.id,
      marker,
      'ACTIVATE',
    );
    assertStatus(bothActivation, 409);
  },
);

test(
  'keeps concurrent renewal idempotent and supersession atomic',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const context = await createMandateContext(
      prisma,
      ownerA,
      marker,
      'renewal-concurrent',
      [PropertyOperation.SALE],
    );
    const primary = await createMandate(
      server.baseUrl,
      ownerA,
      context,
      marker,
      { exclusive: true, key: 'renew-primary' },
    );
    assertStatus(primary, 201);
    await submitAndSignMandate(
      server.baseUrl,
      ownerA,
      primary.body.mandate.id,
      marker,
    );
    await activateMandate(
      server.baseUrl,
      ownerA,
      primary.body.mandate.id,
      marker,
    );

    const renewals = await Promise.all([
      renewMandate(
        server.baseUrl,
        ownerA,
        primary.body.mandate.id,
        'concurrent-renew-a',
      ),
      renewMandate(
        server.baseUrl,
        operationsA,
        primary.body.mandate.id,
        'concurrent-renew-b',
      ),
    ]);
    assert.deepEqual(
      renewals.map((item) => item.status),
      [201, 201],
      renewals.map((item) => item.text).join(' | '),
    );
    assert.equal(new Set(renewals.map((item) => item.body.mandate.id)).size, 1);
    assert.equal(
      renewals.filter((item) => item.body.created === true).length,
      1,
    );
    assert.equal(
      renewals.filter((item) => item.body.created === false).length,
      1,
    );
    const renewalId = renewals[0]?.body.mandate.id;
    assert.ok(renewalId);
    assert.equal(
      await prisma.mandate.count({
        where: { previousMandateId: primary.body.mandate.id },
      }),
      1,
    );

    const updated = await requestJson(
      server.baseUrl,
      `/mandates/${renewalId}`,
      {
        cookie: ownerA.cookie,
        method: 'PATCH',
        body: {
          authorizedPriceCents: '26000000',
          commissionBps: 325,
          endsAt: addUtcDays(90),
          idempotencyKey: `${marker}:renewal-terms`,
          organizationId: ownerA.organizationId,
          startsAt: addUtcDays(-1),
        },
      },
    );
    assertStatus(updated, 200);
    await submitAndSignMandate(server.baseUrl, ownerA, renewalId, marker);
    const blocker = await createMandateDocument(
      server.baseUrl,
      ownerA,
      renewalId,
      marker,
      {
        documentType: 'RENEWAL_REVIEW',
        name: 'Revisión pendiente de renovación',
        status: DocumentStatus.REQUIRED,
      },
    );
    assertStatus(blocker, 201);
    const failedActivation = await transitionMandate(
      server.baseUrl,
      ownerA,
      renewalId,
      marker,
      'ACTIVATE',
    );
    assertStatus(failedActivation, 409);
    const primaryAfterFailure = await getMandate(
      server.baseUrl,
      ownerA,
      primary.body.mandate.id,
    );
    assertStatus(primaryAfterFailure, 200);
    assert.equal(primaryAfterFailure.body.mandate.status, MandateStatus.ACTIVE);
    assert.equal(
      await prisma.mandateEvent.count({
        where: { action: 'SUPERSEDE', mandateId: primary.body.mandate.id },
      }),
      0,
    );

    await prisma.document.update({
      where: { id: blocker.body.document.id },
      data: { status: DocumentStatus.ARCHIVED },
    });
    await activateMandate(server.baseUrl, ownerA, renewalId, marker);
    const [primaryAfter, renewalAfter] = await Promise.all([
      getMandate(server.baseUrl, ownerA, primary.body.mandate.id),
      getMandate(server.baseUrl, ownerA, renewalId),
    ]);
    assertStatus(primaryAfter, 200);
    assertStatus(renewalAfter, 200);
    assert.equal(primaryAfter.body.mandate.status, MandateStatus.SUPERSEDED);
    assert.equal(renewalAfter.body.mandate.status, MandateStatus.ACTIVE);
    assert.equal(
      await prisma.mandateEvent.count({
        where: { action: 'SUPERSEDE', mandateId: primary.body.mandate.id },
      }),
      1,
    );
  },
);

async function assertHistoryLength(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  expected: number,
) {
  const history = await getMandateHistory(baseUrl, actor, mandateId);
  assertStatus(history, 200);
  assert.equal(history.body.events.length, expected);
}

function eventCount(mandateId: string) {
  return prisma.mandateEvent.count({ where: { mandateId } });
}

function rawTransition(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  action: string,
  idempotencyKey: string,
  extra: Record<string, unknown> = {},
) {
  return requestJson(baseUrl, `/mandates/${mandateId}/transitions`, {
    cookie: actor.cookie,
    method: 'POST',
    body: {
      action,
      idempotencyKey,
      organizationId: actor.organizationId,
      ...extra,
    },
  });
}

function renewMandate(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  key: string,
) {
  return requestJson<{
    created: boolean;
    mandate: { id: string; previousMandateId: string | null };
  }>(baseUrl, `/mandates/${mandateId}/renewals`, {
    cookie: actor.cookie,
    method: 'POST',
    body: {
      idempotencyKey: `${marker}:${key}`,
      organizationId: actor.organizationId,
    },
  });
}

function createListing(
  baseUrl: string,
  actor: FixtureActor,
  propertyId: string,
  mandateId: string | undefined,
  operationType: BusinessOperationType,
  status: ListingStatus,
  key: string,
) {
  return requestJson(baseUrl, '/listings', {
    cookie: actor.cookie,
    method: 'POST',
    body: {
      mandateId,
      operationType,
      organizationId: actor.organizationId,
      propertyId,
      status,
      title: `Listing ${key} ${marker}`,
    },
  });
}
