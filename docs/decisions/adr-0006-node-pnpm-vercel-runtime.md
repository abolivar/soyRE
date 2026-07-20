# ADR-0006 — Contrato De Node, pnpm Y Vercel

## Estado

Aceptada.

## Contexto

SoyRE puede abrirse desde shells que resuelven distintas instalaciones de
Node. `.nvmrc` documentaba Node 22.22.2, pero no cambiaba el runtime por si solo;
`package.json#engines` tampoco impedia que comandos locales se iniciaran con
Node 25 o 26. pnpm podia provenir de Corepack o de una instalacion global, y los
logs cacheados de Turbo podian mostrar advertencias de un runtime historico.

Vercel despliega por version mayor de Node y actualiza automaticamente minor y
patch. Un pin exacto para el runtime del proveedor seria incompatible con ese
modelo, mientras dejar toda la seleccion en el dashboard crearia una fuente de
verdad no versionada.

## Decisión

1. El runtime soportado por SoyRE y seleccionado por Vercel es Node `22.x`.
2. El runtime local reproducible es Node `22.22.2`.
3. `pnpm-workspace.yaml#useNodeVersion` selecciona Node `22.22.2` para los
   scripts del proyecto, independientemente del Node de la shell padre.
4. pnpm queda fijado en `10.33.2` mediante `packageManager`, `engines.pnpm` y la
   politica estricta del workspace.
5. `pnpm runtime:check` valida Node y pnpm antes de desarrollo, validaciones,
   Prisma y builds oficiales.
6. Vercel ejecuta `pnpm build:web`; ese comando comparte el mismo chequeo antes
   de construir `@soyre/web` y sus dependencias.
7. Corepack se habilita en Development, Preview y Production del proyecto
   Vercel.
8. `pnpm vercel:build` fija y ejecuta la CLI de Vercel mediante `pnpm dlx`;
   Corepack queda como dependencia de desarrollo ligera. Instalaciones globales
   no forman parte del contrato.
9. `.nvmrc`, `package.json` y `pnpm-workspace.yaml` forman parte de las
   dependencias globales de Turbo para invalidar caches cuando cambie el
   contrato.

## Consecuencias

- Los comandos oficiales de SoyRE son reproducibles sin cambiar el Node global
  de la maquina ni afectar otros repositorios.
- Una invocacion directa con un Node fuera de 22 falla con un mensaje
  accionable; una invocacion mediante pnpm selecciona el runtime correcto.
- La primera ejecucion puede descargar Node 22.22.2 al almacen administrado por
  pnpm. Las siguientes ejecuciones reutilizan esa instalacion.
- El build de Vercel usa Node 22 para el proveedor y Node 22.22.2 para los
  scripts administrados por pnpm. Las funciones desplegadas siguen las
  actualizaciones de seguridad de Vercel dentro de Node 22.x.
- No se crea `.pnpm-store` dentro del workspace y no se elimina ninguna
  instalacion global de Node o pnpm.

## Verificación

La aceptacion minima es:

```bash
pnpm install --frozen-lockfile
pnpm runtime:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm vercel:build
```

El log de runtime debe mostrar Node 22 y pnpm 10.33.2 antes de construir. El
proyecto Vercel debe conservar Node `22.x`, raiz `.`, salida `apps/web/.next` y
Corepack habilitado en sus tres entornos.
