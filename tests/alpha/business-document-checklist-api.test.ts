import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  BusinessOperationType,
  BusinessParticipantRole,
  BusinessPartyType,
  createPrismaClient,
  DocumentEntityType,
  DocumentRequirementStatus,
  DocumentStatus,
} from '@soyre/database';
import { ensureApiServer, type ApiServer } from '../helpers/api-server.ts';
import {
  assertStatus,
  extractSessionCookie,
  requestJson,
} from '../helpers/http.ts';

type RegisteredUser = {
  memberships: Array<{ organizationId: string }>;
};

type TemplateResponse = {
  template: { id: string; version: number };
};

type ChecklistResponse = {
  created: boolean;
  checklist: {
    id: string;
    templateVersion: number;
    requirements: Array<{
      id: string;
      name: string;
      category: string;
      clientId: string | null;
      propertyId: string | null;
      businessContractId: string | null;
      participantId: string | null;
    }>;
    summary: {
      total: number;
      completed: number;
      pending: number;
      blockers: Array<{ id: string }>;
      progressPercentage: number;
    };
  };
};

const enabled = process.env.BUSINESS_DOCUMENT_CHECKLIST_API_MUTATING === 'true';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prisma = createPrismaClient();
let server: ApiServer | null = null;

before(async () => {
  if (enabled) server = await ensureApiServer();
});

after(async () => {
  await server?.stop();
  await prisma.$disconnect();
});

