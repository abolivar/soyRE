import { FileText, Plus } from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '@soyre/ui';

const documentRows = [
  {
    id: 'doc-1',
    name: 'Contrato de corretaje',
    context: 'PH Costa Norte 1402',
    owner: 'A. Ruiz',
    status: 'Firmado',
    tone: 'success',
  },
  {
    id: 'doc-2',
    name: 'Ficha KYC comprador',
    context: 'Familia Moreno',
    owner: 'A. Ruiz',
    status: 'Por revisar',
    tone: 'warning',
  },
  {
    id: 'doc-3',
    name: 'Titulo de propiedad',
    context: 'Lote Altos del Lago',
    owner: 'L. Paredes',
    status: 'Validando',
    tone: 'featured',
  },
] as const;

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Expedientes"
        title="Documentos"
        description="Control documental por propiedad, cliente y oportunidad, preparado para flujos legales y auditoria."
        actions={
          <Button icon={Plus}>
            Cargar documento
          </Button>
        }
      />

      <FilterBar>
        <SearchInput placeholder="Buscar documento o expediente" />
        <select aria-label="Estado documental" defaultValue="all">
          <option value="all">Todos los estados</option>
          <option value="signed">Firmados</option>
          <option value="review">Por revisar</option>
          <option value="missing">Faltantes</option>
        </select>
      </FilterBar>

      <section className="dashboard-grid">
        <DataTable
          columns={[
            { key: 'name', label: 'Documento' },
            { key: 'context', label: 'Contexto' },
            { key: 'owner', label: 'Owner' },
            { key: 'status', label: 'Estado' },
          ]}
          rows={documentRows.map((document) => ({
            id: document.id,
            cells: {
              name: (
                <span>
                  <strong className="entity-title">{document.name}</strong>
                  <span className="meta-row">Expediente operativo</span>
                </span>
              ),
              context: document.context,
              owner: document.owner,
              status: (
                <StatusBadge tone={document.tone}>{document.status}</StatusBadge>
              ),
            },
          }))}
        />

        <EmptyState
          description="Cuando una oportunidad requiera documentos faltantes, apareceran aqui con responsable y fecha limite."
          icon={FileText}
          title="Sin faltantes abiertos"
        />
      </section>
    </>
  );
}
