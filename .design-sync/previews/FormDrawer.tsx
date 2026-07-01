import { Button, FormDrawer, Input, Select } from '@soyre/ui';

const noop = () => {};

export function NuevaPropiedad() {
  return (
    <FormDrawer
      open
      title="Nueva propiedad"
      description="Registra el inmueble y asígnalo a un owner comercial."
      onClose={noop}
      footer={
        <>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="primary">Guardar propiedad</Button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <Input id="drawer-titulo" label="Título" placeholder="PH Costa Norte 1402" />
        <Input id="drawer-ubicacion" label="Ubicación" placeholder="Costa del Este" />
        <Select id="drawer-operacion" label="Operación" defaultValue="venta">
          <option value="venta">Venta</option>
          <option value="alquiler">Alquiler</option>
        </Select>
        <Input id="drawer-precio" label="Precio de lista" placeholder="$420,000" />
      </div>
    </FormDrawer>
  );
}
