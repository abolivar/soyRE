# Prueba Cliente Cero Alpha

## Objetivo

Esta prueba es el eje de aceptacion funcional para abrir el alpha de SoyPMS con
un cliente cero. Cubre el producto disponible hoy: registro de organizacion,
sesion, usuarios, roles, clientes, propiedades, agentes, etapas operativas,
documentos, mandatos, publicaciones internas, visitas, ofertas, negocios,
calculos, tareas, dashboard, auditoria indirecta y aislamiento por organizacion.

No valida funcionalidades fuera del MVP actual, como firma electronica avanzada,
integraciones con portales, app movil, marketplace publico, contabilidad completa
o IA avanzada.

## Precondiciones

- Usar un entorno conectado a la base remota de Supabase. No usar Postgres local,
  Docker ni VM local.
- Tener el API y la web apuntando al mismo entorno alpha.
- Usar datos con prefijo `cliente-cero` o `client-zero` para poder encontrarlos y
  limpiarlos despues.
- Ejecutar la prueba en escritorio y repetir los pasos criticos en movil.
- Guardar evidencia con fecha, usuario, URL, captura o respuesta API y resultado.

## Datos Sugeridos

- Organizacion: `Cliente Cero Alpha <fecha>`
- Slug: `cliente-cero-alpha-<fecha>`
- Owner: `Alpha Owner`, correo `owner+<fecha>@soypms.test`
- Usuario solo lectura: `Solo Lectura`, rol `READONLY`
- Cliente: `Cliente Alpha <fecha>`, roles `BUYER` y `SELLER`
- Propiedad: `Apartamento Alpha <fecha>`, venta y alquiler, Panama / Panama /
  Costa del Este
- Agente externo: `Agente Alpha <fecha>`
- Negocio: `Negocio Alpha <fecha>`, operacion `SALE`, modo simple, moneda `USD`

## Criterio De Pase

- P0 bloqueante: registro, login, sesion, aislamiento por organizacion, permisos,
  creacion de cliente, propiedad, negocio y commit del negocio deben funcionar.
- P1 alto: listados, busquedas, dashboard, documentos, mandatos, listings, visitas,
  ofertas y tareas deben funcionar sin datos cruzados ni errores 5xx.
- P2 medio: textos, estados vacios, responsive, mensajes de error y orden visual
  deben ser coherentes para operar el alpha.

## Macroprueba Automatizada

La macroprueba opt-in cubre el recorrido por API y crea datos reales de sandbox en
el entorno remoto:

```bash
CLIENT_ZERO_MUTATING=true pnpm test:client-zero
```

Tambien se mantiene compatibilidad con el comando alpha existente:

```bash
ALPHA_SMOKE_MUTATING=true pnpm test:alpha
```

Resultado ideal:

- El comando levanta o reutiliza el API local con variables remotas.
- Crea una organizacion sandbox y una organizacion aislada.
- Registra owner, inicia sesion, crea usuarios, valida roles y bloquea escritura
  para `READONLY`.
- Crea cliente con documento de identidad, descarga el documento, crea propiedad,
  agente, etapa, documento operativo, mandato, listing, negocio, tareas, visita y
  oferta.
- Calcula plan de pagos y comisiones, valida, previsualiza y confirma el negocio.
- Verifica dashboard, listados, detalle, retiro de propiedad y logout.
- Termina con todos los subtests en verde, sin errores 5xx.

Si el comando se ejecuta sin `CLIENT_ZERO_MUTATING=true` o
`ALPHA_SMOKE_MUTATING=true`, debe omitirse sin crear datos.

## Prueba Avanzada De Negocios

Después de completar este recorrido base, ejecutar
`docs/testing/client-zero-advanced-business.md` para exprimir planes de pago,
comisiones compartidas, validaciones negativas y repetición con datos aleatorios.

## Recorrido Manual

### 1. Salud Publica

Accion: abrir la home publica y consultar `GET /api/health` si esta disponible en
el entorno.

Resultado ideal: la marca visible es SoyPMS, no hay errores visuales, el health
responde correcto y ninguna pantalla publica muestra informacion interna.

