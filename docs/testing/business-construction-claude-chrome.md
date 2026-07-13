# Prueba Manual: Construccion De Negocio En Chrome

## Objetivo

Este protocolo define una macroprueba manual para que la extension de Claude en
Chrome ejecute la construccion de negocios en SoyPMS varias veces, con datos
aleatorios y rutas distintas.

El foco es validar el flujo real disponible hoy en `/businesses/new`:

- Creacion automatica de borrador.
- Autosave y continuacion del borrador.
- Tipo de operacion y modo simple/avanzado.
- Cliente existente y cliente creado dentro del flujo.
- Seleccion de inmueble o avance sin inmueble cuando el contrato lo permita.
- Tipo de contrato y condiciones.
- Montos financieros.
- Plan de pagos y pagos especiales.
- Comisiones simples y avanzadas.
- Automatizaciones.
- Validacion, vista previa y confirmacion del negocio.
- Aparicion del negocio en el listado `/businesses`.

No valida integraciones externas, firma electronica, emails, portales externos,
contabilidad final ni recuperacion de pagos reales.

## Entorno

- URL alpha: `https://soypms-alpha.vercel.app`
- Usuario: usar una cuenta `OWNER` o `ADMIN` provista fuera de este documento.
- No escribir passwords en notas, capturas ni reportes.
- Ejecutar en Chrome con DevTools Network abierto cuando sea posible.
- No modificar datos de clientes reales. Usar nombres con prefijo `QA-NG`.

## Regla De Evidencia

Para cada iteracion guardar:

- Iteracion: `QA-NG-<fecha>-<numero>`.
- URL inicial y URL final.
- Operacion: venta, alquiler, reserva, cesion u otra.
- Modo: simple o avanzado.
- Cliente usado o creado.
- Inmueble usado o `sin inmueble`.
- Contrato seleccionado.
- Total contractual, total programado y diferencia.
- Resultado de vista previa.
- Resultado de confirmacion.
- Errores 4xx/5xx vistos en Network.
- Captura del resumen lateral antes de confirmar.
- Captura del banner final o del error bloqueante esperado.

Si aparece un `500`, detener la iteracion y registrar:

- Endpoint.
- Metodo.
- Status.
- Momento del flujo.
- Datos visibles usados, sin password ni cookies.
- Captura del mensaje en UI.

## Datos Aleatorios

Usar un sufijo unico por iteracion:

```text
QA-NG-YYYYMMDD-HHMM-##
```

Ejemplo si hoy es 2026-07-13:

```text
QA-NG-20260713-1145-01
```

Valores aleatorios recomendados:

- Nombre de negocio: `QA-NG <sufijo> <tipo>`
- Cliente nuevo: `Cliente <sufijo>`, apellido `Prueba`
- Email de cliente: `cliente+<sufijo>@soypms.test`
- Telefono: `+507 6<7 digitos aleatorios>`
- Documento: `QA-<6 digitos aleatorios>`
- Firma esperada: fecha futura entre 7 y 20 dias.
- Cierre esperado: fecha futura posterior a firma entre 21 y 90 dias.
- Precio base venta: entre `120000.00` y `950000.00`.
- Precio alquiler: entre `900.00` y `8500.00`.
- Reserva: entre 1% y 5% del total.
- Pago a la firma: entre 5% y 30% del total.
- Cuotas: entre 2 y 24.
- Comision simple: entre `2.00` y `5.00`.
- Regla fija de referido: entre `250.00` y `2500.00`.

Si el selector no tiene suficientes clientes, inmuebles o agentes, crear los
datos minimos en sus modulos antes de iniciar la iteracion, siempre con prefijo
`QA-NG`.

## Criterios Globales De Pase

La prueba pasa cuando:

