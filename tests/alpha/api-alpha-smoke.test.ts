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

const mutatingAlphaEnabled = process.env.ALPHA_SMOKE_MUTATING === 'true';
const runId =
  process.env.ALPHA_SMOKE_RUN_ID ??
  `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

let server: ApiServer | null = null;

before(async () => {
  if (mutatingAlphaEnabled) {
    server = await ensureApiServer();
  }
});

after(async () => {
  await server?.stop();
});

test(
  'alpha API flow creates sandbox organization and exercises core operations',
  { skip: !mutatingAlphaEnabled },
  async () => {
    assert.ok(server, 'API server must be available for alpha smoke.');

    const baseUrl = server.baseUrl;
    const slug = `alpha-smoke-${runId}`;
    const email = `alpha.smoke.${runId}@example.com`;
    const password = `AlphaSmoke-${runId}!`;
    const metadata = { alphaSmoke: true, runId };

    const register = await requestJson<{ user: AuthUser }>(
      baseUrl,
      '/auth/register',
      {
        body: {
          organizationName: `Alpha Smoke ${runId}`,
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
        },
        cookie,
        method: 'POST',
      },
    );

    assertStatus(client, 201);
    const clientId = client.body.client.id;

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

    const offer = await requestJson<EntityResponse<'offer'>>(baseUrl, '/offers', {
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
    });

    assertStatus(offer, 201);

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
      listBusinesses.body.businesses.some((business) => business.id === businessId),
      true,
    );
  },
);