Evidencia: captura de home y respuesta health.

### 2. Registro De Organizacion

Accion: registrar la organizacion `Cliente Cero Alpha <fecha>` con el owner.

Resultado ideal: se crea la organizacion, el owner queda autenticado, se recibe
cookie httpOnly y `auth/me` devuelve el usuario con membership `OWNER` activa.

Evidencia: captura post-registro y payload de `auth/me`.

### 3. Login, Logout Y Sesion

Accion: cerrar sesion, intentar acceder a una pantalla protegida, iniciar sesion
otra vez y revisar la sesion actual.

Resultado ideal: sin sesion hay redireccion o `401`; con credenciales correctas
hay acceso; con credenciales incorrectas hay error claro sin filtrar datos.

Evidencia: captura de login, error esperado y sesion recuperada.

### 4. Dashboard Inicial

Accion: entrar al dashboard con la organizacion recien creada.

Resultado ideal: el dashboard muestra alcance de organizacion, metricas en cero o
estado inicial, sin datos de otras organizaciones.

Evidencia: captura del dashboard inicial.

### 5. Usuarios Y Roles

Accion: listar usuarios, crear un usuario `AGENT` invitado, validarlo, cambiarlo a
`OPERATIONS`, suspenderlo y crear un usuario `READONLY` activo.

Resultado ideal: solo `OWNER` o `ADMIN` pueden administrar usuarios; los cambios
de estado y rol se reflejan en la lista; no se puede dejar la organizacion sin
owner activo.

Evidencia: lista de usuarios antes/despues y estados `INVITED`, `ACTIVE`,
`SUSPENDED`.

### 6. Permisos De Solo Lectura

Accion: iniciar sesion como `READONLY`, leer propiedades y tratar de crear una
propiedad.

Resultado ideal: lectura permitida; escritura bloqueada con `403`; la UI debe
ocultar o deshabilitar acciones no permitidas.

Evidencia: respuesta de lectura y error `403`.

### 7. Clientes

Accion: crear un cliente persona con roles `BUYER` y `SELLER`, datos de contacto,
preferencias, consentimiento y documento de identidad basico.

Resultado ideal: el cliente queda listado, el detalle muestra datos completos,
documento validado en ficha y descarga del documento disponible para usuarios con
permiso.

Evidencia: ficha del cliente, resultado de busqueda y descarga del documento.

### 8. Propiedades

Accion: crear una propiedad con operaciones `SALE` y `RENT`, propietario, zona,
precios, areas, estacionamientos, notas internas y tags.

Resultado ideal: la propiedad queda activa, asociada a la organizacion, al owner y
al cliente propietario; aparece en busqueda por titulo/codigo/zona y el detalle
muestra venta y alquiler separados.

Evidencia: ficha de propiedad, listado filtrado y detalle.

### 9. Aislamiento Por Organizacion

Accion: crear una segunda organizacion de prueba e intentar consultar la propiedad
de la primera organizacion.

Resultado ideal: la segunda organizacion recibe `404` o acceso denegado; nunca ve
clientes, propiedades, negocios, documentos ni usuarios de la primera.

Evidencia: respuesta de aislamiento.

### 10. Agentes Externos

Accion: crear un agente externo o broker colaborador con al menos un canal de
contacto.

Resultado ideal: el agente queda listado, se puede consultar el detalle y puede
relacionarse despues con visitas o negocios.

Evidencia: lista y detalle del agente.

### 11. Etapas Operativas

Accion: crear una etapa configurable para negocios de venta.

Resultado ideal: la etapa aparece ordenada en `workflow-stages`, activa y asociada
a `SALE`; no se hardcodea solo en UI.

Evidencia: lista de etapas.

### 12. Documento Operativo

Accion: crear un documento requerido para el cliente o la propiedad.

Resultado ideal: queda en estado `REQUIRED`, asociado a la entidad correcta y
visible en busqueda/listado.

Evidencia: lista de documentos y detalle de entidad relacionada.

### 13. Mandato

Accion: crear un mandato de venta en borrador para la propiedad, con precio
autorizado, moneda y comision.

