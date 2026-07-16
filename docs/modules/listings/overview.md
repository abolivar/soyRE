# Módulo De Preparación Comercial Y Publicaciones

## Propósito

Listings convierte una propiedad autorizada en un producto comercial listo para
ofrecer. Reúne modalidad, precio autorizado, copy público, materiales, canales,
aprobación interna y estado de publicación.

Un listing no es la propiedad, el mandato ni el negocio. Pertenece a una
`organization`, referencia una `property` y usa un mandato activo como gate.
`property` continúa siendo la entidad central del ciclo inmobiliario.

## Decisiones Del Beta

- Venta y alquiler se preparan como listings separados. Un mandato `BOTH` puede
  habilitar uno de venta y otro de alquiler, nunca un listing ambiguo `BOTH`.
- El beta controla la publicación de forma interna. No confirma que un portal
  externo haya aceptado contenido y no simula integraciones inexistentes.
- Crear un listing siempre produce `DRAFT`; el cliente no elige un estado libre.
- Readiness es calculado por el servidor. El JSON histórico puede conservar un
  snapshot, pero nunca es una entrada confiable enviada por la UI.
- La aprobación es una decisión humana posterior al readiness técnico.
- Los cambios materiales después de aprobar devuelven el listing a preparación
  y dejan historial; no alteran silenciosamente una publicación aprobada.
- Pausar y retirar son conceptos distintos. Una pausa puede reanudarse; un
  retiro termina la publicación operativa y luego puede archivarse.
- No se elimina físicamente un listing usado ni su historial.

## Modalidad

El API acepta exclusivamente `SALE` o `RENT`:

- `SALE` requiere que `property.operations` incluya venta, un precio de venta
  mayor que cero y un mandato activo compatible con venta.
- `RENT` requiere alquiler, canon mayor que cero, disponibilidad y un mandato
  activo compatible con alquiler.
- `RESERVATION`, `ASSIGNMENT`, `PRE_SALE`, `SEPARATION` y `OTHER` pertenecen al
  negocio transaccional y se rechazan como modalidades de listing.

Solo puede existir un listing no terminal por organización, propiedad y
modalidad. Reintentar la creación con la misma clave idempotente devuelve el
recurso ya creado; una solicitud distinta devuelve conflicto.

## Estados Objetivo

| Estado      | Significado operativo                                                   |
| ----------- | ----------------------------------------------------------------------- |
| `DRAFT`     | Copy, precio, canales y materiales todavía editables.                   |
| `READY`     | Readiness técnico satisfecho; pendiente de aprobación humana.           |
| `APPROVED`  | Contenido aprobado para publicarse en los canales seleccionados.        |
| `PUBLISHED` | Publicación interna registrada; no implica sincronización con portales. |
| `PAUSED`    | Temporalmente fuera de oferta; puede reanudarse tras revalidar.         |
| `WITHDRAWN` | Retirado de forma definitiva de la operación comercial actual.          |
| `ARCHIVED`  | Estado terminal fuera de vistas operativas, disponible para auditoría.  |

`WITHDRAWN` amplía el enum persistente actual. La migración, schema, DTOs,
serializadores, filtros y UI deben cambiar juntos.

## Transiciones

| Desde                             | Acción                 | Hacia       | Reglas principales                                     |
| --------------------------------- | ---------------------- | ----------- | ------------------------------------------------------ |
| `DRAFT`                           | declarar listo         | `READY`     | Readiness completo y sin bloqueantes.                  |
| `READY`                           | devolver a preparación | `DRAFT`     | Motivo obligatorio.                                    |
| `READY`                           | aprobar                | `APPROVED`  | Rol aprobador y snapshot vigente de readiness.         |
| `APPROVED`                        | devolver a preparación | `DRAFT`     | Motivo; invalida la aprobación anterior.               |
| `APPROVED`                        | publicar               | `PUBLISHED` | Readiness revalidado y al menos un canal seleccionado. |
| `PUBLISHED`                       | pausar                 | `PAUSED`    | Motivo obligatorio.                                    |
| `PAUSED`                          | reanudar               | `PUBLISHED` | Readiness y mandato revalidados.                       |
| `APPROVED`, `PUBLISHED`, `PAUSED` | retirar                | `WITHDRAWN` | Motivo y fecha efectiva obligatorios.                  |
| `DRAFT`, `WITHDRAWN`              | archivar               | `ARCHIVED`  | Solo `OWNER` o `ADMIN`; motivo obligatorio.            |

Una transición fuera de la matriz devuelve `409` y no escribe estado, evento
ni auditoría parcial. La misma organización y clave de idempotencia devuelve el
evento existente. Claves iguales entre organizaciones no colisionan.

## Edición Y Cambios Materiales

