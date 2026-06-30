import { X } from 'lucide-react';
import type { ReactNode } from 'react';

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
