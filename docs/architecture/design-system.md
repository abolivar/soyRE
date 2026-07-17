# Design System Architecture

Este documento cubre la **arquitectura** del sistema de diseño: dónde viven las primitivas, cómo se construyen, cómo se consumen y qué se permite o no se permite agregar. El **diseño visual** (tokens, tipografía, anatomía de componentes, accesibilidad) vive en `design.md` en la raíz del repo. El **lenguaje visual vigente del producto** vive en `docs/architecture/visual-language.md`. La decisión firme está en `docs/decisions/adr-0005-design-system-home.md`.

## Decisiones

1. **Home canónica:** `packages/ui` (workspace `@soyre/ui`). Toda primitiva visual reutilizable entre apps del monorepo vive aquí.
2. **No librería de terceros como base.** Sin shadcn/ui, Radix, MUI, Chakra. Las primitivas son código propio que aplica las clases CSS de `apps/web/app/globals.css` y los tokens de `design.md`. Ver ADR-0005.
3. **Tokens como variables CSS.** No se duplican en código JS/TS. Se exponen desde `packages/ui/src/styles/tokens.css` y se consumen vía `var(--token-name)`.
4. **Tipografía:** DM Sans self-hosted (en uso). Los pesos visibles se limitan a `400`, `500` y `600-700`; no se usa `800/850` como valor por defecto.
5. **Iconografía:** lucide-react. No se introducen sets adicionales.
6. **Estados obligatorios** para componentes dependientes de datos: loading, empty, error, data (per `CODEX.md §Reglas De UI`).
7. **UI copy en español correcto, con acentos y sin lenguaje técnico interno; identifiers, props, types y nombres de archivo en inglés** (per `CONTRIBUTING.md`, `CODEX.md` y `docs/architecture/visual-language.md`).

## Layout dentro de `packages/ui`

```
packages/ui/
├── package.json                  # exports . (JS+types) y ./styles (CSS bundle)
├── tsconfig.json                 # JSX habilitado, dist/ generado por tsc
├── dist/                         # generado
└── src/
    ├── index.ts                  # re-exports públicos
    ├── styles/
    │   ├── tokens.css            # :root con variables del design system
    │   └── components.css        # clases de las primitivas (migradas desde globals.css)
    └── components/
        ├── Button/
        │   ├── Button.tsx
        │   └── index.ts
        ├── Badge/
        ├── Card/
        ├── Input/
        ├── PageHeader/
        ├── MetricCard/
        ├── StatusBadge/
        ├── SectionPanel/
        ├── SearchInput/
        ├── FilterBar/
        ├── DataTable/
        ├── EmptyState/
        ├── LoadingState/
        ├── ErrorState/
        ├── ActivityTimeline/
        ├── ConfirmDialog/
        ├── FormDrawer/
        ├── PropertyCard/
        └── Tabs/
```

## Primitivas canónicas

Estado actual: **21 primitivas** implementadas en `packages/ui/src/components/`, agrupadas por rol.

### Atoms (6)

- **`Button`** — 4 variantes (`primary`/`secondary`/`ghost`/`danger`), `loading` state con Loader2, `icon` leading (LucideIcon), `asChild` para renderizar el hijo aplicándole las clases y handlers del botón (útil para envolver `<Link>` de Next sin romper accesibilidad). Extends `ButtonHTMLAttributes<HTMLButtonElement>`.
- **`Badge`** — pieza de metadato per `design.md §7.2`, props `tone: Tone`, `shape: 'badge' | 'tag'`.
- **`Card`** — surface genérica, extends `HTMLAttributes<HTMLElement>`, renderiza `<article>`.
- **`Input`** / **`Select`** / **`Textarea`** — wrappers con `id` requerido (Server Component-friendly, sin `useId`), `label`, `labelHidden?` (patrón visually-hidden para accesibilidad sin texto visible), `hint?`, `error?` que dispara `aria-invalid` + borde danger.

### Composites (14)