En `DRAFT` se pueden editar copy, materiales, canales sugeridos y notas. En
`READY` solo se permiten correcciones que devuelvan el recurso a `DRAFT` dentro
de la misma transacción.

Son cambios materiales:

- modalidad, propiedad o mandato;
- precio o moneda visibles;
- título y copy público;
- portada, conjunto u orden de materiales;
- canales seleccionados;
- condiciones comerciales públicas.

Después de `APPROVED`, un cambio material exige la acción “devolver a
preparación”, motivo y una nueva aprobación. Fechas, actores y diferencias se
conservan en el historial.

## Readiness Comercial

El servidor calcula bloqueantes con códigos estables y copy de producto
localizado en la web. Para pasar a `READY`, `APPROVED`, `PUBLISHED` o reanudar:

1. La propiedad pertenece a la organización, no está cerrada, retirada ni
   archivada y admite la modalidad.
2. Existe un mandato `ACTIVE` explícitamente relacionado, de la misma propiedad
   y organización, compatible con la modalidad y vigente en la fecha actual.
3. La evidencia firmada del mandato continúa aprobada y no existen bloqueantes
   documentales aplicables.
4. El precio correspondiente es mayor que cero y la moneda usa tres letras ISO.
5. País, ciudad, zona y tipo de propiedad están completos.
6. El título y copy público cumplen mínimos de longitud y no contienen texto de
   demostración presentado como real.
7. Existe una portada vigente y al menos un material comercial vigente. Cada
   material tiene tipo, orden, nombre accesible, actor y organización.
8. Para publicar o reanudar existe al menos un canal seleccionado.

El resultado incluye `ready`, `checkedAt` y una lista de bloqueantes con
`code`, `scope` y recurso relacionado. No se aceptan bloqueantes o porcentajes
calculados por el cliente.

Si un mandato publicado vence, se cancela o queda reemplazado, el listing no
puede reanudarse ni ejecutar nuevas transiciones comerciales. La pausa
automática y la creación de tareas pertenecen al lote de workflow; hasta
entonces el dashboard debe hacer visible la regularización pendiente.

## Materiales Comerciales

Los materiales pertenecen al listing y no se mezclan con documentos legales.
El modelo objetivo conserva:

- tipo (`COVER_IMAGE`, `GALLERY_IMAGE`, `FLOOR_PLAN`, `VIDEO_LINK` u otro tipo
  configurado que el beta admita);
- orden, nombre, texto alternativo y vigencia;
- referencia privada o URL validada según el tipo;
- autor, fecha, reemplazo y motivo;
- `organizationId`, `listingId` y claves compuestas de aislamiento.

Los binarios se almacenan de forma privada y se previsualizan mediante URLs
firmadas cortas. No se reutiliza el bucket legal del expediente, no se aceptan
paths enviados por el cliente y no se crean URLs públicas permanentes durante
este lote. Portada y galería nunca se presentan como publicadas en un portal.

## Canales

Los canales son destinos declarados por la organización, por ejemplo sitio
propio, redes, cartelera interna o un portal operado manualmente. Para el beta:

- seleccionar un canal registra intención y alcance;
- publicar registra actor y fecha internos;
- no se inventan IDs, URLs ni estados de sincronización externos;
- un fallo o retiro por canal se agrega después como integración explícita.

## Tenancy Y Relaciones

- Listing, propiedad, mandato, materiales, eventos y actores derivan acceso de
  una membership activa en la misma `organization`.
- Las FK listing→property y listing→mandate usan organización más ID.
- El mandato debe pertenecer a la propiedad seleccionada.
- Conocer un UUID ajeno devuelve `404` después de resolver la membership; no
  permite inferir título, readiness, materiales ni historial.
- Listas, búsquedas, conteos y filtros siempre incluyen organización.
- Las tablas nuevas se crean con RLS habilitado y acceso directo por Data API
  cerrado; el API confiable sigue siendo la frontera operativa.

## Permisos Iniciales

