import { Badge } from '@soyre/ui';

export function Tonos() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Badge tone="primary">Venta</Badge>
      <Badge tone="rent">Alquiler</Badge>
      <Badge tone="featured">Destacada</Badge>
      <Badge tone="success">Validado</Badge>
      <Badge tone="warning">Pendiente</Badge>
      <Badge tone="danger">Vencido</Badge>
      <Badge tone="neutral">Borrador</Badge>
    </div>
  );
}

export function Etiquetas() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <Badge shape="tag" tone="primary">Costa del Este</Badge>
      <Badge shape="tag" tone="rent">180 m²</Badge>
      <Badge shape="tag" tone="featured">Uso mixto</Badge>
      <Badge shape="tag" tone="neutral">3 recámaras</Badge>
    </div>
  );
}