test(
  'business document checklist is idempotent, isolated and keeps snapshots',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    const ownerA = await register(
      server.baseUrl,
      `checklist-a-${runId}@example.com`,
      `checklist-a-${runId}`,
    );
    const ownerB = await register(
      server.baseUrl,
      `checklist-b-${runId}@example.com`,
      `checklist-b-${runId}`,
    );
    const contextA = await createBusinessContext(ownerA.organizationId, 'A');
    const contextB = await createBusinessContext(ownerB.organizationId, 'B');
    const templateA = await createTemplate(
      server.baseUrl,
      ownerA.cookie,
      ownerA.organizationId,
      `sale-pa-${runId}`,
    );
    const templateB = await createTemplate(
      server.baseUrl,
      ownerB.cookie,
      ownerB.organizationId,
      `sale-pa-b-${runId}`,
    );

    const crossOrganizationBusiness = await requestJson(
      server.baseUrl,
      `/businesses/${contextB.businessId}/document-checklists`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          templateId: templateA.id,
        },
      },
    );
    assertStatus(crossOrganizationBusiness, 404);

    const crossOrganizationTemplate = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          templateId: templateB.id,
        },
      },
    );
    assertStatus(crossOrganizationTemplate, 404);

    const instantiated = await requestJson<ChecklistResponse>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          templateId: templateA.id,
        },
      },
    );
    assertStatus(instantiated, 201);
    assert.equal(instantiated.body.created, true);
    assert.equal(instantiated.body.checklist.templateVersion, 1);
    assert.equal(instantiated.body.checklist.summary.total, 2);
    assert.equal(instantiated.body.checklist.summary.pending, 1);
    assert.equal(instantiated.body.checklist.summary.blockers.length, 1);
    assert.equal(instantiated.body.checklist.summary.progressPercentage, 0);

    const blockedBusinessTransition = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/transition-validation`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          targetStatus: 'ACTIVE',
        },
      },
    );
    assertStatus(blockedBusinessTransition, 409);

    const allowedBusinessTransition = await requestJson<{
      allowed: boolean;
      blockers: unknown[];
    }>(
      server.baseUrl,
      `/businesses/${contextB.businessId}/document-checklists/transition-validation`,
      {
        cookie: ownerB.cookie,
        method: 'POST',
        body: {
          organizationId: ownerB.organizationId,
          targetStatus: 'ACTIVE',
        },
      },
    );
    assertStatus(allowedBusinessTransition, 201);
    assert.equal(allowedBusinessTransition.body.allowed, true);
    assert.deepEqual(allowedBusinessTransition.body.blockers, []);

    const repeated = await requestJson<ChecklistResponse>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          templateId: templateA.id,
        },
      },
    );
    assertStatus(repeated, 201);
    assert.equal(repeated.body.created, false);
    assert.equal(repeated.body.checklist.id, instantiated.body.checklist.id);

    const reservation = instantiated.body.checklist.requirements.find(
      (item) => item.category === 'RESERVA',
    );
    assert.ok(reservation);
    const spoofedUpload = await requestMultipart(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files`,
      ownerA.cookie,
      ownerA.organizationId,
      new File(['not really a pdf'], 'reserva.pdf', {
        type: 'application/pdf',
      }),
    );
    assert.equal(spoofedUpload.status, 400);
    assert.equal(
      await prisma.document.count({ where: { requirementId: reservation.id } }),
      0,
    );

    if (!process.env.SUPABASE_SECRET_KEY) {
      const unconfiguredStorage = await requestMultipart(
        server.baseUrl,
        `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files`,
        ownerA.cookie,
        ownerA.organizationId,
        new File(['%PDF-1.7\n%%EOF'], 'reserva.pdf', {
          type: 'application/pdf',
        }),
      );
      assert.equal(unconfiguredStorage.status, 503);
      assert.equal(
        await prisma.document.count({
          where: { requirementId: reservation.id },
        }),
        0,
      );
    } else {
      const uploaded = await requestMultipart(
        server.baseUrl,
        `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files`,
        ownerA.cookie,
        ownerA.organizationId,
        new File(['%PDF-1.7\n%%EOF'], 'reserva.pdf', {
          type: 'application/pdf',
        }),
      );
      assert.equal(uploaded.status, 201);
      const uploadBody = (await uploaded.json()) as {
        document: { id: string; storagePath?: string };
      };
      assert.equal(uploadBody.document.storagePath, undefined);
      const stored = await prisma.document.findUniqueOrThrow({
        where: { id: uploadBody.document.id },
      });
      assert.ok(stored.storagePath);

      try {
        const download = await requestJson<{
          signedUrl: string;
          expiresIn: number;
          document: { storagePath?: string };
        }>(
          server.baseUrl,
          `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files/${stored.id}/download?organizationId=${ownerA.organizationId}`,
          { cookie: ownerA.cookie },
        );
        assertStatus(download, 200);
        assert.equal(download.body.expiresIn, 60);
        assert.equal(download.body.document.storagePath, undefined);
        const privateFile = await fetch(download.body.signedUrl);
        assert.equal(privateFile.status, 200);
        assert.match(await privateFile.text(), /^%PDF-/);
      } finally {
        await deleteStorageFixture(stored.storagePath);
        await prisma.document.delete({ where: { id: stored.id } });
      }
    }

    const lifecycleDocument = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          organizationId: ownerA.organizationId,
          entityType: DocumentEntityType.BUSINESS,
          businessId: contextA.businessId,
          requirementId: reservation.id,
          name: reservation.name,
          documentType: reservation.category,
          status: DocumentStatus.UPLOADED,
          fileName: 'reserva-lifecycle.pdf',
          mimeType: 'application/pdf',
          fileSize: 14,
          uploadedByUserId: undefined,
        },
      });
      await tx.businessDocumentRequirement.update({
        where: { id: reservation.id },
        data: { status: DocumentRequirementStatus.UPLOADED },
      });
      return document;
    });

    const directApproval = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          status: 'APPROVED',
          documentId: lifecycleDocument.id,
        },
      },
    );
    assertStatus(directApproval, 409);

    const underReview = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          status: 'UNDER_REVIEW',
          documentId: lifecycleDocument.id,
        },
      },
    );
    assertStatus(underReview, 201);

    const wrongDocument = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          status: 'APPROVED',
          documentId: contextB.contractId,
        },
      },
    );
    assertStatus(wrongDocument, 404);

    const observedWithoutReason = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          status: 'OBSERVED',
          documentId: lifecycleDocument.id,
        },
      },
    );
    assertStatus(observedWithoutReason, 400);

    const observed = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          status: 'OBSERVED',
          documentId: lifecycleDocument.id,
          reason: 'Falta la firma del comprador.',
        },
      },
    );
    assertStatus(observed, 201);

    const history = await requestJson<{
      documents: Array<{
        id: string;
        version: number;
        isCurrent: boolean;
        storagePath?: string;
      }>;
      events: Array<{
        fromStatus: string;
        toStatus: string;
        reason: string | null;
      }>;
    }>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/history?organizationId=${ownerA.organizationId}`,
      { cookie: ownerA.cookie },
    );
    assertStatus(history, 200);
    assert.equal(history.body.documents[0]?.version, 1);
    assert.equal(history.body.documents[0]?.isCurrent, true);
    assert.equal(history.body.documents[0]?.storagePath, undefined);
    assert.deepEqual(
      history.body.events.map((event) => event.toStatus),
      ['UNDER_REVIEW', 'OBSERVED'],
    );
    assert.equal(
      history.body.events.at(-1)?.reason,
      'Falta la firma del comprador.',
    );

    const crossOrganizationTransition = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: ownerB.cookie,
        method: 'POST',
        body: {
          organizationId: ownerB.organizationId,
          status: 'NOT_APPLICABLE',
          reason: 'Intento cruzado de otra organización.',
        },
      },
    );
    assertStatus(crossOrganizationTransition, 404);

    const custom = await requestJson<{
      created: boolean;
      requirement: ChecklistResponse['checklist']['requirements'][number];
    }>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          name: 'Comprobante extraordinario',
          category: 'COMPROBANTE_ESPECIAL',
          reason: 'Documento pertinente acordado por las partes.',
          clientId: contextA.clientId,
          propertyId: contextA.propertyId,
          businessContractId: contextA.contractId,
          participantId: contextA.participantId,
        },
      },
    );
    assertStatus(custom, 201);
    assert.equal(custom.body.created, true);
    assert.equal(custom.body.requirement.clientId, contextA.clientId);
    assert.equal(custom.body.requirement.propertyId, contextA.propertyId);
    assert.equal(
      custom.body.requirement.businessContractId,
      contextA.contractId,
    );
    assert.equal(custom.body.requirement.participantId, contextA.participantId);

    for (const relation of [
      { clientId: contextB.clientId },
      { propertyId: contextB.propertyId },
      { businessContractId: contextB.contractId },
      { participantId: contextB.participantId },
    ]) {
      const rejected = await requestJson(
        server.baseUrl,
        `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements`,
        {
          cookie: ownerA.cookie,
          method: 'POST',
          body: {
            organizationId: ownerA.organizationId,
            name: 'Relación inválida',
            category: 'OTRO',
            reason: 'Debe rechazarse por aislamiento.',
            ...relation,
          },
        },
      );
      assertStatus(rejected, 400);
    }

    const versioned = await requestJson<TemplateResponse>(
      server.baseUrl,
      `/document-checklist-templates/${templateA.id}`,
      {
        cookie: ownerA.cookie,
        method: 'PATCH',
        body: {
          organizationId: ownerA.organizationId,
          name: 'Plantilla modificada después del expediente',
          items: [
            {
              key: 'reservation',
              name: 'Reserva reemplazada en plantilla',
              category: 'RESERVA',
            },
          ],
        },
      },
    );
    assertStatus(versioned, 200);
    assert.equal(versioned.body.template.version, 2);

    const listed = await requestJson<{
      summary: ChecklistResponse['checklist']['summary'];
      checklists: ChecklistResponse['checklist'][];
    }>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists?organizationId=${ownerA.organizationId}`,
      { cookie: ownerA.cookie },
    );
    assertStatus(listed, 200);
    assert.equal(listed.body.checklists.length, 1);
    assert.equal(listed.body.checklists[0]?.templateVersion, 1);
    assert.deepEqual(
      listed.body.checklists[0]?.requirements.map((item) => item.name),
      ['Reserva firmada', 'Adenda o anexo', 'Comprobante extraordinario'],
    );
    assert.equal(listed.body.summary.total, 3);
    assert.equal(listed.body.summary.pending, 1);

    const readonlyPassword = `Readonly-${runId}!`;
    const readonlyCreated = await requestJson<{ user: { email: string } }>(
      server.baseUrl,
      '/users',
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          firstName: 'Solo',
          lastName: 'Lectura',
          email: `checklist-readonly-${runId}@example.com`,
          password: readonlyPassword,
          role: 'READONLY',
          startActive: true,
        },
      },
    );
    assertStatus(readonlyCreated, 201);
    const readonlyLogin = await requestJson(server.baseUrl, '/auth/login', {
      method: 'POST',
      body: {
        email: readonlyCreated.body.user.email,
        password: readonlyPassword,
      },
    });
    assertStatus(readonlyLogin, 200);
    const readonlyCookie = extractSessionCookie(readonlyLogin.headers);

    const readonlyList = await requestJson<{
      summary: { total: number };
    }>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists?organizationId=${ownerA.organizationId}`,
      { cookie: readonlyCookie },
    );
    assertStatus(readonlyList, 200);
    assert.equal(readonlyList.body.summary.total, 1);

    const readonlyWrite = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists`,
      {
        cookie: readonlyCookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          templateId: templateA.id,
        },
      },
    );
    assertStatus(readonlyWrite, 403);
  },
);

