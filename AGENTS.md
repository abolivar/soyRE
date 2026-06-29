# AGENTS.md

## Project Context

soyRE is a SaaS platform for real estate brokers.

The system is not a generic CRM. It is an operational platform for the real estate property as a product. The future domain includes:

- Intake.
- Mandates.
- Document validation.
- Commercial preparation.
- Publication.
- Showings.
- Offers.
- Sale or lease.
- Closing.
- Commissions.
- Archive.
- Audit.

## Firm Decisions

- Runtime: Node.js 22 LTS.
- Package manager: pnpm.
- Monorepo: pnpm workspaces.
- Orchestration: Turborepo.
- Frontend: Next.js App Router.
- Backend: NestJS.
- API: REST, prepared for OpenAPI.
- Database: managed PostgreSQL provider.
- ORM: Prisma.
- Language: strict TypeScript.
- SaaS tenancy concept: `organization`.
- The database is not local Docker and not a virtual machine. Development connects directly to a provider-owned PostgreSQL database.

## Work Rules

- Treat `References/` as reference material, not binding architecture.
- Do not build outside the current ticket scope.
- Do not turn the product into a generic CRM.
- Keep `property` as the central future entity.
- Use `organization` for the SaaS customer and tenancy boundary.
- Avoid `tenant` for rental occupants; use `lessee`.
- Do not add real secrets.
- Do not add dependencies without a practical reason.
- Do not implement business models, auth, document upload, workflows, commissions, or integrations during bootstrap.
- Keep changes small, reviewed, and documented.
- Update documentation when changing product or architecture behavior.

## Code Conventions

- Use strict TypeScript.
- Keep controllers thin; business logic belongs in services.
- Validate input DTOs before business logic.
- Prefer explicit resource names and plural REST routes.
- Keep future multi-tenant queries scoped by organization.
- Add tests when behavior is implemented or changed.

## Standard Validation

Run the relevant commands before finishing:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For database changes:

```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm typecheck
pnpm test
```

Use `pnpm db:migrate:dev` only with a dedicated development database.
