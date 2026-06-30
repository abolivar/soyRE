import { AlertTriangle } from 'lucide-react';
import type { Tone } from '../../types';

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
