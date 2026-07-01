import { DataTable, EmptyState, StatusBadge } from '@soyre/ui';
import { Inbox } from 'lucide-react';

export function Oportunidades() {
  return (
    <DataTable
      columns={[
        { key: 'property', label: 'Propiedad' },
        { key: 'client', label: 'Cliente' },
        { key: 'stage', label: 'Etapa' },
        { key: 'owner', label: 'Owner' },
        { key: 'value', label: 'Valor' },
      ]}
      rows={[
        {
          id: 'opp-1',
          cells: {
            property: <strong>PH Costa Norte 1402</strong>,
            client: 'Familia Moreno',
            stage: <StatusBadge tone="featured">Oferta enviada</StatusBadge>,
            owner: 'A. Ruiz',
            value: '$420,000',
          },
        },
        {
          id: 'opp-2',
          cells: {
            property: <strong>Local Vía Brasil</strong>,
            client: 'Grupo Terra',
            stage: <StatusBadge tone="rent">Visita técnica</StatusBadge>,
            owner: 'M. Díaz',
            value: '$6,800 / mes',
          },
        },
        {
          id: 'opp-3',
          cells: {
            property: <strong>Lote Altos del Lago</strong>,
            client: 'Inversiones Cima',
            stage: <StatusBadge tone="primary">Documentos</StatusBadge>,
            owner: 'L. Paredes',
            value: '$310,000',
          },
        },
      ]}
    />
  );
}

export function Vacia() {
  return (
    <DataTable
      columns={[
        { key: 'property', label: 'Propiedad' },
        { key: 'stage', label: 'Etapa' },
      ]}
      rows={[]}
      empty={
        <EmptyState
          icon={Inbox}
          title="Sin oportunidades"
          description="Ninguna operación coincide con los filtros actuales. Ajusta la búsqueda."
        />
      }
    />
  );
}
