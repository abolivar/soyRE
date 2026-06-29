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

## Decisión Explícita Sobre Desarrollo Local

No se usará Docker Compose, máquinas virtuales ni PostgreSQL local. El desarrollo se conecta directamente a una base PostgreSQL gestionada por proveedor.

Cada desarrollador debe usar una base dedicada de desarrollo o una rama/base aislada del proveedor. No se debe usar producción para migraciones locales.

## Principios

- Documentar antes de implementar negocio.
- Mantener módulos claros.
- Mantener cambios pequeños.
- Validar con lint, typecheck, tests y build.
- No implementar lógica de negocio hasta que el módulo esté documentado.
