# AGENTS.md

## Contexto del proyecto

Este proyecto es una plataforma SaaS para brokers inmobiliarios.

El sistema **no es un CRM genérico**. Es una plataforma de operaciones de producto inmobiliario donde el centro es el inmueble y su ciclo completo:

- Captación.
- Consignación.
- Validación documental.
- Preparación comercial.
- Publicación.
- Visitas.
- Ofertas.
- Venta o alquiler.
- Cierre.
- Comisiones.
- Archivo.
- Auditoría.

## Stack

- Runtime: Node.js LTS.
- Frontend: Next.js.
- Backend: NestJS.
- Base de datos: PostgreSQL.
- ORM: Prisma.
- Lenguaje: TypeScript estricto.
- Package manager: pnpm.
- Monorepo: pnpm workspaces.
- Orquestación: Turborepo.
- Testing: Jest / Playwright.
- Arquitectura: monorepo con monolito modular.
- Patrón: multi-tenant SaaS.

## Documentación principal

Antes de modificar código, leer:

- `docs/product/foundational.md`
- `docs/architecture/overview.md`
- `docs/architecture/stack.md`
- `docs/architecture/database.md`
- `docs/architecture/api.md`
- `docs/architecture/security.md`
- `docs/architecture/tenancy.md`
- Documento funcional/técnico del módulo correspondiente en `docs/modules/`

## Reglas de trabajo

- No construir funcionalidades fuera del alcance del ticket.
- No convertir el producto en un CRM genérico.
- Mantener el inmueble como entidad central.
- Usar `organization` como concepto del cliente SaaS/multi-tenant.
- Evitar usar `tenant` para inquilino; usar `lessee` cuando aplique.
- Respetar multi-tenancy en todas las consultas futuras.
- Validar permisos en endpoints protegidos.
- Registrar auditoría para acciones críticas.
- No eliminar físicamente entidades críticas sin una decisión documentada.
- No agregar dependencias sin justificar.
- No modificar contratos públicos sin indicarlo.
- No introducir cambios masivos innecesarios.
- Mantener cambios pequeños y revisables.
- Actualizar tests cuando cambie comportamiento.
- Actualizar documentación cuando cambie funcionalidad.
- Ejecutar validaciones antes de finalizar.

## Convenciones de archivos

- Usar inglés técnico para carpetas y archivos.
- Usar `lowercase-kebab-case`.
- No usar espacios, acentos, ñ ni nombres ambiguos.
- Código, modelos, APIs y rutas en inglés.
- Documentación de negocio puede estar en español.

## Convenciones de código

- Usar TypeScript estricto.
- Usar nombres descriptivos.
- Evitar lógica de negocio en controladores.
- Separar controladores, servicios, repositorios, policies y validators.
- Manejar errores con excepciones controladas.
- Evitar duplicación innecesaria.
- No dejar `console.log` en código final.
- Mantener funciones pequeñas.
- Agregar comentarios solo si aclaran una decisión no obvia.

## Convenciones de testing

- Agregar unit tests para reglas de negocio.
- Agregar integration tests para endpoints críticos.
- Agregar tests de permisos.
- Agregar tests de aislamiento multi-tenant.
- Cubrir casos felices y casos de error.
- No eliminar tests existentes salvo justificación clara.

## Validación estándar

Ejecutar cuando aplique:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para cambios de base de datos:

```bash
pnpm db:generate
pnpm db:migrate
pnpm test
pnpm typecheck
```

## Flujo esperado para cada tarea

1. Leer documentación relacionada.
2. Inspeccionar archivos existentes.
3. Identificar patrones del proyecto.
4. Proponer plan breve.
5. Implementar cambios dentro del alcance.
6. Ejecutar validaciones.
7. Resumir archivos modificados.
8. Reportar comandos ejecutados.
9. Indicar riesgos o pendientes.

## Entrega esperada

Al finalizar una tarea, reportar:

- Resumen de cambios.
- Archivos modificados.
- Tests agregados o actualizados.
- Comandos ejecutados.
- Resultado de validaciones.
- Riesgos o pendientes.
