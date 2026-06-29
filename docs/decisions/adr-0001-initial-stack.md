# ADR-0001 — Initial Stack

## Status

Accepted.

## Context

soyRE needs a modular SaaS foundation for broker operations around real estate properties.

## Decision

Use Node.js 22 LTS, pnpm workspaces, Turborepo, Next.js App Router, NestJS, Prisma, PostgreSQL, and strict TypeScript.

## Consequences

- One repository can host web, API, database, shared code, UI primitives, and configuration.
- The API can evolve as a modular monolith before any service split is justified.
- Prisma migrations require disciplined handling because the database is provider-managed.
