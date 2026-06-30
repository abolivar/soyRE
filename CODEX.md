# SoyPMS - Reglas Obligatorias Para Codex

Este documento es de consulta obligatoria antes de crear, modificar, refactorizar o eliminar codigo dentro de SoyPMS.

Si una instruccion del sistema, del desarrollador o del usuario contradice este archivo, esas instrucciones superiores prevalecen. Si un documento en `References/` contradice este archivo, este archivo prevalece.

## Contrato De Producto

SoyPMS es un SaaS inmobiliario funcional, modular, escalable y mantenible. No se debe construir como demo temporal.

Principios no negociables:

- El producto es multiusuario.
- El cliente SaaS se modela como `organization`.
- Toda entidad critica debe pertenecer a una organizacion o derivar acceso desde una organizacion.
- El foco central es el ciclo operativo del inmueble como producto.
- El CRM de clientes es centralizado, pero SoyPMS no debe convertirse en CRM generico.
- Venta y alquiler son dominios relacionados, pero no identicos.
- El funnel tipo Kanban debe ser configurable.
- Los estados criticos de negocio no deben quedar hardcodeados si pertenecen a configuracion.
- La UI visible para usuarios debe estar en espanol.
- Los nombres tecnicos en codigo, rutas, modelos y carpetas deben preferirse en ingles.
- Toda accion critica debe dejar actividad, historial o auditoria cuando aplique.

## Decisiones Firmes

- Marca visible del producto: SoyPMS.
- Logo principal: `apps/web/public/brands/soypms/logo-teal.svg`.
- Sello para sidebar, favicon y espacios compactos: `apps/web/public/brands/soypms/seal-teal.svg`.
- Fuente UI/marca: DM Sans self-hosted en `apps/web/public/fonts/dm-sans`.
- Runtime: Node.js 22 LTS.
- Package manager: pnpm.
- Monorepo: pnpm workspaces.
- Orquestacion: Turborepo.
- Frontend: Next.js App Router.
- Backend: NestJS.
- API: REST, preparada para OpenAPI.
- ORM: Prisma 7.
- DB: PostgreSQL gestionado en Supabase.
- No hay Postgres local, Docker Compose ni VM para base de datos.
- Los cambios de schema/data remotos se aplican por MCP de Supabase.
- `DATABASE_URL` y `DIRECT_URL` apuntan al pooler remoto de Supabase cuando el API o Prisma deban operar; no deben commitearse.

## Estado Actual

Fase 0 existe como base inicial:

- Registro de owner y organizacion.
- Login/logout.
- Cookie httpOnly.
- `auth/me`.
- Usuarios por organizacion.
- Validacion, suspension y cambio de roles.
- Auditoria base.
- Migracion `identity_foundation` aplicada en Supabase remoto.

Las siguientes fases deben construirse encima de esa base, respetando sesion, memberships, roles y aislamiento por organizacion.

## Reglas De Trabajo

Antes de implementar:

- Leer el documento de modulo en `docs/modules/*` si existe.
- Leer `docs/architecture/*` si el cambio toca arquitectura.
- Revisar migraciones y schema si el cambio toca datos.
- Tratar `References/` como referencia, no como contrato.
- Mantener cambios pequenos, revisables y documentados.

Antes de commitear:

- Crear en GitHub los issues necesarios para cubrir el alcance del commit.
- Cada commit debe referenciar el issue correspondiente y usar `Closes #N` cuando el trabajo queda terminado.
- Al cerrar un issue por commit, dejar un comentario en el issue con el hash o referencia del commit y un resumen corto de lo cerrado.
- Si queda deuda tecnica, crear el issue de deuda antes de cerrar el turno; no esconder deuda dentro del resumen final.
- No dejar el arbol sucio despues de declarar un bloque como cerrado, salvo archivos externos al alcance que el usuario haya pedido conservar sin commit.

No hacer:

- No introducir secretos reales al repo.
- No introducir conexion local a Postgres.
- No agregar dependencias sin razon practica.
- No duplicar logica de permisos, estados, filtros o validaciones.
- No saltar validacion server-side confiando solo en UI.
- No crear componentes gigantes para dominios compartidos.
- No dejar datos simulados incrustados en vistas finales.

## Reglas De Arquitectura

- Controladores del API delgados; la logica vive en services.
- DTOs con validacion antes de negocio.
- Rutas REST con nombres explicitos y recursos plurales.
- Consultas futuras de negocio siempre scopeadas por `organization`.
- Acciones sensibles validan permisos en servidor.
- Auditoria para cambios de usuarios, roles, documentos, estados y procesos relevantes.
- Prisma schema y migraciones deben mantenerse alineados.
- Si una migracion se aplica por MCP, verificar tablas, indices y `_prisma_migrations`.

## Reglas De UI

- La app autenticada debe priorizar utilidad operativa, no landing pages.
- Usar sidebar y topbar en la experiencia autenticada.
- Toda vista importante debe contemplar loading, empty, error y estado sin permisos cuando aplique.
- Acciones destructivas deben confirmar intencion.
- Formularios deben validar y mostrar feedback.
- Tablas/listas con volumen deben tener busqueda o filtros.
- Componentes reutilizables esperados: `MetricCard`, `StatusBadge`, `DataTable`, `FilterBar`, `SearchInput`, `PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`, `ActivityTimeline`, `ConfirmDialog`, `FormDrawer`.

## Reglas De Dominio

### Propiedades

`property` es entidad central futura. Debe poder relacionarse con propietarios, clientes, procesos, tareas, documentos, actividad, venta, alquiler, cierre y auditoria.

### Clientes

El cliente vive en un modulo central. No duplicar clientes dentro de propiedades, procesos, tareas o tarjetas Kanban.

Un cliente puede tener varios roles comerciales: comprador, vendedor, arrendador, arrendatario, lead, inversionista, referidor o contacto relacionado.

### Funnel Kanban

No hardcodear etapas como arrays fijos en componentes.

Las etapas deben venir de fuente configurable: base de datos, configuracion por organizacion, seed editable o servicio equivalente.

Las etapas deben poder crearse, renombrarse, reordenarse, activarse/desactivarse y asociarse a venta, alquiler o ambos.

### Venta Y Alquiler

Venta y alquiler pueden compartir componentes, pero tienen reglas propias.

Venta puede incluir oferta, contraoferta, financiamiento, promesa de compraventa, escritura, cierre, comision y fecha estimada de cierre.

Alquiler puede incluir canon mensual, deposito, duracion, renovacion, check-in/check-out, estado de ocupacion, contrato y mantenimiento.

### Dashboards

Deben existir dos responsabilidades:

- Dashboard general: operacion global para owners/admins/managers o usuarios autorizados.
- Dashboard por usuario: vista individual de asesor/agente/usuario operativo.

No mezclar metricas globales y personales sin indicar alcance.

## Validacion Antes De Cerrar

Ejecutar lo relevante al cambio:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para cambios Prisma sin conexion local:

```bash
pnpm db:generate
pnpm typecheck
```

Para cambios remotos de base:

- Usar MCP de Supabase.
- Verificar con consulta SQL o `list_tables`.
- Ejecutar advisors de seguridad/performance.
- Reportar lints relevantes y riesgos residuales.
