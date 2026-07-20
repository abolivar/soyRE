# SoyPMS - Reglas Obligatorias Para Codex

Este documento es de consulta obligatoria antes de crear, modificar, refactorizar o eliminar código dentro de SoyPMS.

Si una instrucción del sistema, del desarrollador o del usuario contradice este archivo, esas instrucciónes superiores prevalecen. Si un documento en `References/` contradice este archivo, este archivo prevalece.

## Contrato De Producto

SoyPMS es un SaaS inmobiliario funcional, modular, escalable y mantenible. No se debe construir como demo temporal.

Principios no negociables:

- El producto es multiusuario.
- El cliente SaaS se modela como `organization`.
- Toda entidad crítica debe pertenecer a una organización o derivar acceso desde una organización.
- El foco central es el ciclo operativo del inmueble como producto.
- El CRM de clientes es centralizado, pero SoyPMS no debe convertirse en CRM genérico.
- Venta y alquiler son dominios relacionados, pero no idénticos.
- El funnel tipo Kanban debe ser configurable.
- Los estados críticos de negocio no deben quedar hardcodeados si pertenecen a configuración.
- La UI visible para usuarios debe estar en español.
- Los nombres técnicos en código, rutas, modelos y carpetas deben preferirse en inglés.
- Toda acción crítica debe dejar actividad, historial o auditoría cuando aplique.

## Decisiones Firmes

- Marca visible del producto: SoyPMS.
- Logo principal: `apps/web/public/brands/soypms/logo-teal.svg`.
- Sello para sidebar, favicon y espacios compactos: `apps/web/public/brands/soypms/seal-teal.svg`.
- Fuente UI/marca: DM Sans self-hosted en `apps/web/public/fonts/dm-sans`.
- Runtime soportado y de despliegue: Node.js 22 LTS (`22.x`).
- Runtime local reproducible: Node.js `22.22.2`, declarado en `.nvmrc` y
  `pnpm-workspace.yaml`.
- Package manager: pnpm `10.33.2`, declarado en `package.json`.
- Monorepo: pnpm workspaces.
- Orquestación: Turborepo.
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

- Registro de owner y organización.
- Login/logout.
- Cookie httpOnly.
- `auth/me`.
- Usuarios por organización.
- Validación, suspensión y cambio de roles.
- Auditoría base.
- Migración `identity_foundation` aplicada en Supabase remoto.

Las siguientes fases deben construirse encima de esa base, respetando sesión, memberships, roles y aislamiento por organización.

## Reglas De Trabajo

Antes de implementar:

- Ejecutar comandos del proyecto mediante `pnpm`; el workspace selecciona el
  Node local reproducible aunque la shell padre tenga otra version.
- Confirmar el contrato con `pnpm runtime:check` cuando se diagnostique el
  entorno o el despliegue.
- Leer el documento de módulo en `docs/modules/*` si existe.
- Leer `docs/architecture/*` si el cambio toca arquitectura.
- Revisar migraciones y schema si el cambio toca datos.
- Tratar `References/` como referencia, no como contrato.
- Mantener cambios pequeños, revisables y documentados.

Antes de commitear:

- Crear en GitHub los issues necesarios para cubrir el alcance del commit.
- Cada commit debe referenciar el issue correspondiente y usar `Closes #N` cuando el trabajo queda terminado.
- Al cerrar un issue por commit, dejar un comentario en el issue con el hash o referencia del commit y un resumen corto de lo cerrado.
- Si queda deuda técnica, crear el issue de deuda antes de cerrar el turno; no esconder deuda dentro del resumen final.
- No dejar el árbol sucio después de declarar un bloque como cerrado, salvo archivos externos al alcance que el usuario haya pedido conservar sin commit.

No hacer:

- No introducir secretos reales al repo.
- No introducir conexión local a Postgres.
- No agregar dependencias sin razón práctica.
- No duplicar lógica de permisos, estados, filtros o validaciones.
- No saltar validación server-side confiando solo en UI.
- No crear componentes gigantes para dominios compartidos.
- No dejar datos simulados incrustados en vistas finales.

## Reglas De Arquitectura

- Controladores del API delgados; la lógica vive en services.
- DTOs con validación antes de negocio.
- Rutas REST con nombres explícitos y recursos plurales.
- Consultas futuras de negocio siempre scopeadas por `organization`.
- Acciones sensibles validan permisos en servidor.
- Auditoría para cambios de usuarios, roles, documentos, estados y procesos relevantes.
- Prisma schema y migraciones deben mantenerse alineados.
- Si una migración se aplica por MCP, verificar tablas, índices y `_prisma_migrations`.

## Reglas De UI

