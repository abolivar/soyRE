'use client';

import { FileText, Plus, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Select,
  StatusBadge,
} from '@soyre/ui';
import {
  activeMemberships,
  businessStatusLabel,
  businessStatusTone,
  operationLabel,
  operationTone,
} from './operational-format';
import {
  apiFetch,
  AuthUser,
  BusinessListItem,
  BusinessesResponse,
} from '../lib/api';

export function DocumentHubWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const memberships = useMemo(() => activeMemberships(user), [user]);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        const membership = activeMemberships(response.user)[0];
        setUser(response.user);
        if (!membership) throw new Error('No tienes una organización activa.');
        setOrganizationId(membership.organizationId);
      })
      .catch((caught) => {
        setError(errorMessage(caught));
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadBusinesses(organizationId);
  }, [organizationId]);

  async function loadBusinesses(nextOrganizationId: string) {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ organizationId: nextOrganizationId });
      const response = await apiFetch<BusinessesResponse>(
        `/businesses?${query.toString()}`,
      );
      setBusinesses(
        response.businesses.filter((business) => business.status !== 'DRAFT'),
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Expedientes"
        title="Expedientes de negocios"
        description="Selecciona una operación para completar, revisar y auditar su documentación."
        actions={
          <Button asChild icon={Plus}>
            <Link href="/businesses/new">Nuevo negocio</Link>
          </Button>
        }
      />

      {memberships.length > 1 ? (
        <div className="filter-bar">
          <Select
            id="document-hub-organization"
            label="Organización"
            onChange={(event) => setOrganizationId(event.target.value)}
            value={organizationId ?? ''}
          >
            {memberships.map((membership) => (
              <option
                key={membership.organizationId}
                value={membership.organizationId}
              >
                {membership.organizationName}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <LoadingState
          title="Cargando expedientes"
          description="Consultando los negocios de la organización activa."
        />
      ) : error ? (
        <ErrorState
          title="No se pudieron cargar los expedientes"
          description={error}
          action={
            organizationId ? (
              <Button
                icon={RefreshCcw}
                onClick={() => loadBusinesses(organizationId)}
                variant="secondary"
              >
                Reintentar
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={[
            { key: 'business', label: 'Negocio' },
            { key: 'client', label: 'Cliente' },
            { key: 'property', label: 'Inmueble' },
            { key: 'operation', label: 'Operación' },
            { key: 'status', label: 'Estado' },
            { key: 'action', label: '' },
          ]}
          empty={
            <EmptyState
              icon={FileText}
              title="No hay negocios con expediente"
              description="Confirma un negocio para comenzar su checklist documental."
              action={
                <Button asChild icon={Plus}>
                  <Link href="/businesses/new">Crear negocio</Link>
                </Button>
              }
            />
          }
          rows={businesses.map((business) => {
            const href = `/businesses/${business.id}/documents?organizationId=${business.organizationId}`;
            return {
              id: business.id,
              cells: {
                action: (
                  <Button asChild variant="secondary">
                    <Link href={href}>Abrir expediente</Link>
                  </Button>
                ),
                business: (
                  <Link className="entity-link" href={href}>
                    <strong className="entity-title">{business.title}</strong>
                    <span className="meta-row">{business.code}</span>
                  </Link>
                ),
                client: business.clientName ?? 'Sin cliente',
                operation: (
                  <StatusBadge tone={operationTone(business.operationType)}>
                    {operationLabel(business.operationType)}
                  </StatusBadge>
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

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la consulta.';
}
