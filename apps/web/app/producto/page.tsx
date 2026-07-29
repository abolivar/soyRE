import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicContentPage } from '../../components/public-content-page';

const title =
  'Software de operación inmobiliaria para organizar toda la cartera';
const description =
  'Conoce cómo SoyPMS organiza propiedades, mandatos, expedientes, tareas, ofertas, cierres y comisiones sin reemplazar el CRM comercial.';

export const metadata: Metadata = {
  alternates: { canonical: '/producto' },
  description,
  openGraph: {
    description,
    title,
    url: '/producto',
  },
  title,
};

export default function ProductPage() {
  return (
    <PublicContentPage
      eyebrow="Producto"
      intro="SoyPMS reúne la continuidad operativa de cada propiedad: desde la captación y el mandato hasta el cierre, la comisión y el archivo. El producto se encuentra en alpha guiada."
      pathname="/producto"
      relatedLinks={[
        {
          description:
            'Une vigencias, documentos y responsables a la propiedad.',
          href: '/mandatos-y-expedientes',
          label: 'Mandatos y expedientes',
        },
        {
          description: 'Documenta cómo se distribuye una comisión al cerrar.',
          href: '/comisiones-inmobiliarias',
          label: 'Comisiones inmobiliarias',
        },
        {
          description:
            'Entiende dónde termina el trabajo comercial y comienza la operación.',
          href: '/crm-inmobiliario-vs-soypms',
          label: 'CRM inmobiliario y SoyPMS',
        },
      ]}
      sections={[
        {
          title: 'Una propiedad como centro de la operación',
          body: (
            <>
              <p>
                En SoyPMS la propiedad no es una nota dentro de un contacto.
                Concentra su disponibilidad, mandato, expediente, responsables,
                tareas, ofertas y resultado comercial. Así el equipo puede leer
                el estado operativo sin reconstruirlo entre chats, correos y
                hojas de cálculo.
              </p>
              <p>
                Los datos se aíslan por organización y la visibilidad depende
                del rol de cada integrante.
              </p>
            </>
          ),
        },
        {
          title: 'Un recorrido que conserva el contexto',
          body: (
            <ol>
              <li>
                <strong>Captación:</strong> registra la propiedad y sus
                responsables.
              </li>
              <li>
                <strong>Mandato y expediente:</strong> controla vigencia y reúne
                soportes relacionados.
              </li>
              <li>
                <strong>Preparación y publicación:</strong> organiza tareas y
                datos necesarios antes de comercializar.
              </li>
              <li>
                <strong>Oferta y cierre:</strong> conserva decisiones y
                resultado de la operación.
              </li>
              <li>
                <strong>Comisión y archivo:</strong> documenta el reparto y
                mantiene trazabilidad.
              </li>
            </ol>
          ),
        },
        {
          title: 'Qué incluye la alpha guiada',
          body: (
            <>
              <p>
                La alpha permite validar recorridos reales de propiedades,
                mandatos, documentos, tareas, negocios y comisiones con un
                acompañamiento directo. Las vistas publicadas son ilustrativas;
                la demo confirma el alcance disponible para tu equipo.
              </p>
              <p>
                Puedes profundizar en el recorrido de{' '}
                <Link href="/mandatos-y-expedientes">
                  mandatos y expedientes inmobiliarios
                </Link>{' '}
                o revisar cómo se documentan las{' '}
                <Link href="/comisiones-inmobiliarias">
                  comisiones inmobiliarias
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: 'Convive con el CRM de tu equipo',
          body: (
            <p>
              El CRM continúa gestionando prospección, leads y conversaciones
              comerciales. SoyPMS toma la continuidad desde que una propiedad
              entra a la cartera. Consulta la comparación entre{' '}
              <Link href="/crm-inmobiliario-vs-soypms">
                CRM inmobiliario y software operativo
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
