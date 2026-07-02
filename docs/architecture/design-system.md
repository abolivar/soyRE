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

### Ya implementadas en `apps/web/components/ui.tsx` (a migrar)

`PageHeader`, `MetricCard`, `StatusBadge`, `SectionPanel`, `SearchInput`, `FilterBar`, `DataTable`, `EmptyState`, `LoadingState`, `ErrorState`, `ActivityTimeline`, `ConfirmDialog`, `FormDrawer`.

Migración: mover archivos a `packages/ui/src/components/<Name>/`, exportar desde `packages/ui/src/index.ts`, y actualizar imports en `apps/web/`.

### Faltantes (solo existen como clases CSS o HTML crudo)

- **`Button`** — clase `.button` con variantes `primary`/`secondary`/`ghost`/`danger` ya existe. Falta wrapper React con sizes (`sm`/`md`/`lg`), loading state, icono leading/trailing, soporte `asChild` opcional para anchors.
- **`Badge`** / **`Tag`** — clases `.status-badge` y `.tone-*` ya existen. Falta wrapper React con prop `tone`.
- **`Input`** / **`Select`** / **`Textarea`** — estilos globales aplicados a tags HTML. Falta componente con label, hint, error state, focus ring controlado.
- **`Card`** genérica — estilos `.metric-card`, `.section-panel` existen. Falta una `Card` reutilizable de base que las demás compongan.
- **`PropertyCard`** — componente clave per `design.md §7.5`. No existe aún. Debe incluir barra de acento por tipo de operación, thumbnail, insight, nombre, ubicación, precio + rango estimado, chips, badge final de match/métrica.
- **`Tabs`** — no existe.

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
