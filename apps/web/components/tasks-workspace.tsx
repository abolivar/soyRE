'use client';

import { CheckCircle2, Clock, ListChecks, Plus, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  apiFetch,
  AuthUser,
  ScheduledActionStatus,
  ScheduledActionType,
  TaskDetailResponse,
  TaskListItem,
  TaskListResponse,
} from '../lib/api';
import {
  activeMemberships,
  businessStatusLabel,
  formatDateTime,
  formatRelativeDue,
  scheduledActionLabel,
  scheduledActionTone,
  scheduledStatusLabel,
} from './operational-format';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingState,
  PageHeader,
  SearchInput,
  SectionPanel,
  Select,
  StatusBadge,
} from '@soyre/ui';

type TaskFilters = {
  eventType: string;
  search: string;
  status: string;
};

const statusOptions: Array<{ label: string; value: ScheduledActionStatus }> = [
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Completadas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
  { label: 'Fallidas', value: 'FAILED' },
];

const eventOptions: Array<{ label: string; value: ScheduledActionType }> = [
  { label: 'Cobro programado', value: 'PAYMENT_DUE' },
  { label: 'Cobro vencido', value: 'PAYMENT_OVERDUE' },
  { label: 'Comision pendiente', value: 'COMMISSION_DUE' },
  { label: 'Revision contrato', value: 'CONTRACT_REVIEW_DUE' },
  { label: 'Firma pendiente', value: 'SIGNATURE_DUE' },
  { label: 'Documento requerido', value: 'DOCUMENT_REQUIRED' },
  { label: 'Aprobacion requerida', value: 'APPROVAL_REQUIRED' },
  { label: 'Accion', value: 'CUSTOM' },
];

