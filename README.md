# soyRE

soyRE is a SaaS platform for real estate brokers focused on operating the property as the core product.

It is not a generic CRM. The future product centers on the complete property lifecycle: intake, mandate, documents, publication, showings, offers, sale or lease, closing, commissions, archive, and audit.

## Requirements

- Node.js 22 LTS
- pnpm 10 through Corepack or the project Node installation
- Access to a managed PostgreSQL database provider

This project intentionally does not use Docker, Docker Compose, or local virtual machines for database development.

## Setup

```bash
nvm use
pnpm install
cp .env.example .env
```

Then set `DATABASE_URL` in `.env` with a dedicated development PostgreSQL database from the provider.

## Development

```bash
pnpm dev
```

Default local services:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/health`

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Database

```bash
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:studio
```

Use `db:migrate:dev` only against a dedicated development database. Use `db:migrate:deploy` for shared environments.

## Documentation

Read these before changing code:

- `AGENTS.md`
- `docs/product/foundational.md`
- `docs/architecture/overview.md`
- `docs/architecture/stack.md`
- The module document under `docs/modules/*`

## Conventions

- Folders and code use technical English.
- File and folder names use `lowercase-kebab-case`.
- Product documentation may be written in Spanish.
- Domain code, models, routes, and APIs use English.
