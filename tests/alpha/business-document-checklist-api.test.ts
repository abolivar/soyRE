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
    templateName: string;
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

const enabled =
  process.env.BUSINESS_DOCUMENT_CHECKLIST_API_MUTATING === 'true' ||
  process.env.DOCUMENT_EXPEDIENTE_QA_MUTATING === 'true';
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const prisma = enabled ? createPrismaClient() : null;
let server: ApiServer | null = null;

before(async () => {
  if (enabled) server = await ensureApiServer();
});

after(async () => {
  await server?.stop();
  await prisma?.$disconnect();
});

test(
  'business document checklist is idempotent, isolated and keeps snapshots',
  { skip: !enabled },
  async () => {
    assert.ok(server);
    assert.ok(prisma);
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
    const contextA = await createBusinessContext(
      ownerA.organizationId,
      'A',
      BusinessOperationType.SALE,
    );
    const contextB = await createBusinessContext(
      ownerB.organizationId,
      'B',
      BusinessOperationType.RENT,
    );
    const templateA = await createTemplate(
      server.baseUrl,
      ownerA.cookie,
      ownerA.organizationId,
      `sale-pa-${runId}`,
      BusinessOperationType.SALE,
    );
    const templateB = await createTemplate(
      server.baseUrl,
      ownerB.cookie,
      ownerB.organizationId,
      `rent-pa-b-${runId}`,
      BusinessOperationType.RENT,
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

    const rentInstantiated = await requestJson<ChecklistResponse>(
      server.baseUrl,
      `/businesses/${contextB.businessId}/document-checklists`,
      {
        cookie: ownerB.cookie,
        method: 'POST',
        body: {
          organizationId: ownerB.organizationId,
          templateId: templateB.id,
        },
      },
    );
    assertStatus(rentInstantiated, 201);
    assert.equal(rentInstantiated.body.created, true);
    assert.match(rentInstantiated.body.checklist.templateName, /Alquiler/);
    assert.deepEqual(
      rentInstantiated.body.checklist.requirements.map((item) => item.category),
      ['ARRENDAMIENTO', 'ENTREGA'],
    );

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
    const crossOrganizationUpload = await requestMultipart(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files`,
      ownerB.cookie,
      ownerB.organizationId,
      new File(['%PDF-1.7\n%%EOF'], 'reserva.pdf', {
        type: 'application/pdf',
      }),
    );
    assert.equal(crossOrganizationUpload.status, 404);
    assert.equal(
      await prisma.document.count({ where: { requirementId: reservation.id } }),
      0,
    );

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

      let replacementPath: string | null = null;
      try {
        const crossOrganizationDownload = await requestJson(
          server.baseUrl,
          `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files/${stored.id}/download?organizationId=${ownerB.organizationId}`,
          { cookie: ownerB.cookie },
        );
        assertStatus(crossOrganizationDownload, 404);

        const initialDownload = await requestJson<{
          signedUrl: string;
          expiresIn: number;
          document: { storagePath?: string };
        }>(
          server.baseUrl,
          `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files/${stored.id}/download?organizationId=${ownerA.organizationId}`,
          { cookie: ownerA.cookie },
        );
        assertStatus(initialDownload, 200);
        assert.equal(initialDownload.body.expiresIn, 60);
        assert.equal(initialDownload.body.document.storagePath, undefined);
        const privateFile = await fetch(initialDownload.body.signedUrl);
        assert.equal(privateFile.status, 200);
        assert.match(await privateFile.text(), /^%PDF-/);

        const replaced = await requestMultipart(
          server.baseUrl,
          `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files/${stored.id}/replacements`,
          ownerA.cookie,
          ownerA.organizationId,
          new File(['%PDF-1.7\n% version 2\n%%EOF'], 'reserva-v2.pdf', {
            type: 'application/pdf',
          }),
          { reason: 'La reserva fue firmada por todas las partes.' },
        );
        assert.equal(replaced.status, 201);
        const replacementBody = (await replaced.json()) as {
          document: { id: string; storagePath?: string; version: number };
        };
        assert.equal(replacementBody.document.storagePath, undefined);
        assert.equal(replacementBody.document.version, 2);
        const replacement = await prisma.document.findUniqueOrThrow({
          where: { id: replacementBody.document.id },
        });
        replacementPath = replacement.storagePath;
        assert.ok(replacementPath);

        const replacementHistory = await requestJson<{
          documents: Array<{
            id: string;
            isCurrent: boolean;
            replacementReason: string | null;
            version: number;
          }>;
        }>(
          server.baseUrl,
          `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/history?organizationId=${ownerA.organizationId}`,
          { cookie: ownerA.cookie },
        );
        assertStatus(replacementHistory, 200);
        assert.deepEqual(
          replacementHistory.body.documents.map((document) => ({
            isCurrent: document.isCurrent,
            version: document.version,
          })),
          [
            { isCurrent: true, version: 2 },
            { isCurrent: false, version: 1 },
          ],
        );
        assert.equal(
          replacementHistory.body.documents[1]?.replacementReason,
          'La reserva fue firmada por todas las partes.',
        );

        const replacementDownload = await requestJson<{ signedUrl: string }>(
          server.baseUrl,
          `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files/${replacement.id}/download?organizationId=${ownerA.organizationId}`,
          { cookie: ownerA.cookie },
        );
        assertStatus(replacementDownload, 200);
        assert.match(
          await (await fetch(replacementDownload.body.signedUrl)).text(),
          /version 2/,
        );
      } finally {
        await deleteStorageFixture(stored.storagePath);
        if (replacementPath) await deleteStorageFixture(replacementPath);
        await prisma.document.deleteMany({
          where: { requirementId: reservation.id },
        });
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

    const addenda = [];
    for (const number of [1, 2]) {
      const addendum = await requestJson<{
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
            name: `Adenda ${number} firmada`,
            category: 'ADENDA',
            reason: `Adenda ${number} acordada después del contrato principal.`,
            businessContractId: contextA.contractId,
          },
        },
      );
      assertStatus(addendum, 201);
      assert.equal(
        addendum.body.requirement.businessContractId,
        contextA.contractId,
      );
      addenda.push(addendum.body.requirement);
    }
    assert.equal(addenda.length, 2);
    assert.notEqual(addenda[0]?.id, addenda[1]?.id);

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

    const approvedCase = await createLifecycleRequirement({
      baseUrl: server.baseUrl,
      businessId: contextA.businessId,
      checklistId: instantiated.body.checklist.id,
      cookie: ownerA.cookie,
      name: 'Documento para aprobación directa',
      organizationId: ownerA.organizationId,
      requiresReview: false,
    });
    const approved = await transitionRequirement({
      ...approvedCase,
      baseUrl: server.baseUrl,
      cookie: ownerA.cookie,
      organizationId: ownerA.organizationId,
      status: 'APPROVED',
    });
    assertStatus(approved, 201);

    const rejectedCase = await createLifecycleRequirement({
      baseUrl: server.baseUrl,
      businessId: contextA.businessId,
      checklistId: instantiated.body.checklist.id,
      cookie: ownerA.cookie,
      name: 'Documento para rechazo',
      organizationId: ownerA.organizationId,
      requiresReview: true,
    });
    assertStatus(
      await transitionRequirement({
        ...rejectedCase,
        baseUrl: server.baseUrl,
        cookie: ownerA.cookie,
        organizationId: ownerA.organizationId,
        status: 'UNDER_REVIEW',
      }),
      201,
    );
    const rejected = await transitionRequirement({
      ...rejectedCase,
      baseUrl: server.baseUrl,
      cookie: ownerA.cookie,
      organizationId: ownerA.organizationId,
      reason: 'Documento ilegible en la revisión final.',
      status: 'REJECTED',
    });
    assertStatus(rejected, 201);

    const expiredCase = await createLifecycleRequirement({
      baseUrl: server.baseUrl,
      businessId: contextA.businessId,
      checklistId: instantiated.body.checklist.id,
      cookie: ownerA.cookie,
      name: 'Documento para vencimiento',
      organizationId: ownerA.organizationId,
      requiresReview: false,
    });
    const expired = await transitionRequirement({
      ...expiredCase,
      baseUrl: server.baseUrl,
      cookie: ownerA.cookie,
      organizationId: ownerA.organizationId,
      reason: 'Vigencia documental agotada.',
      status: 'EXPIRED',
    });
    assertStatus(expired, 201);

    const notApplicable = await requestJson<{
      requirement: { id: string };
    }>(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements`,
      {
        cookie: ownerA.cookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          name: 'Poder especial no requerido',
          category: 'AUTORIZACION',
          reason: 'Caso adversarial de requisito no aplicable.',
        },
      },
    );
    assertStatus(notApplicable, 201);
    const markedNotApplicable = await transitionRequirement({
      baseUrl: server.baseUrl,
      businessId: contextA.businessId,
      checklistId: instantiated.body.checklist.id,
      cookie: ownerA.cookie,
      organizationId: ownerA.organizationId,
      reason: 'Las partes comparecen personalmente.',
      requirementId: notApplicable.body.requirement.id,
      status: 'NOT_APPLICABLE',
    });
    assertStatus(markedNotApplicable, 201);

    const lifecycleRows = await prisma.businessDocumentRequirement.findMany({
      where: {
        id: {
          in: [
            approvedCase.requirementId,
            rejectedCase.requirementId,
            expiredCase.requirementId,
            notApplicable.body.requirement.id,
          ],
        },
      },
      select: { name: true, status: true },
      orderBy: { name: 'asc' },
    });
    assert.deepEqual(
      Object.fromEntries(lifecycleRows.map((row) => [row.name, row.status])),
      {
        'Documento para aprobación directa': 'APPROVED',
        'Documento para rechazo': 'REJECTED',
        'Documento para vencimiento': 'EXPIRED',
        'Poder especial no requerido': 'NOT_APPLICABLE',
      },
    );

    await prisma.document.update({
      where: { id: approvedCase.documentId },
      data: {
        storagePath: `${ownerB.organizationId}/businesses/${contextB.businessId}/escape.pdf`,
      },
    });
    const escapedStoragePath = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${approvedCase.requirementId}/files/${approvedCase.documentId}/download?organizationId=${ownerA.organizationId}`,
      { cookie: ownerA.cookie },
    );
    assertStatus(escapedStoragePath, 403);
    await prisma.document.update({
      where: { id: approvedCase.documentId },
      data: { storagePath: null },
    });

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
      [
        'Reserva firmada',
        'Adenda o anexo',
        'Comprobante extraordinario',
        'Adenda 1 firmada',
        'Adenda 2 firmada',
        'Documento para aprobación directa',
        'Documento para rechazo',
        'Documento para vencimiento',
        'Poder especial no requerido',
      ],
    );
    assert.equal(listed.body.summary.total, 9);
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

    const readonlyReview = await requestJson(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/transitions`,
      {
        cookie: readonlyCookie,
        method: 'POST',
        body: {
          organizationId: ownerA.organizationId,
          status: 'NOT_APPLICABLE',
          reason: 'Intento de revisión sin permiso.',
        },
      },
    );
    assertStatus(readonlyReview, 403);

    const documentsBeforeForbiddenUpload = await prisma.document.count({
      where: { requirementId: reservation.id },
    });
    const readonlyUpload = await requestMultipart(
      server.baseUrl,
      `/businesses/${contextA.businessId}/document-checklists/${instantiated.body.checklist.id}/requirements/${reservation.id}/files`,
      readonlyCookie,
      ownerA.organizationId,
      new File(['%PDF-1.7\n%%EOF'], 'forbidden.pdf', {
        type: 'application/pdf',
      }),
    );
    assert.equal(readonlyUpload.status, 403);
    assert.equal(
      await prisma.document.count({ where: { requirementId: reservation.id } }),
      documentsBeforeForbiddenUpload,
    );
  },
);