- El login mantiene sesion sin redirigir inesperadamente.
- `/businesses/new` abre un borrador sin errores.
- El autosave muestra `Guardado` despues de cambios.
- Los calculos no generan errores bloqueantes en casos positivos.
- La vista previa muestra entidades a crear.
- `Confirmar y crear negocio` queda habilitado cuando no hay errores.
- El negocio confirmado deja de estar como `DRAFT`.
- El listado `/businesses` muestra el negocio y permite filtrarlo/buscarlo.
- No aparecen errores `500`.
- Los `403` solo aparecen en pruebas de permisos o si el usuario no tiene rol
  para confirmar.

## Criterios Globales De Falla

Registrar como falla:

- Pantalla protegida abierta sin sesion valida.
- `401` despues de login valido.
- `403` con usuario `OWNER` o `ADMIN` durante commit.
- `500` en cualquier endpoint del flujo.
- Autosave que no persiste al salir y volver.
- Calculo que queda cargando indefinidamente.
- Vista previa que no refleja los datos ingresados.
- Commit duplicado o multiples negocios creados por una sola confirmacion.
- Negocio confirmado que no aparece en `/businesses`.
- Diferencia de pago distinta de cero en casos positivos.
- Texto roto, superpuesto o fuera de contenedor en desktop.

## Endpoints Que Deben Observarse

No llamar estos endpoints manualmente salvo que se este diagnosticando. Solo
observarlos en Network.

- `GET /api/auth/me`
- `POST /api/business-drafts`
- `GET /api/businesses/new/context`
- `PATCH /api/business-drafts/:businessId`
- `POST /api/business-drafts/:businessId/calculate/payment-plan`
- `POST /api/business-drafts/:businessId/calculate/commissions`
- `POST /api/business-drafts/:businessId/validate`
- `POST /api/business-drafts/:businessId/preview`
- `POST /api/business-drafts/:businessId/commit`
- `GET /api/businesses?...`

Resultado ideal:

- `auth/me`: `200`
- creacion/actualizacion de borrador: `200` o `201`
- calculos, validacion y preview: `200`
- commit positivo: `200`
- errores negativos controlados: `400`, no `500`

## Matriz De Iteraciones

Ejecutar minimo 6 iteraciones. No reutilizar el mismo sufijo.

| Iteracion | Objetivo | Operacion | Modo | Cliente | Inmueble | Contrato | Resultado ideal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Venta simple completa | Venta | Simple | Existente | Seleccionado | Promesa de compraventa o Contrato de compraventa | Commit exitoso con comision simple |
| 2 | Alquiler avanzado | Alquiler | Avanzado | Cliente nuevo inline | Seleccionado | Contrato de arrendamiento | Commit exitoso con co-agente o referido |
| 3 | Reserva sin inmueble | Reserva | Simple | Cliente nuevo inline | Continuar sin inmueble | Reserva / separacion | Commit exitoso sin plan de comision obligatorio |
| 4 | Cesion avanzada | Cesion | Avanzado | Existente o nuevo | Continuar sin inmueble | Cesion | Commit exitoso con comision y condicion de cesion |
| 5 | Borrador y reanudacion | Venta o alquiler | Simple | Parcial | Parcial | Parcial | Autosave y continuacion desde listado |
| 6 | Validaciones negativas | Venta | Simple | Omitir datos clave | Sin inmueble | Contrato que exige inmueble | Errores bloqueantes, sin commit |

Si hay tiempo, repetir iteraciones 1 y 2 con moneda `PAB` y montos distintos.

## Flujo Base Paso A Paso

### 0. Preparacion

1. Abrir `https://soypms-alpha.vercel.app/login`.
2. Iniciar sesion con usuario `OWNER` o `ADMIN`.
3. Confirmar que se abre una pantalla autenticada.
4. Ir a `/businesses`.
5. Capturar conteo inicial de `Abiertos`, `Borradores`, `Activos` y `Monto`.
6. Abrir DevTools Network y activar `Preserve log`.
7. Limpiar Network antes de iniciar cada iteracion.

Resultado ideal:

- Login responde correctamente.
- No hay `401` ni `403` inesperado.
- El listado de negocios carga.

### 1. Abrir Nuevo Negocio

