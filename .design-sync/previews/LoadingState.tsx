import { LoadingState } from '@soyre/ui';

export function PorDefecto() {
  return (
    <div style={{ maxWidth: 460 }}>
      <LoadingState />
    </div>
  );
}

export function Personalizado() {
  return (
    <div style={{ maxWidth: 460 }}>
      <LoadingState
        title="Cargando propiedades"
        description="Estamos sincronizando el inventario con el servidor."
      />
    </div>
  );
}
