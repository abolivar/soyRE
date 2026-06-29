# Tenancy Architecture

## Decisión conceptual

Usar `organization` como entidad que representa al cliente SaaS, broker o inmobiliaria.

No usar `tenant` para inquilinos de alquiler, porque puede confundirse con multi-tenancy. Para inquilino se usará `lessee`.

## Principios futuros

- Toda consulta de negocio debe estar filtrada por organización.
- Los usuarios acceden a organizaciones mediante memberships.
- Los permisos se calculan por organización, rol y recurso.
- Los endpoints deben impedir filtración entre organizaciones.
