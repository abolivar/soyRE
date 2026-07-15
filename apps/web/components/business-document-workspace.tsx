'use client';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileClock,
  FilePlus2,
  FileText,
  History,
  Plus,
  RefreshCcw,
  Replace,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityTimeline,
  Button,
  EmptyState,
  ErrorState,
  FormDrawer,
  Input,
  LoadingState,
  PageHeader,
  ProgressMeter,
  SectionPanel,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  type Tone,
} from '@soyre/ui';
import {
  activeMemberships,
  businessStatusLabel,
  formatDate,
  formatDateTime,
  operationLabel,
} from './operational-format';
import {
  apiFetch,
  apiFetchFormData,
  AuthUser,
  BusinessDocumentChecklistsResponse,
  BusinessDocumentHistoryResponse,
  BusinessDocumentRequirement,
  DocumentChecklistTemplatesResponse,
  DocumentRequirementStatus,
  MembershipRole,
} from '../lib/api';
import {
  completeDocumentRequirementStatuses,
  documentRequirementReviewTargets,
  documentRequirementStatusLabel,
} from '../lib/business-documents';

type DrawerState =
  | { kind: 'custom'; checklistId: string }
  | { kind: 'history'; requirement: BusinessDocumentRequirement }
  | {
      kind: 'replace';
      requirement: BusinessDocumentRequirement;
      documentId: string;
    }
  | { kind: 'review'; requirement: BusinessDocumentRequirement }
  | { kind: 'upload'; requirement: BusinessDocumentRequirement }
  | null;

const managerRoles = new Set<MembershipRole>(['OWNER', 'ADMIN']);
const documentWriteRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'AGENT',
  'OPERATIONS',
]);

