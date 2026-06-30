import { AlertTriangle, Loader2, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tone =
  | 'primary'
  | 'rent'
  | 'featured'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-card-header">
        <span className="metric-label">{label}</span>
        <span className="metric-card-icon" aria-hidden="true">
          <Icon size={19} strokeWidth={2.2} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <p className="metric-detail">{detail}</p>
    </article>
  );
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`status-badge tone-${tone}`}>{children}</span>;
}

export function SectionPanel({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="section-panel">
      <div className="section-panel-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-description">{description}</p> : null}
        </div>
        {actions ? <div className="row-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function SearchInput({
  placeholder,
  name = 'search',
}: {
  placeholder: string;
  name?: string;
}) {
  return (
    <label className="search-input">
      <Search size={17} strokeWidth={2.2} />
      <input aria-label={placeholder} name={name} placeholder={placeholder} />
    </label>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <section className="filter-bar">{children}</section>;
}

export type DataTableColumn = {
  key: string;
  label: string;
};

export type DataTableRow = {
  id: string;
  cells: Record<string, ReactNode>;
};

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: DataTableColumn[];
  rows: DataTableRow[];
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key}>{row.cells[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2.2} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function LoadingState({
  title = 'Cargando informacion',
  description = 'Estamos preparando los datos de esta vista.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="state-panel loading-state" aria-live="polite">
      <span className="state-icon" aria-hidden="true">
        <Loader2 size={22} strokeWidth={2.2} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

export function ErrorState({
  title = 'No se pudo cargar',
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="state-panel error-state" role="alert">
      <span className="state-icon" aria-hidden="true">
        <AlertTriangle size={22} strokeWidth={2.2} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export type ActivityTimelineItem = {
  id: string;
  initials?: string;
  title: string;
  detail: string;
  meta?: string;
  status?: string;
  tone?: Tone;
};

export function ActivityTimeline({
  items,
  empty,
}: {
  items: readonly ActivityTimelineItem[];
  empty?: ReactNode;
}) {
  if (items.length === 0) {
    return empty ? <>{empty}</> : null;
  }

  return (
    <ol className="activity-timeline">
      {items.map((item) => (
        <li className="timeline-item" key={item.id}>
          <span className="timeline-marker">
            {item.initials ? <span>{item.initials}</span> : null}
          </span>
          <span>
            <strong className="entity-title">{item.title}</strong>
            <span className="meta-row">{item.detail}</span>
            {item.meta ? <span className="timeline-meta">{item.meta}</span> : null}
          </span>
          {item.status ? (
            <StatusBadge tone={item.tone ?? 'neutral'}>{item.status}</StatusBadge>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'danger',
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: Tone;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-describedby="confirm-dialog-description"
        aria-modal="true"
        className="confirm-dialog"
        role="dialog"
      >
        <span className={`dialog-icon tone-${tone}`} aria-hidden="true">
          <AlertTriangle size={21} strokeWidth={2.2} />
        </span>
        <div>
          <h2>{title}</h2>
          <p id="confirm-dialog-description">{description}</p>
        </div>
        <div className="dialog-actions">
          <button className="button secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="button danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function FormDrawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="drawer-backdrop" role="presentation">
      <aside
        aria-describedby={description ? 'form-drawer-description' : undefined}
        aria-modal="true"
        className="form-drawer"
        role="dialog"
      >
        <header className="drawer-header">
          <div>
            <h2>{title}</h2>
            {description ? (
              <p id="form-drawer-description">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="Cerrar"
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer ? <footer className="drawer-footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}
