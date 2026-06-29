# Real Estate Broker Ops

Plataforma SaaS para brokers inmobiliarios enfocada en la gestión operativa del inmueble como producto.

Este sistema no es un CRM genérico. El centro del dominio es el inmueble y su ciclo completo: captación, consignación, validación documental, publicación, visitas, ofertas, venta/alquiler, cierre, comisiones, archivo y auditoría.

---

## Requisitos

- Node.js LTS
- pnpm
- Docker
- Docker Compose

---

## Instalación

```bash
pnpm install
cp .env.example .env
```

---

## Base de datos local

```bash
docker compose up -d postgres
```

---

## Desarrollo

```bash
pnpm dev
```

---

## Validación

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

---

## Prisma

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

---

## Documentación clave

Antes de implementar cualquier tarea, leer:

- `AGENTS.md`
- `docs/product/foundational.md`
- `docs/architecture/overview.md`
- `docs/architecture/stack.md`
- Documento del módulo correspondiente en `docs/modules/`

---

## Convención principal

- Archivos y carpetas en inglés técnico.
- `lowercase-kebab-case`.
- Código, modelos y APIs en inglés.
- Documentación de negocio puede estar en español.
