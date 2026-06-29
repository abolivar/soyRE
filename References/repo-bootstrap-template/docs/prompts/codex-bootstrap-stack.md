# Tarea para Codex: Bootstrap inicial del stack

## Contexto

Este proyecto es una plataforma SaaS para brokers inmobiliarios.

No es un CRM genérico. El centro del dominio es el inmueble como producto operativo, documental, comercial, financiero y transaccional.

Antes de modificar o crear código, lee estos documentos si existen en el repo:

- `docs/product/foundational.md`
- `docs/product/glossary.md`
- `docs/architecture/overview.md`
- `docs/architecture/stack.md`
- `docs/architecture/database.md`
- `docs/architecture/api.md`
- `docs/architecture/tenancy.md`
- `docs/architecture/security.md`
- `docs/backlog/bootstrap-tickets.md`
- `AGENTS.md`

Si alguno no existe, créalo como parte de esta tarea con contenido inicial mínimo y claro.

---

## Objetivo

Crear la base técnica del repositorio para desarrollar una plataforma SaaS modular de operaciones inmobiliarias para brokers.

La meta de esta tarea es dejar el stack inicial preparado, documentado y validable, sin implementar funcionalidades de negocio todavía.

---

## Stack objetivo

- Runtime: Node.js LTS.
- Package manager: pnpm.
- Monorepo: pnpm workspaces.
- Build orchestration: Turborepo.
- Frontend: Next.js con App Router y TypeScript.
- UI base: Tailwind CSS. Preparar para shadcn/ui, pero no construir dashboard todavía.
- Backend: NestJS con TypeScript estricto.
- API: REST, preparada para OpenAPI/Swagger.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Local dev: Docker Compose para PostgreSQL.
- Testing: Jest para unit/integration; Playwright preparado para E2E.
- Arquitectura: monorepo + monolito modular.
- Patrón SaaS: multi-tenant usando `organization` como entidad conceptual, no implementar modelo todavía.

---

## Estructura esperada

Crea o prepara esta estructura:

```txt
apps/
  web/
  api/

packages/
  database/
  shared/
  ui/
  config/

docs/
  product/
    foundational.md
    glossary.md
    roadmap.md
    mvp-scope.md

  architecture/
    overview.md
    stack.md
    database.md
    api.md
    tenancy.md
    security.md
    permissions.md
    audit.md

  modules/
    properties/
      overview.md
    mandates/
      overview.md
    documents/
      overview.md
    workflows/
      overview.md
    listings/
      overview.md
    showings/
      overview.md
    offers/
      overview.md
    deals/
      overview.md
    commissions/
      overview.md

  backlog/
    epics.md
    mvp-tickets.md
    bootstrap-tickets.md

  decisions/
    adr-0001-initial-stack.md
    adr-0002-use-property-as-core-entity.md
    adr-0003-use-organization-for-saas-tenancy.md

  prompts/
    codex-base-task.md
    codex-bootstrap-stack.md
    codex-code-review.md

tests/
  unit/
  integration/
  e2e/

AGENTS.md
README.md
CONTRIBUTING.md
.env.example
.gitignore
.editorconfig
package.json
pnpm-workspace.yaml
turbo.json
docker-compose.yml
```

---

## Alcance

Puedes:

