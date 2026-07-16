import assert from 'node:assert/strict';
import {
  createPrismaClient,
  DocumentEntityType,
  DocumentStatus,
  MandateStatus,
  MandateType,
  MembershipRole,
  Prisma,
  PropertyOperation,
} from '@soyre/database';
import {
  assertStatus,
  extractSessionCookie,
  requestJson,
  type ApiResponse,
} from './http.ts';

export type FixturePrisma = ReturnType<typeof createPrismaClient>;

export type FixtureActor = {
  cookie: string;
  email: string;
  organizationId: string;
  password: string;
  role: MembershipRole;
  userId: string;
};

export type MandateContext = {
  clientId: string;
  propertyId: string;
};

export type MandateSnapshot = {
  assignedUserId: string | null;
  documents: Array<{
    documentType: string;
    id: string;
    metadata?: Record<string, unknown> | null;
    status: DocumentStatus;
  }>;
  id: string;
  previousMandateId: string | null;
  readiness: { allowed: boolean; blockers: string[] };
  status: MandateStatus;
  type: MandateType;
};

type UserResponse = {
  user: {
    id: string;
    memberships?: Array<{ organizationId: string }>;
  };
};

export async function registerFixtureOwner(
  baseUrl: string,
  marker: string,
  suffix: string,
) {
  const email = `mandates-${suffix}-${marker}@example.com`;
  const password = `Mandates-${marker}!`;
  const slug = `mandates-${suffix}-${marker}`.toLowerCase();
  const response = await requestJson<UserResponse>(baseUrl, '/auth/register', {
    method: 'POST',
    body: {
      email,
      firstName: 'Mandate',
      lastName: `Owner ${suffix}`,
      organizationName: `Mandates ${suffix} ${marker}`,
      organizationSlug: slug,
      password,
    },
  });
  assertStatus(response, 201);
  const organizationId = response.body.user.memberships?.[0]?.organizationId;
  assert.ok(organizationId);
  return {
    cookie: extractSessionCookie(response.headers),
    email,
    organizationId,
    password,
    role: MembershipRole.OWNER,
    userId: response.body.user.id,
  } satisfies FixtureActor;
}

