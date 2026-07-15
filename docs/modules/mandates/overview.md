# Módulo De Mandatos

## Propósito

Mandates administra la autorización comercial que una persona propietaria
otorga a la organización para ofrecer un inmueble en venta, alquiler o ambas
operaciones. El mandato define vigencia, exclusividad, precio autorizado,
moneda, comisión y responsable operativo.

El mandato no es un negocio ni un listing. Pertenece al inmueble y actúa como
gate para su preparación comercial. `property` continúa siendo la entidad
central y `organization` la frontera SaaS obligatoria.

## Decisiones Del Beta

- Venta, alquiler y ambas operaciones comparten infraestructura, pero la
  autorización se valida por modalidad.
- Un mandato firmado no se sobrescribe. Los cambios materiales requieren un
  sucesor auditable.
- La activación es una transición explícita y confiable del servidor; no se
  deriva de un selector libre en el formulario de creación.
- El vencimiento se puede registrar manualmente durante este lote. Su ejecución
  programada pertenece al lote de automatización.
- KYC no es requisito global. Cada organización puede exigir documentos
  adicionales mediante su configuración documental.
- No se elimina físicamente un mandato usado. Los estados terminales conservan
  evidencia e historial.

## Estados Objetivo

| Estado              | Significado operativo                                                |
| ------------------- | -------------------------------------------------------------------- |
| `DRAFT`             | Términos editables; todavía no se presenta para firma.               |
| `PENDING_SIGNATURE` | Términos completos enviados para firma.                              |
| `PENDING_DOCUMENTS` | Firma registrada; faltan evidencias o validaciones configuradas.     |
| `ACTIVE`            | Autorización vigente y habilitante para preparación comercial.       |
| `EXPIRED`           | La fecha final fue alcanzada sin renovación activa.                  |
| `CANCELLED`         | La autorización terminó antes de su vencimiento, con motivo.         |
| `SUPERSEDED`        | Un mandato sucesor fue activado y reemplazó su vigencia.             |
| `ARCHIVED`          | Estado terminal retirado de la operación diaria, nunca de auditoría. |

`PENDING_SIGNATURE` y `SUPERSEDED` amplían el enum persistente actual. El schema,
la migración, los DTOs, los serializadores y la UI deben cambiar juntos.

## Transiciones

| Desde                                             | Acción                   | Hacia               | Reglas principales                                       |
| ------------------------------------------------- | ------------------------ | ------------------- | -------------------------------------------------------- |
| `DRAFT`                                           | presentar para firma     | `PENDING_SIGNATURE` | Términos completos y relaciones válidas.                 |
| `PENDING_SIGNATURE`                               | devolver para corrección | `DRAFT`             | Motivo obligatorio; no existe firma vigente.             |
| `PENDING_SIGNATURE`                               | registrar firma          | `PENDING_DOCUMENTS` | Fecha y evidencia firmada vinculadas al mandato.         |
| `PENDING_DOCUMENTS`                               | activar                  | `ACTIVE`            | Todas las invariantes y bloqueantes satisfechos.         |
| `DRAFT`, `PENDING_SIGNATURE`, `PENDING_DOCUMENTS` | cancelar                 | `CANCELLED`         | Motivo obligatorio.                                      |
| `ACTIVE`                                          | vencer                   | `EXPIRED`           | `endsAt` alcanzada; no se permite anticiparlo.           |
| `ACTIVE`                                          | cancelar                 | `CANCELLED`         | Motivo y fecha efectiva obligatorios.                    |
| `ACTIVE`                                          | activar sucesor          | `SUPERSEDED`        | Ocurre en la misma transacción que activa la renovación. |
| `EXPIRED`, `CANCELLED`, `SUPERSEDED`              | archivar                 | `ARCHIVED`          | Solo `OWNER` o `ADMIN`.                                  |

Toda transición fuera de la tabla devuelve conflicto y no modifica el mandato.
Repetir una acción con la misma clave de idempotencia devuelve el resultado ya
registrado. Las transiciones concurrentes se serializan por organización e
inmueble.

## Invariantes

### Relaciones

