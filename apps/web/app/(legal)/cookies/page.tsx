import type { Metadata } from 'next';
import { PublicLegalDraftPage } from '../../../components/public-legal-draft-page';

export const metadata: Metadata = {
  description:
    'Borrador pendiente de aprobación de la política de cookies de SoyPMS.',
  title: 'Cookies — borrador',
};

export default function CookiesDraftPage() {
  return (
    <PublicLegalDraftPage
      sections={[
        {
          title: 'Uso esencial previsto',
          body: [
            'El sitio puede usar almacenamiento estrictamente necesario para seguridad, sesión y preferencias de consentimiento.',
          ],
        },
        {
          title: 'Medición opcional',
          body: [
            'La medición de uso y rendimiento se implementará con consentimiento denegado por defecto. No se activará GA4 hasta aprobar este texto y publicar un control de consentimiento.',
          ],
        },
        {
          title: 'Control del usuario',
          body: [
            'La versión aprobada deberá explicar cómo aceptar, rechazar o modificar preferencias sin impedir el acceso al contenido público.',
          ],
        },
      ]}
      title="Cookies"
    />
  );
}
