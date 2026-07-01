import { Tabs } from '@soyre/ui';

export function PorOperacion() {
  return (
    <div style={{ maxWidth: 560 }}>
      <Tabs
        ariaLabel="Operaciones por tipo"
        items={[
          {
            value: 'venta',
            label: 'Venta',
            panel: (
              <p style={{ margin: '16px 0 0', lineHeight: 1.6 }}>
                14 propiedades en venta activa. $4.2M en valor de cartera.
              </p>
            ),
          },
          {
            value: 'alquiler',
            label: 'Alquiler',
            panel: (
              <p style={{ margin: '16px 0 0', lineHeight: 1.6 }}>
                9 unidades en alquiler. Ocupación promedio del 88%.
              </p>
            ),
          },
          {
            value: 'administracion',
            label: 'Administración',
            panel: (
              <p style={{ margin: '16px 0 0', lineHeight: 1.6 }}>
                3 edificios bajo administración integral.
              </p>
            ),
          },
        ]}
      />
    </div>
  );
}
