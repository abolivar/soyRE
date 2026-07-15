# QA Integrado Del Expediente Documental

## Objetivo

Este protocolo valida BETA-DOC-007 sobre el backend conectado al PostgreSQL
remoto de sandbox. No usa Docker, una base local ni políticas públicas de
Storage. La automatización crea organizaciones nuevas con identificadores
aleatorios y nunca consulta, modifica o elimina filas ajenas a esos IDs.

## Comandos

La suite es opt-in. Sin la variable mutante, las pruebas se omiten y no crean
datos:

```bash
pnpm test:documents-beta
```

Para ejecutar el recorrido remoto:

```bash
DOCUMENT_EXPEDIENTE_QA_MUTATING=true pnpm test:documents-beta
```

El servidor se reutiliza si `SOYRE_API_BASE_URL` responde salud; en caso
contrario se levanta temporalmente con las variables remotas del entorno. Para
probar archivos privados de extremo a extremo, el backend también necesita
`SUPABASE_SECRET_KEY`. Esta credencial no se expone a la web ni se escribe en el
repositorio.

El gate visual y responsive no mutante se ejecuta con:

```bash
pnpm test:e2e -- document-workspace.spec.ts
```

## Datos Aislados

Cada ejecución genera un `runId` y usa prefijos `docs-*` y `checklist-*` en:

- Dos organizaciones nuevas, A y B.
- Owners y un usuario `READONLY` nuevos.
- Clientes, propiedades, tipos de contrato, negocios y participantes nuevos.
- Familias de plantillas y expedientes nuevos.

La suite no usa búsquedas amplias para limpiar datos y no ejecuta borrados por
nombre, fecha o prefijo. Solo elimina los objetos binarios y metadatos concretos
que ella misma crea durante el caso de Storage positivo; el resto queda marcado
por `runId` como evidencia de sandbox.

## Matriz API Adversarial

| Caso                   | Acción                                                                | Resultado exacto                                                                 |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Tenancy de plantillas  | Owner A lista o usa `organizationId` de B                             | `403` al cambiar ámbito y `404` al usar una plantilla ajena                      |
| Rol administrativo     | `READONLY` lista plantillas                                           | `403`                                                                            |
| Plantillas distintas   | A crea venta; B crea alquiler                                         | Venta contiene `RESERVA/ADENDA`; alquiler contiene `ARRENDAMIENTO/ENTREGA`       |
| Aplicabilidad          | Plantilla de venta A sobre negocio de alquiler B o negocio ajeno      | `404`; no se crea checklist                                                      |
| Snapshot               | Versionar y activar plantilla después de instanciar                   | Expediente existente conserva versión 1, nombres y cantidad originales           |
| Idempotencia           | Instanciar dos veces la misma familia                                 | Segundo resultado `created=false` y mismo `checklist.id`                         |
| Bloqueo                | Validar `ACTIVE` con reserva incompleta                               | `409` y un bloqueante visible al rol autorizado                                  |
| Sin bloqueo            | Validar negocio B sin requisito aplicable                             | `201`, `allowed=true`, `blockers=[]`                                             |
| Documento libre        | Agregar comprobante con cliente, propiedad, contrato y participante A | `201`; las cuatro relaciones coinciden exactamente                               |
| Relaciones cruzadas    | Repetir con cada ID de B                                              | Cuatro respuestas `400`; no hay requisito parcial válido                         |
| Contrato y adendas     | Crear dos requisitos de adenda vinculados al contrato principal       | Dos IDs distintos y el mismo `businessContractId`; no reemplazan el contrato     |
| Archivo adulterado     | PDF por nombre/MIME con contenido no PDF                              | `400`; conteo de documentos del requisito permanece `0`                          |
| Storage no configurado | PDF válido sin secret backend                                         | `503`; conteo de metadatos permanece `0`                                         |
| Upload privado         | PDF válido con secret backend                                         | `201`; respuesta no contiene `storagePath`; fila remota sí conserva path aislado |
| Descarga privada       | Solicitar URL del archivo vigente                                     | `200`, expiración `60`, contenido inicia `%PDF-` y no se filtra path             |
| Reemplazo              | Cargar versión 2 con motivo                                           | `201`; historial exacto `v2 current`, `v1 archived`; motivo preservado           |
| Path fuera de ámbito   | Documento A apunta artificialmente a prefijo Storage B                | `403` antes de firmar la descarga                                                |
| Revisión obligatoria   | Aprobar `UPLOADED` sin `UNDER_REVIEW`                                 | `409`                                                                            |
| Observación sin motivo | Transicionar a `OBSERVED` sin razón                                   | `400`                                                                            |
| Estados                | Ejecutar observado, aprobado, rechazado, vencido y no aplicable       | Estados finales exactos; rechazado/vencido/no aplicable conservan motivo         |
| Documento cruzado      | Revisar usando ID de contrato/documento B                             | `404`                                                                            |
| Transición cruzada     | Owner B transiciona requisito A                                       | `404`                                                                            |
| Lectura restringida    | `READONLY` lista expediente A                                         | `200`, pero solo requisitos cuyo `readRoles` lo incluyen                         |
| Escritura restringida  | `READONLY` instancia, revisa o carga                                  | `403`; conteo de documentos no cambia                                            |

