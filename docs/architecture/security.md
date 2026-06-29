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

## Auth MVP

La autenticación es propiedad del backend/API.

El MVP usa:

- Email/password.
- Hash de password con `bcryptjs`.
- JWT de acceso en cookie httpOnly.
- Estados de usuario: `PENDING`, `ACTIVE`, `SUSPENDED`, `DISABLED`.
- Roles por organización mediante memberships.
- Validación administrativa de usuarios por organización.

Las cookies deben ser `httpOnly`, `sameSite=lax` y `secure` en producción. El frontend no debe persistir tokens manualmente.
