# SoyRE — README Operativo para Codex

> **Documento de consulta obligatoria antes de modificar el código.**  
> SoyRE no se está construyendo como un MVP desechable. Se está construyendo como un **SaaS inmobiliario funcional, modular, escalable y mantenible**.

---

## 1. Propósito del producto

SoyRE es una plataforma SaaS para gestionar operaciones inmobiliarias de forma centralizada. El sistema debe permitir administrar propiedades, clientes, procesos comerciales, alquileres, ventas, tareas, documentos, métricas y estados operativos desde una experiencia clara y visual.

La prioridad del producto es que un usuario pueda entender rápidamente:

- Qué propiedades existen.
- En qué estado está cada propiedad.
- Qué clientes están relacionados con cada operación.
- En qué etapa del proceso está una venta o alquiler.
- Qué tareas, alertas o acciones están pendientes.
- Qué está pasando a nivel individual y a nivel general.

---

## 2. Principios no negociables

### 2.1 Esto es un SaaS completo

No se debe desarrollar con mentalidad de demo o MVP temporal. Cada módulo debe diseñarse pensando en:

- Multiusuario.
- Organización o cuenta empresarial.
- Roles y permisos.
- Escalabilidad funcional.
- Componentes reutilizables.
- Datos auditables.
- Crecimiento por módulos.

### 2.2 Arquitectura modular

Cada dominio debe estar separado de forma clara. No mezclar lógica de propiedades, clientes, procesos, dashboards y configuración en componentes gigantes.

Cada módulo debe tener, como mínimo:

- Tipos o interfaces.
- Validaciones.
- Servicios o capa de acceso a datos.
- Componentes reutilizables.
- Vistas o páginas.
- Estados de carga, vacío y error.
- Criterios mínimos de prueba.

### 2.3 Código reusable antes que código repetido

Si una vista necesita cards, tablas, badges, filtros, formularios, drawers, modales, timelines o estados visuales, se deben crear componentes reutilizables.

No duplicar lógica de:

- Estados de propiedades.
- Etapas de funnel.
- Filtros.
- Formularios base.
- Validaciones.
- Permisos.
- Relaciones cliente-propiedad.

### 2.4 Las etapas del funnel nunca deben estar hardcodeadas

El sistema debe permitir configurar los pasos de los procesos. El funnel tipo Kanban debe ser personalizable por organización, equipo o tipo de operación.

No crear lógica fija como:

```ts
const stages = ['Nuevo', 'Contactado', 'Visita', 'Oferta', 'Cierre']
```

Las etapas deben venir de configuración, base de datos o una fuente dinámica equivalente.

### 2.5 Venta y alquiler son flujos diferentes

Venta y alquiler pueden compartir propiedades, clientes y componentes visuales, pero no deben tratarse como si fueran exactamente el mismo proceso.

El sistema debe contemplar variaciones de:

- Campos.
- Estados.
- Métricas.
- Contratos.
- Fechas.
- Responsables.
- Documentos.
- Comisiones.
- Alertas.
- Reglas de negocio.

### 2.6 Cliente centralizado

El cliente no debe vivir duplicado dentro de cada propiedad o proceso. Debe existir un módulo central de clientes reutilizable por todo el sistema.

Un mismo cliente puede ser:

- Comprador.
- Vendedor.
- Arrendador.
- Arrendatario.
- Lead.
- Inversionista.
- Contacto relacionado.

---

## 3. Estado actual del desarrollo

La fase de autenticación, login, validación y estructura base de acceso se considera **Fase 0** y está en construcción.

Codex debe asumir que las siguientes fases se construyen encima de esa base, respetando:

- Sesión de usuario.
- Roles.
- Permisos.
- Organización o tenant.
- Validaciones de acceso.
- Separación entre datos propios, datos del equipo y datos generales.

---

## 4. Estructura general esperada

La estructura exacta puede variar según el stack, pero la intención modular debe respetarse.

