import { Button, EmptyState } from '@soyre/ui';
import { Building2, Inbox } from 'lucide-react';

export function Basico() {
  return (
    <div style={{ maxWidth: 460 }}>
      <EmptyState
        icon={Inbox}
        title="Sin propiedades todavía"
        description="Aún no has registrado inmuebles en este espacio de trabajo. Crea el primero para empezar a operar."
      />
    </div>
  );
}

export function ConAccion() {
  return (
    <div style={{ maxWidth: 460 }}>
      <EmptyState
        icon={Building2}
        title="Catálogo vacío"
        description="Ninguna propiedad coincide con los filtros. Ajusta el criterio o registra una nueva."
        action={<Button variant="primary" icon={Building2}>Nueva propiedad</Button>}
      />
    </div>
  );
}