- El inmueble, propietario, responsable, mandato sucesor y documentos deben
  pertenecer a la misma organización.
- El propietario es obligatorio antes de presentar para firma. Puede heredarse
  de la propiedad, pero el mandato conserva el ID acordado como snapshot.
- El responsable debe mantener una membership activa en la organización.
- La modalidad debe ser compatible con `property.operations`: `SALE` requiere
  venta, `RENT` requiere alquiler y `BOTH` requiere ambas.
- Conocer un UUID de otra organización nunca permite leer, relacionar,
  transicionar ni inferir la existencia del recurso.

### Términos

- `authorizedPriceCents` es obligatorio y mayor que cero antes de firma.
- `currency` usa exactamente tres letras ISO normalizadas a mayúsculas.
- `commissionBps` es obligatorio para activar, admite cero y nunca supera
  `10_000` puntos básicos.
- `startsAt` y `endsAt` son obligatorios para activar; `endsAt` no puede ser
  anterior a `startsAt`.
- `signedAt` no puede ser futura ni anterior a la creación del mandato.
- Un mandato solo se activa desde su fecha inicial y mientras su fecha final no
  haya pasado.
- Precio, moneda, comisión, modalidad, propietario, inicio y fin son términos
  materiales. Después de registrar firma son inmutables; una modificación
  material crea un sucesor.

### Exclusividad Y Concurrencia

Los intervalos se consideran inclusivos. Dos mandatos se solapan si comparten
al menos un día y sus modalidades comparten venta o alquiler.

- Un mandato exclusivo no puede activarse si existe otro mandato activo y
  solapado para el mismo inmueble y modalidad.
- Un mandato no exclusivo tampoco puede activarse contra un exclusivo activo y
  solapado.
- Dos mandatos no exclusivos pueden coexistir cuando la organización lo decide.
- `BOTH` intersecta tanto `SALE` como `RENT`.
- La validación debe ser segura ante dos activaciones concurrentes; consultar y
  luego insertar sin bloqueo transaccional no es suficiente.

## Renovación

Renovar crea un nuevo mandato `DRAFT` con `previousMandateId`; no cambia fechas
ni términos del original. El sucesor copia términos como punto de partida, pero
requiere nueva revisión, firma y evidencia.

El mandato anterior continúa `ACTIVE` hasta que el sucesor se activa o llega a
su vencimiento. Activar el sucesor y marcar el anterior `SUPERSEDED` es una sola
transacción. Solo puede existir un sucesor no terminal por mandato y una
solicitud repetida con la misma clave es idempotente.

## Expediente Del Mandato

`DocumentEntityType.MANDATE` ya existe, pero la relación no debe depender de
`metadata`. El modelo `Document` necesita `mandateId` y una clave foránea que
proteja organización y mandato.

La evidencia mínima de firma es un documento vigente vinculado al mandato. La
organización puede exigir poderes, identificaciones, certificados u otros
documentos; esos requisitos son configurables y no convierten KYC en política
global de SoyPMS.

Para activar:

- Debe existir evidencia firmada vigente y aprobada.
- No puede existir un requisito configurado obligatorio que bloquee activación.
- Reemplazar un archivo conserva versiones, autor, fecha y motivo.
- Cancelar, vencer o renovar no elimina el expediente histórico.

## Readiness Comercial

Un listing `DRAFT` puede prepararse antes de la activación para adelantar copy y
materiales, pero no puede pasar a `READY`, `APPROVED` o `PUBLISHED` sin:

1. Un mandato `ACTIVE` de la misma organización e inmueble.
2. Modalidad compatible con la operación del listing.
3. Fecha actual dentro de la vigencia inclusiva.
4. Evidencia firmada y bloqueantes documentales resueltos.
5. Ausencia de conflicto de exclusividad.

El guard se ejecuta en el servidor cada vez que el listing intenta avanzar. Un
mandato vencido, cancelado o reemplazado impide nuevas transiciones comerciales.
La pausa automática de listings ya publicados pertenece al lote de workflow;
durante el beta manual, la API debe devolver el bloqueante y una tarea operativa
debe hacer visible la regularización pendiente.

