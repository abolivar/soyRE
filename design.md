# Design System — Especificación para Desarrollo

> **Propósito.** Este documento es la fuente única de verdad para construir la UI del producto. Define tokens, tipografía, componentes, layout, motion y accesibilidad. Entrégalo a cualquier desarrollador (o agente de código como Claude Code / Codex) y debería poder construir pantallas consistentes sin guía adicional.
>
> **Alcance.** Es una especificación *visual + interacción*. Es deliberadamente **neutral de marca**: no define nombre de producto, logo ni wordmark. Esos elementos se agregan por separado y NO forman parte de este sistema.

---

## 0. Cómo usar este documento

- **Tokens primero.** Nunca escribas un hex, tamaño de fuente o valor de espaciado directamente en un componente. Referencia el token (variable CSS). Si necesitas un valor que no existe como token, agrégalo al set de tokens en vez de inyectarlo inline.
- **Los componentes son contratos.** Cada componente lista su anatomía, variantes, estados y tamaños. Constrúyelos como primitivas reutilizables (componentes de React, Web Components, o el equivalente de tu framework).
- **La accesibilidad no es opcional.** Las reglas de §9 son requisitos, no sugerencias.
- **Implementación canónica.** Las primitivas React viven en `packages/ui` (workspace `@soyre/ui`). Ver `docs/architecture/design-system.md` para la arquitectura del package, build pipeline y reglas de adición.

**Setup recomendado (agnóstico de stack):** un solo archivo `tokens.css` (o `globals.css`) con las variables `:root` de §1–§5, y luego los componentes consumiéndolas. Si usas Tailwind, mapea estos tokens en `tailwind.config` en vez de re-derivar los valores.

---

## 1. Concepto del producto y dominio

Producto inmobiliario para **compra y alquiler** de propiedades. La interfaz es **densa en datos y orientada a la decisión**: precios, rangos, comparables, métricas de riesgo y rentabilidad. La densidad de información es una característica, no un problema a esconder.

**Distinción visual clave del dominio:** el sistema de color refleja el **tipo de operación** de cada propiedad:

| Operación | Familia de color | Uso |
|---|---|---|
| **Venta** | Teal (color primario) | Propiedades en venta — es también el color base del sistema |
| **Alquiler** | Slate Blue | Propiedades en alquiler |
| **Destacado / Premium** | Warm Amber | Acento opcional para promociones, propiedades premium o estados especiales |

> **Regla de oro del color.** El **Teal es el color primario de TODO el sistema** — navegación, botones primarios, links, foco, estados activos, iconografía. Los colores de Alquiler (Slate) y Destacado (Amber) aparecen **exclusivamente** para señalizar el tipo/estado de una propiedad: badges, barras de acento en cards, filtros de tipo. Nunca uses Slate o Amber para acciones del sistema (botones de navegación, CTAs globales, etc.).

---

## 2. Color — Tokens

Paleta construida sobre **una familia primaria (Teal)** + dos familias de acento para tipo de operación + una escala de **neutros cálidos**. Cada familia tiene base, variante oscura (hover/active y texto sobre claro) y tinte claro (fondos y fills sutiles).

> **Intención de diseño.** Los neutros tienen una temperatura ligeramente cálida — **nunca son grises puros**. Esto mantiene la interfaz tranquila aun con varios acentos en pantalla.

```css
:root {
  /* ── PRIMARIO — Teal (Venta + sistema completo) ── */
  --color-primary:        #1A9E8F;  /* base: botones, links, foco, activos */
  --color-primary-dark:   #0D6B61;  /* hover/active, texto sobre fondo claro */
  --color-primary-light:  #D0F0EC;  /* fondos sutiles, fills, badges */

  /* ── ACENTO — Slate Blue (Alquiler) ── */
  --color-rent:           #2D4E8A;
  --color-rent-dark:      #1A3160;
  --color-rent-light:     #D8E3F7;

  /* ── ACENTO — Warm Amber (Destacado / Premium) ── */
  --color-featured:       #C07A3A;
  --color-featured-dark:  #8A5220;
  --color-featured-light: #F7EEDF;

  /* ── NEUTROS (cálidos — nunca gris puro) ── */
  --color-cloud:    #F9F9F8;  /* fondo de página */
  --color-surface:  #F4F4F2;  /* cards, sidebars, fills secundarios */
  --color-border:   #E8E8E5;  /* divisores, bordes */
  --color-muted:    #9A9A96;  /* texto secundario, captions */
  --color-ink:      #2C2C2A;  /* texto primario */
  --color-dark:     #141412;  /* superficies oscuras, hero, footer */

  /* ── SEMÁNTICOS DE ESTADO ── */
  --color-success:  #1A9E8F;  /* = primary */
  --color-warning:  #C07A3A;  /* = featured */
  --color-danger:   #B0452F;  /* error/destructivo (rojo cálido) */
  --color-info:     #2D4E8A;  /* = rent */

  /* ── ALIASES SEMÁNTICOS ── */
  --bg-page:        var(--color-cloud);
  --bg-surface:     var(--color-surface);
  --bg-dark:        var(--color-dark);
  --text-primary:   var(--color-ink);
  --text-secondary: var(--color-muted);
  --text-on-dark:   #FFFFFF;
  --text-on-primary:#FFFFFF;
  --border-default: var(--color-border);
}
```