async function createLifecycleRequirement(input: {
  baseUrl: string;
  businessId: string;
  checklistId: string;
  cookie: string;
  name: string;
  organizationId: string;
  requiresReview: boolean;
}) {
  const created = await requestJson<{ requirement: { id: string } }>(
    input.baseUrl,
    `/businesses/${input.businessId}/document-checklists/${input.checklistId}/requirements`,
    {
      cookie: input.cookie,
      method: 'POST',
      body: {
        organizationId: input.organizationId,
        name: input.name,
        category: 'QA_ESTADO',
        reason: 'Cobertura adversarial del ciclo documental.',
        requiresReview: input.requiresReview,
      },
    },
  );
  assertStatus(created, 201);
  const document = await prisma.document.create({
    data: {
      organizationId: input.organizationId,
      entityType: DocumentEntityType.BUSINESS,
      businessId: input.businessId,
      requirementId: created.body.requirement.id,
      name: input.name,
      documentType: 'QA_ESTADO',
      status: DocumentStatus.UPLOADED,
      fileName: `${input.name.toLowerCase().replaceAll(' ', '-')}.pdf`,
      mimeType: 'application/pdf',
      fileSize: 14,
    },
  });
  await prisma.businessDocumentRequirement.update({
    where: { id: created.body.requirement.id },
    data: { status: DocumentRequirementStatus.UPLOADED },
  });
  return {
    businessId: input.businessId,
    checklistId: input.checklistId,
    documentId: document.id,
    requirementId: created.body.requirement.id,
  };
}

