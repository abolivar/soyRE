import { Button, PageHeader } from '@soyre/ui';
import { Building2 } from 'lucide-react';

export function ConAcciones() {
  return (
    <PageHeader
      eyebrow="Operación inmobiliaria"
      title="Dashboard"
      description="Vista de control para propiedades, relaciones comerciales, oportunidades y tareas del equipo."
      actions={<Button variant="primary" icon={Building2}>Nueva propiedad</Button>}
    />
  );
}

export function Simple() {
  return (
    <PageHeader
      eyebrow="Catálogo"
      title="Propiedades"
      description="Inventario activo con etapa, owner y próxima responsabilidad visible."
    />
  );
}
