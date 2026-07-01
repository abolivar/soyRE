import { Input } from '@soyre/ui';

export function Basico() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Input
        id="precio-lista"
        label="Precio de lista"
        placeholder="$420,000"
        defaultValue="$420,000"
      />
    </div>
  );
}

export function ConPista() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Input
        id="area-construida"
        label="Área construida"
        placeholder="180"
        hint="Superficie en metros cuadrados según ficha catastral."
      />
    </div>
  );
}

export function ConError() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Input
        id="email-owner"
        label="Correo del owner"
        defaultValue="ana@demo"
        error="Ingresa un correo válido para enviar la validación."
      />
    </div>
  );
}

export function Deshabilitado() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Input
        id="codigo-interno"
        label="Código interno"
        defaultValue="SOY-2026-0142"
        hint="Asignado automáticamente al crear la propiedad."
        disabled
      />
    </div>
  );
}