export function TasksWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({
    eventType: '',
    search: '',
    status: 'PENDING',
  });
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const memberships = activeMemberships(response.user);
        const firstMembership = memberships[0];
        setUser(response.user);

        if (!firstMembership) {
          setError('No tienes una organizacion activa para consultar tareas.');
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

    refreshTasks(filters, activeOrganizationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Tareas no disponibles.');
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
      approvals: tasks.filter((task) => task.eventType === 'APPROVAL_REQUIRED')
        .length,
      documents: tasks.filter((task) => task.eventType === 'DOCUMENT_REQUIRED')
        .length,
      overdue: tasks.filter((task) => isOverdue(task)).length,
      total: tasks.length,
    }),
    [tasks],
  );

  async function refreshTasks(
    nextFilters = filters,
    organizationId = activeOrganizationId,
  ) {
    if (!organizationId) {
      setTasks([]);
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

    if (nextFilters.eventType) {
      query.set('eventType', nextFilters.eventType);
    }

    const response = await apiFetch<TaskListResponse>(`/tasks?${query.toString()}`);
    setTasks(response.tasks);
    setIsLoading(false);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilters({
      eventType: stringValue(form, 'eventType') ?? '',
      search: stringValue(form, 'search') ?? '',
      status: stringValue(form, 'status') ?? 'PENDING',
    });
  }

  async function completeTask(task: TaskListItem) {
    if (!activeOrganizationId) {
      return;
    }

    setUpdatingTaskId(task.id);
    setMutationError(null);

    try {
      const response = await apiFetch<TaskDetailResponse>(
        `/tasks/${task.id}/status`,
        {
          body: JSON.stringify({
            note: 'Completada desde el tablero operativo.',
            organizationId: activeOrganizationId,
            status: 'COMPLETED',
          }),
          method: 'PATCH',
        },
      );
      setTasks((current) =>
        filters.status === 'COMPLETED'
          ? current.map((item) =>
              item.id === response.task.id ? response.task : item,
            )
          : current.filter((item) => item.id !== response.task.id),
      );
    } catch (caught) {
      setMutationError(
        caught instanceof Error ? caught.message : 'No se pudo completar la tarea.',
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Trabajo diario"
        title="Tareas"
        description={
          activeMembership
            ? `Acciones programadas de ${activeMembership.organizationName}.`
            : 'Acciones programadas por negocio.'
        }
        actions={
          <Button asChild icon={Plus}>
            <Link href="/businesses/new">Nuevo negocio</Link>
          </Button>
        }
      />

      <section className="summary-strip" aria-label="Resumen de tareas">
        <div>
          <span>Total</span>
          <strong>{metrics.total}</strong>
        </div>
        <div>
          <span>Vencidas</span>
          <strong>{metrics.overdue}</strong>
        </div>
        <div>
          <span>Documentos</span>
          <strong>{metrics.documents}</strong>
        </div>
        <div>
          <span>Aprobaciones</span>
          <strong>{metrics.approvals}</strong>
        </div>
      </section>

      <form onSubmit={applyFilters}>
        <FilterBar>
          {organizations.length > 1 ? (
            <Select
              id="tasks-filter-organization"
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
            aria-label="Buscar tarea"
            defaultValue={filters.search}
            name="search"
            placeholder="Buscar negocio, cliente o inmueble"
          />
          <Select
            id="tasks-filter-status"
            label="Estado"
            labelHidden
            defaultValue={filters.status}
            name="status"
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>
          <Select
            id="tasks-filter-event"
            label="Tipo"
            labelHidden
            defaultValue={filters.eventType}
            name="eventType"
          >
            <option value="">Todos los tipos</option>
            {eventOptions.map((event) => (
              <option key={event.value} value={event.value}>
                {event.label}
              </option>
            ))}
          </Select>
          <Button variant="secondary" type="submit">
            Aplicar
          </Button>
        </FilterBar>
      </form>

      {mutationError ? (
        <ErrorState
          description={mutationError}
          title="No se pudo actualizar la tarea"
        />
      ) : null}

      <section className="dashboard-grid">
        {isLoading ? (
          <LoadingState
            description="Consultando acciones programadas de negocios."
            title="Cargando tareas"
          />
        ) : error ? (
          <ErrorState
            action={
              <Button
                icon={RefreshCcw}
                onClick={() => refreshTasks()}
                variant="secondary"
              >
                Reintentar
              </Button>
            }
            description={error}
            title="No se pudo cargar tareas"
          />
        ) : (
          <DataTable
            columns={[
              { key: 'task', label: 'Tarea' },
              { key: 'context', label: 'Contexto' },
              { key: 'owner', label: 'Owner' },
              { key: 'due', label: 'Vence' },
              { key: 'status', label: 'Estado' },
              { key: 'actions', label: 'Acciones' },
            ]}
            empty={
              <EmptyState
                description="No hay acciones programadas que coincidan con el filtro."
                icon={ListChecks}
                title="Sin tareas"
              />
            }
            rows={tasks.map((task) => ({
              id: task.id,
              cells: {
                actions:
                  task.status === 'PENDING' ? (
                    <Button
                      icon={CheckCircle2}
                      loading={updatingTaskId === task.id}
                      onClick={() => completeTask(task)}
                      variant="secondary"
                    >
                      Completar
                    </Button>
                  ) : (
                    <StatusBadge tone={scheduledActionTone(task.eventType, task.status)}>
                      {scheduledStatusLabel(task.status)}
                    </StatusBadge>
                  ),
                context: (
                  <span>
                    <strong className="entity-title">
                      {task.business.title}
                    </strong>
                    <span className="meta-row">
                      {task.business.clientName ?? 'Sin cliente'} /{' '}
                      {task.business.propertyTitle ?? 'Sin inmueble'}
                    </span>
                  </span>
                ),
                due: (
                  <span className="meta-row">
                    <Clock size={14} strokeWidth={2.2} />
                    {formatRelativeDue(task.scheduledFor)}
                  </span>
                ),
                owner: task.assignedToUser
                  ? `${task.assignedToUser.firstName} ${
                      task.assignedToUser.lastName ?? ''
                    }`.trim()
                  : 'Sin asignar',
                status: (
                  <StatusBadge tone={scheduledActionTone(task.eventType, task.status)}>
                    {businessStatusLabel(task.business.status)}
                  </StatusBadge>
                ),
                task: (
                  <span>
                    <strong className="entity-title">
                      {scheduledActionLabel(task.eventType)}
                    </strong>
                    <span className="meta-row">
                      {formatDateTime(task.scheduledFor)}
                    </span>
                  </span>
                ),
              },
            }))}
          />
        )}

        <SectionPanel
          title="Criterio de prioridad"
          description="Las acciones se ordenan por vencimiento y siempre mantienen relacion con un negocio."
        >
          <div className="compact-list">
            <div className="split-row">
              <span>
                <strong className="entity-title">Vencimiento</strong>
                <span className="meta-row">Hoy y vencidas suben en prioridad.</span>
              </span>
              <StatusBadge tone="warning">Base</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Contexto</strong>
                <span className="meta-row">Cliente, inmueble y negocio visibles.</span>
              </span>
              <StatusBadge tone="success">Regla</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Auditoria</strong>
                <span className="meta-row">Cada cierre queda en audit log.</span>
              </span>
              <StatusBadge tone="primary">Activo</StatusBadge>
            </div>
          </div>
        </SectionPanel>
      </section>
    </>
  );
}

function stringValue(form: FormData, field: string) {
  const value = form.get(field);

  return typeof value === 'string' ? value.trim() : null;
}

function isOverdue(task: TaskListItem) {
  if (task.status !== 'PENDING') {
    return false;
  }

  const dueDate = new Date(task.scheduledFor);

  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < Date.now();
}
