# ADR-0003 — Use Organization for SaaS Tenancy

## Status

Accepted.

## Context

The system is SaaS and must isolate each broker, brokerage, company, or team.

## Decision

Use `organization` as the conceptual tenancy boundary.

## Consequences

- Future business records must be scoped by organization.
- Users access organizations through memberships.
- Use `lessee`, not `tenant`, for rental occupants.
