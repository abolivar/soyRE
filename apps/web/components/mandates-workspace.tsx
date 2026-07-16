'use client';

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Eye,
  FileCheck2,
  FilePlus2,
  Handshake,
  History,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  ClientsResponse,
  MandateDetailResponse,
  MandateHistoryEvent,
  MandateHistoryResponse,
  MandatesResponse,
  MandateStatus,
  MembershipRole,
  OperationalMandate,
  OrganizationClient,
  OrganizationProperty,
  OrganizationUser,
  PropertiesResponse,
  UsersResponse,
} from '../lib/api';
import {
  activeMemberships,
  documentStatusLabel,
  documentStatusTone,
  formatDate,
  formatDateTime,
  formatMoneyCents,
  mandateStatusLabel,
  mandateStatusTone,
  mandateTypeLabel,
} from './operational-format';
import {
  availableMandateActions,
  daysUntil,
  localDateValue,
  mandateBlockerLabel,
  mandateEventLabel,
  type MandateWorkspaceAction,
} from './mandate-workspace-domain';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDrawer,
  Input,
  LoadingState,
  PageHeader,
  SearchInput,
  SectionPanel,
  Select,
  StatusBadge,
  Textarea,
} from '@soyre/ui';

type MandateFilters = {
  search: string;
  status: string;
  type: string;
  expiring: string;
};

const createRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
  'AGENT',
]);
const commitRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
]);