function transitionRequirement(input: {
  baseUrl: string;
  businessId: string;
  checklistId: string;
  cookie: string;
  documentId?: string;
  organizationId: string;
  reason?: string;
  requirementId: string;
  status: string;
}) {
  return requestJson(
    input.baseUrl,
    `/businesses/${input.businessId}/document-checklists/${input.checklistId}/requirements/${input.requirementId}/transitions`,
    {
      cookie: input.cookie,
      method: 'POST',
      body: {
        documentId: input.documentId,
        organizationId: input.organizationId,
        reason: input.reason,
        status: input.status,
      },
    },
  );
}

async function createTemplate(
  baseUrl: string,
  cookie: string,
  organizationId: string,
  familyKey: string,
  operationType: BusinessOperationType,
) {
  const isRent = operationType === BusinessOperationType.RENT;
  const created = await requestJson<TemplateResponse>(
    baseUrl,
    '/document-checklist-templates',
    {
      cookie,
      method: 'POST',
      body: {
        organizationId,
        familyKey,
        name: `${isRent ? 'Alquiler' : 'Venta'} Panamá ${runId}`,
        isActive: true,
        operationTypes: [operationType],
        countries: ['PA'],
        propertyTypes: ['APARTMENT'],
        items: isRent
          ? [
              {
                key: 'lease-contract',
                name: 'Contrato de arrendamiento',
                category: 'ARRENDAMIENTO',
                required: true,
                requiresReview: true,
                blocksTransition: true,
              },
              {
                key: 'delivery-record',
                name: 'Acta de entrega',
                category: 'ENTREGA',
                required: true,
              },
            ]
          : [
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

async function createBusinessContext(
  organizationId: string,
  suffix: string,
  operationType: BusinessOperationType,
) {
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
      operations: [operationType],
      salePrice:
        operationType === BusinessOperationType.SALE ? 250_000 : undefined,
      rentPrice:
        operationType === BusinessOperationType.RENT ? 2_500 : undefined,
      country: 'PA',
      city: 'Panamá',
      zone: 'Prueba',
    },
  });
  const contractType = await prisma.contractType.create({
    data: {
      organizationId,
      name: `Compraventa ${suffix} ${runId}`,
      operationType,
    },
  });
  const business = await prisma.business.create({
    data: {
      organizationId,
      operationType,
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
  fields: Record<string, string> = {},
) {
  const body = new FormData();
  body.set('organizationId', organizationId);
  body.set('file', file);
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
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
      headers: { apikey: secret },
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
