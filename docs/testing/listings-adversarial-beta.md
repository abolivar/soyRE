# Protocolo Beta Adversarial De Publicaciones

## Objetivo

Este protocolo valida el dominio, API, Storage privado y workspace de
Publicaciones contra la base remota administrada. No usa Docker ni una base
local. Las suites mutantes están desactivadas por defecto, crean organizaciones
identificables y eliminan sus fixtures en `finally`.

## Preparación

1. Usar Node.js 22 y pnpm 10.
2. Cargar `DATABASE_URL`, `SUPABASE_URL` y `SUPABASE_SECRET_KEY` sin imprimirlos.
3. Aplicar y verificar las migraciones de #127 mediante Supabase MCP.
4. Confirmar que el bucket `listing-materials` es privado y limitado a 15 MB.
5. Mantener `main` disponible en 3000/4000 y usar puertos distintos para el
   branch.
6. Construir API y web antes de activar pruebas mutantes.

## Matriz API Adversarial

| Escenario                       | Evidencia exacta esperada                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Readiness y lifecycle           | Bloqueantes exactos; transición inválida en 409 sin escritura; recorrido DRAFT→READY→APPROVED→PUBLISHED→PAUSED→WITHDRAWN→ARCHIVED. |
| Venta, alquiler y concurrencia  | Dos listings separados con mandato `BOTH`; modalidad transaccional en 400; una sola creación abierta gana ante carrera.            |
| Roles, asignación y tenancy A/B | Agente no asignado y UUID ajeno en 404; `READONLY`/`FINANCE` en 403; mandato cruzado sin escritura.                                |
| Idempotencia y Storage          | Reintentos devuelven el mismo recurso; MIME adulterado en 400; uploads concurrentes dejan una metadata y un solo objeto.           |

Ejecución:

```bash
SOYRE_API_BASE_URL=http://127.0.0.1:4113/api \
LISTING_ADVERSARIAL_API_MUTATING=true \
pnpm test:listings-adversarial
```

Resultado aceptable: cuatro pruebas aprobadas, cero escrituras parciales, un
solo objeto para la carrera de Storage y limpieza completa.

## E2E Autenticado

El orquestador crea dos publicaciones independientes, una para Chromium desktop
y otra para Chromium móvil. Cada proyecto debe:

1. abrir `/listings` con una cookie real;
2. localizar su fila y abrir el detalle;
3. confirmar readiness completo;
4. agregar un enlace de video privado al expediente comercial;
5. declarar listo, aprobar y publicar;
6. pausar con motivo y reanudar;
7. retirar con motivo y mostrar el estado final;
8. conservar `scrollWidth <= innerWidth`.

Ejecución:

```bash
SOYRE_API_BASE_URL=http://127.0.0.1:4113/api \
LISTING_WORKSPACE_E2E_MUTATING=true \
PLAYWRIGHT_PORT=3114 \
pnpm test:listings-e2e
```

## Gates No Mutantes

```bash
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:listings-beta
pnpm test:e2e
```

Sin flags, las cinco pruebas de Publicaciones deben aparecer omitidas y salir
con código cero. Un fallo de OAuth, DNS, conexión remota o variable secreta es
un bloqueo de entorno. Un estado, permiso, evento, objeto huérfano o respuesta
HTTP inesperada es una regresión funcional.

## Limpieza

La limpieza borra listings y sus relaciones en cascada, luego mandatos,
documentos, propiedades, clientes, auditoría, memberships, organización y
usuarios. Los objetos reales creados para la carrera de Storage se eliminan
explícitamente antes de borrar metadata. Si esa limpieza falla, la suite falla
y conserva el marcador en el nombre de organización para diagnóstico.
