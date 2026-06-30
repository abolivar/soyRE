'use client';

import {
  Building2,
  CalendarDays,
  Eye,
  Home,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthMembership,
  AuthUser,
  ClientsResponse,
  CreatePropertyPayload,
  MembershipRole,
  OrganizationClient,
  OrganizationProperty,
  OrganizationUser,
  PropertiesResponse,
  PropertyDetailResponse,
  PropertyOperation,
  PropertyStatus,
  UsersResponse,
} from '../lib/api';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  FormDrawer,
  LoadingState,
  PageHeader,
  SectionPanel,
  StatusBadge,
  type Tone,
} from '@soyre/ui';

type PropertyFilters = {
  search: string;
  status: string;
  operation: string;
};

const propertyWriteRoles = new Set<MembershipRole>([
  'OWNER',
  'ADMIN',
  'BROKER',
  'AGENT',
  'OPERATIONS',
]);

const propertyTypeOptions = [
  'Apartamento',
  'Casa',
  'Local comercial',
  'Oficina',
  'Terreno',
  'Bodega',
  'Galera',
  'Finca',
  'Proyecto',
];

const amenityOptions = [
  'Piscina',
  'Gimnasio',
  'Area social',
  'Seguridad',
  'Planta electrica',
  'Linea blanca',
  'Deposito',
  'Vista al mar',
];

const statusTone: Record<PropertyStatus, Tone> = {
  ACTIVE: 'success',
  ARCHIVED: 'neutral',
  CLOSED: 'neutral',
  DRAFT: 'warning',
  PUBLISHED: 'primary',
  RESERVED: 'featured',
  UNDER_CONTRACT: 'rent',
  WITHDRAWN: 'danger',
};