1. En `/businesses`, presionar `Nuevo negocio`.
2. Esperar la pantalla `Crear negocio`.
3. Verificar el indicador de guardado.
4. Confirmar que el stepper muestra:
   - `Tipo`
   - `Clientes`
   - `Inmueble`
   - `Contrato`
   - `Montos`
   - `Pagos`
   - `Comisiones`
   - `Acciones`
   - `Revision`

Resultado ideal:

- La pantalla no queda cargando.
- Network muestra `POST /api/business-drafts`.
- Network muestra `GET /api/businesses/new/context`.
- El resumen lateral muestra `Borrador`.

### 2. Paso Tipo

1. En `Operacion`, elegir la operacion definida por la iteracion.
2. En `Moneda`, elegir `USD` salvo que la iteracion pida `PAB`.
3. En `Nombre o referencia`, escribir `QA-NG <sufijo> <operacion>`.
4. En `Firma esperada`, escribir una fecha futura.
5. En `Cierre esperado`, escribir una fecha posterior a la firma.
6. En `Notas iniciales`, escribir una nota breve con el sufijo.
7. Elegir `Modo simple` o `Modo avanzado`.
8. Esperar a que el indicador cambie a `Guardado`.
9. Presionar `Continuar`.

Resultado ideal:

- El resumen lateral actualiza operacion, modo y avance.
- No hay error por fechas.
- Se observa `PATCH /api/business-drafts/:id`.

### 3. Paso Clientes

Ruta A: cliente existente.

1. En `Cliente existente`, seleccionar un cliente de la lista.
2. Confirmar que aparece una tarjeta del participante.
3. Cambiar el rol si la iteracion lo pide:
   - Venta: `Comprador`.
   - Alquiler: `Arrendatario`.
   - Reserva: `Comprador`.
   - Cesion: `Comprador`.
4. No quitar el cliente salvo en la prueba negativa.

Ruta B: cliente creado inline.

1. En `Crear cliente rapido`, llenar:
   - `Nombre`: `Cliente <sufijo>`
   - `Apellido`: `Prueba`
   - `Email`: `cliente+<sufijo>@soypms.test`
   - `Telefono`: telefono aleatorio.
   - `Documento`: documento aleatorio.
2. Presionar `Crear y agregar`.
3. Confirmar que el cliente aparece en la lista de participantes.

Resultado ideal:

- No aparece `Ese cliente ya esta agregado al negocio`, salvo al intentar
  duplicarlo de forma intencional.
- El participante muestra nombre, email o telefono.
- En Network, crear cliente inline usa `POST /api/clients` y luego autosave del
  negocio.

### 4. Paso Inmueble

Ruta con inmueble.

1. En `Inmueble`, seleccionar una propiedad disponible.
2. Preferir propiedades con estado `ACTIVE` o `PUBLISHED`.
3. Confirmar que aparece la tarjeta del inmueble con ciudad, zona y estado.
4. Confirmar que el badge indica `Disponible`.

Ruta sin inmueble.

1. Seleccionar `Continuar sin inmueble`.
2. Confirmar que aparece el warning:
   `El borrador seguira sin inmueble`.

Resultado ideal:

- Si se selecciona inmueble, los montos pueden autocompletarse desde el precio
  sugerido si aun estaban en cero.
- Si el contrato posterior exige inmueble, la revision debe bloquear el commit.

### 5. Paso Contrato

1. En `Tipo de contrato`, seleccionar el contrato correspondiente:
   - Venta: `Promesa de compraventa` o `Contrato de compraventa`.
   - Alquiler: `Contrato de arrendamiento`.
   - Reserva: `Reserva / separacion`.
   - Cesion: `Cesion`.
2. Leer el campo `Requisitos`.
3. En `Notas legales u operativas`, escribir una nota con el sufijo.
4. Alternar condiciones segun la iteracion:
   - Venta simple: `Condicion de financiamiento`.
   - Alquiler avanzado: `Penalidad por mora`.
   - Reserva: ninguna o `Penalidad por mora`.
   - Cesion: `Costo de cesion`.
   - Prueba avanzada extra: `Incremento por materiales`.
5. Presionar `Continuar`.