`PageHeader`, `MetricCard`, `StatusBadge`, `SectionPanel`, `SearchInput`, `FilterBar`, `DataTable`, `EmptyState`, `LoadingState`, `ErrorState`, `ActivityTimeline`, `ConfirmDialog`, `FormDrawer`, `Tabs`.

`Tabs` — config-driven API (`items: TabItem[]` en vez de compound `<Tabs><TabsList><TabsTrigger>`), controlled si `value` está seteado o uncontrolled con `defaultValue`, keyboard navigation (←/→ con focus follow), ARIA completo (`role=tablist/tab/tabpanel`, `aria-selected`, `aria-controls`, `aria-labelledby`, `tabIndex 0/-1`).

### Domain (1)

- **`PropertyCard`** — componente clave per `design.md §7.5`. Tipos públicos: `PropertyOperation` (`sale` | `rent` | `featured`), `PropertyPrice`, `PropertyChip`, `PropertyMatchBadge`. Renderiza barra de acento por operación (mapea a `Tone`: `sale → primary`, `rent → rent`, `featured → featured`), thumbnail (o placeholder tinted por tono), insight con dot coloreado, nombre, ubicación, precio + rango estimado, chips de metadata, badge de match/métrica. `operationLabel` es required (no hardcode de "Venta"/"Alquiler" — i18n-friendly). `priceFormatter` default `Intl.NumberFormat` USD sin decimales; consumers overridean para COP/PEN/etc. Renderiza como `<article>` no-interactivo; consumers wrappean con `<Link>` de Next para navegación.

## Build pipeline

- `tsc -p tsconfig.json` produce `dist/index.js` + `dist/index.d.ts`.
- TSX habilitado en `tsconfig.json` (`jsx: react-jsx`, `include: ["src/**/*.ts", "src/**/*.tsx"]`).
- CSS bundle: los archivos en `src/styles/` se copian a `dist/styles/` durante el build y se exponen vía `exports["./styles"]` en `package.json`.
- React es `peerDependency` — no se bundle-a una copia.

## Consumo desde `apps/web`

```ts
// apps/web/app/layout.tsx
import "@soyre/ui/styles";

// apps/web/app/(app)/dashboard/page.tsx
import { PageHeader, MetricCard, SectionPanel } from "@soyre/ui";
```

`apps/web/app/globals.css` mantiene solo: layout específico de app (sidebar, topbar, landing) y overrides de tema globales. Las clases de primitivas se migran a `packages/ui/src/styles/components.css`.

## Cómo agregar una primitiva nueva

1. Revisar `design.md §7`. Si la anatomía no está documentada, primero agregar la sección a `design.md`.
2. Crear `packages/ui/src/components/<Name>/<Name>.tsx` con `interface Props` tipada estricta.
3. Implementar los estados obligatorios cuando aplique (loading, empty, error).
4. Si requiere estilos nuevos: agregarlos a `packages/ui/src/styles/components.css` usando variables existentes; no introducir hex literals.
5. Exportar desde `packages/ui/src/components/<Name>/index.ts` y desde `packages/ui/src/index.ts`.
6. Consumir desde `apps/web` y validar con `pnpm typecheck` + `pnpm build` + Playwright si aplica.

## Qué NO hacer

- No introducir librerías de componentes de terceros sin abrir un nuevo ADR que supersede o enmiende ADR-0005.
- No duplicar tokens en JS/TS (`const COLOR_PRIMARY = "#1A9E8F"` está prohibido — usar `var(--color-primary)`).
- No usar hex literals en componentes; siempre tokens.
- No mezclar colores de tipo de operación (teal/slate/amber) en una misma primitiva — la primitiva recibe la tonalidad por prop (`tone`).
- No agregar primitivas a `apps/web/components/` que sean genéricamente reutilizables — esas van a `packages/ui`. `apps/web/components/` queda solo para componentes específicos del producto (workspaces, layouts de app, formularios concretos).
