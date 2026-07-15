# Backlog Del Beta Público

## Regla De Ejecución

Cada ítem se convierte en issue antes de implementar. Cada issue debe producir
un PR pequeño, verificable y fusionable. Ningún lote dependiente comienza hasta
que el anterior esté fusionado en `main` y validado desde el servidor estable.

## Lote 1 — Expediente Documental

### BETA-DOC-001 — Modelo De Plantillas Y Snapshot

- Plantillas por organización.
- Requisitos configurables y versionados.
- Aplicabilidad por operación, país, propiedad, contrato y etapa.
- Snapshot inmutable de requisitos por negocio.
- Migración remota y pruebas de aislamiento.

### BETA-DOC-002 — API De Configuración

- Crear, listar, editar, activar y desactivar plantillas.
- Versionar en lugar de reescribir plantillas ya utilizadas.
- Permisos `OWNER`/`ADMIN` y validación server-side.
- Auditoría de cambios.

### BETA-DOC-003 — Expediente Del Negocio

- Instanciar checklist desde plantilla.
- Listar avance, pendientes y bloqueantes.
- Agregar requisito o documento libre.
- Relacionar cliente, propiedad, contrato y participantes de la misma organización.

### BETA-DOC-004 — Storage Privado

- Bucket y paths aislados por organización.
- Upload autorizado.
- Descarga temporal autorizada.
- Validación de tamaño, MIME y extensión.
- Pruebas negativas con UUID/path de otra organización.

### BETA-DOC-005 — Revisión Y Versionamiento

- Cargar, revisar, observar, aprobar, rechazar y marcar no aplicable.
- Reemplazar sin sobrescribir.
- Relacionar adendas con contratos.
- Auditoría completa y motivos obligatorios.

### BETA-DOC-006 — Workspace De Expediente

- Pantalla dedicada dentro del negocio.
- Checklist por estado y etapa.
- Carga y documento personalizado.
- Historial de versiones y observaciones.
- Loading, empty, error y sin permisos.

### BETA-DOC-007 — QA Integrado

- Organización A y B con plantillas diferentes.
- Reserva, contrato, dos adendas y documento libre.
- Reemplazo con historial.
- Requisito bloqueante.
- Cruces por ID y Storage rechazados.
- Recorrido manual, API y E2E documentados.

## Lotes Posteriores

1. Mandatos y habilitación comercial.
2. Readiness y listings.
3. Visitas y seguimiento.
4. Ofertas, reservas y handoff a negocio.
5. Cierre, archivo y coherencia financiera.
6. Workflow y acciones programadas.
7. Dashboard y reportes reales.
8. Hardening integral y release gate.