Resultado ideal: el mandato queda asociado a propiedad y propietario; valida que
las relaciones pertenezcan a la organizacion.

Evidencia: mandato creado y listado filtrado.

### 14. Publicacion Interna

Accion: crear un listing interno en borrador a partir de la propiedad y mandato.

Resultado ideal: listing creado con copy publica, canales internos y checklist de
readiness; no publica en portales externos durante alpha.

Evidencia: listado de publicaciones internas.

### 15. Contexto Para Nuevo Negocio

Accion: abrir el contexto de nuevo negocio.

Resultado ideal: aparecen tipos de contrato, clientes, propiedades, agentes,
usuarios activos, presets de pago, defaults de comision y permisos de commit.

Evidencia: captura o payload del contexto.

### 16. Borrador De Negocio

Accion: crear un negocio `SALE` simple, seleccionar propiedad, cliente principal,
tipo de contrato, participantes, plan de pagos y plan de comision.

Resultado ideal: el borrador guarda version, progreso y relaciones; no permite
relaciones de otra organizacion ni datos financieros invalidos.

Evidencia: borrador guardado y version.

### 17. Calculos, Validacion Y Preview

Accion: calcular plan de pagos, calcular comisiones, validar el borrador y
previsualizar entidades a crear.

Resultado ideal: calculos sin errores, al menos una linea de pago, al menos una
asignacion de comision, validacion sin errores y preview con entidades esperadas.

Evidencia: resultados de calculo, validacion y preview.

### 18. Commit Del Negocio

Accion: confirmar el negocio con una llave de idempotencia unica.

Resultado ideal: el negocio sale de `DRAFT`, genera contratos/planes/snapshots y
tareas programadas; repetir la misma llave no duplica entidades.

Evidencia: detalle del negocio, estado y entidades generadas.

### 19. Tareas

Accion: listar tareas pendientes del negocio y marcar una como completada.

Resultado ideal: las tareas aparecen por negocio, se puede cambiar estado a
`COMPLETED` y queda nota del cambio.

Evidencia: lista de tareas y tarea completada.

### 20. Visitas

Accion: programar una visita relacionada con propiedad, cliente, negocio y agente.

Resultado ideal: la visita queda en estado solicitado o programado, con fecha,
participantes y relaciones correctas.

Evidencia: lista de visitas.

### 21. Ofertas

Accion: crear una oferta de venta sobre la propiedad y negocio.

Resultado ideal: la oferta queda en borrador, con monto, moneda, terminos y
relaciones correctas.

Evidencia: lista de ofertas.

### 22. Dashboard Operativo

Accion: volver al dashboard despues de crear y confirmar el negocio.

Resultado ideal: las metricas reflejan al menos un negocio abierto y el alcance de
la organizacion correcta.

Evidencia: captura del dashboard con datos.

### 23. Retiro De Propiedad

Accion: retirar la propiedad con una razon de prueba.

Resultado ideal: la propiedad cambia a `WITHDRAWN`, conserva historial y sigue
consultable como registro historico.

Evidencia: detalle de propiedad retirada.

### 24. Responsive Y Estados De UI

Accion: repetir dashboard, listado de propiedades, cliente y negocio en ancho
movil.

Resultado ideal: no hay solapes, texto truncado incorrecto ni botones fuera del
viewport; loading, empty, error y sin permisos se entienden en español.

Evidencia: capturas escritorio y movil.

## Registro De Resultado

Usar esta tabla por corrida:

| Campo                  | Valor                                   |
| ---------------------- | --------------------------------------- |
| Fecha                  |                                         |
| Entorno                |                                         |
| Branch/commit          |                                         |
| Tester                 |                                         |
| Organizacion de prueba |                                         |
| Resultado general      | Pasa / Pasa con observaciones / No pasa |
| P0 encontrados         |                                         |
| P1 encontrados         |                                         |
| P2 encontrados         |                                         |
| Evidencia              |                                         |

Cada fallo debe convertirse en issue con severidad, pasos para reproducir,
resultado esperado, resultado real, entorno y evidencia.
