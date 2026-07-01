import { Button, ErrorState } from '@soyre/ui';

export function Basico() {
  return (
    <div style={{ maxWidth: 460 }}>
      <ErrorState description="No pudimos cargar el inventario. Revisa tu conexión e intenta de nuevo." />
    </div>
  );
}

export function ConAccion() {
  return (
    <div style={{ maxWidth: 460 }}>
      <ErrorState
        title="Error al sincronizar"
        description="El servidor no respondió a tiempo. Puedes reintentar la sincronización."
        action={<Button variant="secondary">Reintentar</Button>}
      />
    </div>
  );
}
