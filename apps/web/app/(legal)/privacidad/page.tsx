import type { Metadata } from 'next';
import { PublicLegalDraftPage } from '../../../components/public-legal-draft-page';

export const metadata: Metadata = {
  description:
    'Borrador pendiente de aprobación de la política de privacidad de SoyPMS.',
  title: 'Privacidad — borrador',
};

export default function PrivacyDraftPage() {
  return (
    <PublicLegalDraftPage
      sections={[
        {
          title: 'Datos previstos',
          body: [
            'Para una solicitud de demo se prevé recibir nombre, correo laboral, empresa, país, tamaño del equipo, reto operativo opcional, consentimiento y datos de atribución de la visita.',
            'La solicitud no almacena una dirección IP cruda. El control inicial de abuso usa una huella temporal en memoria que no forma parte del registro comercial.',
          ],
        },
        {
          title: 'Finalidad prevista',
          body: [
            'Los datos se usarían para responder la solicitud, entender el encaje operativo, dar seguimiento a la conversación y medir el origen agregado de las solicitudes.',
            'No se enviará información personal a herramientas de analítica.',
          ],
        },
        {
          title: 'Proveedores y conservación',
          body: [
            'La arquitectura prevista usa Supabase para persistencia y Resend para notificaciones por correo. Los plazos de conservación y mecanismos de ejercicio de derechos deben ser definidos por revisión legal antes de activar el formulario.',
          ],
        },
        {
          title: 'Contacto',
          body: [
            'El canal previsto para consultas de privacidad es hola@soypms.com. Su recepción debe verificarse antes de publicar esta política.',
          ],
        },
      ]}
      title="Privacidad"
    />
  );
}
