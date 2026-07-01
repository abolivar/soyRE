import { ArrowUpRight, ListChecks, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button, PageHeader, StatusBadge } from '@soyre/ui';

const columns = [
  {
    title: 'Captura',
    tone: 'neutral',
    items: [
      {
        title: 'Casa Clayton',
        client: 'Familia Vega',
        value: '$520,000',
        next: 'Calificar presupuesto',
      },
      {
        title: 'Apartamento San Francisco',
        client: 'R. Conte',
        value: '$2,400 / mes',
        next: 'Confirmar documentos',
      },
    ],
  },
  {
    title: 'Visita',
    tone: 'rent',
    items: [
      {
        title: 'Local Via Brasil',
        client: 'Grupo Terra',
        value: '$6,800 / mes',
        next: 'Visita tecnica',
      },
    ],
  },
  {
    title: 'Oferta',
    tone: 'featured',
    items: [
      {
        title: 'PH Costa Norte 1402',
        client: 'Familia Moreno',
        value: '$420,000',
        next: 'Responder contraoferta',
      },
    ],
  },
  {
    title: 'Cierre',
    tone: 'primary',
    items: [
      {
        title: 'Lote Altos del Lago',
        client: 'Inversiones Cima',
        value: '$310,000',
        next: 'Validar contrato',
      },
    ],
  },
] as const;

export default function PipelinePage() {
  return (
    <>
      <PageHeader
        eyebrow="Oportunidades"
        title="Funnel"
        description="Pipeline visual para mover operaciones segun etapa, valor, siguiente accion y responsable."
        actions={
          <Button icon={Plus}>
            Nueva oportunidad
          </Button>
        }
      />

      <section className="kanban-board" aria-label="Funnel comercial">
        {columns.map((column) => (
          <section className="kanban-column" key={column.title}>
            <div className="split-row">
              <h2>{column.title}</h2>
              <StatusBadge tone={column.tone}>{column.items.length}</StatusBadge>
            </div>
            {column.items.map((item) => (
              <article className="opportunity-card" key={item.title}>
                <div className="split-row">
                  <strong>{item.title}</strong>
                  <ListChecks size={17} strokeWidth={2.2} />
                </div>
                <span className="meta-row">{item.client}</span>
                <div className="split-row">
                  <StatusBadge tone={column.tone}>{item.value}</StatusBadge>
                  <Button asChild variant="ghost">
                    <Link href="/tasks">
                      <ArrowUpRight size={16} strokeWidth={2.2} />
                      SLA
                    </Link>
                  </Button>
                </div>
                <span className="meta-row">{item.next}</span>
              </article>
            ))}
          </section>
        ))}
      </section>
    </>
  );
}
