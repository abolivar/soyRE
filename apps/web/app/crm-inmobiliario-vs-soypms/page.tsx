import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicContentPage } from '../../components/public-content-page';

const title = 'CRM inmobiliario y SoyPMS: dos trabajos distintos';
const description =
  'Compara el seguimiento comercial de un CRM inmobiliario con la operación de propiedades, mandatos, expedientes, cierres y comisiones en SoyPMS.';

export const metadata: Metadata = {
  alternates: { canonical: '/crm-inmobiliario-vs-soypms' },
  description,
  openGraph: {
    description,
    title,
    url: '/crm-inmobiliario-vs-soypms',
  },
  title,
};

export default function CrmVsSoypmsPage() {
  return (
    <PublicContentPage
      eyebrow="CRM inmobiliario y operación"
      intro="Tu CRM persigue el lead. SoyPMS opera la cartera. Son responsabilidades complementarias: una herramienta organiza relaciones y oportunidades; la otra conserva la continuidad operativa de cada propiedad."
      pathname="/crm-inmobiliario-vs-soypms"
      relatedLinks={[
        {
          description:
            'Explora las entidades y etapas de la operación de cartera.',
          href: '/producto',
          label: 'Producto SoyPMS',
        },
        {
          description:
            'Controla vigencia y evidencia alrededor de la propiedad.',
          href: '/mandatos-y-expedientes',
          label: 'Mandatos y expedientes',
        },
        {
          description: 'Relaciona participantes y reparto con el cierre.',
          href: '/comisiones-inmobiliarias',
          label: 'Comisiones inmobiliarias',
        },
      ]}
      sections={[
        {
          title: 'Qué resuelve un CRM inmobiliario',
          body: (
            <ul>
              <li>Prospección y origen del lead.</li>
              <li>Seguimiento de contactos y conversaciones.</li>
              <li>Oportunidades y actividad comercial.</li>
              <li>Automatizaciones de captación y nutrición.</li>
            </ul>
          ),
        },
        {
          title: 'Qué resuelve SoyPMS',
          body: (
            <ul>
              <li>Inventario y estado operativo de propiedades.</li>
              <li>Mandatos, vigencias y expedientes.</li>
              <li>Tareas, ofertas y decisiones del equipo.</li>
              <li>Cierres, comisiones, archivo y auditoría.</li>
            </ul>
          ),
        },
        {
          title: 'Dónde se encuentra el punto de relevo',
          body: (
            <p>
              Cuando una propiedad entra a la cartera, comienza un trabajo que
              continúa aunque cambie el lead o el agente responsable. SoyPMS
              organiza ese tramo. El CRM puede seguir siendo la herramienta
              comercial del equipo; no exigimos una migración para validar la
              alpha.
            </p>
          ),
        },
        {
          title: 'Elige según el problema que necesitas resolver',
          body: (
            <p>
              Si el reto principal es captar y dar seguimiento a contactos,
              necesitas fortalecer el CRM. Si el reto es saber qué propiedad
              está lista, qué mandato vence, dónde está el expediente o cómo se
              distribuyó un cierre, revisa el{' '}
              <Link href="/producto">software operativo SoyPMS</Link>.
            </p>
          ),
        },
      ]}
      title={title}
    />
  );
}