export function BusinessDocumentWorkspace({
  businessId,
  preferredOrganizationId,
}: {
  businessId: string;
  preferredOrganizationId?: string;
}) {
  const [data, setData] = useState<BusinessDocumentChecklistsResponse | null>(
    null,
  );
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<MembershipRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [history, setHistory] =
    useState<BusinessDocumentHistoryResponse | null>(null);
  const [templates, setTemplates] = useState<
    DocumentChecklistTemplatesResponse['templates']
  >([]);

  const loadWorkspace = useCallback(
    async (nextOrganizationId: string) => {
      const query = new URLSearchParams({ organizationId: nextOrganizationId });
      const response = await apiFetch<BusinessDocumentChecklistsResponse>(
        `/businesses/${businessId}/document-checklists?${query.toString()}`,
      );
      setData(response);
    },
    [businessId],
  );

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then(async (response) => {
        const memberships = activeMemberships(response.user);
        const membership = preferredOrganizationId
          ? memberships.find(
              (candidate) =>
                candidate.organizationId === preferredOrganizationId,
            )
          : memberships[0];
        if (!membership) throw new Error('No tienes una organización activa.');
        setOrganizationId(membership.organizationId);
        setRole(membership.role);
        await loadWorkspace(membership.organizationId);
        if (managerRoles.has(membership.role)) {
          const query = new URLSearchParams({
            organizationId: membership.organizationId,
          });
          const result = await apiFetch<DocumentChecklistTemplatesResponse>(
            `/document-checklist-templates?${query.toString()}`,
          );
          setTemplates(
            result.templates.filter((template) => template.isActive),
          );
        }
      })
      .catch((caught) => setError(errorMessage(caught)))
      .finally(() => setIsLoading(false));
  }, [loadWorkspace, preferredOrganizationId]);

  const requirements = useMemo(
    () => data?.checklists.flatMap((checklist) => checklist.requirements) ?? [],
    [data],
  );

  async function refresh(message?: string) {
    if (!organizationId) return;
    setError(null);
    await loadWorkspace(organizationId);
    if (message) setNotice(message);
  }

  async function instantiate(templateId: string) {
    if (!organizationId) return;
    await runSave(async () => {
      await apiFetch(`/businesses/${businessId}/document-checklists`, {
        body: JSON.stringify({ organizationId, templateId }),
        method: 'POST',
      });
      await refresh('Expediente inicializado desde la plantilla seleccionada.');
    });
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || drawer?.kind !== 'upload') return;
    const form = new FormData(event.currentTarget);
    form.set('organizationId', organizationId);
    await runSave(async () => {
      await apiFetchFormData(
        requirementPath(businessId, drawer.requirement) + '/files',
        form,
      );
      setDrawer(null);
      await refresh('Documento cargado y agregado al expediente.');
    });
  }

  async function submitReplacement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || drawer?.kind !== 'replace') return;
    const form = new FormData(event.currentTarget);
    form.set('organizationId', organizationId);
    await runSave(async () => {
      await apiFetchFormData(
        `${requirementPath(businessId, drawer.requirement)}/files/${drawer.documentId}/replacements`,
        form,
      );
      setDrawer(null);
      await refresh(
        'Nueva versión cargada; la versión anterior quedó archivada.',
      );
    });
  }

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || drawer?.kind !== 'review') return;
    const form = new FormData(event.currentTarget);
    const status = String(form.get('status')) as DocumentRequirementStatus;
    const documentId = String(form.get('documentId') ?? '') || undefined;
    const reason = String(form.get('reason') ?? '').trim() || undefined;
    await runSave(async () => {
      await apiFetch(
        requirementPath(businessId, drawer.requirement) + '/transitions',
        {
          body: JSON.stringify({ documentId, organizationId, reason, status }),
          method: 'POST',
        },
      );
      setDrawer(null);
      await refresh('Estado documental actualizado.');
    });
  }

  async function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || drawer?.kind !== 'custom') return;
    const form = new FormData(event.currentTarget);
    await runSave(async () => {
      await apiFetch(
        `/businesses/${businessId}/document-checklists/${drawer.checklistId}/requirements`,
        {
          body: JSON.stringify({
            organizationId,
            name: value(form, 'name'),
            category: value(form, 'category'),
            reason: value(form, 'reason'),
            description: value(form, 'description') || undefined,
            required: form.get('required') === 'on',
            requiresReview: form.get('requiresReview') === 'on',
            blocksTransition: form.get('blocksTransition') === 'on',
          }),
          method: 'POST',
        },
      );
      setDrawer(null);
      await refresh('Documento pertinente agregado al expediente.');
    });
  }

  async function openHistory(requirement: BusinessDocumentRequirement) {
    if (!organizationId) return;
    setHistory(null);
    setDrawer({ kind: 'history', requirement });
    try {
      const query = new URLSearchParams({ organizationId });
      setHistory(
        await apiFetch<BusinessDocumentHistoryResponse>(
          `${requirementPath(businessId, requirement)}/history?${query.toString()}`,
        ),
      );
    } catch (caught) {
      setError(errorMessage(caught));
      setDrawer(null);
    }
  }

  async function download(
    requirement: BusinessDocumentRequirement,
    documentId: string,
  ) {
    if (!organizationId) return;
    try {
      const query = new URLSearchParams({ organizationId });
      const response = await apiFetch<{ signedUrl: string }>(
        `${requirementPath(businessId, requirement)}/files/${documentId}/download?${query.toString()}`,
      );
      window.open(response.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function runSave(action: () => Promise<void>) {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <LoadingState
        title="Cargando expediente"
        description="Consultando documentos, permisos y bloqueos del negocio."
      />
    );
  }
  if (error && !data) {
    return (
      <ErrorState
        title="No se pudo cargar el expediente"
        description={error}
        action={
          <Button
            icon={RefreshCcw}
            onClick={() => window.location.reload()}
            variant="secondary"
          >
            Reintentar
          </Button>
        }
      />
    );
  }
  if (!data || !role) return null;

  const firstChecklist = data.checklists[0];
  return (
    <div className="business-document-workspace">
      <PageHeader
        eyebrow="Expediente del negocio"
        title={data.business.title}
        description={`${data.business.code} · ${operationLabel(data.business.operationType)} · ${businessStatusLabel(data.business.status)}`}
        actions={
          <div className="row-actions">
            <Button asChild icon={ArrowLeft} variant="secondary">
              <Link href="/businesses">Negocios</Link>
            </Button>
            {firstChecklist && documentWriteRoles.has(role) ? (
              <Button
                icon={Plus}
                onClick={() =>
                  setDrawer({ kind: 'custom', checklistId: firstChecklist.id })
                }
              >
                Agregar documento
              </Button>
            ) : null}
          </div>
        }
      />

      {notice ? (
        <div className="workspace-notice" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="workspace-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} type="button">
            Cerrar
          </button>
        </div>
      ) : null}

      <section className="summary-strip" aria-label="Resumen del expediente">
        <div>
          <span>Avance obligatorio</span>
          <strong>{data.summary.progressPercentage}%</strong>
        </div>
        <div>
          <span>Pendientes</span>
          <strong>{data.summary.pending}</strong>
        </div>
        <div>
          <span>Completados</span>
          <strong>{data.summary.completed}</strong>
        </div>
        <div>
          <span>Bloqueos</span>
          <strong>{data.summary.blockers.length}</strong>
        </div>
      </section>

      {data.checklists.length === 0 ? (
        <EmptyState
          icon={FilePlus2}
          title="Este negocio aún no tiene expediente"
          description={
            managerRoles.has(role)
              ? 'Selecciona una plantilla activa para crear el checklist documental.'
              : 'Un administrador debe inicializar el checklist documental de este negocio.'
          }
          action={
            managerRoles.has(role) && templates.length ? (
              <Select
                id="document-template"
                label="Plantilla"
                defaultValue=""
                onChange={(event) =>
                  event.target.value && instantiate(event.target.value)
                }
                disabled={isSaving}
              >
                <option value="">Seleccionar plantilla</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · v{template.version}
                  </option>
                ))}
              </Select>
            ) : undefined
          }
        />
      ) : (
        <div className="document-workspace-grid">
          <main className="document-workspace-main">
            <SectionPanel
              title="Checklist documental"
              description="Agrupado por estado y por la etapa que puede bloquear. Las acciones visibles corresponden a tu rol."
            >
              <Tabs
                ariaLabel="Estados del expediente"
                items={[
                  {
                    value: 'pending',
                    label: `Pendientes (${requirements.filter((item) => ['REQUIRED', 'OBSERVED', 'REJECTED', 'EXPIRED'].includes(item.status)).length})`,
                    requirements: requirements.filter((item) =>
                      ['REQUIRED', 'OBSERVED', 'REJECTED', 'EXPIRED'].includes(
                        item.status,
                      ),
                    ),
                  },
                  {
                    value: 'review',
                    label: `En proceso (${requirements.filter((item) => ['UPLOADED', 'UNDER_REVIEW'].includes(item.status)).length})`,
                    requirements: requirements.filter((item) =>
                      ['UPLOADED', 'UNDER_REVIEW'].includes(item.status),
                    ),
                  },
                  {
                    value: 'complete',
                    label: `Completados (${requirements.filter((item) => completeDocumentRequirementStatuses.has(item.status)).length})`,
                    requirements: requirements.filter((item) =>
                      completeDocumentRequirementStatuses.has(item.status),
                    ),
                  },
                  {
                    value: 'all',
                    label: `Todos (${requirements.length})`,
                    requirements,
                  },
                ].map((item) => ({
                  value: item.value,
                  label: item.label,
                  panel: (
                    <RequirementGroups
                      requirements={item.requirements}
                      role={role}
                      onDownload={download}
                      onHistory={openHistory}
                      onReplace={(requirement, documentId) =>
                        setDrawer({ kind: 'replace', requirement, documentId })
                      }
                      onReview={(requirement) =>
                        setDrawer({ kind: 'review', requirement })
                      }
                      onUpload={(requirement) =>
                        setDrawer({ kind: 'upload', requirement })
                      }
                    />
                  ),
                }))}
              />
            </SectionPanel>
          </main>
          <aside className="document-workspace-side">
            <SectionPanel
              title="Avance"
              description={`${data.summary.completed} de ${data.summary.total} requisitos completados.`}
            >
              <ProgressMeter
                label="Expediente"
                detail={`${data.summary.pending} obligatorios pendientes`}
                value={data.summary.progressPercentage}
              />
            </SectionPanel>
            <SectionPanel
              title="Bloqueos operativos"
              description="Deben resolverse antes de avanzar a la etapa indicada."
            >
              {data.summary.blockers.length ? (
                <ul className="blocker-list">
                  {data.summary.blockers.map((blocker) => (
                    <li key={blocker.id}>
                      <ShieldAlert size={17} />
                      <span>
                        <strong>{blocker.name}</strong>
                        <small>
                          {blocker.requiredAtStatus
                            ? `Bloquea ${businessStatusLabel(blocker.requiredAtStatus)}`
                            : 'Bloquea el avance del negocio'}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="detail-empty no-border">
                  No hay bloqueos documentales activos.
                </p>
              )}
            </SectionPanel>
            <SectionPanel
              title="Checklists activos"
              description="La versión aplicada queda congelada para este negocio."
            >
              <ul className="checklist-list">
                {data.checklists.map((checklist) => (
                  <li key={checklist.id}>
                    <FileText size={17} />
                    <span>
                      <strong>{checklist.templateName}</strong>
                      <small>
                        Versión {checklist.templateVersion} ·{' '}
                        {checklist.summary.progressPercentage}%
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </SectionPanel>
          </aside>
        </div>
      )}

      <WorkspaceDrawer
        drawer={drawer}
        history={history}
        isSaving={isSaving}
        onClose={() => setDrawer(null)}
        onCustom={submitCustom}
        onReplacement={submitReplacement}
        onReview={submitReview}
        onUpload={submitUpload}
      />
    </div>
  );
}

function RequirementGroups({
  requirements,
  role,
  onDownload,
  onHistory,
  onReplace,
  onReview,
  onUpload,
}: {
  requirements: BusinessDocumentRequirement[];
  role: MembershipRole;
  onDownload: (
    requirement: BusinessDocumentRequirement,
    documentId: string,
  ) => void;
  onHistory: (requirement: BusinessDocumentRequirement) => void;
  onReplace: (
    requirement: BusinessDocumentRequirement,
    documentId: string,
  ) => void;
  onReview: (requirement: BusinessDocumentRequirement) => void;
  onUpload: (requirement: BusinessDocumentRequirement) => void;
}) {
  const groups = new Map<string, BusinessDocumentRequirement[]>();
  for (const requirement of requirements) {
    const stage = requirement.requiredAtStatus ?? 'ANY';
    groups.set(stage, [...(groups.get(stage) ?? []), requirement]);
  }
  if (!requirements.length)
    return (
      <p className="detail-empty no-border requirement-tab-empty">
        No hay requisitos en este estado.
      </p>
    );
  return (
    <div className="requirement-stage-groups">
      {[...groups.entries()].map(([stage, items]) => (
        <section key={stage} className="requirement-stage-group">
          <div className="requirement-stage-heading">
            <span>
              {stage === 'ANY'
                ? 'Durante toda la operación'
                : `Antes de ${businessStatusLabel(stage as never)}`}
            </span>
            <small>
              {items.length} {items.length === 1 ? 'requisito' : 'requisitos'}
            </small>
          </div>
          <div className="requirement-list">
            {items.map((requirement) => (
              <RequirementCard
                key={requirement.id}
                requirement={requirement}
                role={role}
                onDownload={onDownload}
                onHistory={onHistory}
                onReplace={(documentId) => onReplace(requirement, documentId)}
                onReview={() => onReview(requirement)}
                onUpload={() => onUpload(requirement)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RequirementCard({
  requirement,
  role,
  onDownload,
  onHistory,
  onReplace,
  onReview,
  onUpload,
}: {
  requirement: BusinessDocumentRequirement;
  role: MembershipRole;
  onDownload: (
    requirement: BusinessDocumentRequirement,
    documentId: string,
  ) => void;
  onHistory: (requirement: BusinessDocumentRequirement) => void;
  onReplace: (documentId: string) => void;
  onReview: () => void;
  onUpload: () => void;
}) {
  const current = requirement.documents.filter(
    (document) => document.isCurrent,
  );
  const canUpload = requirement.uploadRoles.includes(role);
  const canReview =
    requirement.reviewRoles.includes(role) &&
    documentRequirementReviewTargets(requirement).length > 0;
  return (
    <article
      className={`requirement-card${requirement.blocksTransition && !completeDocumentRequirementStatuses.has(requirement.status) ? ' is-blocker' : ''}`}
    >
      <header>
        <div className="requirement-title">
          <FileText size={20} />
          <span>
            <strong>{requirement.name}</strong>
            <small>
              {requirement.description ??
                (requirement.source === 'CUSTOM'
                  ? 'Documento agregado por el equipo.'
                  : 'Documento definido por la plantilla.')}
            </small>
          </span>
        </div>
        <StatusBadge tone={requirementTone(requirement.status)}>
          {documentRequirementStatusLabel(requirement.status)}
        </StatusBadge>
      </header>
      <div className="requirement-flags">
        {requirement.required ? (
          <span>Obligatorio</span>
        ) : (
          <span>Opcional</span>
        )}
        {requirement.requiresReview ? <span>Requiere revisión</span> : null}
        {requirement.blocksTransition ? (
          <span className="danger-text">Bloquea avance</span>
        ) : null}
        {requirement.businessContract ? (
          <span>
            Contrato{' '}
            {requirement.businessContract.contractNumber ??
              `v${requirement.businessContract.version}`}
          </span>
        ) : null}
      </div>
      {current.length ? (
        <div className="document-version-list">
          {current.map((document) => (
            <div className="document-version" key={document.id}>
              <span>
                <strong>{document.fileName ?? document.name}</strong>
                <small>
                  Versión {document.version} · {formatBytes(document.fileSize)}{' '}
                  · {formatDateTime(document.createdAt)}
                </small>
              </span>
              <div className="row-actions">
                <Button
                  aria-label={`Descargar ${document.fileName ?? document.name}`}
                  icon={Download}
                  onClick={() => onDownload(requirement, document.id)}
                  variant="ghost"
                >
                  Descargar
                </Button>
                {canUpload ? (
                  <Button
                    icon={Replace}
                    onClick={() => onReplace(document.id)}
                    variant="ghost"
                  >
                    Nueva versión
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="requirement-empty">Aún no se ha cargado un archivo.</p>
      )}
      <footer>
        <span className="requirement-due">
          {requirement.requiredBy ? (
            <>
              <Clock3 size={15} />
              Fecha requerida: {formatDate(requirement.requiredBy)}
            </>
          ) : (
            'Sin fecha límite'
          )}
        </span>
        <div className="row-actions">
          {requirement.documents.length || requirement.events.length ? (
            <Button
              icon={History}
              onClick={() => onHistory(requirement)}
              variant="ghost"
            >
              Historial
            </Button>
          ) : null}
          {canReview ? (
            <Button icon={Eye} onClick={onReview} variant="secondary">
              Revisar
            </Button>
          ) : null}
          {canUpload ? (
            <Button icon={Upload} onClick={onUpload}>
              Subir archivo
            </Button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function WorkspaceDrawer({
  drawer,
  history,
  isSaving,
  onClose,
  onCustom,
  onReplacement,
  onReview,
  onUpload,
}: {
  drawer: DrawerState;
  history: BusinessDocumentHistoryResponse | null;
  isSaving: boolean;
  onClose: () => void;
  onCustom: (event: FormEvent<HTMLFormElement>) => void;
  onReplacement: (event: FormEvent<HTMLFormElement>) => void;
  onReview: (event: FormEvent<HTMLFormElement>) => void;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!drawer) return null;
  if (drawer.kind === 'history')
    return (
      <FormDrawer
        open
        title={`Historial · ${drawer.requirement.name}`}
        description="Versiones y decisiones preservadas en el expediente."
        onClose={onClose}
      >
        <div className="history-section">
          <h3>Versiones</h3>
          {history ? (
            <div className="history-versions">
              {history.documents.map((document) => (
                <div key={document.id}>
                  <FileClock size={17} />
                  <span>
                    <strong>{document.fileName ?? document.name}</strong>
                    <small>
                      v{document.version} ·{' '}
                      {document.isCurrent ? 'Actual' : 'Archivada'} ·{' '}
                      {formatDateTime(document.createdAt)}
                    </small>
                    {document.replacementReason ? (
                      <small>Motivo: {document.replacementReason}</small>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <LoadingState
              title="Cargando historial"
              description="Consultando trazabilidad documental."
            />
          )}
          <h3>Actividad</h3>
          {history ? (
            <ActivityTimeline
              items={history.events.map((event) => ({
                id: event.id,
                title: documentRequirementStatusLabel(event.toStatus),
                detail: event.reason ?? 'Cambio registrado por el sistema.',
                meta: formatDateTime(event.createdAt),
                tone: requirementTone(event.toStatus),
              }))}
              empty={
                <p className="detail-empty no-border">
                  Sin cambios de estado registrados.
                </p>
              }
            />
          ) : null}
        </div>
      </FormDrawer>
    );
  const requirement = drawer.kind === 'custom' ? null : drawer.requirement;
  const form =
    drawer.kind === 'custom' ? (
      <form
        className="drawer-form"
        id="document-action-form"
        onSubmit={onCustom}
      >
        <Input
          id="custom-document-name"
          label="Nombre del documento"
          name="name"
          required
        />
        <Input
          id="custom-document-category"
          label="Categoría"
          name="category"
          required
        />
        <Textarea
          id="custom-document-description"
          label="Descripción"
          name="description"
        />
        <Textarea
          id="custom-document-reason"
          label="Motivo para agregarlo"
          name="reason"
          required
        />
        <label className="check-row">
          <input name="required" type="checkbox" />
          Obligatorio
        </label>
        <label className="check-row">
          <input name="requiresReview" type="checkbox" />
          Requiere revisión
        </label>
        <label className="check-row">
          <input name="blocksTransition" type="checkbox" />
          Bloquea el avance del negocio
        </label>
      </form>
    ) : drawer.kind === 'upload' ? (
      <form
        className="drawer-form"
        id="document-action-form"
        onSubmit={onUpload}
      >
        <Input
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          id="document-file"
          label="Archivo"
          name="file"
          required
          type="file"
          hint="PDF, JPG, PNG, DOC o DOCX. Máximo 15 MB."
        />
      </form>
    ) : drawer.kind === 'replace' ? (
      <form
        className="drawer-form"
        id="document-action-form"
        onSubmit={onReplacement}
      >
        <Input
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          id="replacement-file"
          label="Nueva versión"
          name="file"
          required
          type="file"
        />
        <Textarea
          id="replacement-reason"
          label="Motivo del reemplazo"
          name="reason"
          required
        />
      </form>
    ) : (
      <form
        className="drawer-form"
        id="document-action-form"
        onSubmit={onReview}
      >
        <Select id="review-status" label="Decisión" name="status" required>
          {documentRequirementReviewTargets(drawer.requirement).map(
            (status) => (
              <option key={status} value={status}>
                {documentRequirementStatusLabel(status)}
              </option>
            ),
          )}
        </Select>
        {drawer.requirement.documents.some((document) => document.isCurrent) ? (
          <Select
            id="review-document"
            label="Versión revisada"
            name="documentId"
            required
          >
            <option value="">Seleccionar archivo</option>
            {drawer.requirement.documents
              .filter((document) => document.isCurrent)
              .map((document) => (
                <option key={document.id} value={document.id}>
                  {document.fileName ?? document.name} · v{document.version}
                </option>
              ))}
          </Select>
        ) : null}
        <Textarea
          id="review-reason"
          label="Observación o motivo"
          name="reason"
          hint="Obligatorio para observado, rechazado, vencido o no aplicable."
        />
      </form>
    );
  const titles = {
    custom: 'Agregar documento pertinente',
    replace: 'Cargar nueva versión',
    review: 'Revisar documento',
    upload: 'Subir archivo',
  };
  return (
    <FormDrawer
      open
      title={titles[drawer.kind]}
      description={
        requirement?.name ??
        'Este requisito quedará registrado dentro del expediente.'
      }
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button form="document-action-form" loading={isSaving} type="submit">
            Guardar
          </Button>
        </>
      }
    >
      {form}
    </FormDrawer>
  );
}

function requirementPath(
  businessId: string,
  requirement: BusinessDocumentRequirement,
) {
  return `/businesses/${businessId}/document-checklists/${requirement.checklistId}/requirements/${requirement.id}`;
}
function requirementTone(status: DocumentRequirementStatus): Tone {
  if (status === 'APPROVED') return 'success';
  if (['OBSERVED', 'EXPIRED'].includes(status)) return 'featured';
  if (status === 'REJECTED') return 'danger';
  if (status === 'UPLOADED' || status === 'UNDER_REVIEW') return 'primary';
  return 'neutral';
}
function formatBytes(bytes: number | null) {
  if (!bytes) return 'Tamaño no disponible';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function value(form: FormData, field: string) {
  const entry = form.get(field);
  return typeof entry === 'string' ? entry.trim() : '';
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la acción.';
}
