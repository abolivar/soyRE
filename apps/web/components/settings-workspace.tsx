'use client';

import { KeyRound, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, AuthUser } from '../lib/api';
import { activeMemberships } from './operational-format';
import {
  Button,
  ErrorState,
  Input,
  LoadingState,
  PageHeader,
  SectionPanel,
  Select,
  StatusBadge,
} from '@soyre/ui';

export function SettingsWorkspace() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    refreshSession().catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Sesion no disponible.');
      setIsLoading(false);
    });
  }, []);

  const organizations = useMemo(() => activeMemberships(user), [user]);
  const activeMembership = useMemo(
    () =>
      organizations.find(
        (membership) => membership.organizationId === activeOrganizationId,
      ) ??
      organizations[0] ??
      null,
    [activeOrganizationId, organizations],
  );

  async function refreshSession() {
    setIsLoading(true);
    setError(null);
    const response = await apiFetch<{ user: AuthUser }>('/auth/me');
    const memberships = activeMemberships(response.user);
    setUser(response.user);
    setActiveOrganizationId((current) => current ?? memberships[0]?.organizationId ?? null);
    setIsLoading(false);
  }

  return (
    <>
      <PageHeader
        actions={
          <Button icon={RefreshCcw} onClick={() => refreshSession()} variant="secondary">
            Actualizar
          </Button>
        }
        description={
          activeMembership
            ? `Reglas base de ${activeMembership.organizationName}.`
            : 'Reglas base de organizacion, acceso y operacion.'
        }
        eyebrow="Configuracion"
        title="Ajustes"
      />

      {isLoading ? (
        <LoadingState
          description="Consultando organizacion activa y permisos."
          title="Cargando ajustes"
        />
      ) : error ? (
        <ErrorState
          action={
            <Button icon={RefreshCcw} onClick={() => refreshSession()} variant="secondary">
              Reintentar
            </Button>
          }
          description={error}
          title="No se pudo cargar ajustes"
        />
      ) : (
        <section className="settings-grid">
          <SectionPanel
            title="Organizacion"
            description="Valores operativos que se usan como contexto del workspace."
          >
            <div className="compact-list">
              {organizations.length > 1 ? (
                <Select
                  id="settings-active-organization"
                  label="Organizacion activa"
                  onChange={(event) => setActiveOrganizationId(event.target.value)}
                  value={activeMembership?.organizationId ?? ''}
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
              <Input
                id="settings-public-name"
                label="Nombre publico"
                readOnly
                value={activeMembership?.organizationName ?? 'Sin organizacion activa'}
              />
              <Input
                id="settings-slug"
                label="Slug"
                readOnly
                value={activeMembership?.organizationSlug ?? 'sin-organizacion'}
              />
              <Select
                id="settings-timezone"
                label="Zona horaria"
                defaultValue="America/Panama"
              >
                <option value="America/Panama">America/Panama</option>
              </Select>
              <Select
                id="settings-currency"
                label="Moneda principal"
                defaultValue="USD"
              >
                <option value="USD">USD</option>
              </Select>
            </div>
          </SectionPanel>

          <div className="dashboard-columns">
            <SectionPanel
              title="Acceso"
              description="Politicas actuales para el sistema de validacion."
            >
              <div className="compact-list">
                <article className="setting-row">
                  <span className="avatar">
                    <ShieldCheck size={17} strokeWidth={2.2} />
                  </span>
                  <span>
                    <strong className="entity-title">Validacion manual</strong>
                    <span className="meta-row">
                      Owner o admin aprueban usuarios por membresia.
                    </span>
                  </span>
                  <StatusBadge tone="success">Activo</StatusBadge>
                </article>
                <article className="setting-row">
                  <span className="avatar">
                    <KeyRound size={17} strokeWidth={2.2} />
                  </span>
                  <span>
                    <strong className="entity-title">Password minimo</strong>
                    <span className="meta-row">10 caracteres en registro local.</span>
                  </span>
                  <StatusBadge tone="primary">Base</StatusBadge>
                </article>
              </div>
            </SectionPanel>

            <SectionPanel
              title="Defaults operativos"
              description="Valores disponibles hoy; persistencia editable queda para el bloque administrativo."
            >
              <div className="compact-list">
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Moneda</strong>
                    <span className="meta-row">USD como base para negocios y reportes.</span>
                  </span>
                  <StatusBadge tone="primary">USD</StatusBadge>
                </div>
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Zona horaria</strong>
                    <span className="meta-row">Fechas operativas en America/Panama.</span>
                  </span>
                  <StatusBadge tone="rent">Panama</StatusBadge>
                </div>
                <div className="split-row">
                  <span>
                    <strong className="entity-title">Persistencia</strong>
                    <span className="meta-row">
                      El bloque de administracion guardara estos valores.
                    </span>
                  </span>
                  <StatusBadge tone="warning">Pendiente</StatusBadge>
                </div>
              </div>
            </SectionPanel>
          </div>
        </section>
      )}
    </>
  );
}