```txt
src/
  app/ o pages/
    dashboard/
    properties/
    clients/
    pipelines/
    tasks/
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

## 5. Módulos principales

## 5.1 Dashboard general

Debe existir un dashboard general para visualizar el estado global de la operación.

### Objetivo

Permitir que un administrador, dueño de cuenta, gerente o usuario autorizado vea rápidamente cómo está el negocio.

### Debe mostrar

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

### Requisitos visuales

- Cards de métricas.
- Gráficos simples.
- Filtros por fecha, usuario, equipo, tipo de operación y estado.
- Accesos rápidos a propiedades, clientes y funnel.
- Estados vacíos bien diseñados.

---

## 5.2 Dashboard por usuario

Cada usuario debe tener un dashboard propio.

### Objetivo

Permitir que cada asesor, agente o miembro del equipo vea sus propiedades, clientes, tareas y procesos asignados.

### Debe mostrar

- Mis propiedades asignadas.
- Mis clientes activos.
- Mis procesos abiertos.
- Mis tareas pendientes.
- Mis próximas visitas.
- Mis cierres esperados.
- Actividad reciente propia.
- Alertas personales.

### Regla clave

El dashboard por usuario no reemplaza al dashboard general. Ambos deben existir y tener responsabilidades distintas.

---

## 5.3 Propiedades

El módulo de propiedades es uno de los centros del sistema.

### Objetivo

Gestionar el inventario inmobiliario de forma clara, filtrable y reutilizable por los flujos de venta y alquiler.

### Datos base sugeridos

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

### Estados sugeridos

Los estados deben poder evolucionar. No deben quedar rígidos en el código.

Ejemplos:

- Borrador.
- Disponible.
- En promoción.
- En negociación.
- Reservada.
- Alquilada.
- Vendida.
- Pausada.
- Inactiva.

### Vistas necesarias

- Lista de propiedades.
- Vista tipo cards.
- Detalle de propiedad.
- Crear propiedad.
- Editar propiedad.
- Filtros avanzados.
- Historial de actividad.
- Relación con clientes.
- Relación con procesos.

---

## 5.4 Clientes / CRM centralizado

El módulo de clientes debe ser centralizado.

### Objetivo

Evitar duplicidad y permitir trazabilidad completa de cada persona o empresa relacionada con operaciones inmobiliarias.

### Datos base sugeridos

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

### Roles comerciales posibles

- Comprador.
- Vendedor.
- Arrendador.
- Arrendatario.
- Lead.
- Inversionista.
- Referidor.

### Reglas

- No duplicar clientes si ya existen por email, teléfono o documento.
- Un cliente puede estar relacionado con múltiples propiedades.
- Un cliente puede estar relacionado con múltiples procesos.
- Las interacciones deben quedar registradas.

---

## 5.5 Funnel tipo Kanban

Debe existir un módulo visual tipo Kanban para representar procesos comerciales.

### Objetivo

Permitir que el equipo gestione oportunidades, ventas, alquileres y procesos internos mediante etapas configurables.

### Requisitos no negociables

- Etapas personalizables.
- Drag and drop entre etapas.
- Configuración por tipo de operación.
- Diferenciación entre funnel de venta y funnel de alquiler.
- Asignación de responsable.
- Relación con cliente.
- Relación con propiedad.
- Fechas importantes.
- Registro de cambios de etapa.
- Métricas por etapa.

### Cada tarjeta del Kanban debe poder mostrar

- Cliente principal.
- Propiedad relacionada.
- Tipo de operación: venta o alquiler.
- Valor estimado.
- Responsable.
- Próxima acción.
- Fecha de última actividad.
- Prioridad o alerta visual.

### Configuración de etapas

Las etapas deben poder:

- Crearse.
- Renombrarse.
- Reordenarse.
- Activarse o desactivarse.
- Asociarse a venta, alquiler o ambos.
- Tener campos requeridos.
- Tener reglas de avance.

---

## 5.6 Venta

El flujo de venta debe tener lógica propia.

### Datos y procesos sugeridos

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

### Métricas útiles

- Valor total en pipeline.
- Comisión esperada.
- Ventas en negociación.
- Ventas cerradas.
- Tiempo promedio hasta cierre.
- Conversión por etapa.

---

## 5.7 Alquiler

El flujo de alquiler debe tener lógica propia.

### Datos y procesos sugeridos

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

### Métricas útiles

- Propiedades alquiladas.
- Propiedades disponibles para alquiler.
- Contratos próximos a vencer.
- Ingreso mensual estimado.
- Ocupación.
- Renovaciones pendientes.

---

## 5.8 Tareas, actividad y seguimiento

Todo proceso debe poder tener seguimiento.

### Debe existir

- Tareas asignadas.
- Fechas límite.
- Recordatorios.
- Prioridades.
- Comentarios.
- Historial de actividad.
- Próxima acción.

### Relacionable con

- Propiedad.
- Cliente.
- Proceso Kanban.
- Usuario.

---

## 5.9 Documentos

El sistema debe permitir asociar documentos a entidades clave.

### Documentos relacionados con

- Propiedades.
- Clientes.
- Ventas.
- Alquileres.
- Contratos.

### Reglas

- Debe existir estado de documentación completa o incompleta.
- El dashboard debe poder alertar documentación pendiente.
- Los documentos deben tener metadata mínima: nombre, tipo, fecha, entidad relacionada y usuario que lo cargó.

---

## 5.10 Configuración

Debe existir una base de configuración para que el sistema pueda crecer sin reescribir código.

### Configuraciones necesarias

- Etapas de funnel.
- Estados de propiedades.
- Tipos de propiedad.
- Roles de cliente.
- Usuarios y permisos.
- Preferencias de organización.
- Moneda principal.
- Campos personalizados futuros.

---

## 6. Modelo de datos sugerido

Este modelo es una guía inicial. Codex puede ajustarlo si el stack o la base de datos lo exige, pero debe respetar las relaciones principales.

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

## 7. Entidades clave y relaciones

### Property

Una propiedad puede estar relacionada con:

- Un propietario.
- Uno o varios clientes interesados.
- Un proceso de venta.
- Un proceso de alquiler.
- Tareas.
- Documentos.
- Actividad.

### Client

Un cliente puede estar relacionado con:

- Muchas propiedades.
- Muchos procesos.
- Muchas interacciones.
- Muchos documentos.
- Distintos roles comerciales.

### PipelineItem

Un item de pipeline debe relacionar:

- Tipo de operación.
- Cliente principal.
- Propiedad principal.
- Responsable.
- Etapa actual.
- Valor económico estimado.
- Próxima acción.

---

## 8. Navegación y experiencia visual

El sistema debe ser fácil de navegar. Los elementos gráficos no son accesorios; son parte central de la experiencia.

### Layout mínimo esperado

- Sidebar principal.
- Topbar.
- Breadcrumbs.
- Header de página.
- Acciones rápidas.
- Buscador global futuro.
- Indicadores visuales de estado.

### Navegación principal sugerida

```txt
Dashboard
Propiedades
Clientes
Funnel
Tareas
Documentos
Reportes
Configuración
```

### Componentes visuales reutilizables

- MetricCard.
- StatusBadge.
- PropertyCard.
- ClientCard.
- PipelineCard.
- KanbanBoard.
- KanbanColumn.
- DataTable.
- FilterBar.
- SearchInput.
- PageHeader.
- EmptyState.
- LoadingState.
- ErrorState.
- ActivityTimeline.
- DocumentList.
- TaskList.
- UserAvatar.
- ConfirmDialog.
- FormDrawer.

---

## 9. Reglas de permisos

Todo módulo debe estar preparado para permisos.

### Roles iniciales sugeridos

- Owner.
- Admin.
- Manager.
- Agent.
- Viewer.

### Reglas generales

- Un usuario no debe ver datos de otra organización.
- Un agente puede ver lo asignado a él, salvo permiso ampliado.
- Un manager puede ver información de su equipo.
- Un admin puede configurar catálogos y etapas.
- El owner puede administrar la cuenta completa.

---

## 10. Fases de desarrollo

## Fase 0 — Base, auth y validación

**Estado:** en construcción.

Debe cubrir:

- Login.
- Registro o acceso controlado.
- Sesión.
- Validaciones base.
- Roles iniciales.
- Organización / tenant.
- Rutas protegidas.
- Layout base autenticado.

### Criterio de aceptación

Un usuario autenticado entra a la aplicación y ve una estructura base protegida según su sesión y permisos.

---

## Fase 1 — App shell y navegación

### Objetivo

Construir la estructura visual principal del SaaS.

### Entregables

- Sidebar.
- Topbar.
- Layout autenticado.
- Breadcrumbs.
- Rutas principales.
- Estados vacíos iniciales.
- Navegación responsive.
- Sistema visual base.

### Criterio de aceptación

El usuario puede navegar entre Dashboard, Propiedades, Clientes, Funnel, Tareas, Documentos y Configuración aunque algunos módulos estén todavía en estado inicial.

---

## Fase 2 — Propiedades base

### Objetivo

Crear el primer módulo funcional de inventario.

### Entregables

- Crear propiedad.
- Editar propiedad.
- Listar propiedades.
- Ver detalle.
- Filtros por tipo, estado, operación y responsable.
- Cards visuales.
- Tabla reusable.
- Relación inicial con propietario o cliente.

### Criterio de aceptación

El usuario puede gestionar propiedades reales y entender su estado desde lista, card y detalle.

---

## Fase 3 — Clientes centralizados

### Objetivo

Crear el CRM base.

### Entregables

- Crear cliente.
- Editar cliente.
- Listar clientes.
- Ver detalle.
- Evitar duplicados básicos.
- Asignar roles comerciales.
- Relacionar clientes con propiedades.
- Historial inicial de interacciones.

### Criterio de aceptación

El usuario puede mantener una base central de clientes reutilizable en venta, alquiler y procesos.

---

## Fase 4 — Funnel Kanban personalizable

### Objetivo

Crear el módulo visual de procesos.

### Entregables

- Board Kanban.
- Columnas dinámicas.
- Drag and drop.
- Tarjetas relacionadas con cliente y propiedad.
- Configuración de etapas.
- Diferenciación inicial entre venta y alquiler.
- Historial de cambios de etapa.

### Criterio de aceptación

El usuario puede crear un proceso, verlo en Kanban y moverlo entre etapas configurables.

---

## Fase 5 — Flujos específicos de venta y alquiler

### Objetivo

Separar correctamente la lógica de venta y alquiler.

### Entregables venta

- Datos comerciales de venta.
- Oferta y negociación.
- Comisión estimada.
- Documentos de venta.
- Fecha estimada de cierre.

### Entregables alquiler

- Canon mensual.
- Depósito.
- Duración de contrato.
- Fechas de inicio y vencimiento.
- Estado de ocupación.
- Alertas de renovación.

### Criterio de aceptación

Venta y alquiler comparten base visual, pero tienen datos, métricas y procesos propios.

---

## Fase 6 — Dashboards reales

### Objetivo

Convertir el dashboard en centro de control operativo.

### Entregables

- Dashboard general con métricas reales.
- Dashboard por usuario con métricas propias.
- Gráficos básicos.
- Filtros por fecha, usuario, tipo de operación y estado.
- Alertas de tareas/documentos/procesos.
- Actividad reciente.

### Criterio de aceptación

Un usuario puede entrar al dashboard y entender rápidamente qué requiere atención.

---

## Fase 7 — Tareas, documentos y actividad

### Objetivo

Agregar trazabilidad y seguimiento operativo.

### Entregables

- Tareas.
- Comentarios.
- Documentos.
- Historial de actividad.
- Alertas visuales.
- Próximas acciones.

### Criterio de aceptación

Cada propiedad, cliente y proceso puede tener seguimiento claro.

---

## Fase 8 — Configuración SaaS

### Objetivo

Permitir que cada organización configure su operación.

### Entregables

- Configurar etapas del funnel.
- Configurar estados.
- Configurar usuarios.
- Configurar permisos.
- Configurar catálogos.
- Preparar límites por plan futuro.
- Preparar billing futuro si aplica.

### Criterio de aceptación

La plataforma puede adaptarse a más de una empresa sin tocar código por cada operación.

---

## Fase 9 — Endurecimiento, QA y preparación productiva

### Objetivo

Elevar la confiabilidad del sistema.

### Entregables

- Pruebas de módulos críticos.
- Validaciones de formularios.
- Control de errores.
- Auditoría de acciones críticas.
- Revisión responsive.
- Revisión de permisos.
- Optimización de queries.
- Seeds de datos demo.
- Documentación mínima de uso.

### Criterio de aceptación

El sistema puede ser usado por usuarios reales con datos reales sin depender de intervención técnica diaria.

---

## 11. Reglas obligatorias para Codex

1. Leer este README antes de generar o modificar código.
2. No crear módulos monolíticos.
3. No hardcodear etapas del Kanban.
4. No hardcodear estados críticos de negocio si deben ser configurables.
5. No duplicar clientes por propiedad o proceso.
6. No mezclar lógica de venta y alquiler sin una abstracción clara.
7. No hacer llamadas directas a base de datos desde componentes visuales si existe o debe existir capa de servicio.
8. No crear vistas sin estados de loading, empty y error.
9. No crear componentes que solo sirvan para una pantalla si pueden ser reutilizables.
10. Todo módulo debe respetar organización, usuario, permisos y ownership de datos.
11. Toda acción crítica debe poder auditarse o dejar actividad.
12. Las rutas deben protegerse según sesión y permisos.
13. La interfaz debe mantenerse clara, visual y navegable.
14. Los nombres de código deben preferirse en inglés; los textos visibles para el usuario deben estar en español salvo decisión contraria.
15. Cada fase debe quedar funcional antes de avanzar a la siguiente.

---

## 12. Definition of Done por módulo

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

## 13. Prioridad inmediata después de auth

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

## 14. Decisiones asumidas hasta nuevo aviso

Estas decisiones pueden cambiar, pero Codex debe usarlas como base mientras no exista una instrucción contraria.

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

## 15. Preguntas abiertas no bloqueantes

Estas preguntas ayudan a afinar el diseño, pero no deben frenar la construcción modular inicial.

1. ¿El SaaS será por inmobiliaria/empresa con múltiples usuarios o también para agentes independientes?
2. ¿Qué roles exactos se usarán en producción desde el inicio?
3. ¿Habrá planes de suscripción desde la primera versión productiva?
4. ¿Qué moneda principal se usará inicialmente?
5. ¿Qué país o mercado se tomará como base legal y comercial inicial?
6. ¿Se integrarán calendarios, WhatsApp, email o portales inmobiliarios en fases posteriores?
7. ¿Las propiedades pueden estar simultáneamente en venta y alquiler?
8. ¿El funnel debe poder configurarse por usuario, por equipo, por organización o por tipo de operación?

---

## 16. Norte del producto

SoyRE debe sentirse como un centro de control inmobiliario: visual, claro, rápido y confiable.

Cada decisión técnica debe responder a esta pregunta:

> ¿Esto ayuda a que el usuario entienda, gestione y cierre mejor sus operaciones inmobiliarias?

Si la respuesta es no, debe replantearse.
