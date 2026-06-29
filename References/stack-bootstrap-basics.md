# Stack Bootstrap Basics — Real Estate Broker Ops

**Producto:** Plataforma SaaS para brokers inmobiliarios  
**Enfoque:** Gestión operativa del inmueble como producto, no CRM genérico  
**Objetivo de este documento:** preparar la base técnica mínima para que Codex pueda crear el repositorio, instalar el stack y dejarlo listo para desarrollo modular.

---

## 1. Decisión base del stack

| Capa | Decisión | Motivo |
|---|---|---|
| Runtime | Node.js LTS | Ecosistema estable para Next.js, NestJS, Prisma y herramientas TypeScript. |
| Package manager | pnpm | Excelente para monorepos, rápido y con workspaces nativos. |
| Monorepo | pnpm workspaces + Turborepo | Permite separar apps y paquetes compartidos sin fragmentar el producto. |
| Frontend | Next.js App Router | Dashboard SaaS, rutas protegidas, SSR/CSR flexible y buen ecosistema. |
| UI | Tailwind CSS + shadcn/ui | Velocidad para dashboard administrativo con componentes copiables y personalizables. |
| Backend | NestJS | Arquitectura modular, DI, controladores, servicios, guards, pipes y testing ordenado. |
| API | REST + OpenAPI | Sencillo para MVP, fácil de probar, documentar e integrar. |
| Base de datos | PostgreSQL | Relacional, robusta, ideal para multi-tenancy, auditoría y transacciones. |
| ORM | Prisma | Migraciones, schema tipado y buena DX con TypeScript. |
| Auth inicial | API-owned auth con JWT/cookies httpOnly | Mejor control para SaaS B2B y futuras apps externas. No implementar todavía en bootstrap. |
| Testing | Jest + Playwright | Unit/integration en API y E2E para flujos críticos del dashboard. |
| Local dev | Docker Compose | PostgreSQL local reproducible. |
| Documentación | Markdown en `/docs` | Codex debe leer documentos antes de tocar código. |

---

## 2. Estructura inicial del repositorio

```txt
real-estate-broker-ops/
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
      mandates/
      documents/
      workflows/
      listings/
      showings/
      offers/
      deals/
      commissions/

    backlog/
      epics.md
      mvp-tickets.md
      bootstrap-tickets.md

    decisions/
      adr-0001-initial-stack.md
      adr-0002-use-property-as-core-entity.md
      adr-0003-use-organization-for-saas-tenancy.md

    prompts/
      codex-bootstrap-stack.md
      codex-base-task.md
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

## 3. Convenciones principales

### Archivos y carpetas

- Inglés técnico.
- `lowercase-kebab-case`.
- Sin espacios, acentos ni ñ.
- Documentación en español permitida.
- Código, rutas, modelos y APIs en inglés.

### Dominio

| Concepto | Nombre recomendado |
|---|---|
| Inmueble | `property` |
| Propietario | `owner` |
| Consignación / mandato | `mandate` |
| Publicación | `listing` |
| Visita | `showing` |
| Oferta | `offer` |
| Operación / transacción | `deal` |
| Alquiler / contrato | `lease` |
| Inquilino | `lessee` |
| Organización cliente SaaS | `organization` |
| Broker/inmobiliaria | `brokerage` |
| Comisión | `commission` |
| Documento | `document` |
| Auditoría | `audit-log` |

---

## 4. Comandos base esperados

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para base de datos:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Para Docker local:

```bash
docker compose up -d postgres
docker compose down
```

---

## 5. Qué debe crear Codex en la Tarea 0

Codex debe crear la base del repositorio y dejarlo ejecutable, pero sin implementar negocio todavía.

### Debe crear

- Monorepo con pnpm workspaces.
- `apps/web` con Next.js.
- `apps/api` con NestJS.
- `packages/database` preparado para Prisma.
- `packages/shared`, `packages/ui`, `packages/config` como paquetes placeholder.
- `docker-compose.yml` con PostgreSQL local.
- `.env.example`.
- `README.md`.
- `AGENTS.md`.
- Documentación base en `/docs`.
- Scripts root para dev, build, lint, typecheck, test.
- ADR inicial del stack.
- Prompt base para próximas tareas.

### No debe crear todavía

- Modelos reales de negocio.
- Autenticación completa.
- Endpoints de negocio.
- UI del producto.
- Flujos de inmuebles.
- Migraciones definitivas.
- Integraciones externas.
- Comisiones.
- Document upload real.

---

## 6. Definition of Done para el bootstrap

- [ ] El repo instala dependencias con `pnpm install`.
- [ ] Existe `pnpm-workspace.yaml`.
- [ ] Existen `apps/web` y `apps/api`.
- [ ] Existe `packages/database` con Prisma inicializado o documentado.
- [ ] Existe `docker-compose.yml` con PostgreSQL local.
- [ ] Existe `.env.example`.
- [ ] Existe `README.md` con comandos de instalación y ejecución.
- [ ] Existe `AGENTS.md` específico del producto.
- [ ] Existe `/docs` con arquitectura, producto, backlog, decisiones y prompts.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` funcionan o Codex documenta claramente cualquier ajuste pendiente.
- [ ] No se creó lógica de negocio fuera de alcance.
