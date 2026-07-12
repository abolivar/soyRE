import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { ensureApiServer, type ApiServer } from '../helpers/api-server.ts';
import {
  assertStatus,
  extractSessionCookie,
  requestJson,
} from '../helpers/http.ts';

type AuthUser = {
  id: string;
  email: string;
  memberships: Array<{
    organizationId: string;
    organizationSlug: string;
    role: string;
  }>;
};

type EntityResponse<TName extends string> = Record<TName, { id: string }> & {
  [key: string]: unknown;
};

type MembershipUser = {
  membershipId: string;
  id: string;
  email: string;
  role: string;
  membershipStatus: string;
  userStatus: string;
};

type ListResponse<TName extends string> = Record<
  TName,
  Array<{ id: string }>
> & {
  [key: string]: unknown;
};

const mutatingClientZeroEnabled =
  process.env.CLIENT_ZERO_MUTATING === 'true' ||
  process.env.ALPHA_SMOKE_MUTATING === 'true';
const runId =
  process.env.CLIENT_ZERO_RUN_ID ??
  process.env.ALPHA_SMOKE_RUN_ID ??
  `${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;

let server: ApiServer | null = null;

before(async () => {
  if (mutatingClientZeroEnabled) {
    server = await ensureApiServer();
  }
});

after(async () => {
  await server?.stop();
});

test(
  'client zero API journey creates sandbox SaaS account and exercises alpha operations',
  { skip: !mutatingClientZeroEnabled },
  async () => {
    assert.ok(server, 'API server must be available for alpha smoke.');

    const baseUrl = server.baseUrl;
    const slug = `client-zero-${runId}`;
    const email = `client.zero.${runId}@example.com`;
    const password = `ClientZero-${runId}!`;
    const metadata = { alphaSmoke: true, clientZero: true, runId };

    const unauthenticatedDashboard = await requestJson<{ statusCode: number }>(
      baseUrl,
      '/dashboard/summary',
    );

    assertStatus(unauthenticatedDashboard, 401);

    const register = await requestJson<{ user: AuthUser }>(
      baseUrl,
      '/auth/register',
      {
        body: {
          organizationName: `Cliente Cero ${runId}`,
          organizationSlug: slug,
          firstName: 'Alpha',
          lastName: 'Smoke',
          email,
          password,
        },
        method: 'POST',
      },
    );

    assertStatus(register, 201);
    assert.equal(register.body.user.email, email);
    assert.equal(register.body.user.memberships[0]?.organizationSlug, slug);

    const cookie = extractSessionCookie(register.headers);
    const userId = register.body.user.id;
    const organizationId = register.body.user.memberships[0]?.organizationId;

    assert.ok(organizationId, 'Expected registered user organization.');

    const me = await requestJson<{ user: AuthUser }>(baseUrl, '/auth/me', {
      cookie,
    });

    assertStatus(me, 200);
    assert.equal(me.body.user.id, userId);

    const usersBefore = await requestJson<{ users: MembershipUser[] }>(
      baseUrl,
      '/users',
      { cookie },
    );

    assertStatus(usersBefore, 200);
    assertContainsId(usersBefore.body.users, userId, 'registered owner user');

    const invitedUser = await requestJson<{ user: MembershipUser }>(
      baseUrl,
      '/users',
      {
        body: {
          firstName: 'Operaciones',
          lastName: `Alpha ${runId}`,
          email: `operaciones.${runId}@example.com`,
          password: `Operations-${runId}!`,
          role: 'AGENT',
          startActive: false,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(invitedUser, 201);
    assert.equal(invitedUser.body.user.membershipStatus, 'INVITED');

    const validatedUser = await requestJson<{ user: MembershipUser }>(
      baseUrl,
      `/users/${invitedUser.body.user.membershipId}/validate`,
      {
        cookie,
        method: 'PATCH',
      },
    );

    assertStatus(validatedUser, 200);
    assert.equal(validatedUser.body.user.membershipStatus, 'ACTIVE');
    assert.equal(validatedUser.body.user.userStatus, 'ACTIVE');

    const updatedRole = await requestJson<{ user: MembershipUser }>(
      baseUrl,
      `/users/${validatedUser.body.user.membershipId}/role`,
      {
        body: { role: 'OPERATIONS' },
        cookie,
        method: 'PATCH',
      },
    );

    assertStatus(updatedRole, 200);
    assert.equal(updatedRole.body.user.role, 'OPERATIONS');

    const suspendedUser = await requestJson<{ user: MembershipUser }>(
      baseUrl,
      `/users/${updatedRole.body.user.membershipId}/suspend`,
      {
        cookie,
        method: 'PATCH',
      },
    );

    assertStatus(suspendedUser, 200);
    assert.equal(suspendedUser.body.user.membershipStatus, 'SUSPENDED');

    const readonlyPassword = `Readonly-${runId}!`;
    const readonlyUser = await requestJson<{ user: MembershipUser }>(
      baseUrl,
      '/users',
      {
        body: {
          firstName: 'Solo',
          lastName: `Lectura ${runId}`,
          email: `readonly.${runId}@example.com`,
          password: readonlyPassword,
          role: 'READONLY',
          startActive: true,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(readonlyUser, 201);
    assert.equal(readonlyUser.body.user.membershipStatus, 'ACTIVE');
    assert.equal(readonlyUser.body.user.role, 'READONLY');

    const readonlyLogin = await requestJson<{ user: AuthUser }>(
      baseUrl,
      '/auth/login',
      {
        body: {
          email: readonlyUser.body.user.email,
          password: readonlyPassword,
        },
        method: 'POST',
      },
    );

    assertStatus(readonlyLogin, 200);
    const readonlyCookie = extractSessionCookie(readonlyLogin.headers);

    const context = await requestJson<{
      contractTypes: Array<{
        id: string;
        name: string;
        operationType: string;
      }>;
    }>(baseUrl, '/businesses/new/context', { cookie });

    assertStatus(context, 200);
    const saleContractType = context.body.contractTypes.find(
      (contractType) => contractType.operationType === 'SALE',
    );
    assert.ok(saleContractType, 'Expected a SALE contract type in context.');

    const client = await requestJson<EntityResponse<'client'>>(
      baseUrl,
      '/clients',
      {
        body: {
          roles: ['BUYER', 'SELLER'],
          firstName: 'Cliente',
          lastName: `Alpha ${runId}`,
          email: `cliente.${runId}@example.com`,
          phone: '+507 6000-0000',
          country: 'Panama',
          city: 'Panama',
          zone: 'San Francisco',
          source: 'alpha-smoke',
          interestType: 'BUY',
          budgetMin: 250000,
          budgetMax: 450000,
          currency: 'USD',
          tags: ['alpha-smoke', runId],
          dataConsent: true,
          marketingConsent: false,
          identityDocument: {
            type: 'NATIONAL_ID',
            documentNumber: `ID-${runId}`,
            issuingCountry: 'PA',
            firstName: 'Cliente',
            lastName: `Alpha ${runId}`,
            birthDate: '1990-01-01',
            expirationDate: '2030-01-01',
            fileName: `cedula-${runId}.png`,
            mimeType: 'image/png',
            fileSize: 3,
            fileBase64: 'AQID',
            ocrText: `Cliente Alpha ${runId}`,
            extractedData: { source: 'client-zero' },
          },
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(client, 201);
    const clientId = client.body.client.id;

    const listClients = await requestJson<ListResponse<'clients'>>(
      baseUrl,
      `/clients?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(listClients, 200);
    assertContainsId(listClients.body.clients, clientId, 'created client');

    const clientDetail = await requestJson<{
      client: {
        id: string;
        identityDocuments: Array<{ id: string; fileName: string }>;
      };
    }>(baseUrl, `/clients/${clientId}`, { cookie });

    assertStatus(clientDetail, 200);
    assert.equal(clientDetail.body.client.id, clientId);
    const identityDocumentId =
      clientDetail.body.client.identityDocuments[0]?.id;
    assert.ok(
      identityDocumentId,
      'Expected an identity document on client detail.',
    );

    const identityDownload = await fetch(
      `${baseUrl}/clients/${clientId}/identity-documents/${identityDocumentId}/download`,
      {
        headers: { cookie },
      },
    );

    assert.equal(identityDownload.status, 200);
    assert.equal(identityDownload.headers.get('content-type'), 'image/png');
    assert.equal(identityDownload.headers.get('content-length'), '3');
    assert.equal((await identityDownload.arrayBuffer()).byteLength, 3);

    const property = await requestJson<EntityResponse<'property'>>(
      baseUrl,
      '/properties',
      {
        body: {
          ownerClientId: clientId,
          title: `Apartamento Alpha ${runId}`,
          internalCode: `ALPHA-${runId}`,
          type: 'Apartamento',
          operations: ['SALE', 'RENT'],
          status: 'ACTIVE',
          country: 'Panama',
          city: 'Panama',
          zone: 'Costa del Este',
          bedrooms: 2,
          bathrooms: 2,
          parkingSpaces: 1,
          builtArea: 120,
          salePrice: 250000,
          rentPrice: 1800,
          currency: 'USD',
          source: 'alpha-smoke',
          tags: ['alpha-smoke', runId],
          privateNotes: `Sandbox alpha smoke ${runId}`,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(property, 201);
    const propertyId = property.body.property.id;

    const listProperties = await requestJson<ListResponse<'properties'>>(
      baseUrl,
      `/properties?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(listProperties, 200);
    assertContainsId(
      listProperties.body.properties,
      propertyId,
      'created property',
    );

    const propertyDetail = await requestJson<EntityResponse<'property'>>(
      baseUrl,
      `/properties/${propertyId}`,
      { cookie },
    );

    assertStatus(propertyDetail, 200);
    assert.equal(propertyDetail.body.property.id, propertyId);

    const readonlyProperties = await requestJson<ListResponse<'properties'>>(
      baseUrl,
      `/properties?search=${encodeURIComponent(runId)}`,
      { cookie: readonlyCookie },
    );

    assertStatus(readonlyProperties, 200);
    assertContainsId(
      readonlyProperties.body.properties,
      propertyId,
      'readonly visible property',
    );

    const readonlyPropertyWrite = await requestJson<{ statusCode: number }>(
      baseUrl,
      '/properties',
      {
        body: {
          title: `Intento bloqueado ${runId}`,
          type: 'Apartamento',
          operations: ['SALE'],
          status: 'ACTIVE',
          country: 'Panama',
          city: 'Panama',
          zone: 'San Francisco',
          salePrice: 100000,
          currency: 'USD',
        },
        cookie: readonlyCookie,
        method: 'POST',
      },
    );

    assertStatus(readonlyPropertyWrite, 403);

    const outsiderRegister = await requestJson<{ user: AuthUser }>(
      baseUrl,
      '/auth/register',
      {
        body: {
          organizationName: `Cliente Cero Aislado ${runId}`,
          organizationSlug: `client-zero-outsider-${runId}`,
          firstName: 'Usuario',
          lastName: 'Aislado',
          email: `outsider.${runId}@example.com`,
          password: `Outsider-${runId}!`,
        },
        method: 'POST',
      },
    );

    assertStatus(outsiderRegister, 201);
    const outsiderCookie = extractSessionCookie(outsiderRegister.headers);

    const outsiderProperty = await requestJson<{ statusCode: number }>(
      baseUrl,
      `/properties/${propertyId}`,
      { cookie: outsiderCookie },
    );

    assertStatus(outsiderProperty, 404);

    const agent = await requestJson<EntityResponse<'agent'>>(
      baseUrl,
      '/agents',
      {
        body: {
          category: 'BROKER',
          firstName: 'Agente',
          lastName: `Alpha ${runId}`,
          email: `agente.${runId}@example.com`,
          phone: '+507 6000-0001',
          notes: `Sandbox alpha smoke ${runId}`,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(agent, 201);
    const agentId = agent.body.agent.id;

    const listAgents = await requestJson<ListResponse<'agents'>>(
      baseUrl,
      `/agents?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(listAgents, 200);
    assertContainsId(listAgents.body.agents, agentId, 'created agent');

    const agentDetail = await requestJson<EntityResponse<'agent'>>(
      baseUrl,
      `/agents/${agentId}`,
      { cookie },
    );

    assertStatus(agentDetail, 200);
    assert.equal(agentDetail.body.agent.id, agentId);

    const workflowStage = await requestJson<EntityResponse<'workflowStage'>>(
      baseUrl,
      '/workflow-stages',
      {
        body: {
          scope: 'BUSINESS',
          name: `Alpha etapa ${runId}`,
          position: 10,
          tone: 'neutral',
          appliesTo: ['SALE'],
          metadata,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(workflowStage, 201);
    const workflowStageId = workflowStage.body.workflowStage.id;

    const workflowStages = await requestJson<ListResponse<'workflowStages'>>(
      baseUrl,
      '/workflow-stages?scope=BUSINESS',
      { cookie },
    );

    assertStatus(workflowStages, 200);
    assertContainsId(
      workflowStages.body.workflowStages,
      workflowStageId,
      'created workflow stage',
    );

    const document = await requestJson<EntityResponse<'document'>>(
      baseUrl,
      '/documents',
      {
        body: {
          entityType: 'CLIENT',
          clientId,
          name: `Documento Alpha ${runId}`,
          documentType: 'identity',
          status: 'REQUIRED',
          notes: `Sandbox alpha smoke ${runId}`,
          metadata,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(document, 201);
    const documentId = document.body.document.id;

    const documents = await requestJson<ListResponse<'documents'>>(
      baseUrl,
      `/documents?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(documents, 200);
    assertContainsId(documents.body.documents, documentId, 'created document');

    const mandate = await requestJson<EntityResponse<'mandate'>>(
      baseUrl,
      '/mandates',
      {
        body: {
          propertyId,
          ownerClientId: clientId,
          type: 'SALE',
          status: 'DRAFT',
          exclusive: false,
          authorizedPriceCents: '25000000',
          currency: 'USD',
          commissionBps: 300,
          notes: `Sandbox alpha smoke ${runId}`,
          metadata,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(mandate, 201);
    const mandateId = mandate.body.mandate.id;

    const mandates = await requestJson<ListResponse<'mandates'>>(
      baseUrl,
      `/mandates?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(mandates, 200);
    assertContainsId(mandates.body.mandates, mandateId, 'created mandate');

    const listing = await requestJson<EntityResponse<'listing'>>(
      baseUrl,
      '/listings',
      {
        body: {
          propertyId,
          mandateId,
          status: 'DRAFT',
          title: `Listing Alpha ${runId}`,
          publicCopy: 'Ficha de prueba alpha.',
          channels: ['internal'],
          readiness: metadata,
          notes: `Sandbox alpha smoke ${runId}`,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(listing, 201);
    const listingId = listing.body.listing.id;

    const listings = await requestJson<ListResponse<'listings'>>(
      baseUrl,
      `/listings?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(listings, 200);
    assertContainsId(listings.body.listings, listingId, 'created listing');

    const draft = await requestJson<{
      business: { id: string; version: number };
    }>(baseUrl, '/business-drafts', {
      body: {
        operationType: 'SALE',
        mode: 'SIMPLE',
        title: `Negocio Alpha ${runId}`,
        currency: 'USD',
      },
      cookie,
      method: 'POST',
    });

    assertStatus(draft, 201);
    const businessId = draft.body.business.id;
    const draftData = {
      mode: 'SIMPLE',
      operationType: 'SALE',
      title: `Negocio Alpha ${runId}`,
      currency: 'USD',
      propertyId,
      primaryClientId: clientId,
      contractTypeId: saleContractType.id,
      expectedSignatureDate: '2026-08-01',
      expectedClosingDate: '2026-09-01',
      financial: {
        basePriceCents: '25000000',
        negotiatedPriceCents: '25000000',
        totalContractAmountCents: '25000000',
        payableAmountCents: '25000000',
        commissionBaseAmountCents: '25000000',
      },
      participants: [
        {
          participantKey: 'buyer',
          clientId,
          displayName: `Cliente Alpha ${runId}`,
          role: 'BUYER',
          isPrimary: true,
          commissionEligible: false,
        },
        {
          participantKey: 'primary-agent',
          userId,
          displayName: `Agente interno Alpha ${runId}`,
          role: 'PRIMARY_AGENT',
          isPrimary: true,
          commissionEligible: true,
        },
        {
          participantKey: 'external-broker',
          realEstateAgentId: agentId,
          displayName: `Agente externo Alpha ${runId}`,
          role: 'BROKER',
          isPrimary: false,
          commissionEligible: false,
        },
      ],
      paymentPlan: {
        preset: 'CASH',
        totalAmountCents: '25000000',
        frequency: 'NONE',
        roundingStrategy: 'LAST_INSTALLMENT',
        closingDate: '2026-09-01',
      },
      commissionPlan: {
        commissionBase: 'NEGOTIATED_PRICE',
        simpleCommissionBasisPoints: 300,
        rules: [],
      },
      automations: {
        commissionReminders: true,
        paymentReminders: true,
        reviewTask: true,
        signatureTask: true,
      },
      metadata,
    };

    const updatedDraft = await requestJson<{
      business: { id: string; version: number };
    }>(baseUrl, `/business-drafts/${businessId}`, {
      body: {
        data: draftData,
        version: draft.body.business.version,
      },
      cookie,
      method: 'PATCH',
    });

    assertStatus(updatedDraft, 200);
    assert.equal(updatedDraft.body.business.id, businessId);

    const paymentPlan = await requestJson<{
      paymentPlan: { errors: string[]; lines: unknown[] };
    }>(baseUrl, `/business-drafts/${businessId}/calculate/payment-plan`, {
      body: { data: draftData },
      cookie,
      method: 'POST',
    });

    assertStatus(paymentPlan, 201);
    assert.deepEqual(paymentPlan.body.paymentPlan.errors, []);
    assert.ok(paymentPlan.body.paymentPlan.lines.length >= 1);

    const commissionPlan = await requestJson<{
      commissionPlan: { allocations: unknown[]; errors: string[] };
    }>(baseUrl, `/business-drafts/${businessId}/calculate/commissions`, {
      body: { data: draftData },
      cookie,
      method: 'POST',
    });

    assertStatus(commissionPlan, 201);
    assert.deepEqual(commissionPlan.body.commissionPlan.errors, []);
    assert.ok(commissionPlan.body.commissionPlan.allocations.length >= 1);

    const validation = await requestJson<{
      validation: Array<{ code: string; level: string }>;
    }>(baseUrl, `/business-drafts/${businessId}/validate`, {
      body: { data: draftData },
      cookie,
      method: 'POST',
    });

    assertStatus(validation, 201);
    assert.equal(
      validation.body.validation.some((item) => item.level === 'ERROR'),
      false,
    );

    const preview = await requestJson<{
      preview: {
        entitiesToCreate: Array<{ count: number; entity: string }>;
        validation: Array<{ level: string }>;
      };
    }>(baseUrl, `/business-drafts/${businessId}/preview`, {
      body: { data: draftData },
      cookie,
      method: 'POST',
    });

    assertStatus(preview, 201);
    assert.ok(preview.body.preview.entitiesToCreate.length > 0);

    const committed = await requestJson<{
      business: { id: string; status: string };
    }>(baseUrl, `/business-drafts/${businessId}/commit`, {
      body: {
        idempotencyKey: `alpha-smoke-${runId}`,
        version: updatedDraft.body.business.version,
      },
      cookie,
      method: 'POST',
    });

    assertStatus(committed, 201);
    assert.equal(committed.body.business.id, businessId);
    assert.notEqual(committed.body.business.status, 'DRAFT');

    const businessDetail = await requestJson<{
      business: {
        id: string;
        commissionPlans: unknown[];
        paymentPlans: unknown[];
        scheduledActions: Array<{ id: string; status: string }>;
      };
    }>(baseUrl, `/businesses/${businessId}`, { cookie });

    assertStatus(businessDetail, 200);
    assert.equal(businessDetail.body.business.id, businessId);
    assert.ok(businessDetail.body.business.paymentPlans.length >= 1);
    assert.ok(businessDetail.body.business.commissionPlans.length >= 1);
    assert.ok(businessDetail.body.business.scheduledActions.length >= 1);

    const tasks = await requestJson<{
      tasks: Array<{ id: string; businessId: string; status: string }>;
    }>(baseUrl, `/tasks?search=${encodeURIComponent(runId)}`, { cookie });

    assertStatus(tasks, 200);
    const pendingTask = tasks.body.tasks.find(
      (task) => task.businessId === businessId && task.status === 'PENDING',
    );
    assert.ok(pendingTask, 'Expected at least one pending generated task.');

    const completedTask = await requestJson<{
      task: { id: string; status: string };
    }>(baseUrl, `/tasks/${pendingTask.id}/status`, {
      body: {
        status: 'COMPLETED',
        note: `Validado por cliente cero ${runId}`,
      },
      cookie,
      method: 'PATCH',
    });

    assertStatus(completedTask, 200);
    assert.equal(completedTask.body.task.id, pendingTask.id);
    assert.equal(completedTask.body.task.status, 'COMPLETED');

    const showing = await requestJson<EntityResponse<'showing'>>(
      baseUrl,
      '/showings',
      {
        body: {
          propertyId,
          clientId,
          businessId,
          realEstateAgentId: agentId,
          status: 'REQUESTED',
          scheduledFor: '2026-08-15T15:00:00.000Z',
          notes: `Sandbox alpha smoke ${runId}`,
          metadata,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(showing, 201);
    const showingId = showing.body.showing.id;

    const showings = await requestJson<ListResponse<'showings'>>(
      baseUrl,
      `/showings?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(showings, 200);
    assertContainsId(showings.body.showings, showingId, 'created showing');

    const offer = await requestJson<EntityResponse<'offer'>>(
      baseUrl,
      '/offers',
      {
        body: {
          propertyId,
          clientId,
          businessId,
          operationType: 'SALE',
          status: 'DRAFT',
          amountCents: '24500000',
          currency: 'USD',
          terms: 'Oferta de prueba alpha.',
          metadata,
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(offer, 201);
    const offerId = offer.body.offer.id;

    const offers = await requestJson<ListResponse<'offers'>>(
      baseUrl,
      `/offers?search=${encodeURIComponent(runId)}`,
      { cookie },
    );

    assertStatus(offers, 200);
    assertContainsId(offers.body.offers, offerId, 'created offer');

    const dashboard = await requestJson<{
      metrics: { openBusinesses: number };
      organization: { id: string };
    }>(baseUrl, '/dashboard/summary', { cookie });

    assertStatus(dashboard, 200);
    assert.equal(dashboard.body.organization.id, organizationId);
    assert.ok(dashboard.body.metrics.openBusinesses >= 1);

    const listBusinesses = await requestJson<{
      businesses: Array<{ id: string }>;
    }>(baseUrl, `/businesses?search=${encodeURIComponent(runId)}`, {
      cookie,
    });

    assertStatus(listBusinesses, 200);
    assert.equal(
      listBusinesses.body.businesses.some(
        (business) => business.id === businessId,
      ),
      true,
    );

    const withdrawnProperty = await requestJson<{
      property: { id: string; status: string; withdrawnAt: string | null };
    }>(baseUrl, `/properties/${propertyId}/withdraw`, {
      body: { reason: `Cierre de prueba cliente cero ${runId}` },
      cookie,
      method: 'PATCH',
    });

    assertStatus(withdrawnProperty, 200);
    assert.equal(withdrawnProperty.body.property.id, propertyId);
    assert.equal(withdrawnProperty.body.property.status, 'WITHDRAWN');
    assert.ok(withdrawnProperty.body.property.withdrawnAt);

    const logout = await requestJson<{ ok: boolean }>(baseUrl, '/auth/logout', {
      cookie,
      method: 'POST',
    });

    assertStatus(logout, 200);
    assert.equal(logout.body.ok, true);
  },
);

function assertContainsId(
  items: Array<{ id: string }>,
  id: string,
  label: string,
) {
  assert.equal(
    items.some((item) => item.id === id),
    true,
    `Expected ${label} ${id} in response list.`,
  );
}
