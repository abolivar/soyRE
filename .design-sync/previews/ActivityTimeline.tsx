import { ActivityTimeline } from '@soyre/ui';

export function Actividad() {
  return (
    <div style={{ maxWidth: 520 }}>
      <ActivityTimeline
        items={[
          {
            id: 'act-1',
            initials: 'AR',
            title: 'Validación de owner completada',
            detail: 'SoyPMS Demo Realty quedó activa para operar.',
            status: 'Sistema',
            tone: 'success',
          },
          {
            id: 'act-2',
            initials: 'MD',
            title: 'Nueva visita agendada',
            detail: 'Local Vía Brasil, martes 10:00 a.m.',
            meta: 'Hace 2 horas',
            status: 'Comercial',
            tone: 'rent',
          },
          {
            id: 'act-3',
            initials: 'LP',
            title: 'Checklist documental actualizado',
            detail: 'Contrato de corretaje y ficha KYC cargados.',
            status: 'Legal',
            tone: 'featured',
          },
        ]}
      />
    </div>
  );
}