export function PropertiesWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [properties, setProperties] = useState<OrganizationProperty[]>([]);
  const [ownerClients, setOwnerClients] = useState<OrganizationClient[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>(
    [],
  );
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  const [selectedPropertyDetail, setSelectedPropertyDetail] =
    useState<OrganizationProperty | null>(null);
  const [propertyToWithdraw, setPropertyToWithdraw] =
    useState<OrganizationProperty | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>({
    operation: '',
    search: '',
    status: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError(
            'No tienes una organizacion activa para consultar propiedades.',
          );
          setIsLoading(false);
          return;
        }

        setActiveOrganizationId(firstMembership.organizationId);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Sesion no disponible.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    refreshProperties(filters, activeOrganizationId).catch((caught) => {
      setError(
        caught instanceof Error ? caught.message : 'Propiedades no disponibles.',
      );
      setIsLoading(false);
    });
    refreshSupportingData(activeOrganizationId).catch(() => {
      setOwnerClients([]);
      setOrganizationUsers([]);
    });
  }, [activeOrganizationId, filters]);

  useEffect(() => {
    if (!activeOrganizationId || !selectedPropertyId) {
      setSelectedPropertyDetail(null);
      setDetailError(null);
      return;
    }

    refreshPropertyDetail(selectedPropertyId, activeOrganizationId).catch(
      (caught) => {
        setDetailError(
          caught instanceof Error ? caught.message : 'Detalle no disponible.',
        );
        setIsDetailLoading(false);
      },
    );
  }, [activeOrganizationId, selectedPropertyId]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const canCreateProperties = activeMembership
    ? propertyWriteRoles.has(activeMembership.role)
    : false;
  const selectedPropertySummary = useMemo(
    () =>
      properties.find((property) => property.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  );
  const selectedProperty =
    selectedPropertyDetail?.id === selectedPropertyId
      ? selectedPropertyDetail
      : selectedPropertySummary;
  const metrics = useMemo(() => {
    const active = properties.filter((property) =>
      ['ACTIVE', 'PUBLISHED', 'RESERVED', 'UNDER_CONTRACT'].includes(
        property.status,
      ),
    ).length;
    const sale = properties.filter((property) =>
      property.operations.includes('SALE'),
    ).length;
    const rent = properties.filter((property) =>
      property.operations.includes('RENT'),
    ).length;

    return { active, rent, sale };
  }, [properties]);

  async function refreshProperties(
    nextFilters = filters,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      setProperties([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const query = new URLSearchParams({ organizationId });

    if (nextFilters.search) {
      query.set('search', nextFilters.search);
    }

    if (nextFilters.status) {
      query.set('status', nextFilters.status);
    }

    if (nextFilters.operation) {
      query.set('operation', nextFilters.operation);
    }

    const response = await apiFetch<PropertiesResponse>(
      `/properties?${query.toString()}`,
    );
    setProperties(response.properties);
    setSelectedPropertyId((current) =>
      current &&
      response.properties.some((property) => property.id === current)
        ? current
        : response.properties[0]?.id ?? null,
    );
    setIsLoading(false);
  }

  async function refreshSupportingData(organizationId: string) {
    const query = new URLSearchParams({ organizationId });
    const [clientsResponse, usersResponse] = await Promise.all([
      apiFetch<ClientsResponse>(`/clients?${query.toString()}`),
      apiFetch<UsersResponse>(`/users?${query.toString()}`),
    ]);
    setOwnerClients(
      clientsResponse.clients.filter((client) =>
        client.roles.some((role) => role === 'SELLER' || role === 'LESSOR'),
      ),
    );
    setOrganizationUsers(usersResponse.users);
  }

  async function refreshPropertyDetail(
    propertyId: string,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      return;
    }

    setIsDetailLoading(true);
    setSelectedPropertyDetail(null);
    setDetailError(null);
    const query = new URLSearchParams({ organizationId });
    const response = await apiFetch<PropertyDetailResponse>(
      `/properties/${propertyId}?${query.toString()}`,
    );
    setSelectedPropertyDetail(response.property);
    setIsDetailLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      operation: stringValue(form, 'operation') ?? '',
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? '',
    });
  }

  function openCreatePropertyDrawer() {
    setFormError(null);
    setIsDrawerOpen(true);
  }

  function closeCreatePropertyDrawer() {
    if (isSubmitting) {
      return;
    }

    setIsDrawerOpen(false);
    setFormError(null);
  }

  async function createProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!activeOrganizationId || !canCreateProperties) {
      setFormError('No tienes permiso para crear propiedades en esta organizacion.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        ...buildPropertyPayload(new FormData(event.currentTarget)),
        organizationId: activeOrganizationId,
      };
      const response = await apiFetch<PropertyDetailResponse>('/properties', {
        body: JSON.stringify(payload),
        method: 'POST',
      });
      setProperties((current) => [response.property, ...current]);
      setSelectedPropertyId(response.property.id);
      setSelectedPropertyDetail(response.property);
      setIsDrawerOpen(false);
      event.currentTarget.reset();
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo crear la propiedad.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function withdrawProperty() {
    if (!activeOrganizationId || !propertyToWithdraw) {
      return;
    }

    setIsWithdrawing(true);
    setWithdrawError(null);

    try {
      const response = await apiFetch<PropertyDetailResponse>(
        `/properties/${propertyToWithdraw.id}/withdraw`,
        {
          body: JSON.stringify({
            organizationId: activeOrganizationId,
            reason: 'Retirada desde inventario web.',
          }),
          method: 'PATCH',
        },
      );
      setProperties((current) =>
        current.map((property) =>
          property.id === response.property.id ? response.property : property,
        ),
      );
      setSelectedPropertyDetail(response.property);
      setPropertyToWithdraw(null);
    } catch (caught) {
      setWithdrawError(
        caught instanceof Error
          ? caught.message
          : 'No se pudo retirar la propiedad.',
      );
    } finally {
      setIsWithdrawing(false);
    }
  }

  return (
    <>
      <PageHeader
        actions={
          <button
            className="button primary"
            disabled={!canCreateProperties}
            onClick={openCreatePropertyDrawer}
            type="button"
          >
            <Plus size={17} strokeWidth={2.2} />
            Nueva propiedad
          </button>
        }
        description={
          activeMembership
            ? `Inventario operativo de ${activeMembership.organizationName}.`
            : 'Activos inmobiliarios por organizacion, owner, modalidad y estado.'
        }
        eyebrow="Inventario"
        title="Propiedades"
      />

      <section className="summary-strip" aria-label="Resumen de propiedades">
        <div>
          <span>Total</span>
          <strong>{properties.length}</strong>
        </div>
        <div>
          <span>Activas</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Venta</span>
          <strong>{metrics.sale}</strong>
        </div>
        <div>
          <span>Alquiler</span>
          <strong>{metrics.rent}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <select
              aria-label="Organizacion"
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
            </select>
          ) : null}
          <label className="search-input">
            <Building2 size={17} strokeWidth={2.2} />
            <input
              aria-label="Buscar propiedad"
              defaultValue={filters.search}
              name="search"
              placeholder="Buscar propiedad, codigo, zona u owner"
            />
          </label>
          <select
            aria-label="Modalidad"
            defaultValue={filters.operation}
            name="operation"
          >
            <option value="">Todas las modalidades</option>
            <option value="SALE">Venta</option>
            <option value="RENT">Alquiler</option>
          </select>
          <select aria-label="Estado" defaultValue={filters.status} name="status">
            <option value="">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activa</option>
            <option value="PUBLISHED">Publicada</option>
            <option value="RESERVED">Reservada</option>
            <option value="UNDER_CONTRACT">En contrato</option>
            <option value="CLOSED">Cerrada</option>
            <option value="WITHDRAWN">Retirada</option>
          </select>
          <button className="button secondary" type="submit">
            Aplicar
          </button>
        </FilterBar>
      </form>

      <section className="dashboard-grid">
        {isLoading ? (
          <LoadingState
            description="Consultando inventario de la organizacion activa."
            title="Cargando propiedades"
          />
        ) : error ? (
          <ErrorState
            action={
              <button
                className="button secondary"
                onClick={() => refreshProperties()}
                type="button"
              >
                <RefreshCcw size={16} strokeWidth={2.2} />
                Reintentar
              </button>
            }
            description={error}
            title="No se pudo cargar propiedades"
          />
        ) : (
          <DataTable
            columns={[
              { key: 'property', label: 'Propiedad' },
              { key: 'location', label: 'Ubicacion' },
              { key: 'operation', label: 'Modalidad' },
              { key: 'price', label: 'Precio' },
              { key: 'status', label: 'Estado' },
              { key: 'owner', label: 'Owner' },
              { key: 'actions', label: 'Detalle' },
            ]}
            empty={
              <EmptyState
                action={
                  canCreateProperties ? (
                    <button
                      className="button primary"
                      onClick={openCreatePropertyDrawer}
                      type="button"
                    >
                      <Home size={17} strokeWidth={2.2} />
                      Crear primera propiedad
                    </button>
                  ) : undefined
                }
                description={
                  canCreateProperties
                    ? 'Crea la primera ficha con datos minimos, modalidad, precio y ubicacion para activar inventario.'
                    : 'Tu rol actual permite consultar inventario, pero no crear propiedades en esta organizacion.'
                }
                icon={Building2}
                title="Sin propiedades registradas"
              />
            }
            rows={properties.map((property) => ({
              cells: {
                actions: (
                  <div className="row-actions">
                    <button
                      className={
                        property.id === selectedPropertyId
                          ? 'table-action active'
                          : 'table-action'
                      }
                      onClick={() => setSelectedPropertyId(property.id)}
                      type="button"
                    >
                      <Eye size={15} strokeWidth={2.2} />
                      Ver
                    </button>
                    {canCreateProperties && property.status !== 'WITHDRAWN' ? (
                      <button
                        aria-label={`Retirar ${property.title}`}
                        className="icon-button"
                        onClick={() => setPropertyToWithdraw(property)}
                        title="Retirar propiedad"
                        type="button"
                      >
                        <Trash2 size={16} strokeWidth={2.2} />
                      </button>
                    ) : null}
                  </div>
                ),
                location: (
                  <span>
                    <span className="meta-row">
                      <MapPin size={14} strokeWidth={2.2} />
                      {[property.city, property.zone].filter(Boolean).join(' / ')}
                    </span>
                    <span className="meta-row">{property.country}</span>
                  </span>
                ),
                operation: (
                  <span className="badge-cluster">
                    {property.operations.map((operation) => (
                      <StatusBadge
                        key={operation}
                        tone={operation === 'SALE' ? 'primary' : 'rent'}
                      >
                        {operationLabel(operation)}
                      </StatusBadge>
                    ))}
                  </span>
                ),
                owner:
                  property.ownerClient?.displayName ??
                  assignedUserLabel(property) ??
                  'Sin owner',
                price: formatPropertyPrice(property),
                property: (
                  <span>
                    <strong className="entity-title">{property.title}</strong>
                    <span className="meta-row">
                      {property.internalCode ?? property.type}
                    </span>
                  </span>
                ),
                status: (
                  <StatusBadge tone={statusTone[property.status]}>
                    {statusLabel(property.status)}
                  </StatusBadge>
                ),
              },
              id: property.id,
            }))}
          />
        )}

        <SectionPanel
          description="Ficha de trabajo de la propiedad seleccionada, con owner, precios, dimensiones y datos de publicacion."
          title="Detalle operativo"
        >
          {isDetailLoading ? (
            <LoadingState
              description="Consultando ficha completa de la propiedad."
              title="Cargando detalle"
            />
          ) : detailError ? (
            <ErrorState
              action={
                selectedPropertyId ? (
                  <button
                    className="button secondary"
                    onClick={() => refreshPropertyDetail(selectedPropertyId)}
                    type="button"
                  >
                    <RefreshCcw size={16} strokeWidth={2.2} />
                    Reintentar
                  </button>
                ) : undefined
              }
              description={detailError}
              title="Detalle no disponible"
            />
          ) : selectedProperty ? (
            <PropertyDetailPanel property={selectedProperty} />
          ) : (
            <EmptyState
              description="Selecciona una propiedad para revisar su contexto operativo."
              icon={Building2}
              title="Sin propiedad seleccionada"
            />
          )}
        </SectionPanel>
      </section>

      <FormDrawer
        description="Crea una ficha inicial conectada a la organizacion activa. Los campos adicionales quedan disponibles sin saturar el alta."
        footer={
          <>
            <button
              className="button secondary"
              disabled={isSubmitting}
              onClick={closeCreatePropertyDrawer}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={isSubmitting}
              form="property-create-form"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} strokeWidth={2.2} />
                  Guardando...
                </>
              ) : (
                'Crear propiedad'
              )}
            </button>
          </>
        }
        onClose={closeCreatePropertyDrawer}
        open={isDrawerOpen && canCreateProperties}
        title="Nueva propiedad"
      >
        <form
          className="drawer-form"
          id="property-create-form"
          onSubmit={createProperty}
        >
          <section className="form-section">
            <div>
              <h3>Identificacion basica</h3>
              <p>Datos minimos para reconocer el activo en el inventario.</p>
            </div>
            <label>
              Nombre comercial
              <input
                name="title"
                placeholder="PH Costa Norte 1402"
                required
              />
            </label>
            <div className="form-grid two">
              <label>
                Tipo
                <select defaultValue="Apartamento" name="type" required>
                  {propertyTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Codigo interno
                <input name="internalCode" placeholder="SOY-PTY-001" />
              </label>
            </div>
            <div className="form-grid three">
              <label>
                Pais
                <input defaultValue="Panama" name="country" required />
              </label>
              <label>
                Ciudad
                <input name="city" placeholder="Panama" required />
              </label>
              <label>
                Zona
                <input name="zone" placeholder="Costa del Este" required />
              </label>
            </div>
          </section>

          <section className="form-section">
            <div>
              <h3>Operacion y precio</h3>
              <p>Selecciona venta, alquiler o ambas modalidades.</p>
            </div>
            <div className="option-grid">
              <label className="check-card">
                <input name="operations" type="checkbox" value="SALE" />
                <span>Venta</span>
              </label>
              <label className="check-card">
                <input name="operations" type="checkbox" value="RENT" />
                <span>Alquiler</span>
              </label>
            </div>
            <div className="form-grid three">
              <label>
                Precio venta
                <input min="0" name="salePrice" placeholder="420000" type="number" />
              </label>
              <label>
                Renta mensual
                <input min="0" name="rentPrice" placeholder="6800" type="number" />
              </label>
              <label>
                Moneda
                <input defaultValue="USD" name="currency" required />
              </label>
            </div>
          </section>

          <details className="form-collapsible">
            <summary>Asignacion y owner</summary>
            <div className="form-section">
              <div>
                <h3>Responsables internos</h3>
                <p>Conecta el activo con un usuario y un cliente propietario.</p>
              </div>
              <div className="form-grid two">
                <label>
                  Responsable
                  <select defaultValue="" name="assignedUserId">
                    <option value="">Usuario actual</option>
                    {organizationUsers.map((organizationUser) => (
                      <option key={organizationUser.id} value={organizationUser.id}>
                        {userLabel(organizationUser)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Propietario
                  <select defaultValue="" name="ownerClientId">
                    <option value="">Sin owner cliente</option>
                    {ownerClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-grid two">
                <label>
                  Estado inicial
                  <select defaultValue="DRAFT" name="status">
                    <option value="DRAFT">Borrador</option>
                    <option value="ACTIVE">Activa</option>
                    <option value="PUBLISHED">Publicada</option>
                    <option value="RESERVED">Reservada</option>
                  </select>
                </label>
                <label>
                  Fuente
                  <input name="source" placeholder="Referido, owner directo, portal" />
                </label>
              </div>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Ubicacion extendida</summary>
            <div className="form-section">
              <div>
                <h3>Direccion y referencia</h3>
                <p>Informacion util para visitas, publicaciones y documentos.</p>
              </div>
              <label>
                Direccion
                <input name="address" placeholder="Calle, referencia o direccion" />
              </label>
              <div className="form-grid two">
                <label>
                  Edificio o proyecto
                  <input name="buildingName" placeholder="PH Costa Norte" />
                </label>
                <label>
                  Unidad
                  <input name="unitNumber" placeholder="1402" />
                </label>
              </div>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Caracteristicas fisicas</summary>
            <div className="form-section">
              <div>
                <h3>Dimensiones y distribucion</h3>
                <p>Campos cuantitativos para busqueda, comparables y ficha comercial.</p>
              </div>
              <div className="form-grid three">
                <label>
                  Recamaras
                  <input min="0" name="bedrooms" type="number" />
                </label>
                <label>
                  Banos
                  <input min="0" name="bathrooms" type="number" />
                </label>
                <label>
                  Parkings
                  <input min="0" name="parkingSpaces" type="number" />
                </label>
              </div>
              <div className="form-grid three">
                <label>
                  Area construida m2
                  <input min="0" name="builtArea" placeholder="120" type="number" />
                </label>
                <label>
                  Area terreno m2
                  <input min="0" name="lotArea" placeholder="300" type="number" />
                </label>
                <label>
                  Piso
                  <input min="0" name="floor" type="number" />
                </label>
              </div>
              <label>
                Ano de construccion
                <input min="1800" name="yearBuilt" placeholder="2020" type="number" />
              </label>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Condiciones comerciales</summary>
            <div className="form-section">
              <div>
                <h3>Gastos y disponibilidad</h3>
                <p>Condiciones que suelen cambiar por operacion o negociacion.</p>
              </div>
              <div className="form-grid three">
                <label>
                  Mantenimiento
                  <input min="0" name="maintenanceFee" placeholder="250" type="number" />
                </label>
                <label>
                  Deposito alquiler
                  <input min="0" name="rentalDeposit" placeholder="6800" type="number" />
                </label>
                <label>
                  Disponible desde
                  <input name="availableFrom" type="date" />
                </label>
              </div>
              <label>
                Condiciones
                <textarea
                  name="listingConditions"
                  placeholder="Exclusividad, disponibilidad, terminos de negociacion o restricciones."
                />
              </label>
            </div>
          </details>

          <details className="form-collapsible">
            <summary>Publicacion y notas</summary>
            <div className="form-section">
              <div>
                <h3>Descripcion y etiquetas</h3>
                <p>Contenido operativo para preparar canales sin publicar automaticamente.</p>
              </div>
              <div className="option-grid">
                {amenityOptions.map((amenity) => (
                  <label className="check-card" key={amenity}>
                    <input name="amenities" type="checkbox" value={amenity} />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
              <label>
                Descripcion publica
                <textarea
                  name="publicDescription"
                  placeholder="Descripcion comercial, atributos, entorno y beneficios."
                />
              </label>
              <label>
                Notas privadas
                <textarea
                  name="privateNotes"
                  placeholder="Contexto interno, owner, riesgos, pendientes o proximas acciones."
                />
              </label>
              <label>
                Tags
                <input name="tags" placeholder="VIP, inversion, familiar" />
              </label>
            </div>
          </details>

          {formError ? <p className="form-error">{formError}</p> : null}
        </form>
      </FormDrawer>

      <ConfirmDialog
        confirmLabel={isWithdrawing ? 'Retirando...' : 'Retirar'}
        description={
          propertyToWithdraw
            ? `La propiedad ${propertyToWithdraw.title} saldra del inventario activo y quedara marcada para auditoria.`
            : 'La propiedad saldra del inventario activo.'
        }
        onCancel={() => {
          if (!isWithdrawing) {
            setPropertyToWithdraw(null);
            setWithdrawError(null);
          }
        }}
        onConfirm={withdrawProperty}
        open={propertyToWithdraw !== null}
        title={withdrawError ?? 'Retirar propiedad'}
      />
    </>
  );
}

function PropertyDetailPanel({ property }: { property: OrganizationProperty }) {
  return (
    <div className="client-detail">
      <div className="detail-hero">
        <span>
          <strong>{property.title}</strong>
          <small>
            {[property.type, property.internalCode].filter(Boolean).join(' / ') ||
              'Ficha de propiedad'}
          </small>
        </span>
        <StatusBadge tone={statusTone[property.status]}>
          {statusLabel(property.status)}
        </StatusBadge>
      </div>

      <div className="detail-grid">
        <DetailField label="Modalidad" value={operationsLabel(property.operations)} />
        <DetailField label="Precio" value={formatPropertyPrice(property)} />
        <DetailField
          label="Ubicacion"
          value={[property.city, property.zone].filter(Boolean).join(' / ')}
        />
        <DetailField label="Pais" value={property.country} />
        <DetailField label="Owner cliente" value={property.ownerClient?.displayName ?? 'Pendiente'} />
        <DetailField label="Responsable" value={assignedUserLabel(property) ?? 'Pendiente'} />
        <DetailField label="Area construida" value={areaLabel(property.builtArea)} />
        <DetailField label="Area terreno" value={areaLabel(property.lotArea)} />
        <DetailField label="Recamaras" value={countLabel(property.bedrooms)} />
        <DetailField label="Banos" value={countLabel(property.bathrooms)} />
        <DetailField label="Parkings" value={countLabel(property.parkingSpaces)} />
        <DetailField label="Disponible" value={formatDate(property.availableFrom)} />
      </div>

      <div className="compact-list">
        <div className="split-row">
          <span>
            <strong className="entity-title">Direccion</strong>
            <span className="meta-row">
              {[
                property.address,
                property.buildingName,
                property.unitNumber,
              ]
                .filter(Boolean)
                .join(' / ') || 'Pendiente'}
            </span>
          </span>
          <MapPin size={17} strokeWidth={2.2} />
        </div>
        <div className="split-row">
          <span>
            <strong className="entity-title">Condiciones</strong>
            <span className="meta-row">
              {property.listingConditions ?? 'Sin condiciones registradas'}
            </span>
          </span>
          <WalletCards size={17} strokeWidth={2.2} />
        </div>
        <div className="split-row">
          <span>
            <strong className="entity-title">Actualizacion</strong>
            <span className="meta-row">{formatDateTime(property.updatedAt)}</span>
          </span>
          <CalendarDays size={17} strokeWidth={2.2} />
        </div>
      </div>

      <div className="detail-tags">
        {property.operations.map((operation) => (
          <StatusBadge
            key={operation}
            tone={operation === 'SALE' ? 'primary' : 'rent'}
          >
            {operationLabel(operation)}
          </StatusBadge>
        ))}
        {property.amenities.map((amenity) => (
          <StatusBadge key={amenity} tone="featured">
            {amenity}
          </StatusBadge>
        ))}
        {property.tags.map((tag) => (
          <StatusBadge key={tag} tone="neutral">
            {tag}
          </StatusBadge>
        ))}
      </div>

      {property.publicDescription || property.privateNotes ? (
        <div className="detail-notes">
          <strong>Notas</strong>
          {property.publicDescription ? <p>{property.publicDescription}</p> : null}
          {property.privateNotes ? <p>{property.privateNotes}</p> : null}
        </div>
      ) : null}
    </div>
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

function activeMemberships(user: AuthUser | null): AuthMembership[] {
  return (
    user?.memberships.filter(
      (membership) =>
        membership.status === 'ACTIVE' &&
        membership.organizationStatus === 'ACTIVE',
    ) ?? []
  );
}

function buildPropertyPayload(form: FormData): CreatePropertyPayload {
  const operations = form.getAll('operations').map(String) as PropertyOperation[];

  if (operations.length === 0) {
    throw new Error('Selecciona al menos una modalidad: venta o alquiler.');
  }

  const salePrice = numberValue(form, 'salePrice');
  const rentPrice = numberValue(form, 'rentPrice');

  if (operations.includes('SALE') && salePrice === undefined) {
    throw new Error('El precio de venta es requerido para propiedades en venta.');
  }

  if (operations.includes('RENT') && rentPrice === undefined) {
    throw new Error('La renta mensual es requerida para propiedades en alquiler.');
  }

  return compactPayload({
    address: stringValue(form, 'address'),
    amenities: form.getAll('amenities').map(String),
    assignedUserId: stringValue(form, 'assignedUserId'),
    availableFrom: stringValue(form, 'availableFrom'),
    bathrooms: numberValue(form, 'bathrooms'),
    bedrooms: numberValue(form, 'bedrooms'),
    buildingName: stringValue(form, 'buildingName'),
    builtArea: numberValue(form, 'builtArea'),
    city: stringValue(form, 'city'),
    country: stringValue(form, 'country'),
    currency: stringValue(form, 'currency')?.toUpperCase(),
    floor: numberValue(form, 'floor'),
    internalCode: stringValue(form, 'internalCode'),
    listingConditions: stringValue(form, 'listingConditions'),
    lotArea: numberValue(form, 'lotArea'),
    maintenanceFee: numberValue(form, 'maintenanceFee'),
    operations,
    ownerClientId: stringValue(form, 'ownerClientId'),
    parkingSpaces: numberValue(form, 'parkingSpaces'),
    privateNotes: stringValue(form, 'privateNotes'),
    publicDescription: stringValue(form, 'publicDescription'),
    rentalDeposit: numberValue(form, 'rentalDeposit'),
    rentPrice,
    salePrice,
    source: stringValue(form, 'source'),
    status: stringValue(form, 'status') as PropertyStatus | undefined,
    tags: csvValue(form, 'tags'),
    title: stringValue(form, 'title'),
    type: stringValue(form, 'type'),
    unitNumber: stringValue(form, 'unitNumber'),
    yearBuilt: numberValue(form, 'yearBuilt'),
    zone: stringValue(form, 'zone'),
  }) as CreatePropertyPayload;
}

function compactPayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return value !== undefined && value !== '';
    }),
  );
}

function stringValue(form: FormData, key: string) {
  const value = form.get(key);

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(form: FormData, key: string) {
  const value = stringValue(form, key);

  return value ? Number(value) : undefined;
}

function csvValue(form: FormData, key: string) {
  return (
    stringValue(form, key)
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

function userLabel(user: OrganizationUser) {
  return `${user.firstName} ${user.lastName ?? ''}`.trim() || user.email;
}

function assignedUserLabel(property: OrganizationProperty) {
  if (!property.assignedUser) {
    return null;
  }

  return `${property.assignedUser.firstName} ${
    property.assignedUser.lastName ?? ''
  }`.trim();
}

function operationLabel(operation: PropertyOperation) {
  return operation === 'SALE' ? 'Venta' : 'Alquiler';
}

function operationsLabel(operations: PropertyOperation[]) {
  return operations.map(operationLabel).join(' + ');
}

function statusLabel(status: PropertyStatus) {
  const labels: Record<PropertyStatus, string> = {
    ACTIVE: 'Activa',
    ARCHIVED: 'Archivada',
    CLOSED: 'Cerrada',
    DRAFT: 'Borrador',
    PUBLISHED: 'Publicada',
    RESERVED: 'Reservada',
    UNDER_CONTRACT: 'En contrato',
    WITHDRAWN: 'Retirada',
  };

  return labels[status];
}

function formatPropertyPrice(property: OrganizationProperty) {
  const parts = [];

  if (property.salePrice !== null) {
    parts.push(formatCurrency(property.salePrice, property.currency));
  }

  if (property.rentPrice !== null) {
    parts.push(`${formatCurrency(property.rentPrice, property.currency)} / mes`);
  }

  return parts.join(' + ') || 'Por definir';
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function areaLabel(value: number | null) {
  return value === null ? 'Pendiente' : `${value.toLocaleString('en-US')} m2`;
}

function countLabel(value: number | null) {
  return value === null ? 'Pendiente' : String(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Pendiente';
  }

  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-PA', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
