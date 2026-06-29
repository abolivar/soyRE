# Codex Bootstrap Stack Prompt

Create or maintain the initial soyRE stack:

- pnpm workspace monorepo.
- Next.js App Router in `apps/web`.
- NestJS API in `apps/api`.
- Prisma package in `packages/database`.
- Shared placeholder packages in `packages/shared`, `packages/ui`, and `packages/config`.
- Managed PostgreSQL provider configuration through environment variables.
- No Docker Compose and no local VM database.
- No business models or endpoints beyond infrastructure health checks.
