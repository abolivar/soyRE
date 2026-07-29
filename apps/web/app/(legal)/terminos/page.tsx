import type { Metadata } from 'next';
import { PublicLegalDraftPage } from '../../../components/public-legal-draft-page';

export const metadata: Metadata = {
  description:
    'Borrador pendiente de aprobación de los términos del sitio público de SoyPMS.',
  title: 'Términos — borrador',
};

export default function TermsDraftPage() {
  return (
    <PublicLegalDraftPage
      sections={[
        {
          title: 'Alcance del sitio',
          body: [
            'El sitio presenta SoyPMS, un software de operación inmobiliaria en alpha guiada. Las vistas publicadas son ilustrativas y la demo confirma el alcance vigente.',
          ],
        },
        {
          title: 'Sin asesoría profesional',
          body: [
            'El contenido del sitio y del producto no sustituye asesoría jurídica, contable, tributaria o regulatoria.',
          ],
        },
        {
          title: 'Propiedad y uso',
          body: [
            'Las condiciones de uso, propiedad intelectual, limitación de responsabilidad, jurisdicción y resolución de controversias deben ser definidas por revisión legal antes de publicar estos términos.',
          ],
        },
      ]}
      title="Términos"
    />
  );
}
