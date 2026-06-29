# ADR-0004 — Managed PostgreSQL Without Local DB Connection

## Status

Accepted.

## Context

The project will not use local virtual machines, Docker Compose, local PostgreSQL containers, or a local database connection from this workspace.

## Decision

Use provider-managed PostgreSQL in Supabase. Schema and administrative data changes are applied remotely through the Supabase MCP.

Runtime/deployment environments provide `DATABASE_URL` and `DIRECT_URL` when the API must connect to Postgres. Local development in this workspace does not require or use those values.

## Consequences

- `.env` keeps local `DATABASE_URL`, `DIRECT_URL`, and `SHADOW_DATABASE_URL` empty by default.
- Prisma migration files remain the reviewable source of schema changes.
- Remote changes must be verified through MCP SQL/listing/advisors.
- The repository must not include `docker-compose.yml` as part of the default workflow.
