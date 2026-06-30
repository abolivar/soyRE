import { Loader2 } from 'lucide-react';

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