Resultado ideal:

- El campo `Requisitos` refleja si exige inmueble, pagos y comisiones.
- Las condiciones seleccionadas cambian visualmente a estado activo.
- Las condiciones con aprobacion generan warnings, no `500`.

### 6. Paso Montos

1. Llenar `Precio base`.
2. Llenar `Precio negociado`.
3. Llenar `Total contractual`.
4. Llenar `Total pagable`.
5. Llenar `Base de comision`.
6. Para una ruta simple, presionar `Usar precio base` y verificar que sincroniza
   totales.
7. Para una ruta avanzada, usar valores distintos:
   - `Precio base`: total original.
   - `Precio negociado`: total con descuento.
   - `Total contractual`: total negociado.
   - `Total pagable`: total negociado menos pago externo, si aplica.
   - `Base de comision`: precio negociado o neto.
8. Verificar el bloque de desglose financiero.
9. Presionar `Continuar`.

Resultado ideal:

- Todos los montos se muestran con dos decimales.
- El resumen lateral actualiza `Total pagable`.
- No se aceptan montos negativos en casos positivos.

### 7. Paso Pagos

1. En `Preset`, elegir segun iteracion:
   - Venta simple: `Contado` o `Reserva + firma + saldo`.
   - Alquiler avanzado: `Cuotas regulares`.
   - Reserva: `Contado` o `Personalizado`.
   - Cesion: `Firma + cuotas`.
2. Confirmar `Monto a programar`.
3. Llenar `Reserva`.
4. Llenar `Pago a la firma`.
5. Llenar `Numero de cuotas`.
6. Elegir `Frecuencia`.
7. Llenar `Inicio de cuotas`.
8. Llenar `Dia de vencimiento`.
9. Si aplica, presionar `Pago especial`.
10. En la linea especial, llenar:
    - Nombre.
    - Tipo: `Especial`, `Pago final`, `Entrega`, `Cesion` o `Materiales`.
    - Monto.
    - Fecha.
11. Esperar recalculo.
12. Verificar que `Diferencia` sea `USD 0.00` o `PAB 0.00` en casos positivos.
13. Revisar la tabla de pagos.
14. Presionar `Continuar`.

Resultado ideal:

- Se muestra `Calculo sin errores bloqueantes`.
- La tabla tiene lineas con secuencia, tipo, fecha y monto.
- Si la suma no cuadra, aparece error o warning y la revision debe bloquear el
  commit hasta corregirlo.

### 8. Paso Comisiones

Ruta simple.

1. Seleccionar `Agente principal`.
2. Llenar `Porcentaje simple`, por ejemplo `3` o `3.50`.
3. Elegir `Trigger de pago`, por ejemplo `Al cierre`.
4. Elegir `Base de calculo`, por ejemplo `Precio negociado`.
5. Verificar que aparece desglose de comision.

Ruta avanzada.

1. Confirmar que el modo es `Avanzado`.
2. Seleccionar `Agente principal`.
3. Seleccionar otro agente en `Agregar co-agente / referido`.
4. Presionar `Co-agente` o `Referido`.
5. Presionar `Regla base`.
6. En la regla, elegir participante.
7. Elegir tipo:
   - `% venta`
   - `% comision`
   - `Monto fijo`
   - `Con tope`
8. Llenar porcentaje o monto.
9. Elegir trigger.
10. Si hay multiples reglas, confirmar que el desglose no duplica participantes
    por error.

Resultado ideal:

- En contratos que requieren comision, existe al menos una asignacion.
- La tabla de comisiones muestra participante, tipo, trigger y monto.
- Si se presiona `Regla base` sin agente principal, aparece error controlado:
  `Selecciona un agente principal antes de crear reglas.`

### 9. Paso Acciones

1. Verificar que aparecen:
   - `Recordatorios de pago`
   - `Tarea de firma`
   - `Revision interna`
   - `Recordatorios de comision`
2. Para iteraciones positivas, dejar al menos `Recordatorios de pago` y `Tarea de
   firma` activos.
