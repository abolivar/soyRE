import { PublicDemoRequestForm } from './public-demo-request-form';

export function PublicDemoRequestSection() {
  const enabled =
    process.env.NEXT_PUBLIC_DEMO_FORM_ENABLED?.trim().toLowerCase() === 'true';

  return (
    <section className="public-demo-section" id="demo">
      <div className="public-landing-container public-landing-container-narrow">
        <div className="public-demo-section-heading">
          <div>
            <p className="public-landing-eyebrow">Alpha guiada</p>
            <h2>Revisa tu operación con el equipo de SoyPMS.</h2>
          </div>
          <p>
            Cuéntanos cómo trabaja tu equipo. El formulario conserva
            consentimiento y atribución, pero permanece cerrado hasta que los
            textos legales estén aprobados.
          </p>
        </div>
        <PublicDemoRequestForm enabled={enabled} />
      </div>
    </section>
  );
}
