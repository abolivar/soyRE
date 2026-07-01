import { ConfirmDialog } from '@soyre/ui';

const noop = () => {};

export function Eliminar() {
  return (
    <ConfirmDialog
      open
      tone="danger"
      title="Eliminar propiedad"
      description="Esta acción quitará PH Costa Norte 1402 del inventario y de las operaciones asociadas. No se puede deshacer."
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      onCancel={noop}
      onConfirm={noop}
    />
  );
}
