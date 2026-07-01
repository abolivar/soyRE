import { Clock, Plus } from 'lucide-react';
import {
  Button,
  DataTable,
  FilterBar,
  PageHeader,
  SearchInput,
  SectionPanel,
  StatusBadge,
} from '@soyre/ui';

const taskRows = [
  {
    id: 'task-1',
    title: 'Responder contraoferta',
    context: 'PH Costa Norte 1402',
    owner: 'A. Ruiz',
    due: 'Hoy 4:00 p.m.',
    status: 'Critica',
    tone: 'danger',
  },
  {
    id: 'task-2',
    title: 'Confirmar visita tecnica',
    context: 'Local Via Brasil',
    owner: 'M. Diaz',
    due: 'Manana 10:00 a.m.',
    status: 'En tiempo',
    tone: 'rent',
  },
  {
    id: 'task-3',
    title: 'Revisar contrato de corretaje',
    context: 'Lote Altos del Lago',
    owner: 'L. Paredes',
    due: '48 h',
    status: 'Legal',
    tone: 'featured',
  },
] as const;

export default function TasksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Trabajo diario"
        title="Tareas"
        description="Acciones asignadas por oportunidad, propiedad o cliente, con SLA visible para priorizar."
        actions={
          <Button icon={Plus}>
            Nueva tarea
          </Button>
        }
      />

      <FilterBar>
        <SearchInput placeholder="Buscar tarea o contexto" />
        <select aria-label="Prioridad" defaultValue="all">
          <option value="all">Todas las prioridades</option>
          <option value="critical">Criticas</option>
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
        </select>
      </FilterBar>

      <section className="dashboard-grid">
        <DataTable
          columns={[
            { key: 'task', label: 'Tarea' },
            { key: 'context', label: 'Contexto' },
            { key: 'owner', label: 'Owner' },
            { key: 'due', label: 'Vence' },
            { key: 'status', label: 'Estado' },
          ]}
          rows={taskRows.map((task) => ({
            id: task.id,
            cells: {
              task: (
                <span>
                  <strong className="entity-title">{task.title}</strong>
                  <span className="meta-row">Accion operativa</span>
                </span>
              ),
              context: task.context,
              owner: task.owner,
              due: (
                <span className="meta-row">
                  <Clock size={14} strokeWidth={2.2} />
                  {task.due}
                </span>
              ),
              status: <StatusBadge tone={task.tone}>{task.status}</StatusBadge>,
            },
          }))}
        />

        <SectionPanel
          title="Criterio de prioridad"
          description="Las tareas no viven aisladas: deben estar conectadas a un activo, contacto u oportunidad."
        >
          <div className="compact-list">
            <div className="split-row">
              <span>
                <strong className="entity-title">Sin contexto</strong>
                <span className="meta-row">No se permite crear una tarea suelta.</span>
              </span>
              <StatusBadge tone="success">Regla</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">SLA visible</strong>
                <span className="meta-row">Fecha, responsable y proxima accion.</span>
              </span>
              <StatusBadge tone="warning">Base</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Cierre auditable</strong>
                <span className="meta-row">Resultado obligatorio al completar.</span>
              </span>
              <StatusBadge tone="primary">Base</StatusBadge>
            </div>
          </div>
        </SectionPanel>
      </section>
    </>
  );
}
