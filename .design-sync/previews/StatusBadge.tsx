import { StatusBadge } from '@soyre/ui';

export function Tonos() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <StatusBadge tone="success">Publicado</StatusBadge>
      <StatusBadge tone="rent">En visitas</StatusBadge>
      <StatusBadge tone="featured">Oferta enviada</StatusBadge>
      <StatusBadge tone="warning">Documentos</StatusBadge>
      <StatusBadge tone="danger">SLA vencido</StatusBadge>
      <StatusBadge tone="neutral">Archivado</StatusBadge>
    </div>
  );
}
