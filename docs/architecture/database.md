# Database Architecture

## Base de Datos

PostgreSQL gestionado por proveedor.

## ORM

Prisma.

## Conexión Y Operación

No hay Postgres local desde este workspace.

La base remota se administra mediante MCP de Supabase. Los cambios de schema deben quedar reflejados en `packages/database/prisma/schema.prisma` y en migraciones SQL revisables, pero se aplican y verifican remotamente por MCP.

`DATABASE_URL` y `DIRECT_URL` se pueden configurar en `.env` o `.env.local` ignorados por git cuando el API o Prisma necesiten operar contra Supabase remoto.

Conexion esperada:

- `DATABASE_URL`: shared pooler transaction mode, `aws-1-us-west-2.pooler.supabase.com:6543`, con `?pgbouncer=true`.
- `DIRECT_URL`: shared pooler session mode, `aws-1-us-west-2.pooler.supabase.com:5432`, para migraciones.
- Usuario de pooler: `prisma.dgyfhuzwmlclyhsdplrs`; rol remoto `prisma` dedicado a Prisma.

Prisma 7 no define `url` ni `directUrl` dentro de `schema.prisma`. Las URLs viven en `packages/database/prisma.config.ts`. El cliente se genera con `provider = "prisma-client"` y se instancia con `@prisma/adapter-pg`.

La migración inicial de identidad fue aplicada en Supabase remoto y registrada en `_prisma_migrations`.

## Principios Futuros

- Usar `organization_id` para aislamiento multi-tenant.
- Evitar hard deletes en entidades críticas.
- Registrar auditoría para acciones sensibles.
- Usar migraciones revisables.
- Mantener enums explícitos para estados de negocio.
- Verificar cambios remotos con SQL, `list_tables` y advisors de Supabase.

## Modelos Futuros Principales

- `Organization`
- `User`
- `Membership`
- `Role`
- `Property`
- `Owner`
- `Mandate`
- `Document`
- `Workflow`
- `Listing`
- `Showing`
- `Offer`
- `Deal`
- `Commission`
- `AuditLog`
