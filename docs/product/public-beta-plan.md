# Plan Del Primer Beta Público

## Objetivo

El primer beta público de SoyPMS debe permitir que dos organizaciones operen
flujos inmobiliarios completos y aislados, desde la captación del inmueble hasta
el cierre del negocio, su expediente, pagos, comisiones, archivo y auditoría.

El beta no se abre por cantidad de pantallas. Se abre cuando los recorridos de
venta y alquiler son funcionales de extremo a extremo, repetibles y seguros
entre organizaciones.

## Decisiones De Producto

- `property` continúa siendo la entidad central del ciclo inmobiliario.
- `organization` es el cliente SaaS y la frontera obligatoria de datos y permisos.
- El expediente transaccional pertenece al negocio.
- KYC no es un requisito global de SoyPMS.
- Una organización puede configurar requisitos KYC dentro de sus propias
  plantillas documentales si su operación lo exige.
- Los checklists documentales son configurables y no sustituyen la posibilidad
  de agregar documentos pertinentes durante una operación.
- Venta y alquiler comparten infraestructura, pero conservan reglas y recorridos
  propios.
- Primero se completan y prueban transiciones manuales. Después se automatizan.
- La separación entre organizaciones se implementa en cada lote. El hardening
  integral se ejecuta después de estabilizar los flujos y antes de abrir el beta.

## Topología De Desarrollo Y Prueba

- El checkout principal permanece en `main` y ejecuta web/API como referencia
  estable de funcionamiento.
- Cada lote se desarrolla en un worktree separado y una rama `codex/*` creada
  desde el último `origin/main`.
- Ningún cambio de producto se realiza directamente sobre el checkout estable.
- Cada lote usa issue, branch, commits vinculados, PR, validación y merge.
- Después de cada merge se actualiza `main`, se reinicia el servidor estable y
  se ejecuta un smoke antes de comenzar el siguiente lote dependiente.

## Secuencia De Lotes

### Lote 0 — Contrato Del Beta

Define alcance, expediente documental, tenancy, permisos, gates de QA y backlog.
No modifica schema, API ni UI.

### Lote 1 — Expediente Documental Configurable

Permite configurar plantillas por organización, instanciar checklists por
negocio, agregar documentos libres, cargar archivos privados, revisar,
observar, aprobar, reemplazar y versionar evidencias.

### Lote 2 — Mandatos

Completa borrador, firma, activación, vigencia, exclusividad, vencimiento,
cancelación y renovación. Un mandato debe controlar cuándo una propiedad puede
pasar a preparación comercial.

El contrato verificable de estados, permisos, expediente, concurrencia y
readiness vive en `docs/modules/mandates/overview.md`. El lote se divide en
modelo/API, workspace operativo y QA adversarial; el vencimiento automático se
conecta posteriormente en el lote de workflow.

### Lote 3 — Preparación Comercial Y Listings

Valida readiness, aprobación interna, publicación, pausa, retiro y archivo. Las
integraciones complejas con portales no son requisito del primer beta.

### Lote 4 — Visitas

Completa programación, confirmación, reprogramación, cancelación, participantes,
resultado, feedback y próxima acción.

### Lote 5 — Ofertas Y Negociación

Completa envío, vigencia, contraofertas versionadas, aceptación, rechazo,
expiración, reserva y conversión transaccional a negocio.

### Lote 6 — Cierre Y Archivo

Completa contratos, adendas, pagos, hitos, entrega, cancelación, reversión,
estado final del inmueble, comisiones, archivo y auditoría.

### Lote 7 — Workflow Y Automatización

Conecta tareas, responsables, fechas límite, acciones programadas, recordatorios
y vencimientos después de validar las transiciones manuales.

### Lote 8 — Dashboard Y Reportes

Reemplaza lecturas demostrativas por métricas derivadas de los módulos reales,
separando alcance de organización y alcance personal.

### Lote 9 — Hardening Y Release Gate

Completa RLS, permisos de base, políticas de Storage, rate limiting, auth,
headers, secretos, retención, backup/restore, observabilidad, abuso y pruebas de
aislamiento antes de abrir el beta público.

## Gate Obligatorio Por Lote

Un lote no está cerrado hasta que cumple:

1. Reglas, estados, permisos y excepciones documentados.
2. Issue y branch creados antes del código.
3. Migración, schema, API y UI alineados cuando apliquen.
4. Validación server-side independiente de la UI.
5. Auditoría de acciones críticas.
6. Pruebas unitarias, de integración y E2E proporcionales al riesgo.
7. Casos negativos de cruce entre organizaciones.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` relevantes en verde.
9. Migraciones remotas verificadas cuando existan cambios de datos.
10. PR fusionado y smoke ejecutado desde el nuevo `main` estable.

## Criterios De Apertura Del Beta

- Web y API productivas tienen health verificable.
- Registro, login, logout y recuperación de acceso funcionan.
- Existen al menos dos organizaciones de prueba con aislamiento demostrado.
- Venta y alquiler completan el recorrido acordado sin intervención en base.
- Una organización puede configurar y reutilizar plantillas documentales.
- Un usuario autorizado puede agregar un documento no previsto al expediente.
- Reservas, contratos, adendas y comprobantes conservan historial y versiones.
- Una oferta aceptada genera o enlaza un único negocio de forma idempotente.
- El cierre deja estados, pagos, comisiones, expediente y auditoría consistentes.
- No quedan datos simulados presentados como datos reales.
- El hardening del Lote 9 está cerrado sin hallazgos P0/P1 abiertos.
- Backup, restauración, rollback, soporte y reporte de incidentes están documentados.

## Exclusiones Del Primer Beta

- KYC obligatorio impuesto por SoyPMS.
- Firma electrónica avanzada.
- Marketplace público o MLS completo.
- Integraciones con todos los portales.
- Contabilidad general completa.
- Aplicación móvil nativa.
- IA documental como dependencia del flujo.
