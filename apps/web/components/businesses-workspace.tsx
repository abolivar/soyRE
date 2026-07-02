'use client';

import { ClipboardCheck, Plus, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  BusinessesResponse,
  BusinessListItem,
  BusinessOperationType,
  BusinessStatus,
} from '../lib/api';
import {
  activeMemberships,
  businessStatusLabel,
  businessStatusTone,
  formatDate,
  formatMoneyCents,
  operationLabel,
  operationTone,
  paymentStatusLabel,
  paymentStatusTone,
  scheduledActionLabel,
} from './operational-format';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  ProgressMeter,
  SearchInput,
  Select,
  StatusBadge,
} from '@soyre/ui';

type BusinessFilters = {
  operationType: string;
  search: string;
  status: string;
};

const statusOptions: Array<{ label: string; value: BusinessStatus }> = [
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Revisión', value: 'PENDING_REVIEW' },
  { label: 'Aprobado', value: 'APPROVED' },
  { label: 'Contrato generado', value: 'CONTRACT_GENERATED' },
  { label: 'Firma pendiente', value: 'PENDING_SIGNATURE' },
  { label: 'Activo', value: 'ACTIVE' },
  { label: 'Cerrado', value: 'CLOSED' },
  { label: 'Cancelado', value: 'CANCELLED' },
  { label: 'Rechazado', value: 'REJECTED' },
];

const operationOptions: Array<{ label: string; value: BusinessOperationType }> = [
  { label: 'Venta', value: 'SALE' },
  { label: 'Alquiler', value: 'RENT' },
  { label: 'Reserva', value: 'RESERVATION' },
  { label: 'Cesión', value: 'ASSIGNMENT' },
  { label: 'Preventa', value: 'PRE_SALE' },
  { label: 'Separación', value: 'SEPARATION' },
  { label: 'Otro', value: 'OTHER' },
];

