# ADR-0001 — Initial Stack

## Estado

Aceptado inicialmente.

## Contexto

El producto necesita una base moderna, modular, mantenible y amigable para desarrollo asistido por Codex.

## Decisión

Usar:

- Node.js LTS.
- pnpm.
- pnpm workspaces.
- Turborepo.
- Next.js.
- NestJS.
- PostgreSQL.
- Prisma.
- Docker Compose.
- Jest / Playwright.

## Consecuencias

- Mayor claridad modular.
- Mejor reutilización entre frontend/backend.
- Más facilidad para ejecutar validaciones.
- Requiere disciplina con documentación, scripts y límites de alcance.
