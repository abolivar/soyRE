# Database Architecture

## Base de datos

PostgreSQL.

## ORM

Prisma.

## Principios futuros

- Usar `organization_id` para aislamiento multi-tenant.
- Evitar hard deletes en entidades críticas.
- Registrar auditoría para acciones sensibles.
- Usar migraciones revisables.
- Mantener enums explícitos para estados de negocio.

## Modelos futuros principales

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
