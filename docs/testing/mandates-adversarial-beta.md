# Protocolo Beta Adversarial De Mandatos

## Objetivo

Este protocolo valida el dominio, la API y el workspace de Mandatos contra la
base remota administrada. No usa Docker ni una base local. Las suites mutantes
están desactivadas por defecto, crean una organización única y eliminan sus
usuarios y datos operativos en `finally`.

## Preparación

1. Usar Node.js 22 y pnpm 10.
2. Cargar las variables remotas de ejecución sin imprimir secretos.
3. Construir `@soyre/api` y generar Prisma antes de iniciar una API aislada.
4. Mantener `main` disponible en 3000/4000 y usar otros puertos para el branch.
5. Confirmar `GET /api/health` antes de activar cualquier suite mutante.

Ejemplo de API del branch:

```bash
APP_URL=http://127.0.0.1:3112 API_PORT=4111 pnpm --filter @soyre/api start
```

## Matriz API Adversarial

La suite cubre cuatro escenarios independientes:

| Escenario                          | Evidencia exacta esperada                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modalidades, extremos, roles y A/B | `SALE`, `RENT` y `BOTH` válidos; términos inválidos en 400; roles sin permiso en 403; IDs cruzados sin escritura.                                       |
| Lifecycle y expediente             | Solo transiciones permitidas; firma futura rechazada; evidencia rechazada o vencida bloquea; reemplazo aprobado habilita; fallos sin eventos huérfanos. |
| Activación y readiness             | Una sola activación exclusiva gana; modalidades no intersectadas coexisten; listing incompatible o sin mandato activo se bloquea.                       |
| Renovación y supersesión           | Dos renovaciones simultáneas devuelven el mismo sucesor; una indica creación; activar el sucesor reemplaza el anterior atómicamente.                    |

Ejecución:

```bash
SOYRE_API_BASE_URL=http://127.0.0.1:4111/api \
MANDATE_ADVERSARIAL_API_MUTATING=true \
pnpm test:mandates-adversarial
```

Resultado aceptable: cuatro pruebas aprobadas, cero fallos y cero fixtures de la
organización marcador después de la limpieza.

## E2E Autenticado

El orquestador crea dos mandatos y propiedades independientes dentro de una
organización temporal. Inyecta en Chromium la cookie real emitida por la API y
usa el proxy same-origin de Next para el tráfico de la aplicación.

Cada proyecto, desktop y móvil, debe:

1. abrir `/mandates` con sesión válida;
2. localizar su fila y abrir el detalle;
3. presentar el borrador para firma;
4. registrar evidencia firmada y aprobada;
5. vincular esa evidencia al registrar la firma;
6. activar el mandato;
7. mostrar estado activo, readiness listo y cuatro eventos;
8. conservar `scrollWidth <= innerWidth`.

Ejecución:

```bash
SOYRE_API_BASE_URL=http://127.0.0.1:4111/api \
MANDATE_WORKSPACE_E2E_MUTATING=true \
PLAYWRIGHT_PORT=3112 \
pnpm test:mandates-e2e
```

Resultado aceptable: un orquestador aprobado que contiene dos proyectos
Playwright aprobados y limpieza remota completa al finalizar.

## Gates No Mutantes

```bash
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Las suites opt-in sin sus flags deben aparecer omitidas, nunca ejecutar altas
por accidente. Los fallos de DNS, conexión al proveedor o descarga de tooling
se registran como bloqueantes de entorno; un status, cálculo, evento o escritura
incorrecta se trata como regresión funcional.

## Limpieza Y Diagnóstico

La limpieza elimina primero listings, eventos, documentos, mandatos,
propiedades, clientes y auditoría; después memberships, organización y usuarios.
Se ejecuta también cuando Playwright o una aserción intermedia falla.

Si una prueba concurrente excede el tiempo:

- revisar el log por `P2028` o espera de advisory lock;
- confirmar que el timeout de la prueba es mayor que el presupuesto remoto de
  la transacción;
- comprobar que ambas respuestas convergen en el mismo recurso;
- verificar que no quedaron eventos o sucesores duplicados antes de reintentar.
