# Stack Técnico

## Decisión

- **Runtime y orquestación**
  - Node.js 22 LTS.
  - pnpm 10 con workspaces.
  - Turborepo.

- **Frontend (`apps/web`)**
  - Next.js 16 App Router (`next` 16.2.x).
  - React 19 (`react` 19.2.x).
  - Tailwind CSS v4 con `@tailwindcss/postcss`.
  - Tokens de diseño expresados como variables CSS en `:root` (ver `design.md`).
  - lucide-react para iconografía.
  - DM Sans self-hosted en `apps/web/public/fonts/dm-sans/`.
  - Playwright para e2e.

- **Backend (`apps/api`)**
  - NestJS REST API, preparada para OpenAPI.
  - En producción alpha corre como servicio Node separado y puede publicarse detrás
    de un rewrite same-origin del frontend para preservar cookies httpOnly.

- **Datos (`packages/database`)**
  - PostgreSQL gestionado en Supabase.
  - Prisma 7 como ORM.

- **Design System (`packages/ui`)**
  - Home canónica de primitivas React compartidas entre apps del monorepo.
  - Build con `tsc` (genera `dist/index.js` + `dist/index.d.ts` + CSS bundle).
  - Spec visual en `design.md`; arquitectura del package en `docs/architecture/design-system.md`.

- **Lenguaje y tipos:** TypeScript estricto.

## Decisión Explícita Sobre Base De Datos

No se usará Docker Compose, máquinas virtuales ni PostgreSQL local desde este workspace.

La base PostgreSQL gestionada vive en Supabase. Los cambios de schema y datos administrativos se aplican remotamente mediante MCP de Supabase.

`DATABASE_URL` y `DIRECT_URL` apuntan al pooler remoto de Supabase cuando el API o Prisma deban conectarse a Postgres. Deben vivir solo en archivos ignorados por git o en variables de runtime/deploy.

## Decisión Explícita Sobre Design System

No se usará una librería de componentes de terceros (shadcn/ui, Radix, MUI, Chakra) como base. Las primitivas se construyen propias en `packages/ui` sobre el sistema de clases CSS definido en `apps/web/app/globals.css` y los tokens de `design.md`. Esta decisión se revisa solo si aparece una necesidad concreta documentada (por ejemplo, Radix Primitives para accesibilidad compleja), no por defecto.

Decisión registrada en `docs/decisions/adr-0005-design-system-home.md`.

## Principios

- Documentar antes de implementar negocio.
- Mantener módulos claros.
- Mantener cambios pequeños.
- Validar con lint, typecheck, tests y build.
- No implementar lógica de negocio hasta que el módulo esté documentado.
- No agregar dependencias sin razón práctica.

## Dependencias de tareas del monorepo

Los paquetes workspace publican sus puntos de entrada desde `dist`. Por eso las
tareas raíz no pueden asumir que un checkout conserva artefactos de una
ejecución anterior:

- `typecheck` espera tanto el `build` como el `typecheck` de sus dependencias.
- `test` espera tanto el `build` como los tests de sus dependencias.
- `build` continúa encadenando los builds de dependencias mediante `^build`.

Turbopack usa la raiz del workspace para resolver esos paquetes. Por esa razon,
el store de pnpm no debe vivir dentro del repositorio: se usa la ubicacion
global predeterminada y `pnpm dev:check` impide iniciar el watcher cuando existe
un `.pnpm-store` heredado. Esta separacion evita que decenas de miles de objetos
del gestor de paquetes consuman descriptores o bloqueen el watcher en macOS.

Esta relación se declara en `turbo.json`. Así `apps/api` recibe los artefactos
de `packages/shared` y `packages/database`, y `apps/web` recibe los de
`packages/shared` y `packages/ui`, incluso después de una instalación limpia.
Los tres paquetes publican también sus declaraciones TypeScript desde `dist`;
ningún consumidor depende del cliente Prisma generado dentro de `src`.
