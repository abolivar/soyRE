# Security Architecture

## Principios

- No exponer secretos.
- Usar `.env.example` con placeholders.
- Validar inputs.
- Sanitizar salidas cuando aplique.
- Usar permisos por rol y organización.
- Registrar auditoría en acciones críticas.
- Proteger documentos sensibles.
- Evitar filtrado cross-tenant.

## Auth Futura

La autenticación debe ser propiedad del backend/API. Para el MVP se recomienda email/password y sesiones o JWT en cookies httpOnly, con autorización basada en roles, memberships y organización.

No implementar auth durante bootstrap.
