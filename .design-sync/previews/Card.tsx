import { Badge, Card } from '@soyre/ui';

export function Basica() {
  return (
    <div style={{ maxWidth: 360 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 16 }}>PH Costa Norte 1402</strong>
          <Badge tone="primary">Venta</Badge>
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', lineHeight: 1.6 }}>
          Costa del Este · 142 m² · 3 recámaras. Owner validado y documentación al día.
        </p>
      </Card>
    </div>
  );
}