### Reglas de uso del color

1. **Teal por defecto.** Es el color de toda acción de sistema y de las propiedades en venta.
2. **Slate solo para alquiler.** Aparece en badges, barras de acento y filtros de propiedades en alquiler. Nunca en botones de navegación/CTA globales.
3. **Amber solo para destacados.** Promociones, premium, estados especiales. Uso escaso — pierde fuerza si se sobreusa.
4. **Nunca mezcles dos acentos en un mismo componente.** Una card es de venta (teal) **o** de alquiler (slate), no ambas.
5. **Nunca pongas un acento sobre el fondo de otro acento.** Los fondos de pantalla son siempre neutros.
6. **Fondos oscuros** usan `--color-dark` (#141412), nunca negro puro.
7. **Prohibido:** gradientes decorativos saturados, glow, sombras de color fuerte. Las sombras son neutras y suaves (§5).

### Contraste (WCAG AA)

| Combinación | Ratio | Uso |
|---|---|---|
| `--color-ink` sobre `--color-cloud` | 12.8:1 | Texto cuerpo ✓ AAA |
| `--color-muted` sobre `--color-cloud` | 3.4:1 | Solo texto ≥18px o no esencial |
| `#FFFFFF` sobre `--color-primary` | 3.1:1 | Texto ≥16px bold en botones ✓ AA Large |
| `--color-primary-dark` sobre `--color-primary-light` | 5.9:1 | Badges/chips ✓ AA |
| `#FFFFFF` sobre `--color-rent` | 6.4:1 | ✓ AA |

> Para texto pequeño sobre color primario, usa `--color-primary-dark` o aumenta el peso. No uses `--color-muted` para texto esencial < 18px sobre fondos claros.

---

## 3. Tipografía

Dos familias. Ambas libres y gratuitas (Google Fonts), o auto-hospedadas.

```css
:root {
  --font-display: 'Space Grotesk', sans-serif;  /* display, headlines, números grandes */
  --font-body:    'DM Sans', sans-serif;         /* cuerpo, UI, datos, captions */
}
```

- **Space Grotesk** — pesos 300 / 400 / 500 / 600 / 700. Para títulos, cifras destacadas (precios, métricas) y números grandes. Su carácter geométrico funciona muy bien en datos.
- **DM Sans** — pesos 300 / 400 / 500 (italic 400). Para todo el texto de cuerpo, etiquetas de UI, captions y datos en línea.

### Escala tipográfica

```css
:root {
  --text-display: 42px;  /* hero, números grandes        — Space Grotesk 600, -1px */
  --text-h1:      28px;  /* títulos de página             — Space Grotesk 500, -0.5px */
  --text-h2:      20px;  /* títulos de sección            — Space Grotesk 500 */
  --text-body:    16px;  /* cuerpo                         — DM Sans 400, lh 1.7 */
  --text-caption: 14px;  /* captions, texto secundario    — DM Sans 400, color muted */
  --text-label:   12px;  /* labels, overlines             — DM Sans 500, uppercase, +0.06em */

  --leading-tight: 1.2;
  --leading-snug:  1.4;
  --leading-body:  1.7;

  --tracking-display: -0.024em;
  --tracking-h1:      -0.018em;
  --tracking-label:    0.06em;
}
```

| Rol | Familia | Peso | Tamaño | Tracking | Line-height |
|---|---|---|---|---|---|
| Display | Space Grotesk | 600 | 42px | -0.024em | 1.2 |
| H1 | Space Grotesk | 500 | 28px | -0.018em | 1.4 |
| H2 | Space Grotesk | 500 | 20px | normal | 1.4 |
| Body | DM Sans | 400 | 16px | normal | 1.7 |
| Caption | DM Sans | 400 | 14px | normal | 1.4 — color `--color-muted` |
| Label/Overline | DM Sans | 500 | 12px | 0.06em | 1.4 — UPPERCASE |
| Precio / métrica | Space Grotesk | 600–700 | 20–24px | -0.5px | 1.1 |

> **Casing.** Sentence case en todo. Title case solo para nombres propios. Las labels/overlines van en MAYÚSCULA con tracking.

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
```

---

## 4. Espaciado, radios y elevación

### Escala de espaciado (base 4px)

```css
:root {
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;
  --space-12: 48px; --space-16: 64px; --space-20: 80px; --space-24: 96px;
}
```

> **Usa flex/grid con `gap`** para espaciar grupos de elementos (botones, chips, cards, nav). Evita márgenes por-elemento y whitespace inline; `gap` es explícito y sobrevive a edición/reordenamiento.

### Radios

```css
:root {
  --radius-sm:   4px;   /* chips, badges pequeños */
  --radius-md:   6px;   /* inputs, botones */
  --radius-lg:   8px;   /* cards, paneles */
  --radius-xl:  16px;   /* cards de propiedad, contenedores grandes */
  --radius-pill: 999px; /* tags, pills, avatares */
}
```

### Elevación (sombras neutras y suaves)

```css
:root {
  --shadow-card:  0 1px 3px rgba(20,20,18,0.08), 0 0 0 1px var(--color-border);
  --shadow-raise: 0 4px 12px rgba(20,20,18,0.10), 0 0 0 1px var(--color-border);
  --shadow-pop:   0 16px 48px rgba(20,20,18,0.12);  /* hover de card de propiedad */
  --shadow-modal: 0 24px 52px rgba(20,20,18,0.20);
}
```

> Nada de sombras coloreadas o difusas grandes en estado base. El hover de una card de propiedad puede usar `--shadow-pop` + `translateY(-4px)`.

---

## 5. Layout

- **Ancho de contenido:** máximo ~1180–1300px centrado. Padding lateral 24px (móvil) → 52–64px (desktop).
- **App con sidebar:** sidebar fija ~220px sobre `--color-dark`; contenido principal scrolleable sobre `--bg-page`.
- **Landing/marketing:** secciones full-width alternando fondos `--bg-page` / `--bg-surface` / `--bg-dark` para ritmo.
- **Grids de propiedades:** 3 columnas desktop → 2 tablet → 1 móvil. Gap `--space-4`.
- **Densidad:** prioriza información. Cada gap tiene propósito funcional, no decorativo.
- **Texturas permitidas** (sutiles, sobre fondos oscuros): grid de líneas finas a `rgba(255,255,255,0.025)` o dot-grid. Nada de gradientes saturados.

### Breakpoints

```css
/* mobile-first */
--bp-sm: 640px;   /* tablet pequeña */
--bp-md: 900px;   /* tablet / colapso de sidebar y nav */
--bp-lg: 1200px;  /* desktop */
```

---

## 6. Iconografía

- **Estilo:** stroke (línea), minimal, `stroke-width` 1.5–2, esquinas redondeadas (`stroke-linecap/linejoin: round`).
- **Tamaños:** 14 / 16 / 20 / 24px. Alinea óptimamente con el texto adyacente.
- **Sin emoji** como iconos en UI funcional (datos, valoraciones, navegación). El tono puede usar texto, no emoji decorativo.
- **Set recomendado:** [Lucide](https://lucide.dev) — coincide con la estética factual. No se incluye un set propietario.
- **Color:** heredan `currentColor`. En estado neutro usan `--color-muted`; activos/hover toman `--color-primary`.

---

## 7. Componentes

Para cada uno: anatomía, variantes, estados, sizing. Constrúyelos como primitivas reutilizables.

### 7.1 Button

**Anatomía:** contenedor + label (+ icono opcional leading/trailing).

**Variantes:**
- `primary` — fondo `--color-primary`, texto blanco. Hover → `--color-primary-dark`.
- `secondary` — fondo transparente, borde + texto `--color-primary`. Hover → fill `--color-primary-light`.
- `ghost` — fondo transparente, texto `--color-ink`, borde `--color-border`. Hover → fondo `--color-surface`.
- `danger` — texto/borde `--color-danger` (transparente). Hover → fill tenue rojo.

**Tamaños:** `sm` (padding 4×10, 12px) · `md` (7×14, 13px) · `lg` (10×20, 14px). Radio `--radius-md`. Fuente: DM Sans 500 o Space Grotesk 600.

**Estados:** default, hover, active (oscurece ~6%), focus (`outline: 2px solid` con offset, color primario), disabled (`--color-border` fondo, `--color-muted` texto, `cursor: not-allowed`), loading (spinner + texto, `aria-busy`).

> Para acciones contextuales de alquiler/destacado puede existir un botón con color de acento, pero **los CTAs globales siempre son `primary` (teal)**.

```html
<button class="btn btn--primary btn--md">Ver análisis</button>
```

### 7.2 Badge / Tag

Pieza de metadato. Texto 11–12px peso 500, padding 3×8 (badge `--radius-sm`) o 3×10 (tag `--radius-pill`).

**Variantes por tipo de operación:**
- Venta → fondo `--color-primary-light`, texto `--color-primary-dark`.
- Alquiler → fondo `--color-rent-light`, texto `--color-rent-dark`.
- Destacado → fondo `--color-featured-light`, texto `--color-featured-dark`.
- Neutral → fondo `--color-border`, texto `--color-ink`.

**Status dot:** punto de 6px + label, para estados (Activo, Pendiente, En revisión).

### 7.3 Input / Select / Textarea

Campo con label (overline 12px uppercase), control, y hint/error opcional.

- Control: fondo blanco, borde `--color-border`, radio `--radius-md`, padding 7×10, 13–14px.
- **Focus:** borde `--color-primary` + `box-shadow: 0 0 0 3px rgba(26,158,143,0.12)`.
- **Error:** borde `--color-danger`, hint en `--color-danger`.
- Placeholder: `--color-muted`.
- Hit target mínimo 44px en móvil.

### 7.4 Card (genérica)

Fondo blanco o `--color-surface`, borde `--color-border`, radio `--radius-lg`, `--shadow-card`. Padding `--space-4`–`--space-6`.

### 7.5 Property Card (componente clave)

Card de propiedad para grids y carruseles.

**Anatomía (de arriba a abajo):**
1. **Barra de acento** (3–4px) según operación: teal (venta) / slate (alquiler) / amber (destacado).
2. **Thumbnail** (~150px alto): imagen real o placeholder con tinte de la operación; **tag de operación** flotante arriba-izquierda.
3. **Insight** — línea de 11–12px con dot de color: el "por qué" de la propiedad (ej. "Cerca de 3 colegios").
4. **Nombre** — Space Grotesk 600, 15–16px.
5. **Ubicación** — 12–13px `--color-muted`.
6. **Precio** — Space Grotesk 700, ~21px + **rango estimado** en 11px muted (ej. "$265,000 · Est. $252k–$288k").
7. **Chips** — 2–4 metadatos (m², parqueo, cap rate…), pills sobre `--color-surface`.
8. **Match/métrica** — badge final (ej. "✓ 96% match" en venta, "↑ Cap rate 7.1%" en alquiler).

**Estados:** hover → `translateY(-4px)` + `--shadow-pop`, borde transparente. Toda la card es clickeable (rol link/button).

> **Honestidad del dato (ver §10):** el precio siempre se acompaña de rango y/o fuente. Nunca un precio puntual sin contexto.

### 7.6 Data Card / Métrica

Para dashboards. Label overline + valor grande (Space Grotesk 600, 22–24px) + subtexto + badge opcional. Borde superior de 2px en color de contexto.

### 7.7 Navegación

- **Top nav (marketing):** fija, fondo translúcido con `backdrop-filter: blur(20px)`; sobre hero oscuro usa fondo `rgba(dark, 0.88)`. Scroll-aware: oscurece al hacer scroll > 80px.
- **Sidebar (app):** fija sobre `--color-dark`; items con icono + label; item activo con fill `--color-primary` al ~13% y texto/icono `--color-primary`.

### 7.8 Tabs

Línea inferior de 2px `--color-border`; tab activa con borde inferior de 3px en color de contexto y texto `--color-ink`; inactivas `--color-muted`. Usa `role="tablist"/"tab"/"tabpanel"` + `aria-selected`.

### 7.9 Search (búsqueda en lenguaje natural)

Input grande (h ~58–64px) con icono leading, botón de acción primario embebido a la derecha, y dropdown de sugerencias on-focus.

- Dropdown: sugerencias con icono + texto + tag, y fila de "pills" de filtros rápidos.
- Comportamiento: abre on-focus, cierra on-click-outside; opcional placeholder typewriter que se detiene al enfocar.
- Sincroniza la query a la URL al enviar (`?q=...`).
- `aria-expanded` en el control, `aria-label` descriptivo.

### 7.10 Carousel

Track horizontal con técnica de clones para loop infinito; autoplay ~3400ms con **pausa on-hover**; botones prev/next fuera del área scrolleable. Respeta `prefers-reduced-motion` (desactiva autoplay).

### 7.11 Tabla comparativa

Para "nosotros vs alternativa": dos columnas, header de color (la columna propia con fill `--color-primary`), filas con ✓ (primary) y ✗ (muted). En móvil colapsa a una sola columna (la propia).

### 7.12 Modal / Sheet

Overlay `rgba(20,20,18,0.4)`; panel blanco radio `--radius-lg`, `--shadow-modal`. Focus-trap, cierre con Esc y click-outside, `role="dialog"` + `aria-modal`.

### 7.13 Footer

Grid multi-columna sobre `--color-dark`. Tagline + columnas de links + barra inferior legal. Links `rgba(255,255,255,0.45)` → blanco en hover.

---

## 8. Motion

```css
:root {
  --ease-out:   cubic-bezier(0.22, 1, 0.36, 1);
  --ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast:   0.15s;   /* hover, color */
  --dur-base:   0.25s;   /* transform, elevación */
  --dur-slow:   0.55s;   /* reveals al hacer scroll */
}
```

- **Funcional, medido. Nada bouncy.** Hover: cambio sutil de fondo o profundización de color (teal → deep teal). Active: oscurecer ~6%.
- **Scroll reveal:** `opacity 0→1` + `translateY(20px→0)`, escalonado ~40ms entre items. Estado final visible por defecto (para no-JS / print / reduced-motion).
- **Sin loops decorativos infinitos** en contenido (un pulse sutil en un indicador "en vivo" está bien).
- **Respeta `prefers-reduced-motion: reduce`:** desactiva typewriter, autoplay de carousel y reveals → mostrar estado final inmediato.

---

## 9. Accesibilidad (requisitos)

- **Contraste:** AA mínimo (texto normal 4.5:1, grande 3:1). Ver tabla §2.
- **Foco visible:** nunca `outline: none` sin reemplazo. Usa `:focus-visible` con outline de 2px color primario + offset.
- **Targets táctiles:** ≥ 44×44px en móvil.
- **Semántica:** HTML correcto (`<button>` para acciones, `<a>` para navegación, headings jerárquicos, `<nav role="navigation">`).
- **Roles ARIA:** tabs, dialog, carousel (`aria-label`), search (`aria-expanded`) según §7.
- **Teclado:** todo operable sin mouse; orden de tab lógico; Esc cierra overlays; focus-trap en modales.
- **Imágenes:** `alt` descriptivo; placeholders decorativos `aria-hidden`.
- **Reduced motion:** ver §8.
- **No comuniques solo por color:** acompaña el color de operación con el tag de texto ("Venta"/"Alquiler").

---

## 10. Voz y contenido (UX writing)

El tono del producto es **factual, directo, experto sin alardear**. Aplica a microcopy, estados vacíos, errores y onboarding.

**Principios:**
1. **El dato primero, la emoción después** — si hay un número, va el número; si hay incertidumbre, se declara.
2. **Demuestra, no afirmes** — sin "líderes del mercado", sin "tecnología de punta".
3. **Frases cortas. Puntos. Sin adornos.** Sin signos de exclamación en contextos de decisión. Sin emoji decorativo.
4. **Respeto sin condescendencia** — el usuario toma una decisión grande; háblale de igual a igual.

**Ejemplos:**

| ✗ Evita | ✓ Usa |
|---|---|
| "¡Encuentra el hogar de tus sueños!" | "847 propiedades en tu rango. 12 que valen tu tiempo." |
| "IA de última generación que analiza miles de variables" | "Precio estimado: $285,000–$310,000. Basado en 34 cierres en 90 días." |
| "¡Vaya! Algo salió mal 🙈" | "Algo falló. No es tu culpa. Estamos en ello." |

**Honestidad del dato (regla de producto):** todo precio/valoración se muestra con su **rango** y/o **fuente** y nivel de confianza. Nunca un número puntual sin contexto. Toda valoración lleva el disclaimer: *"Las valoraciones son estimadas. No constituyen asesoría financiera ni legal."*

---

## 11. Checklist de implementación

- [ ] `tokens.css` con todas las variables de §2–§5, `:root`.
- [ ] Fuentes cargadas (Space Grotesk + DM Sans) con `font-display: swap`.
- [ ] Reset/normalize + estilos base de `body` (font, color, bg, antialiasing, `text-wrap: pretty`).
- [ ] Primitivas: Button, Badge/Tag, Input/Select, Card, PropertyCard, DataCard, Tabs, Modal.
- [ ] Navegación (top + sidebar) con estados activos en color primario.
- [ ] Color de operación aplicado SOLO a señalización de propiedades; teal para todo lo demás.
- [ ] Estados de cada componente: default / hover / active / focus-visible / disabled / loading / error.
- [ ] Cuatro estados de data: loading (skeleton) / vacío / error / con datos.
- [ ] Accesibilidad §9 verificada (contraste, foco, teclado, ARIA, targets).
- [ ] `prefers-reduced-motion` respetado.
- [ ] Responsive en los 3 breakpoints.
- [ ] Microcopy revisado contra §10.

---

## 12. Snippet base de tokens (copiar/pegar)

```css
/* tokens.css — fuente única de verdad */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');

:root {
  /* Color — primario (venta + sistema) */
  --color-primary:#1A9E8F; --color-primary-dark:#0D6B61; --color-primary-light:#D0F0EC;
  /* Color — alquiler */
  --color-rent:#2D4E8A; --color-rent-dark:#1A3160; --color-rent-light:#D8E3F7;
  /* Color — destacado */
  --color-featured:#C07A3A; --color-featured-dark:#8A5220; --color-featured-light:#F7EEDF;
  /* Neutros cálidos */
  --color-cloud:#F9F9F8; --color-surface:#F4F4F2; --color-border:#E8E8E5;
  --color-muted:#9A9A96; --color-ink:#2C2C2A; --color-dark:#141412;
  /* Estado */
  --color-success:#1A9E8F; --color-warning:#C07A3A; --color-danger:#B0452F; --color-info:#2D4E8A;
  /* Aliases */
  --bg-page:var(--color-cloud); --bg-surface:var(--color-surface); --bg-dark:var(--color-dark);
  --text-primary:var(--color-ink); --text-secondary:var(--color-muted);
  --text-on-dark:#fff; --text-on-primary:#fff; --border-default:var(--color-border);

  /* Tipografía */
  --font-display:'Space Grotesk',sans-serif; --font-body:'DM Sans',sans-serif;
  --text-display:42px; --text-h1:28px; --text-h2:20px;
  --text-body:16px; --text-caption:14px; --text-label:12px;
  --leading-tight:1.2; --leading-snug:1.4; --leading-body:1.7;
  --tracking-display:-0.024em; --tracking-h1:-0.018em; --tracking-label:0.06em;

  /* Espaciado */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px;
  --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px;
  --space-16:64px; --space-20:80px; --space-24:96px;

  /* Radios */
  --radius-sm:4px; --radius-md:6px; --radius-lg:8px; --radius-xl:16px; --radius-pill:999px;

  /* Elevación */
  --shadow-card:0 1px 3px rgba(20,20,18,.08),0 0 0 1px var(--color-border);
  --shadow-raise:0 4px 12px rgba(20,20,18,.10),0 0 0 1px var(--color-border);
  --shadow-pop:0 16px 48px rgba(20,20,18,.12);
  --shadow-modal:0 24px 52px rgba(20,20,18,.20);

  /* Motion */
  --ease-out:cubic-bezier(.22,1,.36,1); --ease-inout:cubic-bezier(.65,0,.35,1);
  --dur-fast:.15s; --dur-base:.25s; --dur-slow:.55s;
}

body {
  font-family:var(--font-body); font-size:var(--text-body);
  color:var(--text-primary); background:var(--bg-page);
  line-height:var(--leading-body); -webkit-font-smoothing:antialiased; text-wrap:pretty;
}
```

---

*Fin del documento. Cualquier valor nuevo debe agregarse como token aquí antes de usarse en un componente.*
