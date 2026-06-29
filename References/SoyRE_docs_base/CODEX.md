# SoyRE — Instrucciones obligatorias para Codex

> Este documento es de consulta obligatoria antes de crear, modificar, refactorizar o eliminar código dentro de SoyRE.

SoyRE no es un MVP desechable. SoyRE es un **SaaS inmobiliario funcional, modular, escalable y mantenible**. Toda implementación debe respetar esta visión.

---

## 1. Contrato operativo para Codex

Antes de trabajar en cualquier archivo, Codex debe asumir lo siguiente:

1. El producto será multiusuario.
2. El producto tendrá organizaciones o tenants.
3. La información debe respetar ownership de usuario, equipo y organización.
4. Los módulos deben ser reutilizables y extensibles.
5. Venta y alquiler son dominios relacionados, pero no idénticos.
6. El CRM de clientes es centralizado.
7. El funnel tipo Kanban es configurable.
8. Los estados críticos no deben quedar hardcodeados si forman parte de la configuración del negocio.
9. La UI visible para el usuario debe estar en español.
10. Los nombres técnicos del código deben preferirse en inglés.
11. Toda vista importante debe tener estados de loading, empty y error.
12. Toda acción crítica debe dejar actividad, historial o auditoría cuando aplique.
13. Cada fase debe quedar funcional antes de avanzar a la siguiente.

---

## 2. Reglas no negociables

## 2.1 No construir como demo

No crear código con mentalidad temporal si la pieza pertenece al core del producto.

Evitar:

- Componentes gigantes.
- Lógica duplicada.
- Datos simulados incrustados en vistas finales.
- Estados fijos dentro de componentes.
- Permisos ignorados.
- Consultas directas desde UI si debe existir servicio/capa de datos.
- Formularios sin validación.
- Páginas sin manejo de errores.

---

## 2.2 No hardcodear etapas del Kanban

Prohibido crear lógica como:

```ts
const stages = ['Nuevo', 'Contactado', 'Visita', 'Oferta', 'Cierre']
```

Las etapas deben venir de una fuente configurable:

- Base de datos.
- Configuración por organización.
- Servicio de configuración.
- Seed inicial editable.
- Fuente dinámica equivalente.

Las etapas deben poder:

- Crearse.
- Renombrarse.
- Reordenarse.
- Activarse o desactivarse.
- Asociarse a venta, alquiler o ambos.
- Tener campos requeridos.
- Tener reglas de avance.

---

## 2.3 No duplicar clientes

El cliente debe vivir en un módulo central.

No crear clientes embebidos dentro de:

- Propiedades.
- Tarjetas Kanban.
- Procesos de venta.
- Procesos de alquiler.
- Tareas.

Las demás entidades deben referenciar al cliente por relación o identificador.

Un cliente puede tener múltiples roles:

- Comprador.
- Vendedor.
- Arrendador.
- Arrendatario.
- Lead.
- Inversionista.
- Referidor.

---

## 2.4 Venta y alquiler no son el mismo flujo

Pueden compartir componentes, entidades base y UI, pero deben tener reglas propias.

Venta puede incluir:

- Precio de venta.
- Comisión.
- Oferta.
- Contraoferta.
- Financiamiento.
- Promesa de compraventa.
- Escritura.
- Fecha estimada de cierre.

Alquiler puede incluir:

- Canon mensual.
- Depósito.
- Duración de contrato.
- Fecha de inicio.
- Fecha de vencimiento.
- Renovación.
- Check-in / check-out.
- Estado de ocupación.
- Mantenimiento.

---

## 2.5 Dashboards obligatorios

Deben existir dos responsabilidades separadas:

### Dashboard general

Vista global de la operación para owners, admins, managers o usuarios autorizados.

### Dashboard por usuario

Vista individual de cada asesor, agente o usuario operativo.

El dashboard por usuario no reemplaza el dashboard general.

---

## 3. Arquitectura esperada

La estructura exacta puede variar según el stack, pero debe respetarse la separación modular.

