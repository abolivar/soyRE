# Integración de las primeras iteraciones

Este documento registra la integración técnica de los lotes #78 a #81. No
reemplaza los protocolos funcionales de cada lote ni autoriza migraciones fuera
del flujo remoto definido en `CODEX.md`.

## Orden de integración

1. #78: alta rápida de clientes con pasaporte y cédula de Colombia y Panamá.
2. #79: montos referenciales y diferencias de negociación.
3. #80: tabla de comisiones y receptores registrados con múltiples roles.
4. #81: perfiles pagables, erogaciones y compensaciones entre operaciones.

Las ramas se integraron sobre `main` en ese orden para conservar un historial
explícito y facilitar la revisión de cada lote original.

## Conflicto resuelto

Los lotes #79 y #80 modificaban el mismo bloque de validación de
`BusinessesService`. La resolución conserva ambos comportamientos:

- Los errores y avisos de ajustes referenciales se incorporan a la validación
  del negocio.
- Cada receptor calculado de comisión debe corresponder a un cliente, usuario o
  agente inmobiliario registrado como participante.

No se descartó lógica de ninguno de los lotes.

## Validación integrada

La verificación se ejecutó en un worktree limpio con Node 22.22.2:

- `pnpm db:generate`: aprobado.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: 9 tareas aprobadas; Turbo construye automáticamente los
  artefactos de los paquetes workspace.
- `pnpm test`: 56 pruebas aprobadas, distribuidas en 20 de `shared`, 23 de `web`
  y 13 de `api`.
- `pnpm build`: 6 tareas aprobadas y 26 páginas generadas.
- `git diff --check`: aprobado.

## Verificación remota de finanzas

El 15/07/2026 se aplicó la migración
`20260714212054_payout_profiles_disbursements_compensations` al proyecto remoto
mediante Supabase MCP. La evidencia saneada confirmó:

- Registro Supabase `20260715131350_payout_profiles_disbursements_compensations`.
- Registro Prisma con el nombre exacto del directorio local, checksum
  `922f16bf476440095f491e6c7197207ec45ec424337f05fd2020bd71fd62ad2a`,
  `finished_at` informado y sin rollback.
- Cuatro tablas nuevas vacías: `payout_profiles`, `payout_methods`,
  `disbursements` y `compensation_applications`.
- Seis enums, restricciones, claves foráneas e índices alineados con el SQL
  versionado.
- RLS habilitado en las cuatro tablas, sin políticas públicas y sin privilegios
  de lectura para `anon` o `authenticated`; el acceso permanece en la API.
- Prueba remota adversarial aprobada para altas válidas, conservación de montos,
  transiciones, método predeterminado e idempotencia. Todas las filas temporales
  fueron eliminadas y los cuatro conteos residuales quedaron en cero.

## Deudas separadas

- #6 conserva la revisión transversal de advisors y la estrategia de RLS para
  tablas históricas. La verificación detectó siete tablas anteriores con RLS
  deshabilitado; no se habilitó RLS sin definir antes sus políticas.
- #91 cubre trece claves foráneas financieras que el Performance Advisor marca
  sin índice de cobertura. Deben resolverse en una migración incremental, sin
  modificar la migración ya aplicada.
- #88 corrigió la gráfica de Turbo y la exportación de tipos de
  `@soyre/database`; su commit está incorporado en esta rama de integración.

Con #85 verificado remotamente, el PR de integración ya no tiene bloqueo de
base de datos. Su promoción sigue sujeta a revisión y aprobación del PR.