export async function createFixtureUser(
  baseUrl: string,
  owner: FixtureActor,
  marker: string,
  role: MembershipRole,
  suffix: string,
) {
  const email = `mandates-${suffix}-${marker}@example.com`;
  const password = `Mandates-${marker}!`;
  const created = await requestJson<{
    user: { id: string; membershipId: string };
  }>(baseUrl, '/users', {
    cookie: owner.cookie,
    method: 'POST',
    body: {
      email,
      firstName: 'Mandate',
      lastName: suffix,
      organizationId: owner.organizationId,
      password,
      role,
      startActive: true,
    },
  });
  assertStatus(created, 201);
  const login = await requestJson<UserResponse>(baseUrl, '/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  assertStatus(login, 200);
  return {
    cookie: extractSessionCookie(login.headers),
    email,
    organizationId: owner.organizationId,
    password,
    role,
    userId: created.body.user.id,
  } satisfies FixtureActor;
}

export async function createMandateContext(
  prisma: FixturePrisma,
  owner: FixtureActor,
  marker: string,
  suffix: string,
  operations: PropertyOperation[],
  assignedUserId = owner.userId,
) {
  const client = await prisma.client.create({
    data: {
      displayName: `Mandate client ${suffix} ${marker}`,
      email: `mandate-client-${suffix}-${marker}@example.com`,
      organizationId: owner.organizationId,
    },
  });
  const property = await prisma.property.create({
    data: {
      assignedUserId,
      city: 'Panamá',
      country: 'PA',
      operations,
      organizationId: owner.organizationId,
      ownerClientId: client.id,
      salePrice: operations.includes(PropertyOperation.SALE)
        ? 250_000
        : undefined,
      rentPrice: operations.includes(PropertyOperation.RENT)
        ? 1_500
        : undefined,
      title: `Mandate property ${suffix} ${marker}`,
      type: 'APARTMENT',
      zone: 'Beta mandate',
    },
  });
  return { clientId: client.id, propertyId: property.id };
}

export function createMandate(
  baseUrl: string,
  actor: FixtureActor,
  context: MandateContext,
  marker: string,
  input: {
    assignedUserId?: string;
    authorizedPriceCents?: string;
    commissionBps?: number;
    currency?: string;
    endsAt?: string;
    exclusive?: boolean;
    startsAt?: string;
    type?: MandateType;
    [key: string]: unknown;
  } = {},
) {
  const { key = crypto.randomUUID(), ...overrides } = input;
  const fixtureKey = String(key);
  return requestJson<{ mandate: MandateSnapshot }>(baseUrl, '/mandates', {
    cookie: actor.cookie,
    method: 'POST',
    body: {
      assignedUserId: input.assignedUserId ?? actor.userId,
      authorizedPriceCents: input.authorizedPriceCents ?? '25000000',
      commissionBps: input.commissionBps ?? 300,
      currency: input.currency ?? 'USD',
      endsAt: input.endsAt ?? addUtcDays(60),
      exclusive: input.exclusive ?? false,
      notes: `fixture:${marker}:${fixtureKey}`,
      organizationId: actor.organizationId,
      ownerClientId: context.clientId,
      propertyId: context.propertyId,
      startsAt: input.startsAt ?? addUtcDays(-1),
      type: input.type ?? MandateType.SALE,
      ...overrides,
    },
  });
}

export function createMandateDocument(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  marker: string,
  input: {
    documentType?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
    name?: string;
    status?: DocumentStatus;
  } = {},
) {
  const unique = crypto.randomUUID();
  return requestJson<{
    document: {
      id: string;
      metadata: Record<string, unknown> | null;
      status: DocumentStatus;
    };
  }>(baseUrl, '/documents', {
    cookie: actor.cookie,
    method: 'POST',
    body: {
      documentType: input.documentType ?? 'SIGNED_MANDATE',
      entityType: DocumentEntityType.MANDATE,
      expiresAt: input.expiresAt,
      fileName: `mandate-${unique}.pdf`,
      metadata: input.metadata,
      mimeType: 'application/pdf',
      mandateId,
      name: input.name ?? `Mandato firmado ${marker}`,
      notes: `fixture:${marker}`,
      organizationId: actor.organizationId,
      status: input.status ?? DocumentStatus.APPROVED,
      storagePath: `beta-mandates/${marker}/${unique}.pdf`,
    },
  });
}

export function transitionMandate(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  marker: string,
  action: string,
  extra: Record<string, unknown> = {},
) {
  return requestJson<{ mandate: MandateSnapshot }>(
    baseUrl,
    `/mandates/${mandateId}/transitions`,
    {
      cookie: actor.cookie,
      method: 'POST',
      body: {
        action,
        idempotencyKey: `${marker}:${action}:${crypto.randomUUID()}`,
        organizationId: actor.organizationId,
        ...extra,
      },
    },
  );
}

export function getMandate(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
) {
  return requestJson<{ mandate: MandateSnapshot }>(
    baseUrl,
    `/mandates/${mandateId}?organizationId=${actor.organizationId}`,
    { cookie: actor.cookie },
  );
}

export function getMandateHistory(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
) {
  return requestJson<{
    events: Array<{
      action: string;
      id: string;
      metadata: Record<string, unknown> | null;
      toStatus: MandateStatus;
    }>;
  }>(
    baseUrl,
    `/mandates/${mandateId}/history?organizationId=${actor.organizationId}`,
    { cookie: actor.cookie },
  );
}

export async function submitAndSignMandate(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  marker: string,
) {
  const submitted = await transitionMandate(
    baseUrl,
    actor,
    mandateId,
    marker,
    'SUBMIT_FOR_SIGNATURE',
  );
  assertStatus(submitted, 201);
  const document = await createMandateDocument(
    baseUrl,
    actor,
    mandateId,
    marker,
  );
  assertStatus(document, 201);
  const signed = await transitionMandate(
    baseUrl,
    actor,
    mandateId,
    marker,
    'REGISTER_SIGNATURE',
    { documentId: document.body.document.id, signedAt: addUtcDays(-1) },
  );
  assertStatus(signed, 201);
  return document.body.document;
}

export async function activateMandate(
  baseUrl: string,
  actor: FixtureActor,
  mandateId: string,
  marker: string,
) {
  const activated = await transitionMandate(
    baseUrl,
    actor,
    mandateId,
    marker,
    'ACTIVATE',
  );
  assertStatus(activated, 201);
  assert.equal(activated.body.mandate.status, MandateStatus.ACTIVE);
  return activated.body.mandate;
}

export async function cleanupMandateFixtures(
  prisma: FixturePrisma,
  marker: string,
) {
  const organizations = await prisma.organization.findMany({
    where: { slug: { contains: marker.toLowerCase() } },
    select: { id: true },
  });
  const organizationIds = organizations.map((item: { id: string }) => item.id);
  if (organizationIds.length === 0) return;
  const memberships = await prisma.membership.findMany({
    where: { organizationId: { in: organizationIds } },
    select: { userId: true },
  });
  const userIds = [
    ...new Set(memberships.map((item: { userId: string }) => item.userId)),
  ];

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.listing.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.mandateEvent.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.document.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.mandate.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.property.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.client.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.auditLog.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.membership.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await tx.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

export function assertOneStatus<T>(
  responses: Array<ApiResponse<T>>,
  expectedStatus: number,
) {
  assert.equal(
    responses.filter((response) => response.status === expectedStatus).length,
    1,
    `Expected exactly one HTTP ${expectedStatus}: ${responses
      .map((response) => `${response.status} ${response.text}`)
      .join(' | ')}`,
  );
}

export function addUtcDays(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