export function BusinessesWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [filters, setFilters] = useState<BusinessFilters>({
    operationType: '',
    search: '',
    status: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organización activa para consultar negocios.');
          setIsLoading(false);
          return;
        }

        setActiveOrganizationId(firstMembership.organizationId);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Sesión no disponible.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!activeOrganizationId) {
      return;
    }

    refreshBusinesses(filters, activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Negocios no disponibles.');
      setIsLoading(false);
    });
  }, [activeOrganizationId, filters]);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ?? null,
    [activeOrganizationId, organizations],
  );
  const metrics = useMemo(
    () => ({
      active: businesses.filter((business) => business.status === 'ACTIVE').length,
      draft: businesses.filter((business) => business.status === 'DRAFT').length,
      open: businesses.filter(
        (business) =>
          !['CLOSED', 'CANCELLED', 'REJECTED'].includes(business.status),
      ).length,
      totalAmountCents: businesses.reduce(
        (current, business) => current + BigInt(business.totalContractAmountCents),
        0n,
      ),
    }),
    [businesses],
  );

  async function refreshBusinesses(
    nextFilters = filters,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      setBusinesses([]);
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

    if (nextFilters.operationType) {
      query.set('operationType', nextFilters.operationType);
    }

    const response = await apiFetch<BusinessesResponse>(
      `/businesses?${query.toString()}`,
    );
    setBusinesses(response.businesses);
    setIsLoading(false);
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

  return (
    <>
      <PageHeader
        actions={
          <div className="row-actions">
            <Button asChild variant="secondary">
              <Link href="/pipeline">Ver funnel</Link>
            </Button>
            <Button asChild icon={Plus}>
              <Link href="/businesses/new">Nuevo negocio</Link>
            </Button>
          </div>
        }
        description={
          activeMembership
            ? `Listado transaccional de ${activeMembership.organizationName}.`
            : 'Listado transaccional por organización.'
        }
        eyebrow="Negocios"
        title="Negocios"
      />

      <section className="summary-strip" aria-label="Resumen de negocios">
        <div>
          <span>Abiertos</span>
          <strong>{metrics.open}</strong>
        </div>
        <div>
          <span>Borradores</span>
          <strong>{metrics.draft}</strong>
        </div>
        <div>
          <span>Activos</span>
          <strong>{metrics.active}</strong>
        </div>
        <div>
          <span>Monto</span>
          <strong>{formatMoneyCents(metrics.totalAmountCents.toString())}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <Select
              id="businesses-filter-organization"
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
            aria-label="Buscar negocio"
            defaultValue={filters.search}
            name="search"
            placeholder="Buscar negocio, cliente o inmueble"
          />
          <Select
            id="businesses-filter-status"
            label="Estado"
            labelHidden
            defaultValue={filters.status}
            name="status"
          >
            <option value="">Todos los estados</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Select
            id="businesses-filter-operation"
            label="Operación"
            labelHidden
            defaultValue={filters.operationType}
            name="operationType"
          >
            <option value="">Todas las operaciones</option>
            {operationOptions.map((operation) => (
              <option key={operation.value} value={operation.value}>
                {operation.label}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      {isLoading ? (
        <LoadingState
          description="Consultando negocios de la organización activa."
          title="Cargando negocios"
        />
      ) : error ? (
        <ErrorState
          action={
            <Button
              icon={RefreshCcw}
              onClick={() => refreshBusinesses()}
              variant="secondary"
            >
              Reintentar
            </Button>
          }
          description={error}
          title="No se pudo cargar negocios"
        />
      ) : (
        <DataTable
          columns={[
            { key: 'business', label: 'Negocio' },
            { key: 'client', label: 'Cliente' },
            { key: 'property', label: 'Inmueble' },
            { key: 'operation', label: 'Operación' },
            { key: 'status', label: 'Estado' },
            { key: 'progress', label: 'Avance' },
            { key: 'next', label: 'Próximo' },
            { key: 'amount', label: 'Monto' },
          ]}
          empty={
            <EmptyState
              action={
                <Button asChild icon={ClipboardCheck}>
                  <Link href="/businesses/new">Crear primer negocio</Link>
                </Button>
              }
              description="Crea un borrador o confirma una operación para alimentar esta vista."
              icon={ClipboardCheck}
              title="Sin negocios"
            />
          }
          rows={businesses.map((business) => {
            const continuationHref =
              business.status === 'DRAFT'
                ? `/businesses/new?draftId=${business.id}`
                : null;

            return {
              id: business.id,
              cells: {
                amount: formatMoneyCents(
                  business.totalContractAmountCents,
                  business.currency,
                ),
                business: continuationHref ? (
                  <Link className="entity-link" href={continuationHref}>
                    <strong className="entity-title">{business.title}</strong>
                    <span className="meta-row">{business.code} / continuar</span>
                  </Link>
                ) : (
                  <span>
                    <strong className="entity-title">{business.title}</strong>
                    <span className="meta-row">{business.code}</span>
                  </span>
                ),
                client: business.clientName ?? 'Sin cliente',
                next: business.nextPayment ? (
                  <span>
                    <strong className="entity-title">
                      {business.nextPayment.label}
                    </strong>
                    <span className="meta-row">
                      {formatDate(business.nextPayment.dueDate)}
                    </span>
                    <StatusBadge
                      tone={paymentStatusTone(business.nextPayment.status)}
                    >
                      {paymentStatusLabel(business.nextPayment.status)}
                    </StatusBadge>
                  </span>
                ) : business.nextAction ? (
                  scheduledActionLabel(business.nextAction.eventType)
                ) : business.status === 'DRAFT' ? (
                  'Continuar borrador'
                ) : (
                  'Sin siguiente acción'
                ),
                operation: (
                  <StatusBadge tone={operationTone(business.operationType)}>
                    {operationLabel(business.operationType)}
                  </StatusBadge>
                ),
                progress: (
                  <ProgressMeter
                    detail={
                      business.draftProgress.nextStepLabel
                        ? `Siguiente: ${business.draftProgress.nextStepLabel}`
                        : 'Completo'
                    }
                    label="Borrador"
                    size="sm"
                    value={business.draftProgress.percent}
                  />
                ),
                property: business.propertyTitle ?? 'Sin inmueble',
                status: (
                  <StatusBadge tone={businessStatusTone(business.status)}>
                    {businessStatusLabel(business.status)}
                  </StatusBadge>
                ),
              },
            };
          })}
        />
      )}
    </>
  );
}

function stringValue(form: FormData, field: string) {
  const value = form.get(field);

  return typeof value === 'string' ? value.trim() : null;
}
