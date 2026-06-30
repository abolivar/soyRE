'use client';

import {
  Bell,
  Building2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { BrandLogo } from './brand-logo';
import { SearchInput } from './ui';

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const businessNavigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Propiedades', icon: Building2 },
  { href: '/clients', label: 'Clientes', icon: Users },
  { href: '/pipeline', label: 'Funnel', icon: ListChecks },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/documents', label: 'Documentos', icon: FileText },
];

const adminNavigation: NavigationItem[] = [
  { href: '/users', label: 'Usuarios', icon: ShieldCheck },
  { href: '/settings', label: 'Configuracion', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="sidebar-brand" href="/dashboard">
          <BrandLogo decorative variant="seal" />
          <span className="brand-copy">
            <strong>SoyPMS</strong>
            <span>Broker workspace</span>
          </span>
        </Link>

        <nav className="app-nav" aria-label="Navegacion principal">
          <NavSection
            items={businessNavigation}
            label="Operacion"
            pathname={pathname}
          />
          <NavSection items={adminNavigation} label="Sistema" pathname={pathname} />
        </nav>

        <div className="sidebar-footer">
          <span>Organizacion activa</span>
          <strong>SoyPMS Demo Realty</strong>
          <span>Validacion remota Supabase</span>
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
            <Link className="button ghost" href="/login">
              <LogOut size={17} strokeWidth={2.2} />
              Salir
            </Link>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

function NavSection({
  label,
  items,
  pathname,
}: {
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
        const Icon = item.icon;

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
