import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { BusinessOperationType, createPrismaClient } from '@soyre/database';
import { ensureApiServer, type ApiServer } from '../helpers/api-server.ts';
import {
  assertStatus,
  extractSessionCookie,
  requestJson,
} from '../helpers/http.ts';

type RegisteredUser = {
  id: string;
  memberships: Array<{ organizationId: string }>;
};

type TemplateResponse = {
  template: {
    id: string;
    familyKey: string;
    isActive: boolean;
    name: string;
    version: number;
    items: Array<{ key: string; name: string }>;
  };
  versionCreated?: boolean;
};

const enabled =
  process.env.DOCUMENT_TEMPLATE_API_MUTATING === 'true' ||
  process.env.DOCUMENT_EXPEDIENTE_QA_MUTATING === 'true';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let server: ApiServer | null = null;
const prisma = enabled ? createPrismaClient() : null;

before(async () => {
  if (enabled) server = await ensureApiServer();
});

after(async () => {
  await server?.stop();
  await prisma?.$disconnect();
});

test(
  'document template API enforces management, isolation and immutable versioning',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    assert.ok(prisma);
    const owner = await register(
      server.baseUrl,
      `docs-owner-${runId}@example.com`,
      `docs-org-${runId}`,
    );
    const otherOwner = await register(
      server.baseUrl,
      `docs-other-${runId}@example.com`,
      `docs-other-org-${runId}`,
    );

    const forbiddenCrossOrganization = await requestJson(
      server.baseUrl,
      `/document-checklist-templates?organizationId=${otherOwner.organizationId}`,
      { cookie: owner.cookie },
    );
    assertStatus(forbiddenCrossOrganization, 403);

    const readonlyPassword = `Readonly-${runId}!`;
    const readonly = await requestJson<{ user: { email: string } }>(
      server.baseUrl,
      '/users',
      {
        cookie: owner.cookie,
        method: 'POST',
        body: {
          firstName: 'Solo',
          lastName: 'Lectura',
          email: `docs-readonly-${runId}@example.com`,
          password: readonlyPassword,
          role: 'READONLY',
          startActive: true,
        },
      },
    );
    assertStatus(readonly, 201);
    const readonlyLogin = await requestJson<{ user: RegisteredUser }>(
      server.baseUrl,
      '/auth/login',
      {
        method: 'POST',
        body: { email: readonly.body.user.email, password: readonlyPassword },
      },
    );
    assertStatus(readonlyLogin, 200);
    const readonlyCookie = extractSessionCookie(readonlyLogin.headers);

    const forbiddenRole = await requestJson(
      server.baseUrl,
      '/document-checklist-templates',
      { cookie: readonlyCookie },
    );
    assertStatus(forbiddenRole, 403);

    const familyKey = `sale-panama-${runId}`.toLowerCase();
    const created = await requestJson<TemplateResponse>(
      server.baseUrl,
      '/document-checklist-templates',
      {
        cookie: owner.cookie,
        method: 'POST',
        body: {
          organizationId: owner.organizationId,
          familyKey,
          name: 'Venta Panamá',
          operationTypes: ['SALE'],
          countries: ['pa'],
          businessStatuses: ['DRAFT'],
          items: [
            {
              key: 'reservation',
              name: 'Reserva',
              category: 'CONTRACT',
              required: true,
              blocksTransition: true,
            },
          ],
        },
      },
    );
    assertStatus(created, 201);
    assert.equal(created.body.template.version, 1);
    assert.equal(created.body.template.isActive, false);

    const draftUpdated = await requestJson<TemplateResponse>(
      server.baseUrl,
      `/document-checklist-templates/${created.body.template.id}`,
      {
        cookie: owner.cookie,
        method: 'PATCH',
        body: {
          organizationId: owner.organizationId,
          name: 'Venta Panamá actualizada',
        },
      },
    );
    assertStatus(draftUpdated, 200);
    assert.equal(draftUpdated.body.versionCreated, false);
    assert.equal(draftUpdated.body.template.version, 1);

    const activated = await requestJson<TemplateResponse>(
      server.baseUrl,
      `/document-checklist-templates/${created.body.template.id}/activate`,
      {
        cookie: owner.cookie,
        method: 'POST',
        body: { organizationId: owner.organizationId },
      },
    );
    assertStatus(activated, 201);
    assert.equal(activated.body.template.isActive, true);

    const business = await prisma.business.create({
      data: {
        organizationId: owner.organizationId,
        operationType: BusinessOperationType.SALE,
      },
    });
    await prisma.businessDocumentChecklist.create({
      data: {
        organizationId: owner.organizationId,
        businessId: business.id,
        templateId: created.body.template.id,
        templateFamilyKey: familyKey,
        templateName: activated.body.template.name,
        templateVersion: 1,
        applicabilitySnapshot: { operationTypes: ['SALE'], countries: ['PA'] },
      },
    });

    const versioned = await requestJson<TemplateResponse>(
      server.baseUrl,
      `/document-checklist-templates/${created.body.template.id}`,
      {
        cookie: owner.cookie,
        method: 'PATCH',
        body: {
          organizationId: owner.organizationId,
          name: 'Venta Panamá versión 2',
          items: [
            {
              key: 'reservation',
              name: 'Reserva firmada',
              category: 'CONTRACT',
              required: true,
              blocksTransition: true,
            },
            {
              key: 'addendum',
              name: 'Adenda',
              category: 'ADDENDUM',
              required: false,
              allowsMultipleFiles: true,
            },
          ],
        },
      },
    );
    assertStatus(versioned, 200);
    assert.equal(versioned.body.versionCreated, true);
    assert.equal(versioned.body.template.version, 2);
    assert.equal(versioned.body.template.isActive, false);
    assert.equal(versioned.body.template.items.length, 2);

    const versions = await requestJson<{
      templates: TemplateResponse['template'][];
    }>(
      server.baseUrl,
      `/document-checklist-templates?organizationId=${owner.organizationId}&includeInactive=true`,
      { cookie: owner.cookie },
    );
    assertStatus(versions, 200);
    assert.deepEqual(
      versions.body.templates.map((template) => template.version),
      [2, 1],
    );

    const activatedV2 = await requestJson<TemplateResponse>(
      server.baseUrl,
      `/document-checklist-templates/${versioned.body.template.id}/activate`,
      {
        cookie: owner.cookie,
        method: 'POST',
        body: { organizationId: owner.organizationId },
      },
    );
    assertStatus(activatedV2, 201);
    assert.equal(activatedV2.body.template.isActive, true);

    const oldVersion = await requestJson<TemplateResponse>(
      server.baseUrl,
      `/document-checklist-templates/${created.body.template.id}?organizationId=${owner.organizationId}`,
      { cookie: owner.cookie },
    );
    assertStatus(oldVersion, 200);
    assert.equal(oldVersion.body.template.isActive, false);
  },
);

async function register(baseUrl: string, email: string, slug: string) {
  const response = await requestJson<{ user: RegisteredUser }>(
    baseUrl,
    '/auth/register',
    {
      method: 'POST',
      body: {
        organizationName: `Documentos ${slug}`,
        organizationSlug: slug,
        firstName: 'Docs',
        lastName: 'Owner',
        email,
        password: `Documentos-${runId}!`,
      },
    },
  );
  assertStatus(response, 201);
  const organizationId = response.body.user.memberships[0]?.organizationId;
  assert.ok(organizationId);
  return {
    cookie: extractSessionCookie(response.headers),
    organizationId,
  };
}
