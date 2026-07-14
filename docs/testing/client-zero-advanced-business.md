# Prueba Cliente Cero Avanzada: Pagos y Comisiones

## Objetivo

Exprimir el constructor de negocios antes del alpha con escenarios financieros
más complejos que el flujo feliz básico. Esta prueba fuerza:

- Planes de pago personalizados con múltiples líneas.
- Comisiones compartidas entre agente principal, co-agente y referido.
- Recálculo de pagos y comisiones.
- Validación y bloqueo de confirmación cuando los montos no cuadran.
- Repetición con datos aleatorios para detectar errores de estado, cache,
  contexto y persistencia.

Esta prueba complementa `docs/testing/client-zero-alpha.md`. No reemplaza la
prueba cliente cero general.

## Ambiente

- URL pública alpha: `https://soypms-alpha.vercel.app`
- Usuario de prueba: owner o administrador con permiso de crear clientes,
  inmuebles, agentes y negocios.
- Ejecutar en escritorio primero. Repetir los pasos de revisión en móvil.
- Usar prefijo único por corrida: `QA-ADV-<yyyymmdd>-<hhmm>-<iteración>`.

## Regla De Evidencia

En cada iteración guardar:

- Captura de cada paso del negocio: Tipo, Clientes, Inmueble, Contrato, Montos,
  Pagos, Comisiones, Acciones y Revisión.
- Captura de cálculos de pagos y comisiones antes de confirmar.
- Captura de errores esperados en pruebas negativas.
- URL del negocio creado o código visible del negocio.
- Resultado: pasa, pasa con observaciones o no pasa.

Todo error `500`, `401` inesperado, texto en inglés visible o pérdida de datos
al cambiar de paso es P1 o P0 según bloquee confirmación.

## Datos Base Por Iteración

Cambiar el sufijo por corrida. Ejemplo: `QA-ADV-20260713-01`.

| Entidad | Valor |
| --- | --- |
| Cliente comprador | `Comprador QA-ADV-20260713-01` |
| Cliente vendedor | `Vendedor QA-ADV-20260713-01` |
| Propiedad | `Penthouse QA-ADV-20260713-01` |
| Agente principal | `Agente Principal QA-ADV-20260713-01` |
| Co-agente | `Coagente QA-ADV-20260713-01` |
| Referido | `Referido QA-ADV-20260713-01` |
| Monto negociado | `462,500.00 USD` |
| Fecha firma | `2026-08-20` |
| Fecha cierre | `2026-12-20` |

Crear primero las entidades en sus módulos o dentro del flujo cuando la UI lo
permita. Si se crean fuera del flujo, usar los botones de actualización del
wizard antes de seleccionarlas.

## Corrida Principal: Venta Avanzada Con Pagos Personalizados

### 1. Preparar Datos Operativos

1. Entrar con usuario owner o administrador.
2. Crear o verificar tres agentes activos:
   - Agente principal.
   - Co-agente.
   - Referido.
3. Crear cliente comprador con correo único y rol comercial de comprador.
4. Crear cliente vendedor con correo único y rol comercial de vendedor.
5. Crear propiedad de venta:
   - Tipo: apartamento o penthouse.
   - País: Panamá.
   - Ciudad: Panamá.
   - Zona: Costa del Este.
   - Precio venta: `475,000.00 USD`.
   - Propietario: cliente vendedor.

Resultado ideal: los tres agentes, dos clientes y la propiedad aparecen en sus
listados y pueden buscarse por el prefijo de corrida.

### 2. Crear Negocio

1. Ir a `Negocios`.
2. Seleccionar `Nuevo negocio`.
3. En `Tipo`, elegir:
   - Operación: `Venta`.
   - Modo: `Avanzado`.
   - Moneda: `USD`.
   - Título: `Venta avanzada QA-ADV-<sufijo>`.
   - Fecha firma: `2026-08-20`.
   - Fecha cierre: `2026-12-20`.
4. Avanzar a `Clientes`.
5. Seleccionar comprador como participante principal.
6. Agregar vendedor si la UI lo permite en el paso o dejarlo asociado por la
   propiedad.
7. Avanzar a `Inmueble`.
8. Seleccionar `Penthouse QA-ADV-<sufijo>`.
9. Avanzar a `Contrato`.
10. Seleccionar un contrato de venta que requiera pagos y comisiones.

Resultado ideal: el wizard guarda el borrador al cambiar de paso, no pierde
clientes ni inmueble, y no muestra errores de contexto.

### 3. Montos

En `Montos`, cargar:

| Campo | Valor |
| --- | --- |
| Precio base | `475,000.00` |
| Precio negociado | `462,500.00` |
| Total contrato | `462,500.00` |
| Monto pagable | `462,500.00` |
| Base de comisión | `462,500.00` |

Resultado ideal: el resumen del paso muestra los importes en USD y la base de
comisión coincide con el monto negociado.

### 4. Plan De Pagos Personalizado

En `Pagos`:

1. Cambiar `Preset` a `Personalizado`.
2. Mantener `Monto a programar`: `462,500.00`.
3. Agregar seis pagos especiales con estos valores:

| Línea | Tipo | Fecha | Monto |
| --- | --- | --- | --- |
| Reserva inicial | Especial | `2026-07-25` | `5,000.00` |
| Pago a la firma | Especial | `2026-08-20` | `87,500.00` |
| Cuota 1 financiamiento | Especial | `2026-09-20` | `80,000.00` |
| Cuota 2 financiamiento | Especial | `2026-10-20` | `80,000.00` |
| Cuota 3 financiamiento | Especial | `2026-11-20` | `80,000.00` |
| Saldo al cierre | Pago final | `2026-12-20` | `130,000.00` |

3. Ejecutar cálculo o vista previa si el cálculo no corre automáticamente.

Resultado ideal:

- Total contrato: `462,500.00 USD`.
- Total programado: `462,500.00 USD`.
- Diferencia: `0.00 USD`.
- La tabla muestra seis líneas ordenadas por fecha.
- No hay errores de plan de pagos.

### 5. Comisiones Compartidas

En `Comisiones`:

1. Seleccionar agente principal.
2. Cambiar a modo avanzado si no está activo.
3. Seleccionar porcentaje simple `3`.
4. Base de cálculo: `Precio negociado`.
5. Trigger general: `Al cierre`.
6. Agregar co-agente.
7. Seleccionar al cliente comprador ya registrado como receptor y asignarle el rol
   de referido. No crear una segunda persona para el mismo cliente.
8. Crear tres reglas:

| Participante | Tipo de cálculo | Valor | Trigger | Resultado esperado |
| --- | --- | --- | --- | --- |
| Agente principal | `% venta` | `1.5` | Al cierre | `6,937.50 USD` |
| Co-agente | `% comisión` | `30` | Contra cobro | `4,162.50 USD` |
| Cliente comprador (Comprador + Referido) | `% comisión` | `20` | A la firma | `2,775.00 USD` |

Resultado ideal:

- Comisión bruta de referencia: `13,875.00 USD` por 3% de `462,500.00`.
- Total asignado: `13,875.00 USD`.
- El desglose muestra tres asignaciones.
- Cada asignación identifica al participante correcto; si todas quedan con el
  nombre del agente principal, registrar P1.
- El cliente comprador aparece una sola vez como persona y muestra los roles
  `Comprador, Referido`.
- La tabla muestra receptor, roles, base, cálculo, valor, monto, liberación y estado.
- No hay asignaciones duplicadas.
- No hay errores visibles en inglés.

### 6. Acciones

En `Acciones`:

1. Mantener recordatorios de pagos activos.
2. Mantener tarea de firma activa.
3. Mantener tarea de revisión activa.
4. Mantener recordatorios de comisión activos.

Resultado ideal: la vista de revisión debe indicar que se generarán acciones
relacionadas con pagos, contrato y comisiones.

### 7. Revisión y Confirmación

1. Ir a `Revisión`.
2. Ejecutar `Vista previa` o equivalente.
3. Revisar:
   - Errores: `0`.
   - Diferencia de pagos: `0.00 USD`.
   - Comisión estimada: `13,875.00 USD`.
   - Cliente, inmueble y contrato correctos.
4. Confirmar el negocio.

Resultado ideal:

- El negocio cambia de borrador a estado confirmado o pendiente según flujo.
- Se crean plan de pagos, líneas de pago, plan de comisiones, asignaciones,
  contrato o snapshot, y acciones programadas.
- Volver a abrir el negocio muestra los mismos importes.
- Actualizar el navegador no pierde datos.

## Pruebas Negativas Obligatorias

Ejecutar estas pruebas en borradores separados para no contaminar la corrida
principal.

### Negativa A: Plan De Pagos Descuadrado

1. Duplicar la corrida principal hasta `Pagos`.
2. Usar el mismo total `462,500.00`.
3. Cambiar `Saldo al cierre` a `129,999.99`.
4. Ejecutar vista previa.
5. Intentar confirmar.

Resultado ideal:

- Diferencia visible: `0.01 USD`.
- La validación muestra error de plan de pagos.
- La confirmación queda bloqueada.
- No se crea negocio confirmado ni entidades financieras finales.

### Negativa B: Fecha De Cierre Antes De Firma

1. Crear borrador nuevo.
2. Usar fecha firma `2026-08-20`.
3. Usar fecha cierre `2026-08-01`.
4. Ejecutar vista previa.

Resultado ideal:

- La validación muestra que la fecha de cierre no puede ser anterior a la firma.
- El error está en español.
- No permite confirmar.

### Negativa C: Comisión Sin Participante

1. Crear borrador avanzado.
2. No seleccionar agente principal.
3. Intentar agregar regla base.

Resultado ideal:

- La UI muestra `Selecciona un agente principal antes de crear reglas.`
- No se agrega una regla vacía.
- No hay error 500.