| Acción                                       | Roles                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| Listar y consultar                           | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`, asignados y `READONLY`.         |
| Crear y editar preparación                   | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`; agente asignado a la propiedad. |
| Administrar materiales                       | Los mismos roles de edición.                                              |
| Declarar listo o devolver a preparación      | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`.                                 |
| Aprobar, publicar, pausar, reanudar, retirar | `OWNER`, `ADMIN`, `BROKER`, `OPERATIONS`.                                 |
| Archivar                                     | `OWNER`, `ADMIN`.                                                         |

`FINANCE` puede leer precios y condiciones financieras autorizadas, pero no
modifica copy ni publicación. `READONLY` nunca muta. La UI oculta acciones no
permitidas, pero el API vuelve a validar organización, rol y asignación.

## Auditoría E Historial

Cada acción crítica se registra en la misma transacción que el cambio:

- creación y edición de borrador;
- cambio de modalidad, precio, copy, canales o materiales;
- readiness aceptado o rechazado;
- aprobación, publicación, pausa, reanudación, retiro y archivo;
- reemplazo y reordenamiento de materiales.

El evento conserva organización, listing, actor, estado anterior/nuevo, acción,
motivo, clave idempotente, snapshot de readiness y campos materiales cambiados.
El historial se ordena por fecha y desempata por ID.

## API Objetivo

- `GET /api/listings`: búsqueda y filtros por estado, modalidad, propiedad,
  responsable, canal y bloqueantes.
- `GET /api/listings/:listingId`: detalle, readiness, materiales, mandato e
  historial resumido.
- `POST /api/listings`: crea únicamente `DRAFT` de forma idempotente.
- `PATCH /api/listings/:listingId`: edita campos permitidos del borrador.
- `POST /api/listings/:listingId/transitions`: ejecuta una transición validada.
- `GET /api/listings/:listingId/history`: eventos inmutables.
- `POST /api/listings/:listingId/materials`: agrega un material autorizado.
- `PATCH /api/listings/:listingId/materials/:materialId`: reemplaza, ordena o
  archiva sin perder historia.

`organizationId` selecciona una membership del usuario; nunca concede acceso.
Errores visibles se traducen a español y no exponen nombres internos.

## Workspace Objetivo

`/listings` deja de ser un alta genérica y ofrece:

- lista con búsqueda y filtros por modalidad, estado, canal y readiness;
- indicadores de borradores, listos, publicados y bloqueados;
- detalle de propiedad, mandato, precio y vigencia;
- editor de copy, portada, galería, orden y canales;
- checklist de readiness con bloqueantes accionables;
- acciones contextuales por estado, rol y asignación;
- historial de aprobación y publicación;
- loading, empty, error, sin permisos y adaptación móvil.

## QA Obligatorio

- Venta, alquiler y dos listings separados habilitados por mandato `BOTH`.
- Rechazo de modalidades transaccionales no comerciales.
- Matriz completa de transiciones válidas e inválidas.
- Readiness exacto para cada campo, mandato y material ausente.
- Mandato vencido, cancelado, supersedido, ajeno o de otra modalidad.
- Dos creaciones concurrentes para la misma propiedad/modalidad.
- Idempotencia de transición y publicación.
- Cambios materiales que invalidan aprobación.
- Roles, asignación y cruces A/B por listing, propiedad, mandato y material.
- Upload adulterado, path fuera de ámbito y rollback sin metadata huérfana.
- Auditoría exacta y ausencia de escrituras parciales.
- E2E autenticado desktop/móvil de lista, preparación, aprobación, publicación,
  pausa, reanudación, retiro y estados vacíos/error.

## División De Implementación

1. #127 — modelo, migración remota, materiales, servicio de dominio, API,
   historial y readiness.
2. #128 — workspace operativo de Publicaciones con acciones por estado y rol;
   depende de #127.
3. #129 — QA adversarial remoto y E2E, incluido aislamiento A/B, concurrencia y
   rollback de Storage; depende de #127 y #128.

Cada bloque usa issue, branch, commits vinculados, PR y gate propio. Los cambios
de base se aplican por Supabase MCP y se verifican con schema, SQL y advisors.

## Estado De Implementación

El lote #127 implementa en branch el modelo operativo, la migración, el
servicio de dominio, readiness, historial, transiciones y materiales privados.
La migración separa la ampliación de `ListingStatus` de las tablas que consumen
el valor nuevo para respetar el límite transaccional de PostgreSQL. Los
materiales binarios usan el bucket privado `listing-materials`, paths generados
por el servidor, validación de firma y MIME, límite de 15 MB y previews firmados
por 60 segundos. Los enlaces de video requieren HTTPS.

La aplicación remota, los advisors de Supabase y las pruebas integrales A/B
siguen siendo gates del PR: el código local aprobado no se presenta como schema
remoto verificado hasta completar esas evidencias.

El lote #128 reemplaza la vista genérica de `/listings` por un workspace
operativo: alta separada para venta y alquiler, filtros, métricas, detalle,
readiness localizado, acciones derivadas del estado y rol, edición de copy y
canales, materiales privados con preview, reemplazo, archivo y orden, e
historial cronológico. El workspace consume exclusivamente el contrato de #127
y no simula publicaciones en portales externos.

El lote #129 automatiza una matriz adversarial opt-in para lifecycle, venta y
alquiler separados, mandato `BOTH`, roles, asignación, aislamiento A/B,
idempotencia, carreras de creación y rollback de Storage. También agrega un E2E
autenticado independiente para Chromium desktop y móvil. Los flags, puertos,
prerrequisitos y resultados exactos están en
`docs/testing/listings-adversarial-beta.md`.