- Inicializar monorepo con pnpm workspaces.
- Crear `apps/web` usando Next.js con TypeScript, App Router y Tailwind.
- Crear `apps/api` usando NestJS con TypeScript estricto.
- Crear `packages/database` con Prisma preparado para PostgreSQL.
- Crear placeholders en `packages/shared`, `packages/ui` y `packages/config`.
- Crear `docker-compose.yml` para PostgreSQL local.
- Crear `.env.example` con variables necesarias.
- Crear `README.md` con instalación, desarrollo y validación.
- Crear `AGENTS.md` con reglas específicas del producto.
- Crear documentos base en `/docs`.
- Crear scripts root para `dev`, `build`, `lint`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:studio`.
- Configurar Turborepo para orquestar scripts.
- Agregar configuración mínima de TypeScript/ESLint/Prettier si aplica.

---

## Fuera de alcance

No debes:

- Implementar autenticación.
- Crear modelos reales de `Property`, `Owner`, `Mandate`, `Deal` o `Commission` todavía.
- Crear endpoints de negocio.
- Crear pantallas del producto.
- Implementar carga de documentos.
- Implementar workflows.
- Implementar comisiones.
- Implementar multi-tenancy en base de datos todavía.
- Integrar portales inmobiliarios.
- Integrar pagos.
- Integrar firma electrónica.
- Agregar dependencias innecesarias o no justificadas.
- Hacer refactors masivos no relacionados.

---

## Requisitos funcionales del bootstrap

- El proyecto debe estar claramente identificado como plataforma SaaS para brokers inmobiliarios.
- La documentación debe repetir que el sistema no es un CRM genérico.
- La documentación debe dejar claro que `property` es la entidad central futura.
- La documentación debe dejar claro que `organization` será el concepto para el cliente SaaS/multi-tenant.
- El repo debe quedar listo para trabajar por módulos y tickets pequeños.
- El README debe explicar cómo instalar, levantar, validar y usar Docker.

---

## Requisitos técnicos

- Usar TypeScript estricto donde aplique.
- Usar pnpm workspaces.
- Usar nombres de carpetas y archivos en inglés, lowercase y kebab-case.
- Mantener cambios pequeños y claros.
- Evitar lógica de negocio prematura.
- Evitar duplicación innecesaria.
- No guardar secretos reales.
- `.env.example` debe contener placeholders seguros.
- `docker-compose.yml` debe exponer PostgreSQL local.
- Scripts root deben delegar a las apps/packages usando Turborepo o pnpm filters.
- Documentar cualquier comando que no pueda ejecutarse correctamente y explicar por qué.

---

## Variables mínimas esperadas en `.env.example`

```env
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
DATABASE_URL=postgresql://brokerops:brokerops@localhost:5432/brokerops?schema=public
POSTGRES_USER=brokerops
POSTGRES_PASSWORD=brokerops
POSTGRES_DB=brokerops
POSTGRES_PORT=5432
JWT_ACCESS_SECRET=change-me-in-development
JWT_REFRESH_SECRET=change-me-in-development
```

---

## Scripts esperados en el root

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "db:generate": "pnpm --filter @brokerops/database db:generate",
    "db:migrate": "pnpm --filter @brokerops/database db:migrate",
    "db:studio": "pnpm --filter @brokerops/database db:studio"
  }
}
```

Ajusta los scripts si los nombres de paquetes generados son distintos, pero conserva la intención.

---

## Criterios de aceptación

- Existe estructura monorepo con `apps/web`, `apps/api` y `packages/*`.
- Existe `pnpm-workspace.yaml` válido.
- Existe `turbo.json` válido.
- Existe `docker-compose.yml` con PostgreSQL local.
- Existe `.env.example` sin secretos reales.
- Existe `README.md` con comandos claros.
- Existe `AGENTS.md` con contexto del producto, stack, reglas de trabajo y validaciones.
- Existe documentación base en `/docs`.
- Existe ADR inicial del stack.
- Existe prompt base para próximas tareas de Codex.
- El frontend y backend se pueden instalar y construir o queda documentado el ajuste pendiente.
- No se implementó funcionalidad de negocio fuera de alcance.

---

## Validación técnica

Ejecuta, si el entorno lo permite:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para base de datos local:

```bash
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
```

Si alguna validación falla por una limitación del entorno, no ocultes el error. Reporta:

- comando ejecutado,
- error recibido,
- causa probable,
- ajuste recomendado.

---

## Entrega esperada

Al finalizar, entrega:

1. Resumen corto de lo creado.
2. Estructura de carpetas resultante.
3. Archivos creados o modificados.
4. Dependencias agregadas.
5. Comandos ejecutados.
6. Resultado de validaciones.
7. Riesgos o pendientes.
8. Próximos tickets recomendados.

---

## Próximos tickets sugeridos después del bootstrap

No los implementes ahora; solo puedes dejarlos documentados en `docs/backlog/bootstrap-tickets.md`:

1. Crear modelo base `Organization` y estrategia multi-tenant.
2. Crear modelo base `User`, `Role` y `Membership`.
3. Crear módulo `properties` con modelo inicial `Property`.
4. Crear módulo `owners` y relación property-owner.
5. Crear módulo `mandates` para consignación.
6. Crear módulo `documents` con checklist inicial.
7. Crear auditoría básica `audit_logs`.
8. Crear primer dashboard vacío protegido.
