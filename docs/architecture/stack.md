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

## Decision Explicita Sobre Base De Datos

No se usara Docker Compose, maquinas virtuales ni PostgreSQL local desde este workspace.

La base PostgreSQL gestionada vive en Supabase. Los cambios de schema y datos administrativos se aplican remotamente mediante MCP de Supabase.

`DATABASE_URL` y `DIRECT_URL` apuntan al pooler remoto de Supabase cuando el API o Prisma deban conectarse a Postgres. Deben vivir solo en archivos ignorados por git o en variables de runtime/deploy.

## Principios

- Documentar antes de implementar negocio.
- Mantener módulos claros.
- Mantener cambios pequeños.
- Validar con lint, typecheck, tests y build.
- No implementar lógica de negocio hasta que el módulo esté documentado.