```txt
src/
  app/ o pages/
    dashboard/
    properties/
    clients/
    pipelines/
    tasks/
    documents/
    reports/
    settings/

  modules/
    auth/
    dashboard/
    properties/
    clients/
    pipelines/
    rentals/
    sales/
    tasks/
    documents/
    notifications/
    settings/
    audit/

  components/
    layout/
    navigation/
    ui/
    data-display/
    forms/
    charts/
    kanban/
    feedback/

  lib/
    api/
    db/
    permissions/
    validations/
    formatting/
    constants/
    utils/

  types/
  hooks/
  services/
  config/
```

---

## 4. Contrato mínimo por módulo

Cada módulo importante debe tener, cuando aplique:

- Tipos o interfaces.
- Validaciones.
- Servicios o capa de acceso a datos.
- Componentes reutilizables.
- Vistas o páginas.
- Hooks si aportan claridad.
- Estados de loading.
- Estados empty.
- Estados de error.
- Reglas de permisos.
- Relación con organización o tenant.
- Criterios mínimos de prueba.
- Documentación breve si introduce patrones nuevos.

Ejemplo conceptual:

```txt
modules/properties/
  components/
  hooks/
  services/
  schemas/
  types/
  utils/
```

---

## 5. Reglas de UI y componentes

## 5.1 Componentes reutilizables esperados

Crear y reutilizar componentes como:

- `MetricCard`
- `StatusBadge`
- `PropertyCard`
- `ClientCard`
- `PipelineCard`
- `KanbanBoard`
- `KanbanColumn`
- `DataTable`
- `FilterBar`
- `SearchInput`
- `PageHeader`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ActivityTimeline`
- `DocumentList`
- `TaskList`
- `UserAvatar`
- `ConfirmDialog`
- `FormDrawer`

## 5.2 Reglas visuales

- La navegación debe ser clara y consistente.
- Usar sidebar y topbar en la app autenticada.
- Incluir breadcrumbs o contexto de navegación cuando aporte claridad.
- Las cards de métricas deben ser fáciles de escanear.
- Los estados deben mostrarse con badges o indicadores visuales.
- Las tablas deben tener filtros cuando el volumen de datos lo justifique.
- Los formularios largos deben poder dividirse por secciones o pasos.
- Las acciones destructivas deben confirmar intención.

## 5.3 Estados obligatorios por vista

Toda vista de datos debe contemplar:

- Loading.
- Empty state.
- Error state.
- Success feedback cuando aplique.
- Estado sin permisos cuando aplique.

---

## 6. Reglas de permisos y tenant

Roles iniciales sugeridos:

- `owner`
- `admin`
- `manager`
- `agent`
- `viewer`

Reglas generales:

- Un usuario no debe ver datos de otra organización.
- Un agente ve lo asignado a él, salvo permiso ampliado.
- Un manager puede ver datos de su equipo.
- Un admin puede configurar catálogos, usuarios y etapas.
- El owner administra la cuenta completa.
- Las rutas deben estar protegidas por sesión y permisos.
- Las acciones sensibles deben validar permiso del lado servidor o capa equivalente, no solo en UI.

---

## 7. Reglas por dominio

## 7.1 Dashboard general

Debe mostrar, según permisos:

- Total de propiedades.
- Propiedades activas.
- Propiedades en alquiler.
- Propiedades en venta.
- Propiedades reservadas.
- Propiedades cerradas.
- Propiedades con tareas pendientes.
- Propiedades con documentación incompleta.
- Clientes activos.
- Leads nuevos.
- Procesos abiertos por etapa.
- Procesos próximos a vencer.
- Actividad reciente.

Debe tener:

- Cards de métricas.
- Gráficos simples.
- Filtros por fecha, usuario, equipo, tipo de operación y estado.
- Accesos rápidos a propiedades, clientes y funnel.
- Estados vacíos bien diseñados.

---

## 7.2 Dashboard por usuario

Debe mostrar:

- Mis propiedades asignadas.
- Mis clientes activos.
- Mis procesos abiertos.
- Mis tareas pendientes.
- Mis próximas visitas.
- Mis cierres esperados.
- Actividad reciente propia.
- Alertas personales.

Regla clave:

- No mezclar métricas globales con métricas personales sin indicar claramente el alcance.

---

## 7.3 Propiedades

La propiedad es una entidad central.

Datos base sugeridos:

- Código interno.
- Nombre o título comercial.
- Tipo de propiedad.
- Dirección.
- Ciudad / zona.
- Metraje.
- Habitaciones.
- Baños.
- Estacionamientos.
- Precio de venta.
- Precio de alquiler.
- Moneda.
- Estado operativo.
- Estado comercial.
- Propietario relacionado.
- Asesor asignado.
- Disponibilidad.
- Descripción.
- Amenidades.
- Imágenes.
- Documentos.

Vistas necesarias:

- Lista de propiedades.
- Vista tipo cards.
- Detalle de propiedad.
- Crear propiedad.
- Editar propiedad.
- Filtros avanzados.
- Historial de actividad.
- Relación con clientes.
- Relación con procesos.

Estados sugeridos, configurables o evolutivos:

- Borrador.
- Disponible.
- En promoción.
- En negociación.
- Reservada.
- Alquilada.
- Vendida.
- Pausada.
- Inactiva.

---

## 7.4 Clientes / CRM

Datos base sugeridos:

- Nombre.
- Tipo: persona o empresa.
- Teléfono.
- Email.
- Documento de identidad o fiscal.
- Rol comercial.
- Preferencias.
- Presupuesto.
- Zona de interés.
- Tipo de propiedad de interés.
- Estado del cliente.
- Responsable asignado.
- Notas.
- Documentos.
- Historial de interacciones.

Reglas:

- Evitar duplicados básicos por email, teléfono o documento.
- Un cliente puede relacionarse con múltiples propiedades.
- Un cliente puede relacionarse con múltiples procesos.
- Las interacciones deben quedar registradas.
- El cliente nunca debe depender de una sola operación.

---

## 7.5 Funnel Kanban

Cada tarjeta del Kanban debe poder mostrar:

- Cliente principal.
- Propiedad relacionada.
- Tipo de operación: venta o alquiler.
- Valor estimado.
- Responsable.
- Próxima acción.
- Fecha de última actividad.
- Prioridad o alerta visual.

El módulo debe soportar:

- Board Kanban.
- Columnas dinámicas.
- Drag and drop.
- Configuración de etapas.
- Diferenciación entre venta y alquiler.
- Historial de cambios de etapa.
- Métricas por etapa.
- Reglas de avance futuras.

---

## 7.6 Venta

Datos y procesos sugeridos:

- Precio de venta.
- Comisión esperada.
- Porcentaje de comisión.
- Cliente comprador.
- Cliente vendedor.
- Oferta recibida.
- Contraoferta.
- Financiamiento.
- Promesa de compraventa.
- Escritura.
- Cierre.
- Fecha estimada de cierre.
- Documentos legales.
- Estado de negociación.

Métricas útiles:

- Valor total en pipeline.
- Comisión esperada.
- Ventas en negociación.
- Ventas cerradas.
- Tiempo promedio hasta cierre.
- Conversión por etapa.

---

## 7.7 Alquiler

Datos y procesos sugeridos:

- Canon mensual.
- Depósito.
- Duración del contrato.
- Fecha de inicio.
- Fecha de finalización.
- Fecha de renovación.
- Arrendador.
- Arrendatario.
- Estado de ocupación.
- Contrato de alquiler.
- Pagos o registro financiero futuro.
- Alertas de vencimiento.
- Check-in / check-out.
- Mantenimiento asociado.

Métricas útiles:

- Propiedades alquiladas.
- Propiedades disponibles para alquiler.
- Contratos próximos a vencer.
- Ingreso mensual estimado.
- Ocupación.
- Renovaciones pendientes.

---

## 7.8 Tareas, documentos y actividad

Todo proceso debe poder tener seguimiento.

Debe existir:

- Tareas asignadas.
- Fechas límite.
- Recordatorios.
- Prioridades.
- Comentarios.
- Historial de actividad.
- Próxima acción.
- Documentos asociados.
- Metadata de documentos.
- Estado de documentación completa o incompleta.

Relacionable con:

- Propiedad.
- Cliente.
- Proceso Kanban.
- Usuario.
- Venta.
- Alquiler.

---

## 7.9 Configuración

Debe permitir que SoyRE crezca sin reescribir código por cada organización.

Configurable:

- Etapas de funnel.
- Estados de propiedades.
- Tipos de propiedad.
- Roles de cliente.
- Usuarios.
- Permisos.
- Preferencias de organización.
- Moneda principal.
- Campos personalizados futuros.

---

## 8. Modelo de datos sugerido

Este modelo es guía inicial. Puede ajustarse al stack elegido, pero debe respetar relaciones principales.

```txt
organizations
users
user_profiles
roles
permissions
organization_members

