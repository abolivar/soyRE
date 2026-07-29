import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicContentPage } from '../../components/public-content-page';

const title = 'Mandatos y expedientes inmobiliarios, unidos a cada propiedad';
const description =
  'Organiza vigencias, responsables y documentos del mandato dentro del expediente operativo de cada propiedad con SoyPMS.';

export const metadata: Metadata = {
  alternates: { canonical: '/mandatos-y-expedientes' },
  description,
  openGraph: {
    description,
    title,
    url: '/mandatos-y-expedientes',
  },
  title,
};

export default function MandatesAndFilesPage() {
  return (
    <PublicContentPage
      eyebrow="Mandatos y expedientes"
      intro="El mandato define la autorización comercial y el expediente conserva la evidencia necesaria para operar. SoyPMS los mantiene relacionados con la propiedad, sus responsables y su vigencia."
      pathname="/mandatos-y-expedientes"
      relatedLinks={[
        {
          description:
            'Recorre todas las etapas que conecta el software operativo.',
          href: '/producto',
          label: 'Producto SoyPMS',
        },
        {
          description:
            'Conserva el reparto junto al resultado de la operación.',
          href: '/comisiones-inmobiliarias',
          label: 'Comisiones inmobiliarias',
        },
        {
          description:
            'Separa el seguimiento de leads del control de la cartera.',
          href: '/crm-inmobiliario-vs-soypms',
          label: 'CRM inmobiliario y SoyPMS',
        },
      ]}
      sections={[
        {
          title: 'Controla la vigencia sin depender de la memoria',
          body: (
            <>
              <p>
                Cada mandato registra su tipo, fechas, responsables y estado. El
                equipo puede identificar qué está vigente, qué requiere atención
                y qué ya no habilita la comercialización.
              </p>
              <p>
                La plataforma organiza la señal; no sustituye la revisión
                jurídica ni interpreta automáticamente la validez de un
                documento.
              </p>
            </>
          ),
        },
        {
          title: 'Un expediente ligado al inmueble',
          body: (
            <ul>
              <li>Mandato y evidencia de firma.</li>
              <li>Identificación y soportes del propietario.</li>
              <li>Documentos comerciales y de preparación.</li>
              <li>Tareas, observaciones y responsables operativos.</li>
            </ul>
          ),
        },
        {
          title: 'Trazabilidad para trabajar en equipo',
          body: (
            <p>
              Los datos se aíslan por organización y los permisos limitan qué
              puede consultar o cambiar cada rol. El historial ayuda a responder
              quién realizó un cambio y cuándo, sin convertir SoyPMS en un
              repositorio jurídico universal.
            </p>
          ),
        },
        {
          title: 'El mandato continúa dentro del recorrido',
          body: (
            <p>
              Un expediente completo no es el final: habilita tareas,
              publicación, visitas, ofertas y cierre. Revisa el{' '}
              <Link href="/producto">recorrido completo del producto</Link> y la
              separación entre{' '}
              <Link href="/crm-inmobiliario-vs-soypms">
                CRM y operación de cartera
              </Link>
              .
            </p>
          ),
        },
      ]}
      title={title}
    />
  );
}
