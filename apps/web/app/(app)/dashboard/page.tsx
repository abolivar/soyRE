import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  DollarSign,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import {
  activityItems,
  dashboardMetrics,
  opportunityRows,
} from '../../../lib/demo-data';
import {
  ActivityTimeline,
  DataTable,
  MetricCard,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from '@soyre/ui';

const metricCards = [
  { ...dashboardMetrics[0], icon: Building2 },
  { ...dashboardMetrics[1], icon: Users },
  { ...dashboardMetrics[2], icon: DollarSign },
  { ...dashboardMetrics[3], icon: CalendarCheck },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operacion inmobiliaria"
        title="Dashboard"
        description="Vista de control para propiedades, relaciones comerciales, oportunidades y tareas del equipo."
        actions={
          <Link className="button primary" href="/properties">
            <Building2 size={17} strokeWidth={2.2} />
            Nueva propiedad
          </Link>
        }
      />

      <section className="metric-grid" aria-label="Indicadores principales">
        {metricCards.map((metric) => (
          <MetricCard
            detail={metric.detail}
            icon={metric.icon}
            key={metric.label}
            label={metric.label}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-columns">
          <SectionPanel
            title="Funnel general"
            description="Oportunidades con monto, etapa y proxima responsabilidad visible."
            actions={
              <Link className="button secondary" href="/pipeline">
                Ver funnel
                <ArrowUpRight size={16} strokeWidth={2.2} />
              </Link>
            }
          >
            <DataTable
              columns={[
                { key: 'property', label: 'Propiedad' },
                { key: 'client', label: 'Cliente' },
                { key: 'stage', label: 'Etapa' },
                { key: 'owner', label: 'Owner' },
                { key: 'sla', label: 'SLA' },
                { key: 'value', label: 'Valor' },
              ]}
              rows={opportunityRows.map((opportunity) => ({
                id: opportunity.id,
                cells: {
                  property: (
                    <span>
                      <strong className="entity-title">
                        {opportunity.property}
                      </strong>
                      <span className="meta-row">Operacion activa</span>
                    </span>
                  ),
                  client: opportunity.client,
                  stage: (
                    <StatusBadge tone={opportunity.tone}>
                      {opportunity.stage}
                    </StatusBadge>
                  ),
                  owner: opportunity.owner,
                  sla: <StatusBadge tone="warning">{opportunity.sla}</StatusBadge>,
                  value: opportunity.value,
                },
              }))}
            />
          </SectionPanel>

          <SectionPanel
            title="Mi tablero"
            description="La vista personal arranca separada del dashboard general para evitar mezclar gestion del equipo con trabajo individual."
          >
            <div className="compact-list">
              <div className="split-row">
                <span>
                  <strong className="entity-title">Llamadas pendientes</strong>
                  <span className="meta-row">Clientes con decision abierta</span>
                </span>
                <StatusBadge tone="featured">4</StatusBadge>
              </div>
              <div className="split-row">
                <span>
                  <strong className="entity-title">Documentos por validar</strong>
                  <span className="meta-row">Contratos, KYC y anexos</span>
                </span>
                <StatusBadge tone="warning">3</StatusBadge>
              </div>
              <div className="split-row">
                <span>
                  <strong className="entity-title">Visitas de la semana</strong>
                  <span className="meta-row">Agenda comercial confirmada</span>
                </span>
                <StatusBadge tone="rent">7</StatusBadge>
              </div>
            </div>
          </SectionPanel>
        </div>

        <SectionPanel
          title="Actividad reciente"
          description="Eventos de negocio y sistema listos para auditoria."
        >
          <ActivityTimeline items={activityItems} />
        </SectionPanel>
      </section>

      <section className="module-grid" aria-label="Modulos operativos">
        <article className="module-card">
          <ClipboardCheck size={20} strokeWidth={2.2} />
          <h3>Control por SLA</h3>
          <p>
            Cada oportunidad debe exponer responsable, proxima accion y riesgo
            operativo sin abrir otra pantalla.
          </p>
        </article>
        <article className="module-card">
          <Building2 size={20} strokeWidth={2.2} />
          <h3>Inventario vivo</h3>
          <p>
            Las propiedades se leen como activos en proceso: estado, canal,
            documentos, precio y responsable.
          </p>
        </article>
        <article className="module-card">
          <Users size={20} strokeWidth={2.2} />
          <h3>Relaciones con contexto</h3>
          <p>
            Clientes y propietarios se ordenan alrededor de necesidades,
            presupuestos, preferencias y decisiones.
          </p>
        </article>
      </section>
    </>
  );
}