## Matriz E2E

Se ejecuta en los proyectos `chromium-desktop` (1440 × 900) y
`chromium-mobile` (Pixel 7):

| Ruta                                       | Estado    | Resultado exacto                                                                       |
| ------------------------------------------ | --------- | -------------------------------------------------------------------------------------- |
| `/documents` sin sesión                    | Protegida | Redirección a `/login?next=...`, heading `Ingresar`, sin overflow horizontal           |
| `/businesses/:id/documents?...` sin sesión | Protegida | Mismo gate; ningún UUID produce lectura previa a autenticación                         |
| `/documents` autenticado                   | Hub       | Organización explícita, negocios confirmados y acción `Abrir expediente`               |
| Workspace autenticado                      | Data      | Resumen, tabs por estado, grupos por etapa y acciones según rol                        |
| Workspace autenticado                      | Empty     | Owner/Admin puede elegir plantilla; otros roles ven instrucción sin API administrativa |
| Workspace autenticado                      | Error     | Mensaje en español y acción de reintento o cierre                                      |

Los tres últimos casos requieren una sesión de sandbox suministrada al runner o
recorrido manual. No se agrega un bypass de autenticación para automatizarlos.

## Evidencia Y Criterio De Pase

Registrar por ejecución:

- Fecha, commit y `runId`.
- URL del API usada, sin credenciales.
- Conteo de suites, pruebas aprobadas, omitidas y fallidas.
- Confirmación explícita de si el caso Storage positivo corrió o quedó omitido
  por falta de `SUPABASE_SECRET_KEY`.
- `pnpm db:generate`, lint, typecheck serial, test y build.
- Smoke `200` de web y API desde `main` estable.

El lote solo puede declararse completamente aprobado cuando el recorrido de
Storage positivo y el workspace autenticado también tengan evidencia. Un suite
verde con esos casos omitidos es avance verificable, no cierre del gate.

## Ejecución 2026-07-15

- API temporal: `http://127.0.0.1:4013/api`, levantada desde la rama #103 y
  detenida al finalizar.
- Resultado mutante remoto: 2 pruebas aprobadas, 0 fallidas, 0 omitidas, duración
  total 151.1 segundos.
- Run checklist: `1784157637032-kt1pd7`; organizaciones A/B
  `checklist-a-...` y `checklist-b-...`, con un negocio y una plantilla cada una.
- Run plantillas: `1784157745891-6rvdie`; `docs-org-...` conservó un negocio y
  dos versiones de plantilla; la organización aislada quedó sin recursos de
  negocio.
- `SUPABASE_SECRET_KEY` no estaba configurada. Se aprobó el caso exacto
  `PDF válido -> 503 -> cero metadatos`; el upload, reemplazo y descarga binaria
  positivos continúan pendientes y no se sustituyeron por acceso anónimo.
- Antes del pase hubo un intento diagnóstico con los runIds
  `1784157558259-jwhwhr` y `1784157558211-32fobj`. Detectó correctamente que el
  fixture de alquiler no incluía renta y que dos archivos de prueba competían
  por el mismo puerto. Se corrigieron ambos defectos. Las cuatro organizaciones
  de ese intento permanecen aisladas; un borrado conservador por UUID fue
  rechazado por la FK de memberships y no se forzó una limpieza destructiva.
- La ejecución no mutante se repitió sin `DATABASE_URL`: 2 pruebas omitidas,
  proceso `0`, sin abrir conexión. Esto confirma el gate opt-in.
- Playwright se ejecutó con las variables públicas de sandbox en el puerto
  temporal `3014`: 14 pruebas aprobadas en escritorio y móvil, incluidas las
  cuatro combinaciones de rutas documentales protegidas y viewport. No hubo
  fallas ni overflow horizontal. Los estados autenticados continúan pendientes
  porque no se inyectaron credenciales ni se agregó un bypass de sesión.
- `pnpm test` aprobó las 9 tareas del monorepo: API 27/27, shared 20/20 y web
  28/28. `pnpm build` aprobó los 6 paquetes y generó las 26 rutas web.
- Las primeras invocaciones locales de test y build fueron bloqueadas por el
  sandbox al crear el socket IPC de `tsx` y un puerto interno de Turbopack,
  respectivamente. Los mismos comandos, sin cambios de código y con permisos
  normales de proceso, finalizaron en `0`; se clasifican como restricciones de
  entorno y no como regresiones.
- El checkout estable `main` permaneció arriba durante el lote: web `200` en
  `http://127.0.0.1:3000` y salud API `200` en
  `http://127.0.0.1:4000/api/health`.
