import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicContentPage } from '../../components/public-content-page';

const title = 'Comisiones inmobiliarias con reglas visibles desde el cierre';
const description =
  'Documenta el valor, los participantes y la distribución de comisiones inmobiliarias junto a la operación que las originó.';

export const metadata: Metadata = {
  alternates: { canonical: '/comisiones-inmobiliarias' },
  description,
  openGraph: {
    description,
    title,
    url: '/comisiones-inmobiliarias',
  },
  title,
};

export default function RealEstateCommissionsPage() {
  return (
    <PublicContentPage
      eyebrow="Comisiones inmobiliarias"
      intro="SoyPMS relaciona la distribución de la comisión con el negocio cerrado, sus participantes y la evidencia operativa. El objetivo es conservar una regla entendible, no rehacer el cálculo en cada conversación."
      pathname="/comisiones-inmobiliarias"
      relatedLinks={[
        {
          description:
            'Conoce el recorrido desde la captación hasta el archivo.',
          href: '/producto',
          label: 'Producto SoyPMS',
        },
        {
          description: 'Organiza la evidencia que precede a una operación.',
          href: '/mandatos-y-expedientes',
          label: 'Mandatos y expedientes',
        },
        {
          description: 'Distingue la operación de la gestión comercial.',
          href: '/crm-inmobiliario-vs-soypms',
          label: 'CRM inmobiliario y SoyPMS',
        },
      ]}
      sections={[
        {
          title: 'La comisión nace de una operación concreta',
          body: (
            <p>
              El precio de cierre, el valor comisionable y los participantes
              pertenecen al mismo contexto. Captador, colocador, agencia u otros
              beneficiarios pueden quedar representados con el porcentaje o
              monto definido para ese negocio.
            </p>
          ),
        },
        {
          title: 'Una distribución que el equipo puede revisar',
          body: (
            <ul>
              <li>Valor base y moneda de la operación.</li>
              <li>Participantes y rol dentro del cierre.</li>
              <li>Porcentaje o monto asignado.</li>
              <li>Estado del reparto y trazabilidad de cambios.</li>
            </ul>
          ),
        },
        {
          title: 'Control operativo, no contabilidad completa',
          body: (
            <p>
              SoyPMS documenta cómo se distribuye el ingreso inmobiliario y
              conserva su relación con el cierre. No sustituye el sistema
              contable, la facturación, la nómina ni la asesoría tributaria de
              cada país.
            </p>
          ),
        },
        {
          title: 'Del expediente al resultado',
          body: (
            <p>
              La comisión conserva contexto porque la propiedad, el mandato y el
              cierre ya forman parte del mismo recorrido. Consulta cómo se
              organizan los{' '}
              <Link href="/mandatos-y-expedientes">mandatos y expedientes</Link>{' '}
              o explora el <Link href="/producto">producto completo</Link>.
            </p>
          ),
        },
      ]}
      title={title}
    />
  );
}
