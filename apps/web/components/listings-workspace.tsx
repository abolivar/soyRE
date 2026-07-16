'use client';

import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  History,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  apiFetchFormData,
  AuthUser,
  ListingDetailResponse,
  ListingHistoryEvent,
  ListingHistoryResponse,
  ListingMaterial,
  ListingsResponse,
  ListingStatus,
  MandatesResponse,
  MembershipRole,
  OperationalListing,
  OperationalMandate,
  OrganizationProperty,
  OrganizationUser,
  PropertiesResponse,
  UsersResponse,
} from '../lib/api';
import {
  activeMemberships,
  formatDateTime,
  formatMoneyCents,
  listingStatusLabel,
  listingStatusTone,
  mandateTypeLabel,
} from './operational-format';
import {
  availableListingActions,
  idempotencyKey,
  listingActionLabel,
  listingBlockerLabel,
  listingEventLabel,
  type ListingWorkspaceAction,
} from './listing-workspace-domain';
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

type ListingFilters = {
  operationType: string;
  search: string;
  status: string;
};

type MaterialMode =
  { kind: 'add' } | { kind: 'replace'; material: ListingMaterial };

const createRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'OPERATIONS',
  'AGENT',
]);

export function ListingsWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >(null);
  const [listings, setListings] = useState<OperationalListing[]>([]);
  const [properties, setProperties] = useState<OrganizationProperty[]>([]);
  const [mandates, setMandates] = useState<OperationalMandate[]>([]);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null,
  );
  const [detail, setDetail] = useState<OperationalListing | null>(null);
  const [history, setHistory] = useState<ListingHistoryEvent[]>([]);
  const [filters, setFilters] = useState<ListingFilters>({
    operationType: '',
    search: '',
    status: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeAction, setActiveAction] =
    useState<ListingWorkspaceAction | null>(null);
  const [materialMode, setMaterialMode] = useState<MaterialMode | null>(null);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const first = activeMemberships(response.user)[0];
        setUser(response.user);
        if (!first) {
          setError(
            'No tienes una organización activa para consultar publicaciones.',
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
      setError(errorMessage(caught, 'Publicaciones no disponibles.'));
      setIsLoading(false);
    });
  }, [activeOrganizationId, filters]);

  useEffect(() => {
    if (!activeOrganizationId || !selectedListingId) {
      setDetail(null);
      setHistory([]);
      return;
    }
    refreshDetail(selectedListingId, activeOrganizationId).catch((caught) => {
      setDetailError(errorMessage(caught, 'Detalle no disponible.'));
      setIsDetailLoading(false);
    });
  }, [activeOrganizationId, selectedListingId]);

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
  const actions = useMemo(
    () => availableListingActions(role, user?.id ?? null, detail),
    [detail, role, user?.id],
  );
  const availableProperties = useMemo(
    () =>
      role === 'AGENT'
        ? properties.filter((property) => property.assignedUserId === user?.id)
        : properties,
    [properties, role, user?.id],
  );
  const metrics = useMemo(
    () => ({
      blocked: listings.filter(
        (listing) =>
          !listing.readiness.ready &&
          !['ARCHIVED', 'WITHDRAWN'].includes(listing.status),
      ).length,
      draft: listings.filter((listing) => listing.status === 'DRAFT').length,
      published: listings.filter((listing) => listing.status === 'PUBLISHED')
        .length,
      ready: listings.filter((listing) => listing.status === 'READY').length,
    }),
    [listings],
  );

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
    if (nextFilters.operationType)
      query.set('operationType', nextFilters.operationType);
    const supportQuery = new URLSearchParams({ organizationId });
    const [listingResponse, propertyResponse, mandateResponse, userResponse] =
      await Promise.all([
        apiFetch<ListingsResponse>(`/listings?${query.toString()}`),
        apiFetch<PropertiesResponse>(`/properties?${supportQuery.toString()}`),
        apiFetch<MandatesResponse>(`/mandates?${supportQuery.toString()}`),
        apiFetch<UsersResponse>(`/users?${supportQuery.toString()}`),
      ]);
    setListings(listingResponse.listings);
    setProperties(propertyResponse.properties);
    setMandates(mandateResponse.mandates);
    setUsers(userResponse.users);
    setSelectedListingId((current) =>
      current && listingResponse.listings.some((item) => item.id === current)
        ? current
        : (listingResponse.listings[0]?.id ?? null),
    );
    setIsLoading(false);
  }

  async function refreshDetail(
    listingId: string,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) return;
    setIsDetailLoading(true);
    setDetailError(null);
    const query = new URLSearchParams({ organizationId });
    const [detailResponse, historyResponse] = await Promise.all([
      apiFetch<ListingDetailResponse>(
        `/listings/${listingId}?${query.toString()}`,
      ),
      apiFetch<ListingHistoryResponse>(
        `/listings/${listingId}/history?${query.toString()}`,
      ),
    ]);
    setDetail(detailResponse.listing);
    setHistory(historyResponse.events);
    setIsDetailLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      operationType: stringValue(form, 'operationType') ?? '',
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? '',
    });
  }

  async function submitListing(
    event: FormEvent<HTMLFormElement>,
    mode: 'create' | 'edit',
  ) {
    event.preventDefault();
    if (!activeOrganizationId || !canCreate) return;
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    try {
      const payload = listingPayload(
        form,
        activeOrganizationId,
        user?.id,
        mode,
      );
      const response = await apiFetch<ListingDetailResponse>(
        mode === 'create' ? '/listings' : `/listings/${detail?.id}`,
        {
          body: JSON.stringify(payload),
          method: mode === 'create' ? 'POST' : 'PATCH',
        },
      );
      setIsCreateOpen(false);
      setIsEditOpen(false);
      setSelectedListingId(response.listing.id);
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(response.listing.id, activeOrganizationId);
    } catch (caught) {
      setFormError(errorMessage(caught, 'No se pudo guardar la publicación.'));
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
      const response = await apiFetch<ListingDetailResponse>(
        `/listings/${detail.id}/transitions`,
        {
          body: JSON.stringify({
            action: activeAction,
            idempotencyKey: idempotencyKey(activeAction.toLowerCase()),
            organizationId: activeOrganizationId,
            reason: stringValue(form, 'reason'),
          }),
          method: 'POST',
        },
      );
      setActiveAction(null);
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(response.listing.id, activeOrganizationId);
    } catch (caught) {
      setFormError(errorMessage(caught, 'No se pudo completar la acción.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeOrganizationId || !detail || !materialMode) return;
    setIsSubmitting(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    form.set('organizationId', activeOrganizationId);
    form.set('idempotencyKey', idempotencyKey('material'));
    if (materialMode.kind === 'replace') {
      form.set('change', 'REPLACE');
    }
    if (!(form.get('file') as File)?.size) form.delete('file');
    try {
      await apiFetchFormData(
        materialMode.kind === 'add'
          ? `/listings/${detail.id}/materials`
          : `/listings/${detail.id}/materials/${materialMode.material.id}`,
        form,
        materialMode.kind === 'add' ? 'POST' : 'PATCH',
      );
      setMaterialMode(null);
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(detail.id, activeOrganizationId);
    } catch (caught) {
      setFormError(errorMessage(caught, 'No se pudo guardar el material.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeMaterial(
    material: ListingMaterial,
    change: 'ARCHIVE' | 'REORDER',
    sortOrder?: number,
  ) {
    if (!activeOrganizationId || !detail) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/listings/${detail.id}/materials/${material.id}`, {
        body: JSON.stringify({
          change,
          idempotencyKey: idempotencyKey(`material-${change.toLowerCase()}`),
          organizationId: activeOrganizationId,
          reason:
            change === 'ARCHIVE'
              ? 'Material archivado desde el workspace.'
              : detail.status === 'READY'
                ? 'Orden de materiales actualizado desde el workspace.'
                : undefined,
          sortOrder,
        }),
        method: 'PATCH',
      });
      await refreshWorkspace(activeOrganizationId, filters);
      await refreshDetail(detail.id, activeOrganizationId);
    } catch (caught) {
      setDetailError(errorMessage(caught, 'No se pudo cambiar el material.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function previewMaterial(material: ListingMaterial) {
    if (!activeOrganizationId || !detail) return;
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try {
      const query = new URLSearchParams({
        organizationId: activeOrganizationId,
      });
      const response = await apiFetch<{ url: string }>(
        `/listings/${detail.id}/materials/${material.id}/preview?${query.toString()}`,
      );
      if (popup) popup.location.href = response.url;
      else window.location.assign(response.url);
    } catch (caught) {
      popup?.close();
      setDetailError(errorMessage(caught, 'Preview no disponible.'));
    }
  }

  function openAction(action: ListingWorkspaceAction) {
    setFormError(null);
    if (action === 'EDIT') setIsEditOpen(true);
    else if (action === 'ADD_MATERIAL') setMaterialMode({ kind: 'add' });
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
              Nueva publicación
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
            ? `Preparación comercial de ${activeMembership.organizationName}.`
            : 'Copy, materiales, readiness y publicación interna por organización.'
        }
        eyebrow="Preparación comercial"
        title="Publicaciones"
      />

      <section
        className="summary-strip listing-summary"
        aria-label="Resumen de publicaciones"
      >
        <div>
          <span>Total</span>
          <strong>{listings.length}</strong>
        </div>
        <div>
          <span>Borradores</span>
          <strong>{metrics.draft}</strong>
        </div>
        <div>
          <span>Listas</span>
          <strong>{metrics.ready}</strong>
        </div>
        <div>
          <span>Publicadas</span>
          <strong>{metrics.published}</strong>
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
              id="listings-organization"
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
            aria-label="Buscar publicación"
            defaultValue={filters.search}
            name="search"
            placeholder="Título, propiedad o código"
          />
          <Select
            id="listings-operation"
            label="Modalidad"
            labelHidden
            name="operationType"
            defaultValue={filters.operationType}
          >
            <option value="">Todas las modalidades</option>
            <option value="SALE">Venta</option>
            <option value="RENT">Alquiler</option>
          </Select>
          <Select
            id="listings-status"
            label="Estado"
            labelHidden
            name="status"
            defaultValue={filters.status}
          >
            <option value="">Todos los estados</option>
            {listingStatuses.map((status) => (
              <option key={status} value={status}>
                {listingStatusLabel(status)}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      <section className="dashboard-grid listing-workspace-grid">
        {isLoading ? (
          <LoadingState
            title="Cargando publicaciones"
            description="Consultando preparación comercial."
          />
        ) : error ? (
          <ErrorState
            title="No se pudieron cargar las publicaciones"
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
              { key: 'listing', label: 'Publicación' },
              { key: 'operation', label: 'Modalidad' },
              { key: 'status', label: 'Estado' },
              { key: 'readiness', label: 'Readiness' },
              { key: 'amount', label: 'Precio' },
              { key: 'actions', label: 'Detalle' },
            ]}
            empty={
              <EmptyState
                action={
                  canCreate ? (
                    <Button icon={Plus} onClick={() => setIsCreateOpen(true)}>
                      Crear primera publicación
                    </Button>
                  ) : undefined
                }
                description="Crea un borrador separado para venta o alquiler y completa su preparación."
                icon={Megaphone}
                title="Sin publicaciones"
              />
            }
            rows={listings.map((listing) => ({
              id: listing.id,
              cells: {
                actions: (
                  <button
                    className={
                      listing.id === selectedListingId
                        ? 'table-action active'
                        : 'table-action'
                    }
                    onClick={() => setSelectedListingId(listing.id)}
                    type="button"
                  >
                    <Eye size={15} /> Ver
                  </button>
                ),
                amount: listingAmount(listing),
                listing: (
                  <span>
                    <strong className="entity-title">{listing.title}</strong>
                    <span className="meta-row">{listing.property.title}</span>
                  </span>
                ),
                operation:
                  listing.operationType === 'SALE' ? 'Venta' : 'Alquiler',
                readiness: (
                  <StatusBadge
                    tone={listing.readiness.ready ? 'success' : 'warning'}
                  >
                    {listing.readiness.ready
                      ? 'Listo'
                      : `${listing.readiness.blockers.length} pendiente(s)`}
                  </StatusBadge>
                ),
                status: (
                  <StatusBadge tone={listingStatusTone(listing.status)}>
                    {listingStatusLabel(listing.status)}
                  </StatusBadge>
                ),
              },
            }))}
          />
        )}

        <SectionPanel
          title="Preparación operativa"
          description="Readiness, materiales, acciones e historial de la publicación seleccionada."
        >
          {isDetailLoading ? (
            <LoadingState
              title="Cargando preparación"
              description="Consultando materiales e historial."
            />
          ) : detailError ? (
            <ErrorState
              title="Detalle no disponible"
              description={detailError}
              action={
                selectedListingId ? (
                  <Button
                    onClick={() => refreshDetail(selectedListingId)}
                    variant="secondary"
                  >
                    Reintentar
                  </Button>
                ) : undefined
              }
            />
          ) : detail ? (
            <ListingDetailPanel
              actions={actions}
              history={history}
              isSubmitting={isSubmitting}
              listing={detail}
              onAction={openAction}
              onArchiveMaterial={(material) =>
                changeMaterial(material, 'ARCHIVE')
              }
              onMoveMaterial={(material, direction) =>
                changeMaterial(
                  material,
                  'REORDER',
                  Math.max(0, material.sortOrder + direction),
                )
              }
              onPreviewMaterial={previewMaterial}
              onReplaceMaterial={(material) =>
                setMaterialMode({ kind: 'replace', material })
              }
            />
          ) : (
            <EmptyState
              icon={Megaphone}
              title="Sin publicación seleccionada"
              description="Selecciona una publicación para revisar su preparación."
            />
          )}
        </SectionPanel>
      </section>

      <FormDrawer
        description="El alta crea siempre un borrador separado para venta o alquiler."
        footer={
          <DrawerFooter
            form="listing-create-form"
            loading={isSubmitting}
            onCancel={() => setIsCreateOpen(false)}
            submitLabel="Crear borrador"
          />
        }
        onClose={() => setIsCreateOpen(false)}
        open={isCreateOpen && canCreate}
        title="Nueva publicación"
      >
        <ListingForm
          currentUserId={user?.id}
          error={formError}
          formId="listing-create-form"
          mandates={mandates}
          onSubmit={(event) => submitListing(event, 'create')}
          properties={availableProperties}
          users={users}
        />
      </FormDrawer>

      <FormDrawer
        description="Editar una publicación lista la devuelve a borrador y exige motivo."
        footer={
          <DrawerFooter
            form="listing-edit-form"
            loading={isSubmitting}
            onCancel={() => setIsEditOpen(false)}
            submitLabel="Guardar preparación"
          />
        }
        onClose={() => setIsEditOpen(false)}
        open={isEditOpen && Boolean(detail)}
        title="Editar preparación"
      >
        {detail ? (
          <ListingForm
            current={detail}
            currentUserId={user?.id}
            error={formError}
            formId="listing-edit-form"
            mandates={mandates}
            onSubmit={(event) => submitListing(event, 'edit')}
            properties={availableProperties}
            users={users}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        description={activeAction ? actionDescription(activeAction) : ''}
        footer={
          <DrawerFooter
            form="listing-action-form"
            loading={isSubmitting}
            onCancel={() => setActiveAction(null)}
            submitLabel={
              activeAction ? listingActionLabel(activeAction) : 'Confirmar'
            }
          />
        }
        onClose={() => setActiveAction(null)}
        open={Boolean(activeAction && detail)}
        title={activeAction ? listingActionLabel(activeAction) : 'Acción'}
      >
        <form
          className="drawer-form"
          id="listing-action-form"
          onSubmit={submitAction}
        >
          <section className="form-section">
            <Textarea
              id="listing-action-reason"
              label="Motivo"
              name="reason"
              required={Boolean(
                activeAction && reasonRequiredActions.has(activeAction),
              )}
              placeholder="Deja una razón clara para el historial."
            />
            {formError ? <p className="form-error">{formError}</p> : null}
          </section>
        </form>
      </FormDrawer>

      <FormDrawer
        description="Los binarios permanecen privados; las imágenes y PDFs se validan antes de guardar."
        footer={
          <DrawerFooter
            form="listing-material-form"
            loading={isSubmitting}
            onCancel={() => setMaterialMode(null)}
            submitLabel={
              materialMode?.kind === 'replace'
                ? 'Reemplazar material'
                : 'Agregar material'
            }
          />
        }
        onClose={() => setMaterialMode(null)}
        open={Boolean(materialMode && detail)}
        title={
          materialMode?.kind === 'replace'
            ? 'Reemplazar material'
            : 'Nuevo material'
        }
      >
        <MaterialForm
          error={formError}
          listingStatus={detail?.status}
          mode={materialMode}
          onSubmit={submitMaterial}
        />
      </FormDrawer>
    </>
  );
}

function ListingDetailPanel({
  actions,
  history,
  isSubmitting,
  listing,
  onAction,
  onArchiveMaterial,
  onMoveMaterial,
  onPreviewMaterial,
  onReplaceMaterial,
}: {
  actions: ListingWorkspaceAction[];
  history: ListingHistoryEvent[];
  isSubmitting: boolean;
  listing: OperationalListing;
  onAction: (action: ListingWorkspaceAction) => void;
  onArchiveMaterial: (material: ListingMaterial) => void;
  onMoveMaterial: (material: ListingMaterial, direction: number) => void;
  onPreviewMaterial: (material: ListingMaterial) => void;
  onReplaceMaterial: (material: ListingMaterial) => void;
}) {
  const canChangeMaterials = actions.includes('ADD_MATERIAL');
  return (
    <div className="listing-detail-stack">
      <div className="split-row">
        <span>
          <strong className="entity-title">{listing.title}</strong>
          <span className="meta-row">
            {listing.property.title} ·{' '}
            {listing.operationType === 'SALE' ? 'Venta' : 'Alquiler'}
          </span>
        </span>
        <StatusBadge tone={listingStatusTone(listing.status)}>
          {listingStatusLabel(listing.status)}
        </StatusBadge>
      </div>
      <div
        className={
          listing.readiness.ready
            ? 'readiness-card ready'
            : 'readiness-card blocked'
        }
      >
        <div className="split-row">
          <strong>
            {listing.readiness.ready
              ? 'Preparación completa'
              : 'Preparación bloqueada'}
          </strong>
          <StatusBadge tone={listing.readiness.ready ? 'success' : 'warning'}>
            {listing.readiness.ready
              ? 'Listo'
              : `${listing.readiness.blockers.length} pendiente(s)`}
          </StatusBadge>
        </div>
        {listing.readiness.blockers.length > 0 ? (
          <ul>
            {listing.readiness.blockers.map((blocker) => (
              <li key={`${blocker.scope}-${blocker.code}`}>
                {listingBlockerLabel(blocker)}
              </li>
            ))}
          </ul>
        ) : (
          <p>La publicación puede avanzar a revisión humana.</p>
        )}
      </div>
      <div className="listing-facts">
        <span>
          <small>Mandato</small>
          <strong>
            {listing.mandate
              ? `${mandateTypeLabel(listing.mandate.type)} · ${listing.mandate.status}`
              : 'Pendiente'}
          </strong>
        </span>
        <span>
          <small>Canales</small>
          <strong>{listing.channels.join(', ') || 'Sin seleccionar'}</strong>
        </span>
        <span>
          <small>Responsable</small>
          <strong>
            {listing.assignedUser
              ? `${listing.assignedUser.firstName} ${listing.assignedUser.lastName ?? ''}`.trim()
              : 'Sin asignar'}
          </strong>
        </span>
      </div>
      <div className="row-actions listing-actions">
        {actions.map((action) => (
          <Button
            icon={actionIcon(action)}
            key={action}
            onClick={() => onAction(action)}
            variant={
              action === 'WITHDRAW' || action === 'ARCHIVE'
                ? 'danger'
                : action === 'EDIT' || action === 'ADD_MATERIAL'
                  ? 'secondary'
                  : 'primary'
            }
          >
            {listingActionLabel(action)}
          </Button>
        ))}
      </div>
      <section>
        <div className="split-row">
          <span>
            <strong className="entity-title">Materiales</strong>
            <span className="meta-row">Portada, galería, planos y video</span>
          </span>
          <StatusBadge tone={listing.materials.length ? 'primary' : 'warning'}>
            {listing.materials.length}
          </StatusBadge>
        </div>
        <div className="compact-list listing-material-list">
          {listing.materials.length ? (
            listing.materials.map((material) => (
              <div className="split-row" key={material.id}>
                <span>
                  <strong className="entity-title">{material.name}</strong>
                  <span className="meta-row">
                    {materialTypeLabel(material.type)} · orden{' '}
                    {material.sortOrder}
                  </span>
                </span>
                <div className="row-actions">
                  <Button
                    disabled={isSubmitting}
                    onClick={() => onPreviewMaterial(material)}
                    variant="secondary"
                  >
                    Ver
                  </Button>
                  {canChangeMaterials ? (
                    <>
                      <Button
                        aria-label="Subir material"
                        disabled={isSubmitting || material.sortOrder === 0}
                        icon={ArrowUp}
                        onClick={() => onMoveMaterial(material, -1)}
                        variant="secondary"
                      />
                      <Button
                        aria-label="Bajar material"
                        disabled={isSubmitting}
                        icon={ArrowDown}
                        onClick={() => onMoveMaterial(material, 1)}
                        variant="secondary"
                      />
                      <Button
                        disabled={isSubmitting}
                        onClick={() => onReplaceMaterial(material)}
                        variant="secondary"
                      >
                        Reemplazar
                      </Button>
                      <Button
                        aria-label="Archivar material"
                        disabled={isSubmitting}
                        icon={Trash2}
                        onClick={() => onArchiveMaterial(material)}
                        variant="danger"
                      />
                    </>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="meta-row">
              Agrega una portada para iniciar el readiness comercial.
            </p>
          )}
        </div>
      </section>
      <section>
        <div className="split-row">
          <span>
            <strong className="entity-title">Historial</strong>
            <span className="meta-row">
              Eventos auditados en orden cronológico
            </span>
          </span>
          <History size={18} />
        </div>
        <div className="compact-list">
          {history.length ? (
            [...history].reverse().map((event) => (
              <div className="split-row" key={event.id}>
                <span>
                  <strong className="entity-title">
                    {listingEventLabel(event.action)}
                  </strong>
                  <span className="meta-row">
                    {event.actorUser?.email ?? 'Sistema'} ·{' '}
                    {formatDateTime(event.createdAt)}
                  </span>
                  {event.reason ? (
                    <span className="meta-row">{event.reason}</span>
                  ) : null}
                </span>
                <StatusBadge tone={listingStatusTone(event.toStatus)}>
                  {listingStatusLabel(event.toStatus)}
                </StatusBadge>
              </div>
            ))
          ) : (
            <p className="meta-row">Sin eventos registrados.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function ListingForm({
  current,
  currentUserId,
  error,
  formId,
  mandates,
  onSubmit,
  properties,
  users,
}: {
  current?: OperationalListing;
  currentUserId?: string;
  error: string | null;
  formId: string;
  mandates: OperationalMandate[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  properties: OrganizationProperty[];
  users: OrganizationUser[];
}) {
  const [propertyId, setPropertyId] = useState(current?.propertyId ?? '');
  const [operationType, setOperationType] = useState(
    current?.operationType ?? 'SALE',
  );
  const compatibleMandates = mandates.filter(
    (mandate) =>
      mandate.propertyId === propertyId &&
      (mandate.type === operationType || mandate.type === 'BOTH'),
  );
  return (
    <form className="drawer-form" id={formId} onSubmit={onSubmit}>
      <section className="form-section">
        <div className="form-grid two">
          <Select
            id={`${formId}-property`}
            label="Propiedad"
            name="propertyId"
            onChange={(event) => setPropertyId(event.target.value)}
            value={propertyId}
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
          <Select
            id={`${formId}-operation`}
            label="Modalidad"
            name="operationType"
            onChange={(event) =>
              setOperationType(event.target.value as 'SALE' | 'RENT')
            }
            value={operationType}
            required
          >
            <option value="SALE">Venta</option>
            <option value="RENT">Alquiler</option>
          </Select>
        </div>
        <Input
          id={`${formId}-title`}
          defaultValue={current?.title}
          label="Título comercial"
          name="title"
          minLength={5}
          required
        />
        <Textarea
          id={`${formId}-copy`}
          defaultValue={current?.publicCopy ?? ''}
          label="Texto público"
          name="publicCopy"
          placeholder="Describe la propuesta comercial con datos verificables."
        />
        <div className="form-grid two">
          <Select
            id={`${formId}-mandate`}
            defaultValue={current?.mandateId ?? ''}
            label="Mandato"
            name="mandateId"
          >
            <option value="">Sin mandato</option>
            {compatibleMandates.map((mandate) => (
              <option key={mandate.id} value={mandate.id}>
                {mandate.property.title} · {mandateTypeLabel(mandate.type)} ·{' '}
                {mandate.status}
              </option>
            ))}
          </Select>
          <Select
            id={`${formId}-assignee`}
            defaultValue={current?.assignedUserId ?? currentUserId ?? ''}
            label="Responsable"
            name="assignedUserId"
          >
            <option value="">Sin asignar</option>
            {users
              .filter((member) => member.membershipStatus === 'ACTIVE')
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName ?? ''}
                </option>
              ))}
          </Select>
        </div>
        <Input
          id={`${formId}-channels`}
          defaultValue={current?.channels.join(', ')}
          label="Canales"
          name="channels"
          placeholder="Sitio propio, Instagram, Portal manual"
        />
        <Textarea
          id={`${formId}-notes`}
          defaultValue={current?.notes ?? ''}
          label="Notas internas"
          name="notes"
        />
        {current?.status === 'READY' ? (
          <Textarea
            id={`${formId}-reason`}
            label="Motivo del cambio"
            name="reason"
            required
          />
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </form>
  );
}

function MaterialForm({
  error,
  listingStatus,
  mode,
  onSubmit,
}: {
  error: string | null;
  listingStatus?: ListingStatus;
  mode: MaterialMode | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const current = mode?.kind === 'replace' ? mode.material : null;
  const [type, setType] = useState(current?.type ?? 'COVER_IMAGE');
  return (
    <form
      className="drawer-form"
      id="listing-material-form"
      onSubmit={onSubmit}
    >
      <section className="form-section">
        <Select
          id="listing-material-type"
          label="Tipo"
          name="type"
          onChange={(event) =>
            setType(event.target.value as ListingMaterial['type'])
          }
          value={type}
        >
          <option value="COVER_IMAGE">Portada</option>
          <option value="GALLERY_IMAGE">Galería</option>
          <option value="FLOOR_PLAN">Plano</option>
          <option value="VIDEO_LINK">Enlace de video</option>
          <option value="OTHER">Otro</option>
        </Select>
        <Input
          id="listing-material-name"
          defaultValue={current?.name}
          label="Nombre"
          name="name"
          required
        />
        <Input
          id="listing-material-alt"
          defaultValue={current?.altText ?? ''}
          label="Texto alternativo"
          name="altText"
        />
        {type === 'VIDEO_LINK' ? (
          <Input
            id="listing-material-url"
            defaultValue={current?.externalUrl ?? ''}
            label="URL HTTPS"
            name="externalUrl"
            type="url"
            required
          />
        ) : (
          <Input
            accept={
              type === 'FLOOR_PLAN' || type === 'OTHER'
                ? 'image/jpeg,image/png,image/webp,application/pdf'
                : 'image/jpeg,image/png,image/webp'
            }
            id="listing-material-file"
            label="Archivo"
            name="file"
            type="file"
            required
          />
        )}
        <Input
          id="listing-material-order"
          defaultValue={current?.sortOrder ?? 0}
          label="Orden"
          min={0}
          name="sortOrder"
          type="number"
        />
        {mode?.kind === 'replace' || listingStatus === 'READY' ? (
          <Textarea
            id="listing-material-reason"
            label={
              mode?.kind === 'replace'
                ? 'Motivo del reemplazo'
                : 'Motivo del cambio'
            }
            name="reason"
            required
          />
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </form>
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
      <Button
        disabled={loading}
        onClick={onCancel}
        type="button"
        variant="secondary"
      >
        Cancelar
      </Button>
      <Button disabled={loading} form={form} type="submit">
        {loading ? 'Guardando' : submitLabel}
      </Button>
    </>
  );
}

function listingPayload(
  form: FormData,
  organizationId: string,
  currentUserId: string | undefined,
  mode: 'create' | 'edit',
) {
  const shared = stripEmpty({
    assignedUserId: stringValue(form, 'assignedUserId') ?? currentUserId,
    channels: splitList(stringValue(form, 'channels')),
    mandateId: stringValue(form, 'mandateId'),
    notes: stringValue(form, 'notes'),
    operationType: stringValue(form, 'operationType'),
    organizationId,
    publicCopy: stringValue(form, 'publicCopy'),
    title: stringValue(form, 'title'),
  });
  return mode === 'create'
    ? {
        ...shared,
        idempotencyKey: idempotencyKey('create-listing'),
        propertyId: requiredValue(form, 'propertyId'),
      }
    : {
        ...shared,
        idempotencyKey: idempotencyKey('edit-listing'),
        notes: rawString(form, 'notes'),
        publicCopy: rawString(form, 'publicCopy'),
        reason: stringValue(form, 'reason'),
      };
}

function listingAmount(listing: OperationalListing) {
  const amount =
    listing.operationType === 'SALE'
      ? listing.property.salePrice
      : listing.property.rentPrice;
  return amount === null
    ? 'Pendiente'
    : formatMoneyCents(String(amount * 100), listing.property.currency);
}

function actionDescription(action: ListingWorkspaceAction) {
  const descriptions: Record<ListingWorkspaceAction, string> = {
    ADD_MATERIAL: 'Agrega evidencia comercial privada.',
    APPROVE: 'Confirma la revisión humana del contenido.',
    ARCHIVE: 'Retira el registro de las vistas operativas.',
    DECLARE_READY: 'Revalida todos los bloqueantes antes de avanzar.',
    EDIT: 'Modifica la preparación.',
    PAUSE: 'Detiene temporalmente la oferta.',
    PUBLISH: 'Registra la publicación interna en los canales seleccionados.',
    RESUME: 'Revalida y devuelve la oferta a publicada.',
    RETURN_TO_DRAFT: 'Invalida la aprobación y permite correcciones.',
    WITHDRAW: 'Termina de forma definitiva esta operación comercial.',
  };
  return descriptions[action];
}

function actionIcon(action: ListingWorkspaceAction) {
  return (
    {
      ADD_MATERIAL: Upload,
      APPROVE: ShieldCheck,
      ARCHIVE: Archive,
      DECLARE_READY: CheckCircle2,
      EDIT: Pencil,
      PAUSE: Pause,
      PUBLISH: Send,
      RESUME: Play,
      RETURN_TO_DRAFT: RotateCcw,
      WITHDRAW: XCircle,
    } satisfies Record<ListingWorkspaceAction, typeof Pencil>
  )[action];
}

function materialTypeLabel(type: ListingMaterial['type']) {
  return (
    {
      COVER_IMAGE: 'Portada',
      FLOOR_PLAN: 'Plano',
      GALLERY_IMAGE: 'Galería',
      OTHER: 'Otro',
      VIDEO_LINK: 'Video',
    } satisfies Record<ListingMaterial['type'], string>
  )[type];
}

function stringValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
function rawString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
function requiredValue(form: FormData, key: string) {
  const value = stringValue(form, key);
  if (!value) throw new Error('Completa todos los campos obligatorios.');
  return value;
}
function splitList(value?: string) {
  return value
    ? [
        ...new Set(
          value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ]
    : [];
}
function stripEmpty<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== null && item !== '',
    ),
  );
}
function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const listingStatuses: ListingStatus[] = [
  'DRAFT',
  'READY',
  'APPROVED',
  'PUBLISHED',
  'PAUSED',
  'WITHDRAWN',
  'ARCHIVED',
];
const reasonRequiredActions = new Set<ListingWorkspaceAction>([
  'RETURN_TO_DRAFT',
  'PAUSE',
  'WITHDRAW',
  'ARCHIVE',
]);
