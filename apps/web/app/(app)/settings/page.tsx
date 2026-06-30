import { KeyRound, ShieldCheck } from 'lucide-react';
import {
  PageHeader,
  SectionPanel,
  StatusBadge,
} from '@soyre/ui';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Configuracion"
        title="Ajustes"
        description="Reglas base de organizacion, acceso y lenguaje visual para mantener consistencia mientras crece el producto."
      />

      <section className="settings-grid">
        <SectionPanel
          title="Organizacion"
          description="Valores operativos que usaremos en todo el workspace."
        >
          <div className="compact-list">
            <label>
              Nombre publico
              <input defaultValue="SoyPMS Demo Realty" />
            </label>
            <label>
              Zona horaria
              <select defaultValue="America/Panama">
                <option value="America/Panama">America/Panama</option>
                <option value="America/Bogota">America/Bogota</option>
                <option value="America/Mexico_City">America/Mexico_City</option>
              </select>
            </label>
            <label>
              Moneda principal
              <select defaultValue="USD">
                <option value="USD">USD</option>
                <option value="PAB">PAB</option>
                <option value="COP">COP</option>
              </select>
            </label>
          </div>
        </SectionPanel>

        <div className="dashboard-columns">
          <SectionPanel
            title="Acceso"
            description="Politicas actuales para el sistema de validacion."
          >
            <div className="compact-list">
              <article className="setting-row">
                <span className="avatar">
                  <ShieldCheck size={17} strokeWidth={2.2} />
                </span>
                <span>
                  <strong className="entity-title">Validacion manual</strong>
                  <span className="meta-row">Owner o admin aprueban usuarios.</span>
                </span>
                <StatusBadge tone="success">Activo</StatusBadge>
              </article>
              <article className="setting-row">
                <span className="avatar">
                  <KeyRound size={17} strokeWidth={2.2} />
                </span>
                <span>
                  <strong className="entity-title">Password minimo</strong>
                  <span className="meta-row">10 caracteres en registro/login.</span>
                </span>
                <StatusBadge tone="primary">Base</StatusBadge>
              </article>
            </div>
          </SectionPanel>

          <SectionPanel
            title="Lenguaje visual"
            description="Tokens actuales, listos para reemplazar por la paleta definitiva."
          >
            <div className="compact-list">
              <div className="split-row">
                <span>
                  <strong className="entity-title">Primary teal</strong>
                  <span className="meta-row">Sistema y operaciones de venta.</span>
                </span>
                <StatusBadge tone="primary">#1A9E8F</StatusBadge>
              </div>
              <div className="split-row">
                <span>
                  <strong className="entity-title">Slate blue</strong>
                  <span className="meta-row">Alquiler y relaciones activas.</span>
                </span>
                <StatusBadge tone="rent">#2D4E8A</StatusBadge>
              </div>
              <div className="split-row">
                <span>
                  <strong className="entity-title">Warm amber</strong>
                  <span className="meta-row">Destacados, negociacion y alertas.</span>
                </span>
                <StatusBadge tone="featured">#C07A3A</StatusBadge>
              </div>
            </div>
          </SectionPanel>
        </div>
      </section>
    </>
  );
}
