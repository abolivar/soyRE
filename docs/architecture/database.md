# Database Architecture

## Base de Datos

PostgreSQL gestionado por proveedor.

## ORM

Prisma.

## Conexión

El proyecto usa `DATABASE_URL` para la conexión principal. Si el proveedor separa conexión pooled y conexión directa, usar `DIRECT_URL` para migraciones Prisma.

Para `prisma migrate dev` contra una base gestionada, usar una base de datos dedicada de desarrollo y, si el proveedor lo requiere, `SHADOW_DATABASE_URL`.

Prisma 7 no define `url` ni `directUrl` dentro de `schema.prisma`. Las URLs viven en `packages/database/prisma.config.ts`. El cliente se genera con `provider = "prisma-client"` y se instancia con `@prisma/adapter-pg`.

## Principios Futuros

- Usar `organization_id` para aislamiento multi-tenant.
- Evitar hard deletes en entidades críticas.
- Registrar auditoría para acciones sensibles.
- Usar migraciones revisables.
- Mantener enums explícitos para estados de negocio.
- Separar migraciones de desarrollo y despliegue.

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
