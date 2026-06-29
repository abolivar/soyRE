# ADR-0002 — Use Property as Core Entity

## Status

Accepted.

## Context

The product must not become a generic CRM.

## Decision

The future domain model centers on `property`.

## Consequences

- Owners, mandates, documents, listings, showings, offers, deals, commissions, and audit records should connect directly or indirectly to property workflows.
- CRM-like contact features are secondary and should exist only when they support property operations.
