# Tenancy Architecture

## Decisión Conceptual

Usar `organization` como entidad que representa al cliente SaaS, broker, inmobiliaria o equipo.

No usar `tenant` para inquilinos de alquiler, porque puede confundirse con multi-tenancy. Para inquilino se usará `lessee`.

## Principios Obligatorios

- Toda consulta de negocio debe estar filtrada por organización.
- Los usuarios acceden a organizaciones mediante memberships.
- Los permisos se calculan por organización, rol y recurso.
- Los endpoints deben impedir filtración entre organizaciones.
- Los tests de módulos críticos deben cubrir aislamiento multi-tenant.
- La organización efectiva se deriva de una membership activa de la sesión; un
  `organizationId` enviado por el cliente no concede acceso.
- Toda relación entre recursos valida que ambos pertenecen a la misma
  organización antes de persistirla.
- Conocer un UUID de otra organización no permite distinguir entre existencia y
  acceso cuando esa distinción pueda filtrar información.
- Jobs, Storage, auditoría, idempotencia, búsquedas y reportes respetan la misma
  frontera que las rutas HTTP.

## Identidad Inicial

El primer registro crea una `organization`, un `user` y un `membership` con rol `OWNER`.

Los usuarios adicionales pertenecen a una organización mediante `membership`. La activación o suspensión de un usuario dentro de una organización se hace sobre el membership.

## Matriz De Ownership

| Recurso | Frontera | Regla mínima |
|---|---|---|
| Usuario | Global con memberships | No obtiene acceso operativo sin membership activa. |
| Cliente | `organizationId` directo | Solo se relaciona con recursos de la misma organización. |
| Propiedad | `organizationId` directo | Propietario y responsable deben ser accesibles en la organización. |
| Negocio | `organizationId` directo | Propiedad, clientes, participantes y configuración deben coincidir. |
| Documento | `organizationId` directo | Entidad relacionada y ruta de Storage deben coincidir. |
| Mandato | `organizationId` directo | Propiedad, propietario y responsable deben coincidir. |
| Listing | `organizationId` directo | Propiedad y mandato deben coincidir. |
| Visita | `organizationId` directo | Propiedad, cliente, negocio y agentes deben coincidir. |
| Oferta | `organizationId` directo | Propiedad, cliente, negocio y responsable deben coincidir. |
| Configuración | `organizationId` directo | Nunca se reutiliza implícitamente entre organizaciones. |
| Auditoría | `organizationId` o alcance plataforma | No mezcla eventos operativos con backoffice de plataforma. |

## Patrón De API

1. Autenticar usuario.
2. Resolver memberships activas.
3. Resolver organización efectiva dentro de esas memberships.
4. Autorizar rol y acción.
5. Consultar el recurso con scope de organización.
6. Validar bajo el mismo scope todos los recursos relacionados.
7. Ejecutar escritura y auditoría en la misma transacción cuando aplique.

No se permite consultar primero por UUID global y comprobar la organización
después si la consulta o sus errores pueden exponer información.

## Storage

- Bucket privado.
- Path con prefijo de organización y recurso.
- El servidor valida membership, organización y permiso antes de firmar acceso.
- No se acepta una ruta proporcionada por el cliente como autorización.
- Un documento de una organización no puede enlazarse a un expediente de otra.

## Pruebas Negativas Obligatorias

Cada módulo crítico debe demostrar que una organización B no puede:

- Consultar por ID un recurso de A.
- Asociar un recurso de A dentro de una escritura de B.
- Descargar un archivo de A aunque conozca su path o UUID.
- Filtrar, buscar o contar registros de A.
- Ejecutar una transición, job o acción idempotente sobre A.
- Inferir datos de A a través de mensajes de error, dashboard o auditoría.

Las respuestas esperadas son `404` o `403` según el contrato del endpoint, nunca
un payload parcial del recurso ajeno.

## Seguridad Por Etapas

El aislamiento por organización es funcional y se implementa desde cada lote.
El hardening previo al beta agrega defensa en profundidad: revisión completa de
RLS, privilegios, políticas de Storage, rate limiting, secretos, headers,
retención, backup/restore, observabilidad y pruebas de abuso.
