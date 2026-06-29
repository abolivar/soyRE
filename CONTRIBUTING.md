# Contributing

## Development Flow

1. Read `AGENTS.md` and the related documentation under `docs/`.
2. Keep work scoped to one ticket or one clear architectural decision.
3. Prefer small, reviewable changes.
4. Run validation commands before handing work over.
5. Update documentation when behavior, architecture, or scope changes.

## Naming

- Code, folders, APIs, models, and routes use English.
- Files and folders use `lowercase-kebab-case`.
- Spanish is allowed for product documentation.

## Database Work

This project uses managed PostgreSQL directly. Do not add Docker Compose or local VM database workflows unless the architecture decision changes.

Use a dedicated development database for local migrations.