3. Para una iteracion avanzada, desactivar una o dos opciones y observar que el
   borrador guarda.
4. Presionar `Continuar`.

Resultado ideal:

- Los checkboxes no rompen calculos ni vista previa.
- La nota de impacto se mantiene visible.

### 10. Paso Revision

1. Presionar `Actualizar vista previa`.
2. Esperar a que termine.
3. Revisar bloques:
   - `Operacion`
   - `Modo`
   - `Total contrato`
   - `Total programado`
   - `Diferencia`
   - `Comision estimada`
4. Revisar validaciones.
5. En casos positivos, no debe haber `ERROR`.
6. En casos negativos, debe haber `ERROR` claro y el boton de confirmar debe
   estar deshabilitado.
7. Revisar `entitiesToCreate`, que debe listar entidades como:
   - `business`
   - `business_participants`
   - `business_contracts`
   - `payment_plans`
   - `payment_schedule_lines`
   - `commission_plans`, si aplica.
   - `commission_allocations`, si aplica.
   - `scheduled_actions`
   - `calculation_snapshots`
8. Capturar pantalla del resumen lateral y la revision.

Resultado ideal:

- Casos positivos muestran `Listo para confirmar si los datos son correctos`.
- Casos negativos muestran mensajes bloqueantes especificos.
- No hay `500`.

### 11. Confirmar Negocio

Solo ejecutar en iteraciones positivas.

1. Presionar `Confirmar y crear negocio`.
2. Esperar respuesta.
3. Confirmar que aparece banner:
   `Negocio <codigo> confirmado como <estado>`.
4. Ir a `/businesses`.
5. Buscar por el sufijo.
6. Filtrar por operacion.
7. Filtrar por estado si aplica.
8. Confirmar que el negocio aparece con:
   - Nombre correcto.
   - Cliente correcto.
   - Inmueble correcto o `Sin inmueble`.
   - Operacion correcta.
   - Estado distinto de error.
   - Monto correcto.
9. Si el negocio quedo en lista con `continuar`, registrar como falla si ya fue
   confirmado.

Resultado ideal:

- Commit `200`.
- El negocio confirmado no se duplica al refrescar.
- El listado refleja el negocio.

## Iteracion 1: Venta Simple Completa

Objetivo: confirmar una venta simple con cliente existente, inmueble, contrato,
pagos y comision simple.

Datos:

- Operacion: `Venta`
- Moneda: `USD`
- Modo: `Simple`
- Contrato: `Promesa de compraventa` o `Contrato de compraventa`
- Inmueble: seleccionado, preferiblemente `ACTIVE` o `PUBLISHED`
- Precio sugerido: usar precio de inmueble si se autocompleta, o valor aleatorio
  entre `120000.00` y `950000.00`
- Preset: `Reserva + firma + saldo`
- Reserva: 2% a 5%
- Firma: 10% a 20%
- Cuotas: `1`
- Agente principal: cualquiera activo
- Comision: `3.00`
- Trigger: `Al cierre`

Resultado ideal:

- Vista previa sin errores.
- `business_participants` al menos 2: cliente y agente.
- `business_contracts` 1.
- `payment_schedule_lines` al menos 2.
- `commission_allocations` 1.
- Commit exitoso.

## Iteracion 2: Alquiler Avanzado

Objetivo: confirmar un alquiler con cliente creado inline, inmueble y reglas de
comision avanzada.

Datos:

- Operacion: `Alquiler`
- Moneda: `USD` o `PAB`
- Modo: `Avanzado`
- Cliente: crear inline.
- Rol cliente: `Arrendatario`
- Inmueble: seleccionado.
- Contrato: `Contrato de arrendamiento`
- Monto: alquiler mensual o total contractual de prueba.
- Preset: `Cuotas regulares`
- Cuotas: 6 a 12.
- Frecuencia: `Mensual`
- Condicion: `Penalidad por mora`
- Agente principal: cualquiera activo.
- Co-agente o referido: agregar otro agente si existe.
- Regla base: crear al menos una.

Resultado ideal:

