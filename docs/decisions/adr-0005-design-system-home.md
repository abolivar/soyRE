# ADR-0005 — Design System Home in packages/ui Without Third-Party Component Library

## Status

Accepted.

## Context

SoyPMS needs reusable UI primitives across the monorepo (currently `apps/web`, future apps and internal tools). A visual specification exists in `design.md` covering tokens, typography, spacing, components, motion, and accessibility. Partial React primitives already exist scattered in `apps/web/components/ui.tsx`, and design tokens live as CSS variables in `apps/web/app/globals.css`. The `packages/ui` workspace exists as a stub.

Two questions need a firm decision before continued work:

1. Where do reusable UI primitives live?
2. Are they built on top of a third-party component library (shadcn/ui, Radix, MUI, Chakra) or as in-house primitives over the existing CSS-class system?

## Decision

1. Reusable UI primitives live in `packages/ui` (workspace `@soyre/ui`). `apps/web/components/` is reserved for product-specific components (workspaces, layouts, feature forms).

2. Primitives are built in-house over the existing CSS-class system in `globals.css` and the design tokens in `design.md`. No third-party UI component library is adopted as the base. Tokens are CSS variables, never duplicated in JS/TS.

This decision is revisited only when a concrete, documented need arises (for example, Radix Primitives for accessibility patterns that are hard to implement correctly in-house) — not by default.

## Consequences

- `packages/ui` becomes the single home of the design system. Components currently in `apps/web/components/ui.tsx` migrate to `packages/ui/src/components/<Name>/`.
- `apps/web` consumes the DS via `@soyre/ui` (JS exports) and `@soyre/ui/styles` (CSS bundle).
- New primitives are added in `packages/ui`, never duplicated in `apps/web/components/`.
- Adding a third-party UI dependency requires a new ADR superseding or amending this one.
- The architecture of the package, build pipeline, and primitive catalog live in `docs/architecture/design-system.md`.
- The visual specification (tokens, anatomy, accessibility) continues to live in `design.md` at the repo root.
