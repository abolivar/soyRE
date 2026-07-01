import { MetricCard } from '@soyre/ui';
import { Building2, CalendarCheck, DollarSign, Users } from 'lucide-react';

export function Indicadores() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 16 }}>
      <MetricCard
        tone="primary"
        icon={Building2}
        label="Propiedades activas"
        value="128"
        detail="18 publicadas, 42 en preparación y 68 con seguimiento abierto."
      />
      <MetricCard
        tone="rent"
        icon={Users}
        label="Clientes en seguimiento"
        value="342"
        detail="31 nuevos esta semana y 57 con próxima acción venciendo."
      />
      <MetricCard
        tone="featured"
        icon={DollarSign}
        label="Operaciones en funnel"
        value="26"
        detail="$4.8M estimados entre venta, alquiler y administración."
      />
      <MetricCard
        tone="warning"
        icon={CalendarCheck}
        label="Tareas de hoy"
        value="9"
        detail="3 críticas por SLA y 6 asignadas al equipo comercial."
      />
    </div>
  );
}
