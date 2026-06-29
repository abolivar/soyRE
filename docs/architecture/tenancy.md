# Tenancy Architecture

## Decisión Conceptual

Usar `organization` como entidad que representa al cliente SaaS, broker, inmobiliaria o equipo.

No usar `tenant` para inquilinos de alquiler, porque puede confundirse con multi-tenancy. Para inquilino se usará `lessee`.

## Principios Futuros

- Toda consulta de negocio debe estar filtrada por organización.
- Los usuarios acceden a organizaciones mediante memberships.
- Los permisos se calculan por organización, rol y recurso.
- Los endpoints deben impedir filtración entre organizaciones.
- Los tests de módulos críticos deben cubrir aislamiento multi-tenant.