- La app autenticada debe priorizar utilidad operativa, no landing pages.
- Usar sidebar y topbar en la experiencia autenticada.
- Toda vista importante debe contemplar loading, empty, error y estado sin permisos cuando aplique.
- Acciones destructivas deben confirmar intención.
- Formularios deben validar y mostrar feedback.
- Tablas/listas con volumen deben tener búsqueda o filtros.
- Sistema de diseño: spec visual en `design.md`; lenguaje visual vigente en `docs/architecture/visual-language.md`; reglas arquitectónicas en `docs/architecture/design-system.md`; decisión firme en `docs/decisions/adr-0005-design-system-home.md`.
- Las primitivas reutilizables viven en `packages/ui` (workspace `@soyre/ui`), no en `apps/web/components/`. `apps/web/components/` queda solo para componentes específicos del producto (workspaces, layouts, formularios concretos).
- Componentes reutilizables esperados:
  - Átomos: `Button`, `Badge`, `Input`, `Select`, `Textarea`, `Card`.
  - Compuestos: `MetricCard`, `StatusBadge`, `DataTable`, `FilterBar`, `SearchInput`, `PageHeader`, `SectionPanel`, `EmptyState`, `LoadingState`, `ErrorState`, `ActivityTimeline`, `ConfirmDialog`, `FormDrawer`, `Tabs`.
  - Dominio: `PropertyCard` (per `design.md §7.5`).
- Botones de acción deben usar `Button` desde `@soyre/ui`; enlaces con apariencia de botón deben usar `Button asChild` envolviendo `Link`.
- Formularios visibles deben preferir `Input`, `Select`, `Textarea` y `SearchInput` desde `@soyre/ui`. Si un formulario largo conserva controles nativos por compatibilidad, esos controles deben estar dentro de contenedores acotados del design system (`SectionPanel`, `FormDrawer`, `FilterBar` o clases específicas del módulo), nunca depender de estilos globales universales de `input/select/textarea`.
- Toda pantalla nueva de la app autenticada debe partir de `apps/web/app/(app)/_template/page.tsx.example` o justificar por qué no aplica.
- Antes de cerrar cambios de UI, ejecutar `pnpm check:design-system` o `pnpm lint`; el check debe quedar sin imports a `./ui`, sin `className="button ..."` en `apps/web` y sin hex hardcodeado en atributos de styling TSX.
- No introducir librerías de componentes de terceros (shadcn/ui, Radix, MUI, etc.) como base sin nuevo ADR que supersede o enmiende ADR-0005.
- No usar hex literals en componentes; siempre tokens via `var(--token-name)`.

## Reglas De Lenguaje Visual

- La UI visible debe estar en español correcto y con acentos.
- No mostrar lenguaje interno al usuario: `backend`, `wizard`, `dry run`, `jobs` ni nombres crudos de eventos.
- Los errores de API mostrados al usuario deben mapearse a mensajes de producto en español.
- Pesos tipográficos visibles: `400` para cuerpo, `500` para etiquetas/enlaces/acciones secundarias y `600-700` solo para titulares de página o acción primaria.
- Teal es el único acento de marca. Venta, alquiler y destacada se usan solo para etiquetar tipo de operación inmobiliaria.
- Fechas visibles en formato local `dd/mm/aaaa`.
- Para elecciones binarias o múltiples, preferir una tarjeta seleccionable reutilizable con estado visual claro, no checkboxes nativos sin jerarquía.

## Reglas De Dominio

### Propiedades

`property` es entidad central futura. Debe poder relacionarse con propietarios, clientes, procesos, tareas, documentos, actividad, venta, alquiler, cierre y auditoría.

### Clientes

El cliente vive en un módulo central. No duplicar clientes dentro de propiedades, procesos, tareas o tarjetas Kanban.

Un cliente puede tener varios roles comerciales: comprador, vendedor, arrendador, arrendatario, lead, inversionista, referidor o contacto relacionado.

### Funnel Kanban

No hardcodear etapas como arrays fijos en componentes.

Las etapas deben venir de fuente configurable: base de datos, configuración por organización, seed editable o servicio equivalente.

Las etapas deben poder crearse, renombrarse, reordenarse, activarse/desactivarse y asociarse a venta, alquiler o ambos.

### Venta Y Alquiler

Venta y alquiler pueden compartir componentes, pero tienen reglas propias.

Venta puede incluir oferta, contraoferta, financiamiento, promesa de compraventa, escritura, cierre, comisión y fecha estimada de cierre.

Alquiler puede incluir canon mensual, depósito, duración, renovación, check-in/check-out, estado de ocupación, contrato y mantenimiento.

### Dashboards

Deben existir dos responsabilidades:

- Dashboard general: operación global para owners/admins/managers o usuarios autorizados.
- Dashboard por usuario: vista individual de asesor/agente/usuario operativo.

No mezclar métricas globales y personales sin indicar alcance.

## Validación Antes De Cerrar

Ejecutar lo relevante al cambio:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para cambios Prisma sin conexión local:

```bash
pnpm db:generate
pnpm typecheck
```

Para cambios remotos de base:

- Usar MCP de Supabase.
- Verificar con consulta SQL o `list_tables`.
- Ejecutar advisors de seguridad/performance.
- Reportar lints relevantes y riesgos residuales.
