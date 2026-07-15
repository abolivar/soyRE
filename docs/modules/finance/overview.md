# Módulo de finanzas

El módulo de finanzas registra quién debe recibir una erogación, cómo puede
recibirla y si el valor fue pagado directamente o convertido en saldo a favor
para otra operación del mismo cliente.

## Alcance del primer lote

- Perfiles pagables asociados a personas ya registradas como cliente, usuario o
  agente inmobiliario. Una misma persona puede reunir varios de estos roles.
- Métodos de desembolso sin almacenar números completos de cuenta. Para una
  transferencia solo se guardan banco, titular, últimos cuatro dígitos y una
  referencia segura emitida por el proveedor o bóveda.
- Erogaciones vinculadas a la operación origen, receptor, concepto, moneda y,
  cuando corresponde, asignación de comisión.
- Pago directo o saldo a favor aplicable a otra operación del mismo cliente.
- Aplicaciones y reversiones explícitas, idempotentes y auditadas.

No se almacena el número completo de la cuenta ni un secreto del proveedor en
la base de datos. `providerReference` debe ser un token opaco revocable. La API
nunca devuelve ese valor; solo informa si existe.

## Permisos y revisión

- Lectura: `OWNER`, `ADMIN`, `BROKER` y `FINANCE` con `finance.read`.
- Escritura: `OWNER`, `ADMIN` y `FINANCE` con `finance.write`.
- Todo perfil nuevo queda en `REVIEW_REQUIRED`. Su activación es una acción
  financiera separada y auditada.
- Una erogación no puede aprobarse si el receptor no tiene un perfil activo.
- Un pago directo necesita un método activo. Un saldo a favor no exige método
  bancario porque su destino es otra operación.

Las cuatro tablas financieras tienen RLS habilitado y no exponen políticas al
rol público. El acceso de esta iteración ocurre exclusivamente por la API,
después de verificar organización, membresía, rol y permiso.

## Estados

Un pago directo recorre `DRAFT -> APPROVED -> PAID`.

Un saldo a favor recorre
`DRAFT -> AVAILABLE_FOR_COMPENSATION -> PARTIALLY_APPLIED -> APPLIED`.
Revertir una aplicación devuelve el desembolso a `PARTIALLY_APPLIED` o
`AVAILABLE_FOR_COMPENSATION`, según el saldo que vuelva a quedar disponible.

Cada transición usa comparación optimista de estado o saldo. Si otro proceso
modificó el registro, la operación falla con conflicto y la transacción completa
se revierte.

## Invariantes contables

- Los valores se almacenan como centavos enteros (`bigint`), nunca como punto
  flotante.
- `pagado + aplicado <= original`.
- La moneda es un código ISO de tres letras y debe coincidir entre operación
  origen, erogación, aplicación y operación destino.
- Una compensación solo puede ir a una operación distinta cuyo cliente
  principal sea el mismo receptor del saldo.
- El monto original nunca cambia. Las aplicaciones incrementan el aplicado y
  las reversiones lo disminuyen, conservando cada movimiento.
- Las claves de idempotencia son únicas por organización tanto para erogaciones
  como para aplicaciones.
- Una erogación vinculada a comisión no puede superar el valor pagadero menos
  lo ya pagado y lo reservado por otras erogaciones activas.
- Al ejecutar un pago directo, o al reconocer un saldo a favor, la asignación de
  comisión vinculada avanza de forma atómica a pago parcial o total.

## API

- `GET /finance/payout-profiles`
- `POST /finance/payout-profiles`
- `POST /finance/payout-profiles/:profileId/methods`
- `POST /finance/payout-profiles/:profileId/activate`
- `GET /finance/disbursements`
- `POST /finance/disbursements`
- `POST /finance/disbursements/:disbursementId/approve`
- `POST /finance/disbursements/:disbursementId/mark-paid`
- `POST /finance/disbursements/:disbursementId/applications`
- `POST /finance/compensation-applications/:applicationId/reverse`

Las mutaciones relevantes generan `AuditLog` con actor, organización, recurso,
acción y metadatos no sensibles.

## Migración

La migración
`20260714212054_payout_profiles_disbursements_compensations` crea los enums,
tablas, relaciones, restricciones, índices e RLS. Debe aplicarse al proyecto
remoto exclusivamente mediante Supabase MCP y verificarse con SQL,
`list_tables` y los asesores antes de cerrar el ticket.
