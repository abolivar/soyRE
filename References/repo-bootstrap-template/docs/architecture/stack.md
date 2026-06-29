# Stack Técnico Inicial

## Decisión

El proyecto usará:

- Node.js LTS.
- pnpm.
- pnpm workspaces.
- Turborepo.
- Next.js para frontend.
- NestJS para backend.
- PostgreSQL como base de datos.
- Prisma como ORM.
- Docker Compose para desarrollo local.
- Jest y Playwright para testing.

## Motivo

El producto requiere velocidad de desarrollo, modularidad, buena trazabilidad, soporte multi-tenant y una base ordenada para documentación y desarrollo asistido por Codex.

## Principios

- Documentar antes de implementar.
- Mantener módulos claros.
- Mantener PRs pequeños.
- Validar siempre con lint, typecheck, tests y build.
- No implementar lógica de negocio hasta que el módulo esté documentado.
