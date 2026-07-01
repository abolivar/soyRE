'use client';

import { ArrowUpRight, ClipboardCheck, ListChecks, Plus, RefreshCcw } from 'lucide-react';
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
  formatRelativeDue,
  operationLabel,
  operationTone,
  paymentStatusLabel,
  paymentStatusTone,
  scheduledActionLabel,
} from './operational-format';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  type Tone,
} from '@soyre/ui';

type PipelineFilters = {
  search: string;
  status: string;
  operationType: string;
};

type PipelineColumn = {
  title: string;
  tone: Tone;
  statuses: BusinessStatus[];
};

const statusOptions: Array<{ label: string; value: BusinessStatus }> = [
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Revision', value: 'PENDING_REVIEW' },
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
  { label: 'Cesion', value: 'ASSIGNMENT' },
  { label: 'Preventa', value: 'PRE_SALE' },
  { label: 'Separacion', value: 'SEPARATION' },
  { label: 'Otro', value: 'OTHER' },
];

const columns: PipelineColumn[] = [
  { title: 'Borrador', tone: 'neutral', statuses: ['DRAFT'] },
  {
    title: 'Revision',
    tone: 'warning',
    statuses: ['PENDING_REVIEW', 'APPROVED'],
  },
  {
    title: 'Contrato',
    tone: 'featured',
    statuses: ['CONTRACT_GENERATED', 'PENDING_SIGNATURE'],
  },
  { title: 'Activo', tone: 'success', statuses: ['ACTIVE'] },
  {
    title: 'Cierre',
    tone: 'rent',
    statuses: ['CLOSED', 'CANCELLED', 'REJECTED'],
  },
];

export function PipelineWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [filters, setFilters] = useState<PipelineFilters>({
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
          setError('No tienes una organizacion activa para consultar negocios.');
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
  const totals = useMemo(
    () => ({
      active: businesses.filter((business) => business.status === 'ACTIVE').length,
      open: businesses.filter(
        (business) =>
          !['CLOSED', 'CANCELLED', 'REJECTED'].includes(business.status),
      ).length,
      pendingSignature: businesses.filter(
        (business) => business.status === 'PENDING_SIGNATURE',
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
        eyebrow="Negocios"
        title="Funnel"
        description={
          activeMembership
            ? `Pipeline transaccional de ${activeMembership.organizationName}.`
            : 'Pipeline transaccional por organizacion.'
        }
        actions={
          <Button asChild icon={Plus}>
            <Link href="/businesses/new">Nuevo negocio</Link>
          </Button>
        }
      />

      <section className="summary-strip" aria-label="Resumen de negocios">
        <div>
          <span>Abiertos</span>
          <strong>{totals.open}</strong>
        </div>
        <div>
          <span>Activos</span>
          <strong>{totals.active}</strong>
        </div>
        <div>
          <span>Firma</span>
          <strong>{totals.pendingSignature}</strong>
        </div>
        <div>
          <span>Monto</span>
          <strong>{formatMoneyCents(totals.totalAmountCents.toString())}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <Select
              id="pipeline-filter-organization"
              label="Organizacion"
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
            id="pipeline-filter-status"
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
            id="pipeline-filter-operation"
            label="Operacion"
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
          <Button variant="secondary" type="submit">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      {isLoading ? (
        <LoadingState
          description="Consultando negocios y siguientes acciones."
          title="Cargando funnel"
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
          title="No se pudo cargar el funnel"
        />
      ) : businesses.length === 0 ? (
        <EmptyState
          action={
            <Button asChild icon={ClipboardCheck}>
              <Link href="/businesses/new">Crear primer negocio</Link>
            </Button>
          }
          description="Crea un borrador o confirma una operacion para alimentar el pipeline."
          icon={ListChecks}
          title="Sin negocios en el filtro"
        />
      ) : (
        <section className="kanban-board" aria-label="Funnel comercial">
          {columns.map((column) => {
            const columnBusinesses = businesses.filter((business) =>
              column.statuses.includes(business.status),
            );

            return (
              <section className="kanban-column" key={column.title}>
                <div className="split-row">
                  <h2>{column.title}</h2>
                  <StatusBadge tone={column.tone}>{columnBusinesses.length}</StatusBadge>
                </div>
                {columnBusinesses.length > 0 ? (
                  columnBusinesses.map((business) => (
                    <article className="opportunity-card" key={business.id}>
                      <div className="split-row">
                        <strong>{business.title}</strong>
                        <StatusBadge tone={operationTone(business.operationType)}>
                          {operationLabel(business.operationType)}
                        </StatusBadge>
                      </div>
                      <span className="meta-row">
                        {business.clientName ?? 'Sin cliente'} /{' '}
                        {business.propertyTitle ?? 'Sin inmueble'}
                      </span>
                      <div className="split-row">
                        <StatusBadge tone={businessStatusTone(business.status)}>
                          {businessStatusLabel(business.status)}
                        </StatusBadge>
                        <strong>{formatMoneyCents(business.totalContractAmountCents)}</strong>
                      </div>
                      <span className="meta-row">
                        Cierre {formatDate(business.expectedClosingDate)}
                      </span>
                      {business.nextPayment ? (
                        <div className="split-row">
                          <span className="meta-row">
                            {business.nextPayment.label} /{' '}
                            {formatRelativeDue(business.nextPayment.dueDate)}
                          </span>
                          <StatusBadge
                            tone={paymentStatusTone(business.nextPayment.status)}
                          >
                            {paymentStatusLabel(business.nextPayment.status)}
                          </StatusBadge>
                        </div>
                      ) : null}
                      <div className="split-row">
                        <span className="meta-row">
                          {business.nextAction
                            ? scheduledActionLabel(business.nextAction.eventType)
                            : business.primaryAgentName ?? 'Sin siguiente accion'}
                        </span>
                        <Button asChild variant="ghost">
                          <Link href="/tasks">
                            <ArrowUpRight size={16} strokeWidth={2.2} />
                            SLA
                          </Link>
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <span className="meta-row">Sin negocios en esta etapa.</span>
                )}
              </section>
            );
          })}
        </section>
      )}
    </>
  );
}

function stringValue(form: FormData, field: string) {
  const value = form.get(field);

  return typeof value === 'string' ? value.trim() : null;
}
