# Documents Module

## Propósito

Documents administra requisitos y archivos vinculados a clientes, propiedades,
contratos y negocios. Su recorrido principal en el beta es el expediente
documental del negocio.

El módulo no impone KYC como requisito de SoyPMS. Cada organización decide si
necesita documentos de identidad, debida diligencia u otros requisitos y los
incorpora a sus plantillas.

## Separación De Expedientes

### Expediente Del Cliente

Conserva documentos propios de la persona o empresa. Un documento vigente puede
referenciarse desde varios negocios sin duplicar el archivo. La referencia debe
identificar la versión utilizada en cada operación.

### Expediente De La Propiedad

Conserva evidencias del inmueble, por ejemplo escrituras, planos, reglamentos,
permisos, inventarios o paz y salvo.

### Expediente Del Negocio

Conserva requisitos y evidencias de una transacción específica. Puede incluir:

- Reserva y comprobante de reserva.
- Oferta o contraoferta firmada.
- Promesa de compraventa.
- Contrato de compraventa o arrendamiento.
- Adendas y anexos.
- Poderes o autorizaciones.
- Identificación de participantes cuando la organización la requiera.
- Comprobantes de pago.
- Documentos bancarios.
- Escritura, acta de entrega y documentos de cierre.
- Cualquier documento personalizado pertinente para la operación.

Las categorías ayudan a ordenar, pero no forman un enum cerrado que impida
agregar nuevos tipos.

## Plantillas Por Organización

Una organización puede crear, editar, activar, desactivar y versionar plantillas.
Una plantilla puede aplicar por:

- Operación de venta, alquiler o ambas.
- País.
- Tipo de propiedad.
- Tipo de contrato.
- Etapa del negocio.

Cada requisito configurable puede definir:

- Nombre, categoría y descripción.
- Obligatorio u opcional.
- Etapa en la que se requiere.
- Fecha límite relativa o absoluta.
- Si requiere revisión.
- Si permite varios archivos.
- Si tiene fecha de vencimiento.
- Participante al que corresponde.
- Roles que pueden leer, cargar o revisar.
- Si bloquea una transición del negocio.

Al crear el expediente se guarda una instantánea de los requisitos aplicados.
Cambiar una plantilla no debe modificar silenciosamente negocios existentes.

## Modelo Persistente Inicial

- `document_checklist_templates`: versión de una plantilla y sus criterios de
  aplicabilidad. `familyKey` agrupa todas las versiones funcionales.
- `document_checklist_template_items`: requisitos configurables de esa versión,
  incluidos etapa, plazos relativos, participante, roles y bloqueo.
- `business_document_checklists`: cabecera inmutable de la plantilla aplicada a
  un negocio, con nombre, versión y criterios de aplicabilidad copiados.
- `business_document_requirements`: requisitos materializados del expediente.
  Conservan `itemSnapshot`; por eso una edición posterior de la plantilla no
  altera la evidencia histórica del negocio.

Todas estas tablas incluyen `organizationId`. Las relaciones con plantilla,
negocio, checklist e ítem usan claves foráneas compuestas por organización e ID;
la base de datos rechaza una relación cruzada aunque se intente omitir el filtro
en la aplicación. Solo puede existir una versión activa por familia y
organización.

## API De Configuración De Plantillas

Los endpoints administrativos viven bajo
`/api/document-checklist-templates`:

- `GET /`: lista las versiones activas; `includeInactive=true` incorpora el
  historial de borradores y versiones desactivadas.
- `GET /:templateId`: consulta una versión con sus requisitos.
- `POST /`: crea la primera versión de una familia.
- `PATCH /:templateId`: edita un borrador que todavía no se ha aplicado a un
  negocio. Si la versión ya fue activada o usada por un expediente, crea una
  versión nueva e inactiva y mantiene la versión publicada sin modificaciones.
- `POST /:templateId/activate`: activa esa versión y desactiva la versión activa
  anterior de la misma familia.
- `POST /:templateId/deactivate`: retira la versión de nuevas aplicaciones sin
  afectar los expedientes existentes.

Solo memberships activas `OWNER` o `ADMIN` de la organización indicada pueden
usar esta API. La organización se vuelve a validar en el servicio, incluso
cuando el usuario tenga un rol administrativo en otra organización. Cada
creación, edición, versión, activación y desactivación genera una entrada de
auditoría.

## API Del Expediente Del Negocio

El expediente se opera dentro del negocio:

- `GET /api/businesses/:businessId/document-checklists`: devuelve los
  checklists instanciados, requisitos visibles para el rol y un resumen de
  avance, pendientes obligatorios y bloqueantes.
- `POST /api/businesses/:businessId/document-checklists`: instancia una
  plantilla activa aplicable. Repetir la solicitud para la misma familia es
  idempotente y devuelve el snapshot existente.
