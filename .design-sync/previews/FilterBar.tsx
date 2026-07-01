import { Badge, Button, FilterBar, SearchInput } from '@soyre/ui';

export function ConFiltros() {
  return (
    <div style={{ maxWidth: 720 }}>
      <FilterBar>
        <SearchInput placeholder="Buscar propiedad" />
        <Badge shape="tag" tone="primary">Venta</Badge>
        <Badge shape="tag" tone="rent">Alquiler</Badge>
        <Badge shape="tag" tone="neutral">Costa del Este</Badge>
        <Button variant="ghost">Limpiar</Button>
      </FilterBar>
    </div>
  );
}
