import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

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