- `POST /api/businesses/:businessId/document-checklists/:checklistId/requirements`:
  agrega un requisito libre con nombre, categoría abierta y motivo obligatorio.
- `POST /api/businesses/:businessId/document-checklists/:checklistId/requirements/:requirementId/files`:
  recibe un único archivo `multipart/form-data` en el campo `file`, aplica los
  permisos del requisito y crea sus metadatos solo después de almacenarlo.
- `GET /api/businesses/:businessId/document-checklists/:checklistId/requirements/:requirementId/files/:documentId/download`:
  autoriza nuevamente organización, negocio, requisito y rol antes de emitir
  una URL firmada con vigencia de 60 segundos.
- `POST /api/businesses/:businessId/document-checklists/:checklistId/requirements/:requirementId/files/:documentId/replacements`:
  carga una versión nueva con motivo obligatorio y archiva la versión anterior
  sin sobrescribir ni eliminar su objeto.
- `POST /api/businesses/:businessId/document-checklists/:checklistId/requirements/:requirementId/transitions`:
  ejecuta una transición documental válida y registra documento, actor, motivo,
  estado anterior y estado nuevo.
- `GET /api/businesses/:businessId/document-checklists/:checklistId/requirements/:requirementId/history`:
  devuelve la cadena de versiones y la línea de eventos sin exponer rutas de
  Storage.
- `POST /api/businesses/:businessId/document-checklists/transition-validation`:
  valida un estado objetivo del negocio y responde `409` con los requisitos
  bloqueantes incompletos. Los detalles sensibles solo se muestran a roles con
  lectura del requisito.

La instanciación copia versión, criterios y requisitos, calcula las fechas
relativas y nunca reescribe el expediente cuando cambia la plantilla. La
aplicabilidad se valida contra operación, estado, contrato, país y tipo de
propiedad del negocio.

Un requisito libre puede relacionarse con el cliente participante, la propiedad
del negocio, un contrato del negocio o un participante registrado. La API valida
esas relaciones y la base las protege con claves compuestas de organización y/o
negocio. IDs ajenos se rechazan y no producen registros parciales.

El porcentaje de avance se calcula sobre requisitos obligatorios visibles. Los
requisitos opcionales permanecen en el total y pueden completarse sin impedir
que los obligatorios alcancen cien por ciento. Un requisito bloqueante aplica a
todos los estados si no define `requiredAtStatus`, o únicamente al estado
configurado. La validación server-side impide continuar mientras exista alguno.

## Documentos No Previstos

Un usuario con permiso puede agregar al expediente un requisito o documento que
no exista en la plantilla. Debe registrar nombre, categoría, motivo, usuario y
fecha. Los documentos libres usan las mismas reglas de seguridad, auditoría,
versionamiento y organización que los documentos esperados.

## Estados

- `REQUIRED`: pendiente de carga.
- `UPLOADED`: cargado y pendiente de revisión cuando aplique.
- `UNDER_REVIEW`: revisión iniciada.
- `APPROVED`: aceptado para el flujo actual.
- `OBSERVED`: requiere corrección o información adicional.
- `REJECTED`: no aceptado, con motivo obligatorio.
- `EXPIRED`: perdió vigencia.
- `NOT_APPLICABLE`: requisito descartado con justificación.
- `REPLACED`: existe una versión posterior vigente.

Las transiciones deben validarse en servidor y no todos los requisitos tienen
que recorrer todos los estados.

Reglas iniciales del beta:

- Una carga o reemplazo lleva el requisito a `UPLOADED`.
- Si `requiresReview=true`, `UPLOADED` debe pasar por `UNDER_REVIEW` antes de
  aprobar, observar o rechazar.
- `OBSERVED`, `REJECTED`, `EXPIRED` y `NOT_APPLICABLE` requieren motivo.
- `NOT_APPLICABLE` solo se acepta cuando no existen archivos vigentes.
- Un documento observado o rechazado vuelve a `UPLOADED` mediante reemplazo;
  no se edita el archivo anterior.
- `APPROVED` puede pasar a `EXPIRED`; estados terminales no se reabren sin una
  versión nueva.

## Versionamiento Y Relaciones

- Un archivo cargado no se sobrescribe.
- Cada reemplazo conserva versión anterior, versión nueva, autor, fecha y motivo.
- `lineageId` identifica la cadena; `version` es creciente e `isCurrent` solo
  puede ser verdadero para una versión de esa cadena. La base de datos impide
  dos versiones vigentes y predecesores de otra organización, negocio o
  requisito.
- `business_document_requirement_events` conserva la línea inmutable de
  transiciones con actor y motivo. Sus claves compuestas impiden insertar un
  evento o documento de otro expediente.
