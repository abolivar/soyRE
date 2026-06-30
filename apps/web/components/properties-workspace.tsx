'use client';

import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { propertyRows } from '../lib/demo-data';
import {
  ConfirmDialog,
  DataTable,
  FilterBar,
  FormDrawer,
  PageHeader,
  SearchInput,
  SectionPanel,
  StatusBadge,
} from './ui';

export function PropertiesWorkspace() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [propertyToRetire, setPropertyToRetire] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        eyebrow="Inventario"
        title="Propiedades"
        description="Activos inmobiliarios con estado operativo, responsable, canal y proxima accion."
        actions={
          <button
            className="button primary"
            onClick={() => setIsDrawerOpen(true)}
            type="button"
          >
            <Plus size={17} strokeWidth={2.2} />
            Nueva propiedad
          </button>
        }
      />

      <FilterBar>
        <SearchInput placeholder="Buscar propiedad, zona o owner" />
        <select aria-label="Modalidad" defaultValue="all">
          <option value="all">Todas las modalidades</option>
          <option value="sale">Venta</option>
          <option value="rent">Alquiler</option>
        </select>
        <select aria-label="Estado" defaultValue="all">
          <option value="all">Todos los estados</option>
          <option value="published">Publicado</option>
          <option value="documents">Documentos</option>
          <option value="visits">Visitas</option>
        </select>
      </FilterBar>

      <section className="dashboard-grid">
        <DataTable
          columns={[
            { key: 'property', label: 'Propiedad' },
            { key: 'location', label: 'Ubicacion' },
            { key: 'mode', label: 'Modalidad' },
            { key: 'price', label: 'Precio' },
            { key: 'status', label: 'Estado' },
            { key: 'owner', label: 'Owner' },
            { key: 'actions', label: 'Acciones' },
          ]}
          rows={propertyRows.map((property) => ({
            id: property.id,
            cells: {
              property: (
                <span>
                  <strong className="entity-title">{property.property}</strong>
                  <span className="meta-row">Ficha comercial activa</span>
                </span>
              ),
              location: (
                <span className="meta-row">
                  <MapPin size={14} strokeWidth={2.2} />
                  {property.location}
                </span>
              ),
              mode: property.mode,
              price: property.price,
              status: <StatusBadge tone={property.tone}>{property.status}</StatusBadge>,
              owner: property.owner,
              actions: (
                <div className="row-actions">
                  <button className="button secondary" type="button">
                    Editar
                  </button>
                  <button
                    aria-label={`Retirar ${property.property}`}
                    className="icon-button"
                    onClick={() => setPropertyToRetire(property.property)}
                    type="button"
                  >
                    <Trash2 size={17} strokeWidth={2.2} />
                  </button>
                </div>
              ),
            },
          }))}
        />

        <SectionPanel
          title="Criterios de publicacion"
          description="Antes de publicar, cada propiedad debe tener minimo documental y comercial claro."
        >
          <div className="compact-list">
            <div className="split-row">
              <span>
                <strong className="entity-title">Ficha completa</strong>
                <span className="meta-row">Metraje, precio, ubicacion y fotos</span>
              </span>
              <StatusBadge tone="success">Listo</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Documentos base</strong>
                <span className="meta-row">Contrato, propietario y autorizacion</span>
              </span>
              <StatusBadge tone="warning">Revisar</StatusBadge>
            </div>
            <div className="split-row">
              <span>
                <strong className="entity-title">Canales</strong>
                <span className="meta-row">Portal, redes, referidos y colaboraciones</span>
              </span>
              <StatusBadge tone="primary">Activo</StatusBadge>
            </div>
          </div>
        </SectionPanel>
      </section>

      <FormDrawer
        description="Define la ficha inicial para venta o alquiler con responsable, precio y contexto operativo."
        footer={
          <>
            <button
              className="button secondary"
              onClick={() => setIsDrawerOpen(false)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="button primary"
              onClick={() => setIsDrawerOpen(false)}
              type="button"
            >
              Guardar borrador
            </button>
          </>
        }
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        title="Nueva propiedad"
      >
        <label>
          Nombre comercial
          <input placeholder="PH Costa Norte 1402" />
        </label>
        <div className="field-grid">
          <label>
            Modalidad
            <select defaultValue="sale">
              <option value="sale">Venta</option>
              <option value="rent">Alquiler</option>
            </select>
          </label>
          <label>
            Precio
            <input placeholder="$420,000" />
          </label>
        </div>
        <label>
          Ubicacion
          <input placeholder="Costa del Este" />
        </label>
        <label>
          Responsable
          <select defaultValue="ana">
            <option value="ana">Ana Ruiz</option>
            <option value="marco">Marco Diaz</option>
            <option value="laura">Laura Paredes</option>
          </select>
        </label>
        <label>
          Notas operativas
          <textarea placeholder="Condiciones, restricciones, documentos pendientes o proxima accion." />
        </label>
      </FormDrawer>

      <ConfirmDialog
        confirmLabel="Retirar"
        description={
          propertyToRetire
            ? `La propiedad ${propertyToRetire} saldra del inventario activo y quedara marcada para auditoria.`
            : 'La propiedad saldra del inventario activo.'
        }
        onCancel={() => setPropertyToRetire(null)}
        onConfirm={() => setPropertyToRetire(null)}
        open={propertyToRetire !== null}
        title="Retirar propiedad"
      />
    </>
  );
}
