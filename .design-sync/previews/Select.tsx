import { Select } from '@soyre/ui';

export function Basico() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Select id="operacion" label="Tipo de operación" defaultValue="venta">
        <option value="venta">Venta</option>
        <option value="alquiler">Alquiler</option>
        <option value="administracion">Administración</option>
      </Select>
    </div>
  );
}

export function ConPista() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Select id="owner" label="Owner asignado" hint="Responsable comercial de la operación.">
        <option value="ana">Ana Ruiz</option>
        <option value="marco">Marco Díaz</option>
        <option value="laura">Laura Paredes</option>
      </Select>
    </div>
  );
}

export function ConError() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Select id="etapa" label="Etapa" defaultValue="" error="Selecciona una etapa para continuar.">
        <option value="" disabled>Sin seleccionar</option>
        <option value="visita">Visita técnica</option>
        <option value="oferta">Oferta enviada</option>
      </Select>
    </div>
  );
}
