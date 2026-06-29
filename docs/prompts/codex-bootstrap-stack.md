# Codex Bootstrap Stack Prompt

Historical bootstrap prompt. For current work, `CODEX.md` is the operative contract.

Create or maintain the initial soyRE stack:

- pnpm workspace monorepo.
- Next.js App Router in `apps/web`.
- NestJS API in `apps/api`.
- Prisma package in `packages/database`.
- Shared placeholder packages in `packages/shared`, `packages/ui`, and `packages/config`.
- Managed PostgreSQL in Supabase.
- Remote schema/data operations through MCP.
- No Docker Compose, local VM database, local PostgreSQL, or local database connection.
- Do not expand business modules from this prompt alone; use `CODEX.md` and the active module docs.
