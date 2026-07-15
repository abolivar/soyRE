# Módulo de Negocios

El módulo de negocios ejecuta una venta, alquiler, reserva, separación, preventa
o cesión desde un borrador hasta su confirmación. Cada negocio pertenece a una
`organization` y mantiene al inmueble como entidad operativa central.

## Montos del negocio

El wizard distingue cinco importes con propósitos diferentes:

| Importe | Propósito |
| --- | --- |
| Precio base | Punto de partida comercial del inmueble. |
| Precio negociado | Precio acordado entre las partes. |
| Total contractual | Valor que debe constar en el contrato. |
| Total pagable | Valor que alimenta el plan de pagos. |
| Base de comisión | Valor sobre el cual se calculan comisiones. |

La interfaz puede sincronizarlos para acelerar la captura, pero conserva campos
separados porque una operación real puede requerir valores distintos.

## Ajustes referenciales de negociación

Las diferencias de materiales, mejoras, cesiones y otros acuerdos se registran
como una lista explícita de ajustes referenciales. Cada ajuste contiene:

- Identificador, categoría y concepto.
- Monto y moneda del negocio.
- Sentido: incremento o descuento.
- Parte a la que aplica y notas operativas.
- Efecto invariable `REFERENCE_ONLY`.

El sistema calcula incrementos, descuentos y neto referencial para facilitar la
revisión. Estos montos se guardan en el borrador, viajan en la vista previa y se
copian a las condiciones personalizadas del contrato al confirmar.

Un ajuste referencial no modifica automáticamente el total contractual, el total
pagable, el plan de pagos ni la base de comisión. Si posteriormente debe convertirse
en cargo, pago, erogación o compensación en otra operación, esa conversión debe ser
una acción explícita, trazable y autorizada. Esto evita contabilizar dos veces un
acuerdo o crear obligaciones financieras por una nota comercial.

## Confirmación y auditoría

Antes de confirmar, el backend vuelve a calcular planes de pago, comisiones y
ajustes referenciales. Un ajuste incompleto o con monto no positivo es un error
bloqueante. Cuando existen ajustes válidos, la validación informa que son solo de
referencia. La vista previa y el snapshot de cálculo conservan el resultado usado
para confirmar el negocio.

Los siguientes lotes amplían esta base sin mezclar responsabilidades:

- Tabla de comisiones y personas con múltiples roles: ticket #80.
- Datos de pago, erogaciones y compensaciones entre operaciones: ticket #81.
