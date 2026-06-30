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
nvm use
pnpm install
cp .env.example .env
```

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