## Permisos Iniciales

| Acción                                               | Roles                                                                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Listar y consultar                                   | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`; `AGENT` y `EXTERNAL_AGENT` solo si están asignados; `FINANCE` para términos financieros; `READONLY` sin acciones. |
| Crear y editar borrador                              | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`; `AGENT` solo cuando está asignado al inmueble.                                                                    |
| Presentar para firma                                 | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS` y agente asignado.                                                                                                 |
| Registrar firma, activar, vencer, cancelar o renovar | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`.                                                                                                                   |
| Archivar                                             | `OWNER`, `ADMIN`.                                                                                                                                           |

La autorización se evalúa en servidor por organización, rol, asignación y
recurso. La UI oculta acciones no permitidas, pero nunca es la fuente de verdad.

## Auditoría E Historial

Se registran dentro de la misma transacción:

- creación y cambios de términos del borrador;
- presentación, devolución y firma;
- activación, vencimiento, cancelación, renovación y archivo;
- cambios de responsable;
- conflictos rechazados relevantes;
- documentos cargados, revisados y reemplazados.

Cada evento conserva organización, mandato, actor, estado anterior y nuevo,
fecha, motivo, clave de idempotencia y términos materiales afectados. La
respuesta de historial se ordena por fecha y desempata por ID.

## API Objetivo

- `GET /api/mandates`: filtros por estado, modalidad, inmueble, responsable,
  vencimiento y búsqueda.
- `GET /api/mandates/:mandateId`: detalle, readiness, bloqueantes y resumen del
  expediente.
- `POST /api/mandates`: crea únicamente `DRAFT`.
- `PATCH /api/mandates/:mandateId`: edita campos permitidos del borrador.
- `POST /api/mandates/:mandateId/transitions`: ejecuta una transición validada.
- `POST /api/mandates/:mandateId/renewals`: crea o devuelve el sucesor
  idempotente.
- `GET /api/mandates/:mandateId/history`: devuelve eventos auditables.

`organizationId` nunca concede acceso. Cada consulta parte de una membership
activa y scopea el recurso antes de validar relaciones.

## Workspace Objetivo

`/mandates` debe dejar de ser un alta genérica y ofrecer:

- lista con búsqueda y filtros de estado, modalidad, responsable y vencimiento;
- alertas de mandatos por vencer y bloqueantes;
- detalle con términos, propiedad, propietario, responsable y vigencia;
- timeline de estados e historial;
- expediente firmado y requisitos configurados;
- acciones contextuales según estado y permisos;
- renovación con comparación entre términos anteriores y nuevos;
- loading, empty, error, sin permisos y adaptación móvil.

La UI visible está en español y muestra montos, porcentajes y fechas locales sin
exponer enums ni errores internos.

## QA Obligatorio

- Recorridos completos de venta, alquiler y `BOTH`.
- Matriz exacta de transiciones válidas e inválidas.
- Fechas límite, firma futura, moneda, monto y comisión extremos.
- Dos activaciones exclusivas simultáneas sobre el mismo inmueble.
- Exclusividad con operaciones que coinciden y que no coinciden.
- Renovación idempotente y activación atómica del sucesor.
- Mandato activo que habilita readiness y mandato terminal que lo bloquea.
- Roles, asignación y cruces por cada ID relacionado entre organizaciones A/B.
- Evidencia firmada ausente, observada, vencida, aprobada y reemplazada.
- Auditoría exacta y ausencia de escrituras parciales ante fallos.
- E2E desktop y móvil para lista, detalle, transiciones y estados vacíos/error.

## División De Implementación

1. #115 — modelo, migración remota, servicio de dominio, API, historial,
   expediente y guard de readiness.
2. #116 — workspace operativo de Mandatos con acciones por estado y rol;
   depende de #115.
3. #117 — QA adversarial remoto y E2E, incluido aislamiento A/B y
   concurrencia; depende de #115 y #116.

Cada bloque usa issue, branch, commit vinculado, PR y gate propio. Los cambios
de base se aplican por Supabase remoto y se verifican con schema, SQL y advisors.