### Negativa D: Comisión Duplicada

1. Crear reglas avanzadas.
2. Agregar dos reglas iguales para el mismo participante, rol y tipo de cálculo.
3. Ejecutar vista previa.

Resultado ideal:

- La validación detecta asignación de comisión duplicada.
- La confirmación queda bloqueada o exige corrección.
- El mensaje visible está en español.

### Negativa E: Porcentaje Fuera De Rango

1. En una regla de comisión, ingresar `101`.
2. Ejecutar vista previa.

Resultado ideal:

- La validación muestra que el porcentaje debe ser mayor que cero y hasta
  100%.
- No confirma el negocio.
- El formulario conserva los datos para corregir.

## Variantes De Exprimido

Repetir la corrida principal tres veces cambiando solo estos parámetros.

### Variante 1: Cuotas Regulares

| Campo | Valor |
| --- | --- |
| Preset | `Firma + cuotas` |
| Total | `360,000.00` |
| Pago a la firma | `60,000.00` |
| Número de cuotas | `6` |
| Frecuencia | `Mensual` |
| Inicio de cuotas | `2026-09-15` |
| Día de vencimiento | `15` |

Resultado esperado:

- Pago a la firma: `60,000.00`.
- Seis cuotas de `50,000.00`.
- Diferencia: `0.00`.

### Variante 2: Reserva, Firma y Saldo

| Campo | Valor |
| --- | --- |
| Preset | `Reserva + firma + saldo` |
| Total | `250,000.00` |
| Reserva | `10,000.00` |
| Pago a la firma | `40,000.00` |
| Fecha cierre | `2026-10-30` |

Resultado esperado:

- Reserva: `10,000.00`.
- Pago a la firma: `40,000.00`.
- Saldo al cierre: `200,000.00`.
- Diferencia: `0.00`.

### Variante 3: Comisión Contra Cobro

| Campo | Valor |
| --- | --- |
| Base de cálculo | `Monto cobrado` |
| Porcentaje simple | `2.5` |
| Agente principal | `% venta` `1.25` |
| Co-agente | `% comisión` `30` |
| Referido | `% comisión` `20` |
| Trigger principal | `Contra cobro` |

Resultado esperado para monto base `400,000.00`:

- Comisión bruta de referencia: `10,000.00`.
- Agente principal: `5,000.00`.
- Co-agente: `3,000.00`.
- Referido: `2,000.00`.
- Total asignado: `10,000.00`.

## Matriz De Severidad

| Severidad | Condición |
| --- | --- |
| P0 | No se puede confirmar un negocio válido, se crean duplicados, hay datos cruzados entre organizaciones, o pagos/comisiones calculan mal. |
| P1 | Dropdowns no cargan luego de actualizar, errores 500, mensajes técnicos visibles, pérdida de datos al cambiar pasos, o validaciones no bloquean errores financieros. |
| P2 | Copy confuso, acentos faltantes, orden visual deficiente, diferencias menores de responsive o estados vacíos poco claros. |

## Prompt Para Claude En Chrome

Usa este bloque como instrucción directa para la extensión:

```text
Eres el tester cliente cero de SoyPMS alpha.
URL: https://soypms-alpha.vercel.app
Objetivo: ejecutar la Prueba Cliente Cero Avanzada de pagos y comisiones.

Reglas:
- No inventes datos fuera del prefijo de corrida.
- Usa prefijo QA-ADV-<fecha>-<iteración>.
- Guarda evidencia mental paso a paso: pantalla, acción, resultado esperado,
  resultado observado.
- Si aparece error 500, texto en inglés, dropdown vacío después de actualizar,
  pérdida de datos o cálculo incorrecto, detente y reporta el hallazgo con pasos
  exactos.
- Ejecuta primero la corrida principal de venta avanzada con monto negociado
  462,500.00 USD.
- Verifica que el plan personalizado sume 462,500.00 USD y diferencia 0.00.
- Verifica que las comisiones compartidas den 6,937.50, 4,162.50 y 2,775.00,
  total 13,875.00.
- Luego ejecuta las negativas A, B, C, D y E en borradores separados.
- Repite al menos una variante adicional si la corrida principal pasa.

Al finalizar, entrega un reporte con:
1. Entorno y usuario.
2. Prefijos usados.
3. Resultado por sección.
4. Cálculos observados vs esperados.
5. Fallos con severidad P0/P1/P2.
6. Capturas o descripciones exactas de evidencia.
```

## Registro De Resultado

| Campo | Valor |
| --- | --- |
| Fecha | |
| Tester | |
| Usuario | |
| Entorno | |
| Prefijo corrida principal | |
| Variantes ejecutadas | |
| Negativas ejecutadas | |
| Negocio confirmado | Si / No |
| Diferencia pagos observada | |
| Comisión observada | |
| P0 | |
| P1 | |
| P2 | |
| Resultado general | Pasa / Pasa con observaciones / No pasa |
