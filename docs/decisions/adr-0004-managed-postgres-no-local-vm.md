# ADR-0004 — Managed PostgreSQL Without Local VM

## Status

Accepted.

## Context

The project will not use local virtual machines, Docker Compose, or local PostgreSQL containers for database development.

## Decision

Connect directly to a provider-managed PostgreSQL database for development and deployments.

## Consequences

- `.env` must point to a dedicated development database, never production.
- Prisma migration commands need clear separation between development and deployment.
- If the provider requires it, `DIRECT_URL` and `SHADOW_DATABASE_URL` must be configured.
- The repository must not include `docker-compose.yml` as part of the default workflow.
