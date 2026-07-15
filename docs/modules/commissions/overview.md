# Módulo de Comisiones

El módulo calcula, distribuye y conserva la trazabilidad de las comisiones de un
negocio. Una comisión nunca se asigna a un texto libre: cada receptor debe ser una
persona registrada como cliente, usuario activo o agente de la organización y debe
existir como participante del negocio.

## Identidad y roles

`BusinessParticipant` representa la identidad de una persona dentro del negocio.
Mantiene un rol principal para compatibilidad operativa y una lista de roles en
`metadata.roles`. De esta forma una sola persona puede ser, por ejemplo, comprador
y referido sin duplicar filas ni perder su relación con el cliente original.

Los identificadores aceptados para una persona registrada son:

- `clientId` para clientes.
- `userId` para usuarios activos de la organización.
- `realEstateAgentId` para agentes activos.

El backend bloquea participantes duplicados, receptores sin una de estas relaciones
y asignaciones cuyo `participantKey` no exista en el negocio. Al confirmar, la
relación `CommissionAllocation.participantId` es obligatoria para las nuevas
asignaciones creadas por el wizard.

## Tabla de comisiones

La revisión muestra una fila por asignación con:

| Campo | Significado |
| --- | --- |
| Receptor registrado | Nombre de la persona enlazada. |
| Roles | Todos los roles que cumple en el negocio. |
| Base | Monto usado para el cálculo. |
| Cálculo | Porcentaje de venta, porcentaje de comisión, monto fijo o tope. |
| Valor | Porcentaje o monto configurado en la regla. |
| Monto | Resultado calculado para el receptor. |
| Liberación | Evento que habilita el pago. |
| Estado | Estado inicial de la asignación; en el wizard es `PENDING`. |

Dos reglas con la misma persona y tipo de receptor se consideran duplicadas aunque
usen fórmulas diferentes. Si una persona necesita conceptos económicos diferentes,
deben modelarse explícitamente en el lote de erogaciones y compensaciones, no como
duplicados ambiguos de comisión.

## Límites de este lote

Este módulo calcula y registra el derecho económico, pero todavía no captura cuenta
bancaria, método de pago, documentación fiscal ni compensación entre operaciones.
Esos datos pertenecen al ticket #81 y deben mantenerse separados del cálculo.