- Vista previa sin errores bloqueantes.
- Hay tabla de pagos con cuotas mensuales.
- Hay comision para agente principal y, si se agrego, co-agente o referido.
- Commit exitoso.

## Iteracion 3: Reserva Sin Inmueble

Objetivo: confirmar una reserva que no requiere inmueble ni comision obligatoria.

Datos:

- Operacion: `Reserva`
- Modo: `Simple`
- Cliente: crear inline.
- Inmueble: `Continuar sin inmueble`.
- Contrato: `Reserva / separacion`
- Monto: entre `1000.00` y `10000.00`
- Preset: `Contado` o `Personalizado`
- Agente principal: omitir para validar que no hay comision obligatoria.
- Automatizaciones: desactivar `Recordatorios de comision`.

Resultado ideal:

- Puede aparecer warning por sin inmueble, pero no error bloqueante por inmueble.
- Puede confirmar sin plan de comision.
- `commission_plans` puede ser 0.
- Commit exitoso.

## Iteracion 4: Cesion Avanzada

Objetivo: validar una cesion con condicion contractual y comision requerida.

Datos:

- Operacion: `Cesion`
- Modo: `Avanzado`
- Cliente: existente o nuevo.
- Inmueble: `Continuar sin inmueble`.
- Contrato: `Cesion`
- Condicion: `Costo de cesion`
- Preset: `Firma + cuotas`
- Pago especial: tipo `Cesion`
- Agente principal: requerido.
- Comision: regla avanzada.
- Si hay referido, agregar `Referido` con `Monto fijo`.

Resultado ideal:

- Puede aparecer warning: costo de cesion como condicion sin cargo inmediato.
- No debe bloquear por inmueble.
- Debe bloquear si no hay comision; corregir agregando agente y regla.
- Commit exitoso despues de corregir.

## Iteracion 5: Borrador Y Reanudacion

Objetivo: validar autosave, versionado y continuacion desde listado.

1. Crear nuevo negocio de venta o alquiler.
2. Completar solo `Tipo` y `Clientes`.
3. Esperar `Guardado`.
4. Ir a `/businesses`.
5. Buscar el sufijo.
6. Confirmar que aparece como `Borrador`.
7. Presionar el link del negocio que muestra `continuar`.
8. Confirmar que vuelve a `/businesses/new?draftId=<id>`.
9. Verificar que los datos previos siguen presentes.
10. Completar el resto del flujo o dejarlo como borrador segun la ronda.

Resultado ideal:

- El borrador no pierde datos.
- El resumen lateral mantiene version y progreso.
- El listado muestra `Continuar borrador`.

## Iteracion 6: Validaciones Negativas

Objetivo: confirmar que el sistema bloquea errores de negocio sin caer en `500`.

Ejecutar subcasos. No confirmar si el sistema bloquea correctamente.

### 6A. Sin Cliente

1. Crear negocio de venta.
2. No agregar cliente.
3. Seleccionar contrato de compraventa.
4. Completar montos y pagos.
5. Ir a `Revision`.
6. Actualizar vista previa.

Resultado ideal:

- Error: `Debe existir al menos un cliente para confirmar el negocio.`
- Boton `Confirmar y crear negocio` deshabilitado.
- No hay `500`.

### 6B. Contrato Que Requiere Inmueble Sin Inmueble

1. Crear negocio de venta.
2. Agregar cliente.
3. En inmueble, elegir `Continuar sin inmueble`.
4. En contrato, seleccionar `Promesa de compraventa` o `Contrato de compraventa`.
5. Completar montos, pagos y comision.
6. Actualizar vista previa.

Resultado ideal:

- Error: `Este tipo de contrato requiere seleccionar un inmueble.`
- Boton de confirmar deshabilitado.

### 6C. Cierre Antes De Firma

1. En `Tipo`, poner `Cierre esperado` antes de `Firma esperada`.
2. Completar el minimo para llegar a revision.
3. Actualizar vista previa.

Resultado ideal:

- Error: `La fecha de cierre no puede ser anterior a la firma.`
- Sin `500`.

