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
- `pnpm typecheck`: 6 tareas aprobadas después de construir los artefactos de
  los paquetes workspace.
- `pnpm test`: 56 pruebas aprobadas, distribuidas en 20 de `shared`, 23 de `web`
  y 13 de `api`.
- `pnpm build`: 6 tareas aprobadas y 26 páginas generadas.
- `git diff --check`: aprobado.

## Deudas y bloqueos separados

- #85 mantiene la aplicación y verificación remota de la migración financiera
  mediante Supabase MCP. La integración no aplica migraciones localmente.
- #88 registra que `typecheck` y `test` necesitan declarar en Turbo la
  construcción previa de `shared`, `ui` y `database` cuando el checkout no tiene
  artefactos `dist` residuales.

Hasta cerrar #85, la integración debe permanecer como PR borrador y no debe
promoverse a producción.
