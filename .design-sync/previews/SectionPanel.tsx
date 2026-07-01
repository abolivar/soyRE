import { Badge, Button, SectionPanel } from '@soyre/ui';

export function ConContenido() {
  return (
    <div style={{ maxWidth: 560 }}>
      <SectionPanel
        title="Funnel general"
        description="Oportunidades con monto, etapa y próxima responsabilidad visible."
        actions={<Button variant="secondary">Ver funnel</Button>}
      >
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>PH Costa Norte 1402 · Familia Moreno</span>
            <Badge tone="featured">Oferta enviada</Badge>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Local Vía Brasil · Grupo Terra</span>
            <Badge tone="rent">Visita técnica</Badge>
          </li>
          <li style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Lote Altos del Lago · Inversiones Cima</span>
            <Badge tone="primary">Documentos</Badge>
          </li>
        </ul>
      </SectionPanel>
    </div>
  );
}