- Una adenda se relaciona con el contrato que modifica; no es solamente una nueva
  versión del contrato. Esa relación se conserva en `businessContractId` del
  requisito y se copia a cada archivo de su cadena.
- El expediente permite múltiples contratos, adendas y anexos cuando el negocio
  lo requiera.
- La eliminación física no es una acción operativa normal; se usa reemplazo,
  archivo o política de retención auditable.

## Permisos Iniciales

- `OWNER` y `ADMIN`: configurar plantillas y administrar permisos.
- `BROKER` y `OPERATIONS`: administrar expedientes y revisar documentos.
- `AGENT`: consultar y cargar cuando tenga acceso al negocio.
- `FINANCE`: consultar documentos financieros y de pago autorizados.
- `READONLY`: lectura solo cuando la política del documento lo permita.

## Workspace Operativo Del Negocio

La ruta `/businesses/:businessId/documents` es la entrada principal al
expediente durante el beta. El listado de negocios enlaza cada operación
confirmada a esta ruta y conserva `organizationId` en la navegación para no
inferir el ámbito cuando un usuario pertenece a más de una organización.
La navegación global `/documents` funciona como selector de expedientes y ya no
ofrece captura genérica de rutas de archivo o metadatos de Storage.

La pantalla consume exclusivamente la respuesta autorizada del API y muestra:

- Progreso de requisitos obligatorios, pendientes, completados y bloqueos.
- Requisitos separados por estado y agrupados dentro de cada vista por la etapa
  que pueden bloquear, con categoría, fecha y relación contractual visibles.
- Archivos vigentes, descarga firmada y reemplazo como versión nueva.
- Acciones de carga y revisión solo cuando el rol activo aparece en
  `uploadRoles` o `reviewRoles` del requisito.
- Requisitos personalizados con nombre, categoría abierta y motivo.
- Historial de versiones y eventos sin revelar rutas privadas de Storage.
- Estados explícitos de carga, expediente vacío, error y ausencia de permisos.

Solo `OWNER` y `ADMIN` consultan plantillas e inicializan un expediente vacío
desde la interfaz. Los demás roles reciben una indicación operativa sin intentar
consultar la API administrativa. La pantalla no considera un KYC fijo ni crea
documentos ficticios: cada requisito proviene de la plantilla de la organización
o de una adición explícita y auditable del equipo.

En pantallas estrechas, el resumen lateral pasa debajo del checklist, las
acciones ocupan el ancho disponible y ningún control depende únicamente del
color para comunicar estado o bloqueo.

Los permisos finales se evalúan por membership activa, organización, relación
con el negocio y sensibilidad del documento.

## Almacenamiento

- Los archivos viven en el bucket privado `business-documents`; no existen
  políticas de lectura pública ni URLs permanentes.
- La ruta usa
  `{organizationId}/businesses/{businessId}/checklists/{checklistId}/requirements/{requirementId}/{uuid}-{nombre}`.
- Las descargas usan autorización server-side y una URL temporal de 60 segundos.
- El servidor limita cada archivo a 15 MB y acepta PDF, JPEG, PNG, DOC y DOCX.
  Valida extensión, MIME y firma binaria básica antes de escribir en Storage.
- Metadata y estado viven en PostgreSQL; el binario no debe quedar embebido en
  una respuesta JSON.
- La carga escribe primero el objeto privado y luego crea documento y auditoría
  en una transacción. Si falla la transacción, elimina el objeto para no dejar
  archivos huérfanos. Un fallo de Storage nunca crea metadatos.
- Los endpoints genéricos de documentos no aceptan `storagePath`, nombre, MIME o
  tamaño enviados por el cliente y no exponen archivos del checklist.
- El API requiere `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. La clave secreta es
  exclusiva del backend y nunca debe usar el prefijo `NEXT_PUBLIC_`.
- Retención, eliminación y eventual escaneo de archivos se completan en el lote
  de hardening antes del beta público.

## Auditoría

Registrar como mínimo:

- Creación o cambio de plantilla.
- Instanciación de checklist.
- Creación de requisito personalizado.
- Carga, descarga sensible, revisión, observación, aprobación y rechazo.
- Reemplazo, cambio de versión y cambio de permisos.
- Marcación como no aplicable o vencido.

## Criterios De Aceptación Del Lote

- Dos organizaciones pueden usar plantillas distintas sin compartir datos.
- Una plantilla se instancia como snapshot en un negocio.
- Se pueden agregar reservas, contratos, varias adendas y documentos libres.
- Un cambio de plantilla no reescribe expedientes existentes.
- Un archivo reemplazado conserva historial.
- Un documento bloqueante impide la transición configurada.
- Una organización no puede leer, relacionar ni descargar documentos de otra.