### 6D. Monto Pagable Cero

1. Crear negocio con cliente y contrato.
2. Dejar `Total pagable` en `0.00`.
3. Actualizar vista previa.

Resultado ideal:

- Error: `El monto pagable debe ser mayor que cero.`
- Sin commit.

### 6E. Comision Requerida Sin Agente

1. Crear venta con contrato de compraventa.
2. Completar cliente, inmueble, montos y pagos.
3. No seleccionar agente principal.
4. Actualizar vista previa.

Resultado ideal:

- Error: `Este contrato requiere un plan de comisiones.`
- Al agregar agente principal y comision, el error desaparece.

### 6F. Pago Descuadrado

1. Crear caso positivo.
2. Cambiar `Monto a programar`, reserva, firma o cuotas para que la suma no
   cuadre.
3. Esperar recalculo.
4. Actualizar vista previa.

Resultado ideal:

- Diferencia distinta de cero o error de plan de pagos.
- Commit bloqueado hasta corregir.

## Prompt Copiable Para Claude En Chrome

```text
Actua como QA manual en Chrome para SoyPMS.

Objetivo: ejecutar la prueba manual de construccion de negocios en
https://soypms-alpha.vercel.app siguiendo el protocolo
docs/testing/business-construction-claude-chrome.md.

Reglas:
- No escribas ni guardes passwords en el reporte.
- Usa solo datos con prefijo QA-NG.
- Ejecuta minimo 6 iteraciones: venta simple, alquiler avanzado, reserva sin
  inmueble, cesion avanzada, borrador/reanudacion y validaciones negativas.
- Usa un sufijo unico por iteracion: QA-NG-YYYYMMDD-HHMM-##.
- Manten DevTools Network abierto con Preserve log si esta disponible.
- Si aparece un 500, detente y reporta endpoint, metodo, status, paso y captura.
- Si aparece 401 despues de login valido, detente y reporta.
- Si aparece 403 con usuario OWNER o ADMIN en commit o platform, detente y
  reporta.
- En casos positivos, corrige datos hasta que Diferencia sea 0.00 y no existan
  errores bloqueantes.
- En casos negativos, no fuerces commit; confirma que el boton queda bloqueado y
  que el mensaje de error es claro.

Formato de reporte por iteracion:
1. ID de iteracion.
2. Operacion y modo.
3. Cliente.
4. Inmueble.
5. Contrato.
6. Montos.
7. Preset de pagos y numero de lineas generadas.
8. Comisiones y numero de asignaciones.
9. Automatizaciones activas.
10. Resultado de vista previa.
11. Resultado de commit o bloqueo esperado.
12. Errores Network relevantes.
13. Evidencia: describir capturas tomadas.

Comienza iniciando sesion, abre /businesses, registra conteo inicial y ejecuta la
Iteracion 1.
```

## Plantilla De Reporte Final

```text
Fecha:
Ambiente:
Usuario:
Navegador:

Resumen:
- Iteraciones ejecutadas:
- Positivas exitosas:
- Negativas bloqueadas correctamente:
- Fallas P0:
- Fallas P1:
- Fallas P2:

Tabla:
| ID | Operacion | Modo | Resultado | Endpoint fallido | Observacion |
| -- | -- | -- | -- | -- | -- |

Hallazgos:
1.
2.
3.

Recomendacion:
- Abrir alpha:
- Bloquear alpha:
- Requiere correcciones antes de repetir:
```

## Notas Para Triage

Clasificar hallazgos asi:

- P0: impide login, creacion de borrador, preview o commit positivo; genera 500;
  crea datos cruzados entre organizaciones; duplica commits.
- P1: bloqueo fuerte de una variante importante, calculo incorrecto, perdida de
  autosave, permisos incorrectos, listado no refleja negocio.
- P2: texto, labels, warnings confusos, responsive, carga lenta recuperable,
  orden visual o evidencia incompleta.

No mezclar errores de ambiente con bugs de producto. Si Render esta en cold
start o la red falla, registrar como ambiente y repetir una vez antes de abrir
bug de producto.
