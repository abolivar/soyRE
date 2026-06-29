# Stack Técnico Inicial

## Decisión

El proyecto usa:

- Node.js 22 LTS.
- pnpm.
- pnpm workspaces.
- Turborepo.
- Next.js App Router para frontend.
- Tailwind CSS como base visual.
- NestJS para backend.
- REST API preparada para OpenAPI.
- PostgreSQL gestionado por proveedor.
- Prisma como ORM.
- TypeScript estricto.

## Decisión Explícita Sobre Base De Datos

No se usará Docker Compose, máquinas virtuales, PostgreSQL local ni conexión local a la base desde este workspace.

La base PostgreSQL gestionada vive en Supabase. Los cambios de schema y datos administrativos se aplican remotamente mediante MCP de Supabase.

`DATABASE_URL` y `DIRECT_URL` son variables de runtime/deploy para entornos donde el API deba conectarse a Postgres. No son requisito de desarrollo local en esta máquina.

## Principios

- Documentar antes de implementar negocio.
- Mantener módulos claros.
- Mantener cambios pequeños.
- Validar con lint, typecheck, tests y build.
- No implementar lógica de negocio hasta que el módulo esté documentado.
