# SoyPMS

SoyPMS es un SaaS inmobiliario para brokers, inmobiliarias y equipos comerciales.

El producto no es un CRM generico. El centro operativo es el inmueble como producto: captacion, validacion documental, preparacion comercial, publicacion, visitas, ofertas, venta o alquiler, cierre, comisiones, archivo y auditoria.

El CRM de clientes existe como modulo centralizado, pero no reemplaza el foco principal: operar mejor el ciclo completo de cada propiedad y sus procesos relacionados.

## Documentos Principales

Antes de modificar codigo o arquitectura:

- `CODEX.md`: reglas obligatorias para Codex y asistentes de desarrollo.
- `docs/product/foundational.md`: definicion base del producto.
- `docs/architecture/overview.md`: vision tecnica general.
- `docs/architecture/stack.md`: stack y decisiones firmes.
- `docs/architecture/database.md`: reglas de base de datos remota.
- `docs/modules/*/overview.md`: alcance por modulo.

`References/` contiene material de referencia. No es arquitectura vinculante.

## Estado Actual

Fase 0 esta implementada como base inicial de identidad:

- Registro de organizacion owner.
- Login/logout con cookie httpOnly.
- Usuario actual y memberships.
- Roles por organizacion.
- Validacion, suspension y cambio de rol de usuarios.
- Auditoria base de acciones sensibles.
- Migracion remota aplicada en Supabase por MCP.

La fase siguiente es app shell/navegacion autenticada: sidebar, topbar, rutas principales, estados vacios y layout operativo.

## Stack

- Node.js 22 LTS.
- pnpm 10.
- Turborepo.
- Next.js App Router en `apps/web`.
- NestJS REST API en `apps/api`.
- Prisma 7 en `packages/database`.
- PostgreSQL gestionado en Supabase.
- TypeScript estricto.

## Marca

- Nombre visible del producto: SoyPMS.
- Logo principal: `apps/web/public/brands/soypms/logo-teal.svg`.
- Sello para sidebar, favicon y espacios compactos: `apps/web/public/brands/soypms/seal-teal.svg`.
- Fuente UI/marca: DM Sans self-hosted en `apps/web/public/fonts/dm-sans`.

## Base De Datos

No hay Postgres local.

La base de datos se administra remotamente mediante MCP de Supabase. Cuando el API o Prisma deban conectarse desde esta maquina, deben hacerlo contra el pooler remoto de Supabase en archivos `.env` o `.env.local` ignorados por git.

Variables esperadas:

- `DATABASE_URL`: shared pooler transaction mode en `aws-1-us-west-2.pooler.supabase.com:6543` para runtime.
- `DIRECT_URL`: shared pooler session mode en `aws-1-us-west-2.pooler.supabase.com:5432` para migraciones.
- Usuario de pooler: `prisma.dgyfhuzwmlclyhsdplrs`.

Para cambios de schema:

1. Editar `packages/database/prisma/schema.prisma`.
2. Crear o actualizar la migracion SQL correspondiente.
3. Aplicar y verificar en Supabase por MCP.
4. Ejecutar validaciones locales sin conexion a DB.

No introducir Docker, Docker Compose, VM ni Postgres local.

## Setup Local

```bash
pnpm install
pnpm runtime:check
cp .env.example .env
```

El workspace selecciona Node `22.22.2` para todos los scripts ejecutados con
pnpm, incluso si la terminal fue abierta con otro Node. `.nvmrc` conserva la
misma version para quien prefiera ejecutar `nvm use`. El contrato falla antes de
iniciar Next, Nest, Prisma o Turbo cuando el proceso no usa Node `22.x` o pnpm
`10.33.2`.

No ejecutes los scripts del repositorio con un `node` global. Usa `pnpm <script>`
para que la seleccion del runtime sea propia de SoyRE y no afecte otros
proyectos instalados en la misma maquina.

El store de pnpm debe permanecer fuera del workspace. El proyecto usa la
ubicacion global predeterminada de pnpm porque Next/Turbopack observa la raiz
completa del monorepo para resolver los paquetes compartidos. Un `.pnpm-store`
local agrega decenas de miles de archivos al watcher y puede causar errores
`EMFILE` en macOS.

Si el checkout conserva un `.pnpm-store` creado por una configuracion anterior:

1. Deten los procesos `pnpm dev` del proyecto.
2. Mueve `.pnpm-store` fuera del repositorio como respaldo temporal.
3. Ejecuta `pnpm install` para usar el store global de pnpm.
4. Confirma el entorno con `pnpm dev:check` y luego inicia `pnpm dev`.

`pnpm dev` ejecuta esa comprobacion antes de iniciar Turbo y falla con una
explicacion accionable si detecta el store heredado. No borra archivos ni mueve
el store automaticamente. El comando de desarrollo reenvia las variables del
entorno local a las aplicaciones del monorepo; build y produccion conservan sus
configuraciones independientes.

## Vercel

El proyecto `soypms-alpha` usa la raiz del monorepo y Node `22.x`. Vercel solo
garantiza la version mayor y actualiza automaticamente minor y patch; por eso
`package.json#engines.node` declara `22.x`, mientras `.nvmrc` fija `22.22.2`
para desarrollo reproducible.

`vercel.json` versiona el contrato de build:

- instalacion: `pnpm install --frozen-lockfile`;
- build: `pnpm build:web`, que ejecuta `pnpm runtime:check` antes de Turbo;
- salida: `apps/web/.next`;
- package manager: pnpm `10.33.2` mediante `packageManager` y Corepack `0.35.0`.

La version de la CLI de Vercel esta fijada dentro de `pnpm vercel:build` y se
ejecuta de forma aislada con `pnpm dlx`; Corepack si es una dependencia ligera
del workspace. No uses una CLI global, porque heredaria el Node activo de la
terminal y podria omitir Corepack.

La variable `ENABLE_EXPERIMENTAL_COREPACK=1` debe existir en Development,
Preview y Production. La configuracion del dashboard debe conservar Node
`22.x`; `package.json` actua como respaldo versionado y tiene precedencia para
la seleccion del major.

El `.env` o `.env.local` local puede contener `DATABASE_URL` y `DIRECT_URL` solo contra Supabase remoto. No se debe introducir Docker, VM ni Postgres local. Para desarrollo visual puedes correr el frontend:

```bash
pnpm --filter @soyre/web dev
```

El API local requiere una conexion runtime a Postgres remoto para operar endpoints con Prisma.

## Validacion

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para validacion visual con Playwright:

```bash
pnpm playwright:install
pnpm test:e2e
```

Playwright levanta `apps/web` en `http://127.0.0.1:3000` si no hay servidor
activo. En desarrollo reutiliza el servidor existente y guarda screenshots,
traces y reportes en carpetas ignoradas por git.

Para cambios de Prisma sin conexion runtime:

```bash
pnpm db:generate
pnpm typecheck
```

## Convenciones

- UI visible al usuario en espanol.
- Codigo, carpetas tecnicas, rutas API y modelos en ingles.
- `organization` es el limite SaaS.
- No usar `tenant` para inquilinos de alquiler; usar `lessee`.
- Toda entidad critica futura debe aislarse por organizacion.
- Toda accion sensible debe validar permisos del lado servidor y dejar auditoria cuando aplique.
