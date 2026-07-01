import { Plus, ShieldCheck, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { userRows } from '../../../lib/demo-data';
import {
  Button,
  DataTable,
  FilterBar,
  PageHeader,
  SearchInput,
  SectionPanel,
  Select,
  StatusBadge,
} from '@soyre/ui';

export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sistema de acceso"
        title="Usuarios"
        description="Validacion, roles y acceso por organizacion. La conexion real queda sobre el API remoto cuando el backend este disponible."
        actions={
          <Button icon={Plus}>
            Invitar usuario
          </Button>
        }
      />

      <FilterBar>
        <SearchInput placeholder="Buscar usuario o email" />
        <Select
          id="users-filter-status"
          label="Estado de acceso"
          labelHidden
          defaultValue="all"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="pending">Pendientes</option>
          <option value="suspended">Suspendidos</option>
        </Select>
        <Select
          id="users-filter-role"
          label="Rol"
          labelHidden
          defaultValue="all"
        >
          <option value="all">Todos los roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="broker">Broker</option>
          <option value="operations">Operations</option>
        </Select>
      </FilterBar>

      <section className="dashboard-grid">
        <div className="dashboard-columns">
          <DataTable
            columns={[
              { key: 'user', label: 'Usuario' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Rol' },
              { key: 'access', label: 'Acceso' },
              { key: 'validation', label: 'Validacion' },
              { key: 'actions', label: 'Acciones' },
            ]}
            rows={userRows.map((user) => ({
              id: user.id,
              cells: {
                user: (
                  <span>
                    <strong className="entity-title">{user.name}</strong>
                    <span className="meta-row">SoyPMS Demo Realty</span>
                  </span>
                ),
                email: user.email,
                role: <StatusBadge tone="neutral">{user.role}</StatusBadge>,
                access: user.access,
                validation: (
                  <StatusBadge tone={user.tone}>{user.validation}</StatusBadge>
                ),
                actions: (
                  <div className="row-actions">
                    <Button variant="secondary">
                      Validar
                    </Button>
                    <Button variant="ghost">
                      Suspender
                    </Button>
                  </div>
                ),
              },
            }))}
          />
        </div>

        <SectionPanel
          title="Reglas activas"
          description="Politicas base para mantener controlado el acceso al workspace."
          actions={
            <Button asChild variant="secondary">
              <Link href="/settings">Ajustes</Link>
            </Button>
          }
        >
          <div className="role-list">
            <article className="role-item">
              <span className="avatar">
                <ShieldCheck size={17} strokeWidth={2.2} />
              </span>
              <span>
                <strong className="entity-title">Owner protegido</strong>
                <span className="meta-row">
                  No puede degradarse desde la tabla operativa.
                </span>
              </span>
              <StatusBadge tone="success">Activo</StatusBadge>
            </article>
            <article className="role-item">
              <span className="avatar">
                <UserCheck size={17} strokeWidth={2.2} />
              </span>
              <span>
                <strong className="entity-title">Validacion manual</strong>
                <span className="meta-row">
                  Usuarios nuevos entran pendientes hasta aprobacion.
                </span>
              </span>
              <StatusBadge tone="warning">Pendiente</StatusBadge>
            </article>
          </div>
        </SectionPanel>
      </section>
    </>
  );
}
