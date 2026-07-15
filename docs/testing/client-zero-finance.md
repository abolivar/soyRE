# Protocolo cliente cero: finanzas y compensaciones

Este protocolo se ejecuta contra el entorno remoto conectado. No se crea una
base local, un contenedor ni datos fuera de la organización de prueba.

## Preparación

1. Usar una organización con un usuario `FINANCE`, un `BROKER` de solo lectura y
   un usuario sin permisos financieros.
2. Registrar al cliente A con dos operaciones activas en USD: origen O-100 y
   destino O-200.
3. Registrar al cliente B con una operación activa O-300.
4. Crear una asignación de comisión pagadera de USD 65.00 para el cliente A en
   O-100.

## Caso 1: perfil y método

1. Crear el perfil pagable del cliente A. Debe quedar `REVIEW_REQUIRED`.
2. Confirmar que no se puede aprobar una erogación para ese perfil.
3. Agregar una transferencia con banco, titular, últimos cuatro dígitos `4321`
   y un token ficticio del proveedor.
4. Verificar que las respuestas muestran `accountLast4=4321` y
   `hasProviderReference=true`, pero nunca el token.
5. Activar el perfil con el usuario financiero y confirmar el evento de
   auditoría.
6. Repetir el perfil usando otro rol registrado de la misma persona. Debe
   fusionarse con el perfil existente y no crear otro receptor.

## Caso 2: pago directo

1. Crear por USD 25.00 una erogación `DIRECT_PAYMENT` ligada a una comisión
   pagadera y a su método activo.
2. Repetir la solicitud con la misma clave idempotente. Debe devolver el mismo
   identificador.
3. Aprobarla y marcarla pagada.
4. Esperar: original `2500`, pagado `2500`, aplicado `0`, saldo `0`, estado
   `PAID`; la comisión queda pagada por USD 25.00 más que antes.
5. Repetir `mark-paid`. Debe ser idempotente y no duplicar el pago de comisión.

## Caso 3: saldo a favor y compensación exacta

1. Crear un saldo a favor de USD 65.00 para el cliente A en O-100.
2. Aprobarlo. Debe quedar `AVAILABLE_FOR_COMPENSATION` con original `6500`,
   aplicado `0` y saldo `6500`.
3. Aplicar USD 40.00 a O-200. Esperar aplicado `4000`, saldo `2500` y estado
   `PARTIALLY_APPLIED`.
4. Repetir la aplicación con la misma clave. Debe devolver la misma aplicación
   sin descontar nuevamente.
5. Aplicar USD 25.00 a O-200. Esperar aplicado `6500`, saldo `0` y estado
   `APPLIED`.
6. Revertir la primera aplicación. Esperar aplicado `2500`, saldo `4000` y
   estado `PARTIALLY_APPLIED`. El movimiento original debe seguir visible como
   `REVERSED`, con actor, fecha y motivo.

## Casos negativos obligatorios

- Crear perfil sin cliente, usuario o agente registrado: `400`.
- Usar identidades de personas diferentes en el mismo perfil: `400`.
- Activar o pagar con un usuario sin `finance.write`: prohibido.
- Consultar perfiles o erogaciones sin `finance.read`: prohibido.
- Aprobar un pago directo sin método activo: `400`.
- Vincular una comisión de otra operación u otro receptor: `400`.
- Reservar más que el saldo pendiente de una comisión: `400`.
- Aplicar USD 65.01 sobre un saldo de USD 65.00: `400`.
- Aplicar USD a una operación en otra moneda: `400`.
- Aplicar el saldo a O-300, que pertenece al cliente B: `400`.
- Aplicar el saldo a su propia operación origen: `400`.
- Enviar dos aplicaciones concurrentes por encima del saldo: una puede ganar;
  la otra debe fallar con `409` sin crear un movimiento huérfano.

## Evidencia de cierre

- Resultado de `pnpm db:generate`, lint, typecheck, tests y build con Node 22.
- Tablas, índices, restricciones y RLS verificados en Supabase remoto.
- Asesores de seguridad y rendimiento revisados.
- Capturas o payloads saneados de los tres casos, sin referencias de proveedor.
- Registros de auditoría para creación, activación, aprobación, pago, aplicación
  y reversión.