properties
property_media
property_documents
property_status_history

clients
client_contacts
client_preferences
client_documents
client_interactions

pipelines
pipeline_stages
pipeline_stage_rules
pipeline_items
pipeline_item_stage_history

sales_processes
rental_processes

tasks
task_comments
notifications
activity_logs
audit_logs

custom_fields
custom_field_values
```

---

## 9. Entidades clave y relaciones

## 9.1 Property

Una propiedad puede estar relacionada con:

- Un propietario.
- Uno o varios clientes interesados.
- Un proceso de venta.
- Un proceso de alquiler.
- Tareas.
- Documentos.
- Actividad.

## 9.2 Client

Un cliente puede estar relacionado con:

- Muchas propiedades.
- Muchos procesos.
- Muchas interacciones.
- Muchos documentos.
- Distintos roles comerciales.

## 9.3 PipelineItem

Un item de pipeline debe relacionar:

- Tipo de operación.
- Cliente principal.
- Propiedad principal.
- Responsable.
- Etapa actual.
- Valor económico estimado.
- Próxima acción.

---

## 10. Fases de desarrollo

## Fase 0 — Base, auth y validación

Estado: en construcción.

Debe cubrir:

- Login.
- Registro o acceso controlado.
- Sesión.
- Validaciones base.
- Roles iniciales.
- Organización / tenant.
- Rutas protegidas.
- Layout base autenticado.

Criterio de aceptación:

- Un usuario autenticado entra a la aplicación y ve una estructura base protegida según su sesión y permisos.

---

## Fase 1 — App shell y navegación

Objetivo:

- Construir la estructura visual principal del SaaS.

Entregables:

- Sidebar.
- Topbar.
- Layout autenticado.
- Breadcrumbs.
- Rutas principales.
- Estados vacíos iniciales.
- Navegación responsive.
- Sistema visual base.

Criterio de aceptación:

- El usuario puede navegar entre Dashboard, Propiedades, Clientes, Funnel, Tareas, Documentos y Configuración, aunque algunos módulos estén todavía en estado inicial.

---

## Fase 2 — Propiedades base

Objetivo:

- Crear el primer módulo funcional de inventario.

Entregables:

- Crear propiedad.
- Editar propiedad.
- Listar propiedades.
- Ver detalle.
- Filtros por tipo, estado, operación y responsable.
- Cards visuales.
- Tabla reusable.
- Relación inicial con propietario o cliente.

Criterio de aceptación:

- El usuario puede gestionar propiedades reales y entender su estado desde lista, card y detalle.

---

## Fase 3 — Clientes centralizados

Objetivo:

- Crear el CRM base.

Entregables:

- Crear cliente.
- Editar cliente.
- Listar clientes.
- Ver detalle.
- Evitar duplicados básicos.
- Asignar roles comerciales.
- Relacionar clientes con propiedades.
- Historial inicial de interacciones.

Criterio de aceptación:

- El usuario puede mantener una base central de clientes reutilizable en venta, alquiler y procesos.

---

## Fase 4 — Funnel Kanban personalizable

Objetivo:

- Crear el módulo visual de procesos.

Entregables:

- Board Kanban.
- Columnas dinámicas.
- Drag and drop.
- Tarjetas relacionadas con cliente y propiedad.
- Configuración de etapas.
- Diferenciación inicial entre venta y alquiler.
- Historial de cambios de etapa.

Criterio de aceptación:

- El usuario puede crear un proceso, verlo en Kanban y moverlo entre etapas configurables.

---

## Fase 5 — Flujos específicos de venta y alquiler

Objetivo:

- Separar correctamente la lógica de venta y alquiler.

Entregables venta:

- Datos comerciales de venta.
- Oferta y negociación.
- Comisión estimada.
- Documentos de venta.
- Fecha estimada de cierre.

Entregables alquiler:

- Canon mensual.
- Depósito.
- Duración de contrato.
- Fechas de inicio y vencimiento.
- Estado de ocupación.
- Alertas de renovación.

Criterio de aceptación:

- Venta y alquiler comparten base visual, pero tienen datos, métricas y procesos propios.

---

## Fase 6 — Dashboards reales

Objetivo:

- Convertir el dashboard en centro de control operativo.

Entregables:

- Dashboard general con métricas reales.
- Dashboard por usuario con métricas propias.
- Gráficos básicos.
- Filtros por fecha, usuario, tipo de operación y estado.
- Alertas de tareas/documentos/procesos.
- Actividad reciente.

Criterio de aceptación:

- Un usuario puede entrar al dashboard y entender rápidamente qué requiere atención.

---

## Fase 7 — Tareas, documentos y actividad

Objetivo:

- Agregar trazabilidad y seguimiento operativo.

Entregables:

- Tareas.
- Comentarios.
- Documentos.
- Historial de actividad.
- Alertas visuales.
- Próximas acciones.

Criterio de aceptación:

- Cada propiedad, cliente y proceso puede tener seguimiento claro.

---

## Fase 8 — Configuración SaaS

Objetivo:

- Permitir que cada organización configure su operación.

Entregables:

- Configurar etapas del funnel.
- Configurar estados.
- Configurar usuarios.
- Configurar permisos.
- Configurar catálogos.
- Preparar límites por plan futuro.
- Preparar billing futuro si aplica.

Criterio de aceptación:

- La plataforma puede adaptarse a más de una empresa sin tocar código por cada operación.

---

## Fase 9 — Endurecimiento, QA y preparación productiva

Objetivo:

- Elevar la confiabilidad del sistema.

Entregables:

- Pruebas de módulos críticos.
- Validaciones de formularios.
- Control de errores.
- Auditoría de acciones críticas.
- Revisión responsive.
- Revisión de permisos.
- Optimización de queries.
- Seeds de datos demo.
- Documentación mínima de uso.

Criterio de aceptación:

- El sistema puede ser usado por usuarios reales con datos reales sin depender de intervención técnica diaria.

---

## 11. Prioridad inmediata después de auth

Cuando la base de login y validación esté lista, el orden sugerido es:

1. App shell y navegación.
2. Dashboard skeleton general y por usuario.
3. Propiedades base.
4. Clientes centralizados.
5. Funnel Kanban configurable.
6. Diferenciación venta/alquiler.
7. Dashboards con datos reales.
8. Tareas, documentos y actividad.
9. Configuración SaaS.
10. QA, permisos, auditoría y preparación productiva.

---

## 12. Checklist antes de generar código

Antes de implementar, Codex debe responder internamente:

- ¿Qué módulo estoy tocando?
- ¿Existe una capa de servicios o datos que debo usar?
- ¿Estoy respetando organización/tenant?
- ¿Estoy respetando usuario, rol y permiso?
- ¿Estoy duplicando lógica que debería ser reusable?
- ¿Estoy hardcodeando algo que debe ser configurable?
- ¿La vista tendrá loading, empty y error?
- ¿Venta y alquiler están correctamente diferenciados?
- ¿Cliente está referenciado desde CRM centralizado?
- ¿La acción debe generar activity log o audit log?

---

## 13. Checklist después de generar código

Después de implementar, Codex debe revisar:

- No hay módulos monolíticos.
- No hay etapas Kanban hardcodeadas.
- No hay estados críticos hardcodeados innecesariamente.
- No se duplican clientes.
- No se mezclan venta y alquiler sin abstracción clara.
- No hay llamadas directas a DB desde componentes visuales cuando corresponde servicio.
- Las vistas tienen loading, empty y error.
- Los formularios tienen validación.
- Las rutas están protegidas.
- Las acciones sensibles validan permisos.
- Los textos visibles están en español.
- Los nombres técnicos son claros y preferiblemente en inglés.
- Los componentes reutilizables están en rutas coherentes.
- El módulo cumple su Definition of Done.

---

## 14. Definition of Done por módulo

Un módulo se considera listo solo si cumple:

- Tiene vista principal.
- Tiene creación y edición si aplica.
- Tiene detalle si aplica.
- Tiene componentes reutilizables.
- Tiene validación de datos.
- Tiene manejo de errores.
- Tiene estado vacío.
- Tiene estado de carga.
- Respeta permisos.
- Respeta organización o tenant.
- Tiene relación clara con otros módulos.
- Tiene datos demo o seed si aplica.
- Está documentado de forma mínima.

---

## 15. Implementaciones prohibidas

No implementar:

```ts
// Prohibido: etapas fijas en UI final
const stages = ['Lead', 'Visit', 'Offer', 'Closed']
```

```ts
// Prohibido: cliente embebido como fuente principal de verdad
const property = {
  id: 'property-1',
  clientName: 'Juan Pérez',
  clientPhone: '+507...'
}
```

```ts
// Prohibido: lógica de venta y alquiler mezclada sin tipo claro
const process = {
  price: 1000,
  contractDate: '...',
  commission: 0.05
}
```

Preferir modelos explícitos:

```ts
type OperationType = 'sale' | 'rental'
```

```ts
interface PipelineItem {
  id: string
  organizationId: string
  operationType: OperationType
  clientId: string
  propertyId: string
  stageId: string
  assignedUserId: string
  estimatedValue?: number
  nextActionAt?: string
}
```

---

## 16. Convenciones de naming

- Código, archivos, tipos, servicios y variables: preferiblemente en inglés.
- Textos visibles para el usuario: español.
- Dominios técnicos sugeridos:
  - `properties`
  - `clients`
  - `pipelines`
  - `sales`
  - `rentals`
  - `tasks`
  - `documents`
  - `settings`
  - `audit`
- Evitar nombres genéricos como `data`, `stuff`, `misc`, `common` si no aportan claridad.

---

## 17. Decisiones asumidas hasta nuevo aviso

Codex debe operar con estas decisiones mientras no exista instrucción contraria:

- La aplicación debe ser multiusuario.
- Debe existir separación por organización o tenant.
- El dashboard general y el dashboard por usuario son obligatorios.
- El módulo Kanban debe ser personalizable.
- Venta y alquiler deben diferenciarse desde el diseño del dominio.
- Clientes deben gestionarse en un CRM centralizado.
- La UI debe estar en español.
- El código debe mantener nombres técnicos claros, preferiblemente en inglés.
- Los componentes deben ser reutilizables.
- La navegación visual es parte central del producto.

---

## 18. Preguntas abiertas no bloqueantes

Estas preguntas ayudan a afinar el diseño, pero no deben frenar la construcción modular inicial:

1. ¿El SaaS será por inmobiliaria/empresa con múltiples usuarios o también para agentes independientes?
2. ¿Qué roles exactos se usarán en producción desde el inicio?
3. ¿Habrá planes de suscripción desde la primera versión productiva?
4. ¿Qué moneda principal se usará inicialmente?
5. ¿Qué país o mercado se tomará como base legal y comercial inicial?
6. ¿Se integrarán calendarios, WhatsApp, email o portales inmobiliarios en fases posteriores?
7. ¿Las propiedades pueden estar simultáneamente en venta y alquiler?
8. ¿El funnel debe poder configurarse por usuario, por equipo, por organización o por tipo de operación?

---

## 19. Norte técnico y de producto

Cada decisión técnica debe responder:

> ¿Esto ayuda a que el usuario entienda, gestione y cierre mejor sus operaciones inmobiliarias?

Si la respuesta es no, se debe replantear la implementación.
