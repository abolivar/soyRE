# Adoptar `@soyre/ui` En Pantallas Nuevas

Fuente visual: `design.md`. Lenguaje visual vigente: `docs/architecture/visual-language.md`. Reglas operativas: `CODEX.md`. Arquitectura: `docs/architecture/design-system.md`.

## Estado Base

- `apps/web/app/layout.tsx` importa `@soyre/ui/styles` antes de `./globals.css`.
- Las primitivas reutilizables viven en `packages/ui` y se consumen como `@soyre/ui`.
- `apps/web/components/` queda reservado para componentes específicos de producto.
- `Button` soporta `asChild` para usar `next/link` sin volver a `className="button ..."`.
- `Input`, `Select`, `Textarea` y `SearchInput` son las rutas preferidas para formularios visibles.
- `globals.css` no debe definir apariencia universal para `input/select/textarea`; solo layout y estilos acotados de app.

## Prompt Reutilizable

```text
Construye/ajusta la pantalla {PANTALLA} en apps/web (ruta {RUTA}) para que cumpla el design system SoyPMS.

Lee antes de escribir código:
1. CODEX.md
2. design.md
3. docs/architecture/visual-language.md
4. docs/architecture/design-system.md
5. packages/ui/src/components/ para validar props reales

Reglas:
- Importa primitivas desde @soyre/ui.
- No uses apps/web/components/ui.tsx ni crees primitivas reutilizables en apps/web/components/.
- Usa Button para acciones. Para links con apariencia de botón usa Button asChild + Link.
- Usa Input, Select, Textarea y SearchInput para formularios visibles.
- Usa tokens CSS via var(--token); no agregues hex en styling TSX.
- Copy visible en español correcto, con acentos y sin lenguaje técnico interno. Identifiers, props, tipos y rutas en inglés.
- No muestres strings crudos de API; tradúcelos a mensajes de producto.
- Si la pantalla depende de datos, implementa loading, error, empty y data.
- Usa PageHeader como encabezado principal y SectionPanel/DataTable/EmptyState para estructura operativa.

Entrega:
- Typecheck limpio.
- pnpm check:design-system limpio.
- Sin deuda técnica silenciosa; si aparece, crea issue.
```

## Checklist

- [ ] Imports de primitivas desde `@soyre/ui`.
- [ ] Cero imports a `./ui`.
- [ ] Cero `className="button ..."` en `apps/web`.
- [ ] Formularios con primitivas DS o controles nativos dentro de contenedores acotados.
- [ ] Cero hex hardcodeado en atributos `style`/`className` de TSX.
- [ ] `loading`, `error`, `empty`, `data` cuando hay datos remotos.
- [ ] `pnpm check:design-system` pasa.
