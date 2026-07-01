import { Button } from '@soyre/ui';
import { Building2, Plus, Trash2 } from 'lucide-react';

export function Variantes() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button variant="primary">Guardar cambios</Button>
      <Button variant="secondary">Ver detalle</Button>
      <Button variant="ghost">Cancelar</Button>
      <Button variant="danger">Eliminar</Button>
    </div>
  );
}

export function ConIcono() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button variant="primary" icon={Plus}>Nueva propiedad</Button>
      <Button variant="secondary" icon={Building2}>Asignar inmueble</Button>
      <Button variant="danger" icon={Trash2}>Eliminar registro</Button>
    </div>
  );
}

export function Estados() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <Button variant="primary" loading>Procesando</Button>
      <Button variant="primary" disabled>No disponible</Button>
      <Button variant="secondary" disabled>Bloqueado</Button>
    </div>
  );
}
