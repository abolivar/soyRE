# design-sync notes — @soyre/ui (SoyPMS Design System)

Repo-specific gotchas for syncing `@soyre/ui` to claude.ai/design. Read before every re-sync.

## Shape & build
- **Package shape** (no Storybook). 21 components, all `src`-matched.
- Build entry: `packages/ui/dist/index.js` (ESM). Rebuild the package with `pnpm -F "@soyre/ui..." build` when source changes (the `...` pulls workspace deps). `dist/` is gitignored but the converter reads it from disk.
- Run from repo root: `--node-modules packages/ui/node_modules` (react/react-dom/lucide-react all resolve there).

## CSS / tokens — the one non-obvious step
- The package ships CSS as `src/styles/index.css` which is **`@import`-only** (`tokens.css` + `components.css`). The converter appends `cfg.cssEntry` **raw** and does NOT follow `@import`s, so pointing `cssEntry` at `index.css` ships zero real CSS and fails validate with `[CSS_IMPORT_MISSING]`.
- Fix: `cssEntry` points at **`src/styles/_ds_sync_flat.css`**, a sync-owned flat concat of `tokens.css` + `components.css` (no `@import`s). It is **gitignored** and must be **regenerated before each sync**:
  ```sh
  cat packages/ui/src/styles/tokens.css packages/ui/src/styles/components.css > packages/ui/src/styles/_ds_sync_flat.css
  ```
- All `var(--*)` tokens referenced by `components.css` are defined in `tokens.css`, so the flat file is self-contained (no `[TOKENS_MISSING]`).

## Fonts
- Brand family is **DM Sans**, self-hosted at `apps/web/public/fonts/dm-sans/*.woff2` with `@font-face` in `apps/web/app/globals.css` (absolute `/fonts/...` urls).
- Wired via `cfg.extraFonts: ["../../.design-sync/fonts/dm-sans.css"]` — a sync-owned `@font-face` file with **relative** urls to the repo woff2 so the converter copies them into the bundle's `fonts/`.
- **Inter** appears only as a CSS fallback name in the font stacks; it is not shipped. Suppressed via `cfg.runtimeFontPrefixes: ["Inter"]`.

## Card modes / overrides
- `ConfirmDialog`, `FormDrawer` are overlays (`position: fixed` backdrop) → `cardMode: single` + a `viewport` so the open state renders inside the card.
- `DataTable`, `PageHeader` are full-width → `cardMode: column`.
- `Input`, `Textarea` → `cardMode: column`. Their controls are `width: 100%` (see craft pass below), so at default grid width they overflow the cell; column gives one full-width field per row.

## Craft pass (Emil design-eng review) — applied to components.css
- Added interaction polish: hover color `transition` on buttons/links/tabs, `:active { scale(0.97) }` press feedback, `:focus-visible` teal ring on buttons + inputs, spinner sped up 1.1s→0.7s, overlay entry animations via `@starting-style` (backdrop fade, dialog scale from center, drawer slide from right), `@media (hover:hover)` gate on PropertyCard lift, and a `prefers-reduced-motion` block.
- **Fidelity fix:** the base form-control styling (`input`/`select`/`textarea`: border, bg, radius, `width:100%`, focus ring) lived only in `apps/web/app/globals.css` (element resets) and did NOT ship with the DS. Moved a scoped copy into `components.css` under `.input-field …` so Input/Select/Textarea are self-contained in the shipped CSS. `apps/web/globals.css` still has its own raw-element rules (harmless duplication; the app can later drop them in favor of the primitive).

## Known render warns (re-syncs: these are expected, not new)
- **`[RENDER_THIN]` FormDrawer** — benign. The drawer renders fully (≈30 KB screenshot) but its `position: fixed` children collapse the measured root height to 0. Confirmed visually OK.

## Product-code fix made during this sync
- **Button.tsx** had a bug: `variant="primary"` dropped the `.primary` class (`variantClass = variant === 'primary' ? null : variant`), so primary buttons rendered without the teal fill (`.button.primary` in CSS). Fixed to `['button', variant, className]`. The package `dist/` was rebuilt. This is a real product fix, committed to `packages/ui/src/components/Button/Button.tsx` — not a sync artifact.

## Re-sync risks (what can silently go stale)
- **`_ds_sync_flat.css` is gitignored and generated** — if a re-sync forgets to regenerate it after `tokens.css`/`components.css` change, the bundle ships stale CSS. Always run the `cat` command above first.
- **Font urls** assume `apps/web/public/fonts/dm-sans/` paths — if the app moves/renames its fonts, update `.design-sync/fonts/dm-sans.css`.
- Previews live in `.design-sync/previews/` (committed, sync-owned). They import realistic copy mirroring `apps/web/lib/demo-data.ts`; not tied to upstream code, safe across rebuilds.
- All 21 components share group `general` (the DS has no doc frontmatter `category`). Regrouping would need docsMap stubs, which would replace the synthesized `.prompt.md`; left flat deliberately.