async function createTemplate(
  baseUrl: string,
  cookie: string,
  organizationId: string,
  familyKey: string,
) {
  const created = await requestJson<TemplateResponse>(
    baseUrl,
    '/document-checklist-templates',
    {
      cookie,
      method: 'POST',
      body: {
        organizationId,
        familyKey,
        name: `Expediente ${familyKey}`,
        isActive: true,
        operationTypes: ['SALE'],
        countries: ['PA'],
        propertyTypes: ['APARTMENT'],
        items: [
          {
            key: 'reservation',
            name: 'Reserva firmada',
            category: 'RESERVA',
            required: true,
            requiresReview: true,
            blocksTransition: true,
            dueDaysAfterInstantiation: 3,
            readRoles: [
              'OWNER',
              'ADMIN',
              'BROKER',
              'OPERATIONS',
              'AGENT',
              'READONLY',
            ],
          },
          {
            key: 'addendum',
            name: 'Adenda o anexo',
            category: 'ADENDA',
            required: false,
            allowsMultipleFiles: true,
          },
        ],
      },
    },
  );
  assertStatus(created, 201);
  return created.body.template;
}

async function createBusinessContext(organizationId: string, suffix: string) {
  const client = await prisma.client.create({
    data: {
      organizationId,
      displayName: `Cliente ${suffix} ${runId}`,
      email: `client-${suffix}-${runId}@example.com`,
    },
  });
  const property = await prisma.property.create({
    data: {
      organizationId,
      title: `Propiedad ${suffix} ${runId}`,
      type: 'APARTMENT',
      operations: ['SALE'],
      salePrice: 250_000,
      country: 'PA',
      city: 'Panamá',
      zone: 'Prueba',
    },
  });
  const contractType = await prisma.contractType.create({
    data: {
      organizationId,
      name: `Compraventa ${suffix} ${runId}`,
      operationType: BusinessOperationType.SALE,
    },
  });
  const business = await prisma.business.create({
    data: {
      organizationId,
      operationType: BusinessOperationType.SALE,
      propertyId: property.id,
      primaryClientId: client.id,
      contractTypeId: contractType.id,
    },
  });
  const participant = await prisma.businessParticipant.create({
    data: {
      organizationId,
      businessId: business.id,
      partyType: BusinessPartyType.CLIENT,
      clientId: client.id,
      displayName: client.displayName,
      role: BusinessParticipantRole.BUYER,
      isPrimary: true,
    },
  });
  const contract = await prisma.businessContract.create({
    data: {
      businessId: business.id,
      contractTypeId: contractType.id,
      contractNumber: `CTR-${suffix}-${runId}`,
    },
  });
  return {
    businessId: business.id,
    clientId: client.id,
    propertyId: property.id,
    participantId: participant.id,
    contractId: contract.id,
  };
}

async function requestMultipart(
  baseUrl: string,
  path: string,
  cookie: string,
  organizationId: string,
  file: File,
) {
  const body = new FormData();
  body.set('organizationId', organizationId);
  body.set('file', file);
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { cookie },
    body,
  });
}

async function deleteStorageFixture(path: string) {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  assert.ok(url && secret);
  const response = await fetch(
    `${url}/storage/v1/object/business-documents/${encodeURI(path)}`,
    {
      method: 'DELETE',
      headers: { apikey: secret, authorization: `Bearer ${secret}` },
    },
  );
  assert.ok(
    response.ok,
    `Storage fixture cleanup failed: ${await response.text()}`,
  );
}

async function register(baseUrl: string, email: string, slug: string) {
  const response = await requestJson<{ user: RegisteredUser }>(
    baseUrl,
    '/auth/register',
    {
      method: 'POST',
      body: {
        organizationName: `Checklist ${slug}`,
        organizationSlug: slug,
        firstName: 'Docs',
        lastName: 'Owner',
        email,
        password: `Checklist-${runId}!`,
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