export function MandatesWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [mandates, setMandates] = useState<OperationalMandate[]>([]);
  const [properties, setProperties] = useState<OrganizationProperty[]>([]);
  const [clients, setClients] = useState<OrganizationClient[]>([]);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [selectedMandateId, setSelectedMandateId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<OperationalMandate | null>(null);
  const [history, setHistory] = useState<MandateHistoryEvent[]>([]);
  const [filters, setFilters] = useState<MandateFilters>({
    expiring: '',
    search: '',
    status: '',
    type: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDocumentOpen, setIsDocumentOpen] = useState(false);
  const [activeAction, setActiveAction] =
    useState<MandateWorkspaceAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const first = activeMemberships(response.user)[0];
        setUser(response.user);
        if (!first) {
          setError(
            'No tienes una organización activa para consultar mandatos.',
          );
          setIsLoading(false);
          return;
        }
        setActiveOrganizationId(first.organizationId);
      })
      .catch((caught) => {
        setError(errorMessage(caught, 'Sesión no disponible.'));
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) return;
    refreshWorkspace(activeOrganizationId, filters).catch((caught) => {
      setError(errorMessage(caught, 'Mandatos no disponibles.'));
      setIsLoading(false);
    });
  }, [activeOrganizationId, filters]);

  useEffect(() => {
    if (!activeOrganizationId || !selectedMandateId) {
      setDetail(null);
      setHistory([]);
      return;
    }
    refreshDetail(selectedMandateId, activeOrganizationId).catch((caught) => {
      setDetailError(errorMessage(caught, 'Detalle no disponible.'));
      setIsDetailLoading(false);
    });
  }, [activeOrganizationId, selectedMandateId]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const role = activeMembership?.role ?? null;
  const canCreate = role ? createRoles.has(role) : false;
  const canApproveEvidence = role ? commitRoles.has(role) : false;
  const availableProperties = useMemo(
    () =>
      role === 'AGENT'
        ? properties.filter((property) => property.assignedUserId === user?.id)
        : properties,
    [properties, role, user?.id],
  );
  const actions = useMemo(
    () => availableMandateActions(role, user?.id ?? null, detail),
    [detail, role, user?.id],
  );
  const metrics = useMemo(() => {
    const active = mandates.filter(
      (mandate) => mandate.status === 'ACTIVE',
    ).length;
    const blocked = mandates.filter(
      (mandate) => !mandate.readiness.allowed && !isTerminal(mandate.status),
    ).length;
    const expiring = mandates.filter((mandate) => {
      const days = daysUntil(mandate.endsAt);
      return (
        mandate.status === 'ACTIVE' && days !== null && days >= 0 && days <= 30
      );
    }).length;
    return { active, blocked, expiring };
  }, [mandates]);

  async function refreshWorkspace(
    organizationId = activeOrganizationId,
    nextFilters = filters,
  ) {
    if (!organizationId) return;
    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });
    if (nextFilters.search) query.set('search', nextFilters.search);
    if (nextFilters.status) query.set('status', nextFilters.status);
    if (nextFilters.type) query.set('type', nextFilters.type);
    if (nextFilters.expiring) query.set('expiringBefore', nextFilters.expiring);
    const supportQuery = new URLSearchParams({ organizationId });
    const [mandateResponse, propertyResponse, clientResponse, userResponse] =
      await Promise.all([
        apiFetch<MandatesResponse>(`/mandates?${query.toString()}`),
        apiFetch<PropertiesResponse>(`/properties?${supportQuery.toString()}`),
        apiFetch<ClientsResponse>(`/clients?${supportQuery.toString()}`),
        apiFetch<UsersResponse>(`/users?${supportQuery.toString()}`),
      ]);
    setMandates(mandateResponse.mandates);
    setProperties(propertyResponse.properties);
    setClients(clientResponse.clients);
    setUsers(userResponse.users);
    setSelectedMandateId((current) =>
      current && mandateResponse.mandates.some((item) => item.id === current)
        ? current
        : (mandateResponse.mandates[0]?.id ?? null),
    );
    setIsLoading(false);
  }

  async function refreshDetail(
    mandateId: string,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) return;
    setIsDetailLoading(true);
    setDetailError(null);
    const query = new URLSearchParams({ organizationId });
    const [detailResponse, historyResponse] = await Promise.all([
      apiFetch<MandateDetailResponse>(
        `/mandates/${mandateId}?${query.toString()}`,
      ),
      apiFetch<MandateHistoryResponse>(
        `/mandates/${mandateId}/history?${query.toString()}`,
      ),
    ]);
    setDetail(detailResponse.mandate);
    setHistory(historyResponse.events);
    setIsDetailLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      expiring: stringValue(form, 'expiring') ?? '',
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? '',
      type: stringValue(form, 'type') ?? '',
    });
  }

  async function submitMandate(
    event: FormEvent<HTMLFormElement>,
    mode: 'create' | 'edit',
  ) {
    event.preventDefault();
    if (!activeOrganizationId || !canCreate) return;
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      const payload = mandatePayload(form, activeOrganizationId, user?.id);
      const response = await apiFetch<MandateDetailResponse>(
        mode === 'create' ? '/mandates' : `/mandates/${detail?.id}`,
        {
          body: JSON.stringify(
            mode === 'edit'
              ? { ...payload, idempotencyKey: idempotencyKey('edit') }
              : payload,
          ),
          method: mode === 'create' ? 'POST' : 'PATCH',
        },
      );
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setSelectedMandateId(response.mandate.id);
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(response.mandate.id, activeOrganizationId);
    } catch (caught) {
      setFormError(errorMessage(caught, 'No se pudo guardar el mandato.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeOrganizationId || !detail || !activeAction) return;
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      let nextMandateId = detail.id;
      if (activeAction === 'RENEW') {
        const response = await apiFetch<
          MandateDetailResponse & { created: boolean }
        >(`/mandates/${detail.id}/renewals`, {
          body: JSON.stringify({
            organizationId: activeOrganizationId,
            idempotencyKey: idempotencyKey('renew'),
          }),
          method: 'POST',
        });
        nextMandateId = response.mandate.id;
      } else {
        const response = await apiFetch<MandateDetailResponse>(
          `/mandates/${detail.id}/transitions`,
          {
            body: JSON.stringify(
              stripEmpty({
                action: activeAction,
                documentId: stringValue(form, 'documentId'),
                effectiveAt: stringValue(form, 'effectiveAt'),
                idempotencyKey: idempotencyKey(activeAction.toLowerCase()),
                organizationId: activeOrganizationId,
                reason: stringValue(form, 'reason'),
                signedAt: stringValue(form, 'signedAt'),
              }),
            ),
            method: 'POST',
          },
        );
        nextMandateId = response.mandate.id;
      }
      setSelectedMandateId(nextMandateId);
      setActiveAction(null);
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(nextMandateId, activeOrganizationId);
    } catch (caught) {
      setFormError(errorMessage(caught, 'No se pudo completar la acción.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeOrganizationId || !detail) return;
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch('/documents', {
        body: JSON.stringify(
          stripEmpty({
            documentType: stringValue(form, 'documentType') ?? 'SIGNED_MANDATE',
            entityType: 'MANDATE',
            expiresAt: stringValue(form, 'expiresAt'),
            fileName: stringValue(form, 'fileName'),
            mandateId: detail.id,
            mimeType: 'application/pdf',
            name: stringValue(form, 'name') ?? 'Mandato firmado',
            notes: stringValue(form, 'notes'),
            organizationId: activeOrganizationId,
            status: canApproveEvidence ? 'APPROVED' : 'REQUIRED',
            storagePath: stringValue(form, 'storagePath'),
          }),
        ),
        method: 'POST',
      });
      setIsDocumentOpen(false);
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(detail.id, activeOrganizationId);
    } catch (caught) {
      setFormError(errorMessage(caught, 'No se pudo agregar la evidencia.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openAction(action: MandateWorkspaceAction) {
    setFormError(null);
    if (action === 'EDIT') setIsEditOpen(true);
    else if (action === 'ADD_DOCUMENT') setIsDocumentOpen(true);
    else setActiveAction(action);
  }

  return (
    <>
      <PageHeader
        actions={
          <div className="row-actions">
            <Button
              disabled={!canCreate}
              icon={Plus}
              onClick={() => {
                setFormError(null);
                setIsCreateOpen(true);
              }}
            >
              Nuevo mandato
            </Button>
            <Button
              icon={RefreshCcw}
              onClick={() => refreshWorkspace()}
              variant="secondary"
            >
              Actualizar
            </Button>
          </div>
        }
        description={
          activeMembership
            ? `Autorizaciones comerciales de ${activeMembership.organizationName}.`
            : 'Vigencia, firma, exclusividad y preparación comercial por organización.'
        }
        eyebrow="Autorizaciones"
        title="Mandatos"
      />

      <section className="summary-strip" aria-label="Resumen de mandatos">
        <div>
          <span>Total</span>
          <strong>{mandates.length}</strong>
        </div>
        <div>
          <span>Activos</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Vencen en 30 días</span>
          <strong>{metrics.expiring}</strong>
        </div>
        <div>
          <span>Con bloqueantes</span>
          <strong>{metrics.blocked}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <Select
              id="mandates-organization"
              label="Organización"
              labelHidden
              onChange={(event) => setActiveOrganizationId(event.target.value)}
              value={activeOrganizationId ?? ''}
            >
              {organizations.map((membership) => (
                <option
                  key={membership.organizationId}
                  value={membership.organizationId}
                >
                  {membership.organizationName}
                </option>
              ))}
            </Select>
          ) : null}
          <SearchInput
            aria-label="Buscar mandato"
            defaultValue={filters.search}
            name="search"
            placeholder="Propiedad, propietario o nota"
          />
          <Select
            id="mandates-type"
            label="Modalidad"
            labelHidden
            name="type"
            defaultValue={filters.type}
          >
            <option value="">Todas las modalidades</option>
            <option value="SALE">Venta</option>
            <option value="RENT">Alquiler</option>
            <option value="BOTH">Venta y alquiler</option>
          </Select>
          <Select
            id="mandates-status"
            label="Estado"
            labelHidden
            name="status"
            defaultValue={filters.status}
          >
            <option value="">Todos los estados</option>
            {mandateStatuses.map((status) => (
              <option key={status} value={status}>
                {mandateStatusLabel(status)}
              </option>
            ))}
          </Select>
          <Input
            id="mandates-expiring"
            label="Vence antes de"
            labelHidden
            name="expiring"
            type="date"
            defaultValue={filters.expiring}
          />
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      <section className="dashboard-grid mandate-workspace-grid">
        {isLoading ? (
          <LoadingState
            title="Cargando mandatos"
            description="Consultando autorizaciones de la organización activa."
          />
        ) : error ? (
          <ErrorState
            title="No se pudieron cargar los mandatos"
            description={error}
            action={
              <Button
                icon={RefreshCcw}
                onClick={() => refreshWorkspace()}
                variant="secondary"
              >
                Reintentar
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={[
              { key: 'property', label: 'Propiedad' },
              { key: 'terms', label: 'Condiciones' },
              { key: 'validity', label: 'Vigencia' },
              { key: 'status', label: 'Estado' },
              { key: 'readiness', label: 'Preparación' },
              { key: 'actions', label: 'Detalle' },
            ]}
            empty={
              <EmptyState
                action={
                  canCreate ? (
                    <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
                      Crear primer mandato
                    </Button>
                  ) : undefined
                }
                description={
                  canCreate
                    ? 'Crea un borrador con términos claros. La firma y activación se realizan después mediante acciones auditadas.'
                    : 'Tu rol puede consultar, pero no crear mandatos en esta organización.'
                }
                icon={Handshake}
                title="Sin mandatos registrados"
              />
            }
            rows={mandates.map((mandate) => ({
              id: mandate.id,
              cells: {
                actions: (
                  <button
                    className={
                      mandate.id === selectedMandateId
                        ? 'table-action active'
                        : 'table-action'
                    }
                    onClick={() => setSelectedMandateId(mandate.id)}
                    type="button"
                  >
                    <Eye size={15} /> Ver
                  </button>
                ),
                property: (
                  <span>
                    <strong className="entity-title">
                      {mandate.property.title}
                    </strong>
                    <span className="meta-row">
                      {mandate.ownerClient?.displayName ??
                        'Propietario pendiente'}
                    </span>
                  </span>
                ),
                readiness: (
                  <StatusBadge
                    tone={mandate.readiness.allowed ? 'success' : 'warning'}
                  >
                    {mandate.readiness.allowed
                      ? 'Listo'
                      : `${mandate.readiness.blockers.length} pendiente(s)`}
                  </StatusBadge>
                ),
                status: (
                  <StatusBadge tone={mandateStatusTone(mandate.status)}>
                    {mandateStatusLabel(mandate.status)}
                  </StatusBadge>
                ),
                terms: (
                  <span>
                    <strong>
                      {formatMoneyCents(
                        mandate.authorizedPriceCents,
                        mandate.currency,
                      )}
                    </strong>
                    <span className="meta-row">
                      {mandateTypeLabel(mandate.type)} ·{' '}
                      {formatCommission(mandate.commissionBps)}
                    </span>
                  </span>
                ),
                validity: validityLabel(mandate),
              },
            }))}
          />
        )}

        <SectionPanel
          title="Expediente operativo"
          description="Términos, readiness, acciones e historial del mandato seleccionado."
        >
          {isDetailLoading ? (
            <LoadingState
              title="Cargando expediente"
              description="Consultando términos e historial."
            />
          ) : detailError ? (
            <ErrorState
              title="Expediente no disponible"
              description={detailError}
              action={
                selectedMandateId ? (
                  <Button
                    onClick={() => refreshDetail(selectedMandateId)}
                    variant="secondary"
                  >
                    Reintentar
                  </Button>
                ) : undefined
              }
            />
          ) : detail ? (
            <MandateDetailPanel
              actions={actions}
              history={history}
              mandate={detail}
              onAction={openAction}
            />
          ) : (
            <EmptyState
              icon={Handshake}
              title="Sin mandato seleccionado"
              description="Selecciona un mandato para revisar su expediente y acciones disponibles."
            />
          )}
        </SectionPanel>
      </section>

      <FormDrawer
        description="El alta siempre crea un borrador. Firma y activación se ejecutan después como transiciones auditadas."
        footer={
          <DrawerFooter
            form="mandate-create-form"
            loading={isSubmitting}
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Crear borrador"
          />
        }
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen && canCreate}
        title="Nuevo mandato"
      >
        <MandateForm
          clients={clients}
          error={formError}
          formId="mandate-create-form"
          onSubmit={(event) => submitMandate(event, 'create')}
          properties={availableProperties}
          users={users}
          currentUserId={user?.id}
        />
      </FormDrawer>

      <FormDrawer
        description="Solo los borradores permiten modificar términos materiales."
        footer={
          <DrawerFooter
            form="mandate-edit-form"
            loading={isSubmitting}
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Guardar términos"
          />
        }
        onClose={() => setIsEditOpen(false)}
        open={isEditOpen && Boolean(detail)}
        title="Editar borrador"
      >
        {detail ? (
          <MandateForm
            clients={clients}
            current={detail}
            error={formError}
            formId="mandate-edit-form"
            onSubmit={(event) => submitMandate(event, 'edit')}
            properties={availableProperties}
            users={users}
            currentUserId={user?.id}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        description={
          activeAction && detail ? actionDescription(activeAction, detail) : ''
        }
        footer={
          <DrawerFooter
            form="mandate-action-form"
            loading={isSubmitting}
            onCancel={() => setActiveAction(null)}
            submitLabel={activeAction ? actionLabel(activeAction) : 'Confirmar'}
          />
        }
        onClose={() => setActiveAction(null)}
        open={Boolean(activeAction && detail)}
        title={activeAction ? actionLabel(activeAction) : 'Acción'}
      >
        {activeAction && detail ? (
          <ActionForm
            action={activeAction}
            error={formError}
            mandate={detail}
            onSubmit={submitAction}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        description="Vincula evidencia al expediente. Los roles autorizados la registran aprobada; los demás la dejan pendiente de revisión."
        footer={
          <DrawerFooter
            form="mandate-document-form"
            loading={isSubmitting}
            onCancel={() => setIsDocumentOpen(false)}
            submitLabel="Agregar evidencia"
          />
        }
        onClose={() => setIsDocumentOpen(false)}
        open={isDocumentOpen && Boolean(detail)}
        title="Documento del mandato"
      >
        <form
          className="drawer-form"
          id="mandate-document-form"
          onSubmit={submitDocument}
        >
          <section className="form-section">
            <Select
              id="mandate-document-type"
              label="Tipo documental"
              name="documentType"
              defaultValue="SIGNED_MANDATE"
            >
              <option value="SIGNED_MANDATE">Mandato firmado</option>
              <option value="POWER_OF_ATTORNEY">Poder de representación</option>
              <option value="OWNER_IDENTIFICATION">
                Identificación del propietario
              </option>
              <option value="OTHER">Otro documento pertinente</option>
            </Select>
            <Input
              id="mandate-document-name"
              label="Nombre"
              name="name"
              defaultValue="Mandato firmado"
              required
            />
            <div className="form-grid two">
              <Input
                id="mandate-document-file"
                label="Archivo"
                name="fileName"
                placeholder="mandato-firmado.pdf"
                required
              />
              <Input
                id="mandate-document-path"
                label="Ruta segura"
                name="storagePath"
                placeholder="mandates/organizacion/archivo.pdf"
                required
              />
            </div>
            <Input
              id="mandate-document-expires"
              label="Vence"
              name="expiresAt"
              type="date"
            />
            <Textarea id="mandate-document-notes" label="Notas" name="notes" />
            {formError ? <p className="form-error">{formError}</p> : null}
          </section>
        </form>
      </FormDrawer>
    </>
  );
}

function MandateDetailPanel({
  actions,
  history,
  mandate,
  onAction,
}: {
  actions: MandateWorkspaceAction[];
  history: MandateHistoryEvent[];
  mandate: OperationalMandate;
  onAction: (action: MandateWorkspaceAction) => void;
}) {
  return (
    <div className="mandate-detail">
      <div className="detail-hero">
        <span>
          <strong>{mandate.property.title}</strong>
          <small>
            {mandateTypeLabel(mandate.type)} ·{' '}
            {mandate.exclusive ? 'Exclusivo' : 'No exclusivo'}
          </small>
        </span>
        <StatusBadge tone={mandateStatusTone(mandate.status)}>
          {mandateStatusLabel(mandate.status)}
        </StatusBadge>
      </div>
      <div className="mandate-action-bar" aria-label="Acciones disponibles">
        {actions.length === 0 ? (
          <small>Tu rol no tiene acciones disponibles en este estado.</small>
        ) : (
          actions.map((action) => (
            <Button
              key={action}
              icon={actionIcon(action)}
              onClick={() => onAction(action)}
              variant={action === 'CANCEL' ? 'danger' : 'secondary'}
            >
              {actionLabel(action)}
            </Button>
          ))
        )}
      </div>
      <div className="detail-grid">
        <DetailField
          label="Precio autorizado"
          value={formatMoneyCents(
            mandate.authorizedPriceCents,
            mandate.currency,
          )}
        />
        <DetailField
          label="Comisión"
          value={formatCommission(mandate.commissionBps)}
        />
        <DetailField
          label="Propietario"
          value={mandate.ownerClient?.displayName ?? 'Pendiente'}
        />
        <DetailField
          label="Responsable"
          value={userSummary(mandate.assignedUser)}
        />
        <DetailField label="Inicio" value={formatDate(mandate.startsAt)} />
        <DetailField label="Fin" value={formatDate(mandate.endsAt)} />
        <DetailField label="Firma" value={formatDate(mandate.signedAt)} />
        <DetailField
          label="Renovación"
          value={
            mandate.renewal
              ? `${mandateStatusLabel(mandate.renewal.status)} · ${formatDate(mandate.renewal.startsAt)}`
              : 'Sin sucesor'
          }
        />
      </div>
      <section
        className={
          mandate.readiness.allowed
            ? 'readiness-card ready'
            : 'readiness-card blocked'
        }
      >
        <div className="split-row">
          <strong>
            {mandate.readiness.allowed
              ? 'Listo para preparación comercial'
              : 'Condiciones pendientes'}
          </strong>
          {mandate.readiness.allowed ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
        </div>
        {mandate.readiness.blockers.length > 0 ? (
          <ul>
            {mandate.readiness.blockers.map((blocker) => (
              <li key={blocker}>{mandateBlockerLabel(blocker)}</li>
            ))}
          </ul>
        ) : (
          <p>El mandato puede habilitar una publicación compatible.</p>
        )}
      </section>
      <section>
        <div className="document-list-header">
          <strong>Expediente</strong>
          <span>{mandate.documents.length} documento(s)</span>
        </div>
        <div className="document-list">
          {mandate.documents.length === 0 ? (
            <p className="detail-empty">Todavía no hay evidencia vinculada.</p>
          ) : (
            mandate.documents.map((document) => (
              <div className="document-row" key={document.id}>
                <span>
                  <strong>{document.name}</strong>
                  <small>
                    {documentTypeLabel(document.documentType)} ·{' '}
                    {formatDate(document.createdAt)}
                  </small>
                </span>
                <StatusBadge tone={documentStatusTone(document.status)}>
                  {documentStatusLabel(document.status)}
                </StatusBadge>
              </div>
            ))
          )}
        </div>
      </section>
      <section>
        <div className="document-list-header">
          <strong>Historial</strong>
          <span>{history.length} evento(s)</span>
        </div>
        {history.length === 0 ? (
          <p className="detail-empty">Sin eventos registrados.</p>
        ) : (
          <ol className="activity-timeline">
            {history.map((event) => (
              <li className="timeline-item" key={event.id}>
                <span className="timeline-marker">
                  <History size={16} />
                </span>
                <span>
                  <strong>{mandateEventLabel(event.action)}</strong>
                  <small className="timeline-meta">
                    {userSummary(event.actorUser)} ·{' '}
                    {formatDateTime(event.createdAt)}
                    {event.reason ? ` · ${event.reason}` : ''}
                  </small>
                </span>
                <StatusBadge tone={mandateStatusTone(event.toStatus)}>
                  {mandateStatusLabel(event.toStatus)}
                </StatusBadge>
              </li>
            ))}
          </ol>
        )}
      </section>
      {mandate.notes ? (
        <div className="detail-notes">
          <strong>Notas</strong>
          <p>{mandate.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

function MandateForm({
  clients,
  current,
  currentUserId,
  error,
  formId,
  onSubmit,
  properties,
  users,
}: {
  clients: OrganizationClient[];
  current?: OperationalMandate;
  currentUserId?: string;
  error: string | null;
  formId: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  properties: OrganizationProperty[];
  users: OrganizationUser[];
}) {
  return (
    <form className="drawer-form" id={formId} onSubmit={onSubmit}>
      <section className="form-section">
        <div>
          <h3>Autorización</h3>
          <p>Inmueble, modalidad y partes responsables.</p>
        </div>
        <Select
          id={`${formId}-property`}
          label="Propiedad"
          name="propertyId"
          defaultValue={current?.propertyId ?? ''}
          disabled={Boolean(current)}
          required
        >
          <option value="">Seleccionar propiedad</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.title}
            </option>
          ))}
        </Select>
        <div className="form-grid two">
          <Select
            id={`${formId}-type`}
            label="Modalidad"
            name="type"
            defaultValue={current?.type ?? 'SALE'}
            required
          >
            <option value="SALE">Venta</option>
            <option value="RENT">Alquiler</option>
            <option value="BOTH">Venta y alquiler</option>
          </Select>
          <label className="check-card">
            <input
              defaultChecked={current?.exclusive ?? false}
              name="exclusive"
              type="checkbox"
            />
            <span>Mandato exclusivo</span>
          </label>
        </div>
        <div className="form-grid two">
          <Select
            id={`${formId}-owner`}
            label="Propietario"
            name="ownerClientId"
            defaultValue={current?.ownerClientId ?? ''}
          >
            <option value="">Usar propietario de la propiedad</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.displayName}
              </option>
            ))}
          </Select>
          <Select
            id={`${formId}-assignee`}
            label="Responsable"
            name="assignedUserId"
            defaultValue={current?.assignedUserId ?? currentUserId ?? ''}
            required
          >
            <option value="">Seleccionar responsable</option>
            {users.map((organizationUser) => (
              <option key={organizationUser.id} value={organizationUser.id}>
                {organizationUser.firstName} {organizationUser.lastName ?? ''}
              </option>
            ))}
          </Select>
        </div>
      </section>
      <section className="form-section">
        <div>
          <h3>Términos materiales</h3>
          <p>
            Precio, moneda, comisión y vigencia que se presentarán para firma.
          </p>
        </div>
        <div className="form-grid three">
          <Input
            id={`${formId}-amount`}
            label="Precio autorizado"
            min="0.01"
            name="authorizedAmount"
            defaultValue={moneyInput(current?.authorizedPriceCents)}
            step="0.01"
            type="number"
            required
          />
          <Input
            id={`${formId}-currency`}
            label="Moneda"
            maxLength={3}
            name="currency"
            defaultValue={current?.currency ?? 'USD'}
            required
          />
          <Input
            id={`${formId}-commission`}
            label="Comisión %"
            min="0"
            max="100"
            name="commissionPercent"
            defaultValue={percentInput(current?.commissionBps)}
            step="0.01"
            type="number"
            required
          />
        </div>
        <div className="form-grid two">
          <Input
            id={`${formId}-starts`}
            label="Inicio"
            name="startsAt"
            defaultValue={current?.startsAt ?? ''}
            type="date"
            required
          />
          <Input
            id={`${formId}-ends`}
            label="Fin"
            name="endsAt"
            defaultValue={current?.endsAt ?? ''}
            type="date"
            required
          />
        </div>
        <Textarea
          id={`${formId}-notes`}
          label="Notas"
          name="notes"
          defaultValue={current?.notes ?? ''}
        />
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </form>
  );
}

function ActionForm({
  action,
  error,
  mandate,
  onSubmit,
}: {
  action: MandateWorkspaceAction;
  error: string | null;
  mandate: OperationalMandate;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const approvedEvidence = mandate.documents.filter(
    (document) =>
      document.documentType === 'SIGNED_MANDATE' &&
      document.status === 'APPROVED',
  );
  return (
    <form className="drawer-form" id="mandate-action-form" onSubmit={onSubmit}>
      <section className="form-section">
        {action === 'REGISTER_SIGNATURE' ? (
          <>
            <Input
              id="mandate-action-signed"
              label="Fecha de firma"
              name="signedAt"
              type="date"
              defaultValue={localDateValue()}
              required
            />
            <Select
              id="mandate-action-document"
              label="Evidencia aprobada"
              name="documentId"
              required
            >
              <option value="">Seleccionar documento</option>
              {approvedEvidence.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.name}
                </option>
              ))}
            </Select>
          </>
        ) : null}
        {['RETURN_TO_DRAFT', 'CANCEL'].includes(action) ? (
          <Textarea
            id="mandate-action-reason"
            label="Motivo"
            name="reason"
            required
          />
        ) : null}
        {action === 'CANCEL' && mandate.status === 'ACTIVE' ? (
          <Input
            id="mandate-action-effective"
            label="Fecha efectiva"
            name="effectiveAt"
            type="date"
            defaultValue={localDateValue()}
            required
          />
        ) : null}
        {action === 'RENEW' ? <RenewalComparison mandate={mandate} /> : null}
        {!['REGISTER_SIGNATURE', 'RETURN_TO_DRAFT', 'CANCEL', 'RENEW'].includes(
          action,
        ) ? (
          <p className="action-notice">
            Esta acción se registrará en el historial y actualizará el estado
            del mandato.
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </form>
  );
}

function RenewalComparison({ mandate }: { mandate: OperationalMandate }) {
  return (
    <div className="renewal-comparison">
      <strong>Base de la renovación</strong>
      <div className="detail-grid">
        <DetailField label="Modalidad" value={mandateTypeLabel(mandate.type)} />
        <DetailField
          label="Precio actual"
          value={formatMoneyCents(
            mandate.authorizedPriceCents,
            mandate.currency,
          )}
        />
        <DetailField
          label="Comisión actual"
          value={formatCommission(mandate.commissionBps)}
        />
        <DetailField
          label="Vigencia actual"
          value={`${formatDate(mandate.startsAt)} – ${formatDate(mandate.endsAt)}`}
        />
      </div>
      <p>
        Se creará un sucesor en borrador con estos términos como referencia. Las
        nuevas fechas deberán revisarse antes de enviarlo a firma.
      </p>
    </div>
  );
}

function DrawerFooter({
  form,
  loading,
  onCancel,
  submitLabel,
}: {
  form: string;
  loading: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <>
      <Button disabled={loading} onClick={onCancel} variant="secondary">
        Cancelar
      </Button>
      <Button disabled={loading} form={form} loading={loading} type="submit">
        {submitLabel}
      </Button>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <span className="detail-field">
      <strong>{label}</strong>
      <small>{value}</small>
    </span>
  );
}

const mandateStatuses: MandateStatus[] = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'PENDING_DOCUMENTS',
  'ACTIVE',
  'EXPIRED',
  'CANCELLED',
  'SUPERSEDED',
  'ARCHIVED',
];

function mandatePayload(
  form: FormData,
  organizationId: string,
  currentUserId?: string,
) {
  return stripEmpty({
    organizationId,
    propertyId: stringValue(form, 'propertyId'),
    ownerClientId: stringValue(form, 'ownerClientId'),
    assignedUserId: stringValue(form, 'assignedUserId') ?? currentUserId,
    type: stringValue(form, 'type'),
    exclusive: form.get('exclusive') === 'on',
    authorizedPriceCents: moneyCents(form, 'authorizedAmount'),
    currency: stringValue(form, 'currency')?.toUpperCase(),
    commissionBps: percentageBps(form, 'commissionPercent'),
    startsAt: stringValue(form, 'startsAt'),
    endsAt: stringValue(form, 'endsAt'),
    notes: stringValue(form, 'notes'),
  });
}

function actionLabel(action: MandateWorkspaceAction) {
  return {
    ACTIVATE: 'Activar',
    ADD_DOCUMENT: 'Agregar evidencia',
    ARCHIVE: 'Archivar',
    CANCEL: 'Cancelar mandato',
    EDIT: 'Editar términos',
    EXPIRE: 'Marcar vencido',
    REGISTER_SIGNATURE: 'Registrar firma',
    RENEW: 'Crear renovación',
    RETURN_TO_DRAFT: 'Devolver a borrador',
    SUBMIT_FOR_SIGNATURE: 'Enviar para firma',
  }[action];
}

function actionDescription(
  action: MandateWorkspaceAction,
  mandate: OperationalMandate,
) {
  if (action === 'RENEW')
    return 'Compara los términos actuales y crea un sucesor auditable en borrador.';
  if (action === 'REGISTER_SIGNATURE')
    return 'Selecciona evidencia firmada y aprobada del expediente.';
  if (action === 'CANCEL')
    return `Finaliza ${mandate.property.title} antes de su vencimiento. El motivo quedará auditado.`;
  return `Confirma ${actionLabel(action).toLowerCase()} para ${mandate.property.title}.`;
}

function actionIcon(action: MandateWorkspaceAction) {
  return {
    ACTIVATE: ShieldCheck,
    ADD_DOCUMENT: FilePlus2,
    ARCHIVE: XCircle,
    CANCEL: XCircle,
    EDIT: Pencil,
    EXPIRE: CalendarClock,
    REGISTER_SIGNATURE: FileCheck2,
    RENEW: RotateCcw,
    RETURN_TO_DRAFT: RotateCcw,
    SUBMIT_FOR_SIGNATURE: Send,
  }[action];
}

function validityLabel(mandate: OperationalMandate) {
  const days = daysUntil(mandate.endsAt);
  if (!mandate.endsAt) return 'Sin fecha final';
  if (days === null) return formatDate(mandate.endsAt);
  if (days < 0) return `Venció hace ${Math.abs(days)} día(s)`;
  if (days === 0) return 'Vence hoy';
  return `${formatDate(mandate.endsAt)} · ${days} día(s)`;
}

function isTerminal(status: MandateStatus) {
  return ['EXPIRED', 'CANCELLED', 'SUPERSEDED', 'ARCHIVED'].includes(status);
}
function formatCommission(value: number | null) {
  return value === null
    ? 'Pendiente'
    : `${(value / 100).toLocaleString('es-PA', { maximumFractionDigits: 2 })}%`;
}
function documentTypeLabel(value: string) {
  return (
    {
      IDENTITY_DOCUMENT: 'Identificación del propietario',
      OTHER: 'Otro documento pertinente',
      POWER_OF_ATTORNEY: 'Poder de representación',
      SIGNED_MANDATE: 'Mandato firmado',
    }[value] ?? 'Documento pertinente'
  );
}
function userSummary(
  value: { firstName: string; lastName: string | null; email: string } | null,
) {
  return value
    ? `${value.firstName} ${value.lastName ?? ''}`.trim()
    : 'Sin responsable';
}
function moneyInput(value?: string | null) {
  return value ? (Number(value) / 100).toFixed(2) : '';
}
function percentInput(value?: number | null) {
  return value === null || value === undefined ? '' : (value / 100).toFixed(2);
}
function idempotencyKey(action: string) {
  return `web:${action}:${crypto.randomUUID()}`;
}
function stringValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function moneyCents(form: FormData, key: string) {
  const value = stringValue(form, key);
  return value ? String(Math.round(Number(value) * 100)) : undefined;
}
function percentageBps(form: FormData, key: string) {
  const value = stringValue(form, key);
  return value ? Math.round(Number(value) * 100) : undefined;
}
function stripEmpty<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== '',
    ),
  );
}
function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
