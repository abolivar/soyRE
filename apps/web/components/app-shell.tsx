'use client';

import {
  Bell,
  BarChart3,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  CheckSquare,
  DollarSign,
  FileText,
  Handshake,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  Megaphone,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  ScrollText,
  Send,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, AuthUser, PlatformAccessResponse } from '../lib/api';
import { activeMemberships } from './operational-format';
import { BrandLogo } from './brand-logo';
import { Button, SearchInput } from '@soyre/ui';

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresManager?: boolean;
};

const operationNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/businesses', label: 'Negocios', icon: BriefcaseBusiness },
  { href: '/pipeline', label: 'Funnel', icon: ListChecks },
  { href: '/properties', label: 'Propiedades', icon: Building2 },
  { href: '/clients', label: 'Clientes', icon: Users },
];

const managementNavigation: NavigationItem[] = [
  { href: '/agents', label: 'Agentes', icon: Handshake },
  { href: '/mandates', label: 'Mandatos', icon: Handshake },
  { href: '/listings', label: 'Publicaciones', icon: Megaphone },
  { href: '/showings', label: 'Visitas', icon: CalendarDays },
  { href: '/offers', label: 'Ofertas', icon: Send },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/documents', label: 'Documentos', icon: FileText },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
];

const financeNavigation: NavigationItem[] = [
  { href: '/receivables', label: 'Cobranza', icon: DollarSign },
  { href: '/commissions', label: 'Comisiones', icon: BriefcaseBusiness },
  { href: '/settlements', label: 'Liquidaciones', icon: Landmark },
];

const adminNavigation: NavigationItem[] = [
  { href: '/users', label: 'Usuarios', icon: ShieldCheck, requiresManager: true },
  { href: '/settings', label: 'Configuración', icon: Settings, requiresManager: true },
  { href: '/audit', label: 'Auditoría', icon: ScrollText, requiresManager: true },
];

const platformNavigation: NavigationItem[] = [
  { href: '/platform', label: 'Backoffice', icon: SlidersHorizontal },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [canAccessPlatform, setCanAccessPlatform] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    apiFetch<{ user: AuthUser }>('/auth/me')
      .then((response) => {
        setUser(response.user);

        return apiFetch<PlatformAccessResponse>('/platform/access')
          .then((access) => setCanAccessPlatform(access.platformAdmin))
          .catch(() => setCanAccessPlatform(false));
      })
      .catch(() => {
        setUser(null);
        setCanAccessPlatform(false);
      });
  }, []);

  const activeMembership = useMemo(() => activeMemberships(user)[0] ?? null, [user]);
  const isManager =
    activeMembership?.role === 'OWNER' || activeMembership?.role === 'ADMIN';

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="sidebar-brand" href="/dashboard">
          <BrandLogo decorative variant="seal" />
          <span className="brand-copy">
            <strong>SoyPMS</strong>
            <span>Espacio broker</span>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Navegación principal">
          <NavSection
            items={operationNavigation}
            label="Operación"
            pathname={pathname}
          />
          <NavSection
            items={managementNavigation}
            label="Gestión"
            pathname={pathname}
          />
          <NavSection
            items={financeNavigation}
            label="Finanzas"
            pathname={pathname}
          />
          {canAccessPlatform ? (
            <NavSection
              items={platformNavigation}
              label="SaaS"
              pathname={pathname}
            />
          ) : null}
          <NavSection
            canManage={isManager}
            items={adminNavigation}
            label="Sistema"
            pathname={pathname}
          />
        </nav>

        <div className="sidebar-footer">
          <span>Organización activa</span>
          <strong>{activeMembership?.organizationName ?? 'Sin sesión activa'}</strong>
          <span>
            {activeMembership
              ? `${formatRoleLabel(activeMembership.role)} / validación remota`
              : 'Validación remota activa'}
          </span>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-title">
            <strong>Centro operativo</strong>
            <span>Pipeline, inventario, clientes y control de acceso</span>
          </div>
          <SearchInput placeholder="Buscar propiedad, cliente o tarea" />
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Alertas">
              <Bell size={18} strokeWidth={2.2} />
            </button>
            <Button asChild variant="ghost">
              <Link href="/login">
                <LogOut size={17} strokeWidth={2.2} />
                Salir
              </Link>
            </Button>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

function NavSection({
  canManage = true,
  label,
  items,
  pathname,
}: {
  canManage?: boolean;
  label: string;
  items: NavigationItem[];
  pathname: string | null;
}) {
  return (
    <div className="app-nav-section">
      <span className="app-nav-label">{label}</span>
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname?.startsWith(item.href));
        const isDisabled = item.requiresManager && !canManage;
        const Icon = item.icon;

        if (isDisabled) {
          return (
            <span
              aria-disabled="true"
              className="app-nav-link disabled"
              key={item.href}
            >
              <Icon size={16} strokeWidth={2.1} />
              <span>{item.label}</span>
              <Lock className="nav-lock" size={13} strokeWidth={2.2} />
            </span>
          );
        }

        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={`app-nav-link${isActive ? ' active' : ''}`}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} strokeWidth={2.1} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function formatRoleLabel(role: string) {
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
