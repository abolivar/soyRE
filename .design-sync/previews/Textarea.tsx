import { Textarea } from '@soyre/ui';

export function Basico() {
  return (
    <div style={{ maxWidth: 420 }}>
      <Textarea
        id="notas-visita"
        label="Notas de la visita"
        rows={4}
        placeholder="Resumen de la visita, objeciones del cliente y próximos pasos."
        defaultValue="Cliente interesado en el PH. Solicita revisar el reglamento de copropiedad antes de la oferta."
      />
    </div>
  );
}

export function ConError() {
  return (
    <div style={{ maxWidth: 420 }}>
      <Textarea
        id="descripcion"
        label="Descripción de la propiedad"
        rows={4}
        error="La descripción debe tener al menos 40 caracteres."
        defaultValue="PH en Costa del Este."
      />
    </div>
  );
}
