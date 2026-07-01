# @soyre/ui — SoyPMS Design System

React primitives for SoyPMS, a real-estate operations platform for LatAm brokers. UI copy is **Spanish**; component names, props and types are **English**. Components are plain React (no provider, no context) that render internal CSS classes; you style through **props**, not by writing their class names.

## Setup — one import, no wrapper
- There is **no provider to wrap**. Import the stylesheet **once** at the app root so tokens, the DM Sans font, and component styles load:
  ```tsx
  import "@soyre/ui/styles";
  ```
  Without it, components render unstyled (system font, no color). Everything downstream — tokens, fonts, component CSS — ships through that single stylesheet.
- Icons are **lucide-react** (a peer dependency). Icon props take a lucide component, not a rendered element: `icon={Building2}`.

## Styling idiom — props + tokens, never component class names
This DS has **no utility-class system** for you to compose with. Two rules:

1. **Style components through their props.** The design language is carried by two prop families:
   - **`variant`** on `Button`: `"primary" | "secondary" | "ghost" | "danger"`.
   - **`tone`** on everything semantic (`Badge`, `StatusBadge`, `MetricCard`, `PropertyCard` match badges, `Tabs`, `ConfirmDialog`): `"primary" | "rent" | "featured" | "success" | "warning" | "danger" | "neutral"`.
   The three brand tones map to operation types: **`primary` = teal (venta/sale)**, **`rent` = slate blue (alquiler)**, **`featured` = amber (destacada)**. Never mix two operation tones in one primitive — pass one `tone`.

2. **For your own layout glue, use the design tokens as CSS variables** (never hardcode hex). Real token names, all defined in the shipped stylesheet:
   - Color: `var(--primary)` `var(--primary-strong)` `var(--primary-soft)`, `var(--rent)` `var(--rent-strong)` `var(--rent-soft)`, `var(--featured)` `var(--featured-strong)` `var(--featured-soft)`, `var(--success)` `var(--warning)` `var(--danger)` (+ their `-soft`).
   - Surfaces & ink: `var(--page)` `var(--surface)` `var(--surface-muted)` `var(--ink)` `var(--ink-strong)` `var(--muted)` `var(--line)`.
   - Type & elevation: `var(--font-ui)`, `var(--font-display)`, `var(--shadow-soft)`.

## Where the truth lives
- Read the bound stylesheet **`_ds/@soyre/ui/styles.css`** and its `@import` closure for the exact tokens and component classes.
- Per component: **`<Name>.prompt.md`** (usage) and **`<Name>.d.ts`** (props contract). Compose components; don't reimplement them.

## Idiomatic snippet
```tsx
import { PageHeader, MetricCard, Button } from "@soyre/ui";
import { Building2, Users } from "lucide-react";

<>
  <PageHeader
    eyebrow="Operación inmobiliaria"
    title="Dashboard"
    description="Vista de control de propiedades y operaciones."
    actions={<Button variant="primary" icon={Building2}>Nueva propiedad</Button>}
  />
  {/* layout glue = your own grid + tokens; content = DS components */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
    <MetricCard tone="primary" icon={Building2} label="Propiedades activas" value="128" detail="18 publicadas, 42 en preparación." />
    <MetricCard tone="rent" icon={Users} label="Clientes en seguimiento" value="342" detail="31 nuevos esta semana." />
  </div>
</>
```

## Copy voice
Decision-tool tone: short sentences, concrete numbers, no exclamation marks or emojis in decision contexts. Spanish UI copy.
