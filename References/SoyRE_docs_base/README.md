# SoyRE

SoyRE es un **SaaS inmobiliario** para gestionar propiedades, clientes, procesos comerciales, alquileres, ventas, tareas, documentos y métricas operativas desde una experiencia visual, clara y modular.

Este repositorio no debe tratarse como un prototipo desechable. La intención es construir una plataforma funcional, mantenible y escalable, preparada para usuarios reales, organizaciones, roles, permisos y crecimiento por módulos.

---

## Documentos principales

| Documento | Uso |
| --- | --- |
| `README.md` | Guía humana del producto, módulos, fases y visión general. |
| `CODEX.md` | Reglas obligatorias para Codex y cualquier asistente de desarrollo antes de crear o modificar código. |

> Para decisiones técnicas, implementación o generación de código, **Codex debe consultar primero `CODEX.md`**.

---

## Propósito del producto

SoyRE debe funcionar como un **centro de control inmobiliario**.

El usuario debe poder entender rápidamente:

- Qué propiedades existen.
- En qué estado está cada propiedad.
- Qué clientes están relacionados con cada operación.
- En qué etapa está cada venta o alquiler.
- Qué tareas, documentos o alertas requieren atención.
- Qué ocurre a nivel individual y a nivel general de la organización.

---

## Principios del producto

### 1. SaaS completo, no MVP desechable

Cada módulo debe diseñarse pensando en:

- Multiusuario.
- Organización o tenant.
- Roles y permisos.
- Escalabilidad funcional.
- Datos trazables.
- Componentes reutilizables.
- Mantenimiento a largo plazo.

### 2. Modularidad desde el inicio

SoyRE debe crecer por dominios claros:

- Autenticación.
- Dashboard.
- Propiedades.
- Clientes.
- Funnel / pipeline.
- Ventas.
- Alquileres.
- Tareas.
- Documentos.
- Configuración.
- Auditoría.

### 3. Experiencia visual y navegable

La interfaz debe ayudar al usuario a moverse rápido y entender estados sin fricción. Los componentes visuales no son decoración: son parte del valor central del producto.

---

## Módulos principales

## Dashboard general

Vista de control global para administradores, owners, managers o usuarios autorizados.

Debe permitir ver rápidamente:

- Total de propiedades.
- Propiedades activas.
- Propiedades en venta.
- Propiedades en alquiler.
- Propiedades reservadas, vendidas o alquiladas.
- Clientes activos.
- Leads nuevos.
- Procesos abiertos por etapa.
- Tareas pendientes.
- Documentación incompleta.
- Actividad reciente.

Debe incluir cards, filtros, gráficos simples, accesos rápidos y alertas visuales.

---

## Dashboard por usuario

Cada usuario debe tener un dashboard propio.

Debe mostrar:

- Mis propiedades asignadas.
- Mis clientes activos.
- Mis procesos abiertos.
- Mis tareas pendientes.
- Mis próximas visitas.
- Mis cierres esperados.
- Alertas personales.
- Actividad reciente propia.

El dashboard por usuario **no reemplaza** el dashboard general. Ambos son obligatorios y tienen responsabilidades distintas.

---

## Propiedades

El módulo de propiedades es uno de los centros del sistema.

Debe permitir:

- Crear propiedades.
- Editar propiedades.
- Listar propiedades.
- Ver detalle de propiedad.
- Filtrar por tipo, estado, operación, ubicación y responsable.
- Visualizar propiedades en tabla y cards.
- Relacionar propiedades con clientes, ventas, alquileres, tareas y documentos.

Datos base sugeridos:

- Código interno.
- Título comercial.
- Tipo de propiedad.
- Dirección, ciudad y zona.
- Metraje.
- Habitaciones, baños y estacionamientos.
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

---

## Clientes / CRM centralizado

Los clientes deben vivir en un módulo central, no duplicados dentro de propiedades o procesos.

Un cliente puede ser:

- Comprador.
- Vendedor.
- Arrendador.
- Arrendatario.
- Lead.
- Inversionista.
- Referidor.
- Contacto relacionado.

El CRM debe permitir:

- Crear y editar clientes.
- Evitar duplicados por email, teléfono o documento.
- Asignar roles comerciales.
- Registrar preferencias.
- Relacionar clientes con propiedades y procesos.
- Consultar historial de interacciones.

---

## Funnel tipo Kanban

SoyRE debe tener un módulo visual tipo Kanban para manejar procesos comerciales.

Requisitos clave:

- Etapas personalizables.
- Drag and drop entre etapas.
- Configuración por tipo de operación.
- Diferenciación entre venta y alquiler.
- Relación con cliente.
- Relación con propiedad.
- Responsable asignado.
- Fechas importantes.
- Historial de cambios de etapa.
- Métricas por etapa.

Las etapas del funnel **no deben quedar fijas en código**. Deben venir de configuración, base de datos o fuente dinámica equivalente.

---

## Venta

El flujo de venta debe tener lógica propia.

Debe contemplar:

- Precio de venta.
- Comisión esperada.
- Cliente comprador.
- Cliente vendedor.
- Oferta.
- Contraoferta.
- Financiamiento.
- Promesa de compraventa.
- Escritura.
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

## Alquiler

El flujo de alquiler debe tener lógica propia y separada de venta.

Debe contemplar:

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

## Tareas, documentos y actividad

Cada propiedad, cliente y proceso debe poder tener seguimiento.

Debe existir manejo de:

- Tareas asignadas.
- Fechas límite.
- Recordatorios.
- Prioridades.
- Comentarios.
- Historial de actividad.
- Próxima acción.
- Documentos asociados.
- Estados de documentación completa o incompleta.

---

## Configuración SaaS

La plataforma debe poder adaptarse a distintas organizaciones sin tocar código.

Configuraciones esperadas:

- Etapas de funnel.
- Estados de propiedades.
- Tipos de propiedad.
- Roles de cliente.
- Usuarios y permisos.
- Preferencias de organización.
- Moneda principal.
- Campos personalizados futuros.

---

## Navegación principal sugerida

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

Elementos visuales esperados:

- Sidebar.
- Topbar.
- Breadcrumbs.
- Header de página.
- Acciones rápidas.
- Buscador global futuro.
- Indicadores visuales de estado.

---

## Componentes visuales reutilizables

Componentes sugeridos para construir una UI consistente:

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

---

## Fases de desarrollo

## Fase 0 — Base, auth y validación

Estado actual: en construcción.

Debe cubrir login, sesión, roles iniciales, organización/tenant, rutas protegidas y layout base autenticado.

## Fase 1 — App shell y navegación

Construir sidebar, topbar, layout autenticado, breadcrumbs, rutas principales y estados vacíos iniciales.

## Fase 2 — Propiedades base

Crear el primer módulo funcional de inventario inmobiliario.

## Fase 3 — Clientes centralizados

Crear CRM base y relaciones con propiedades/procesos.

## Fase 4 — Funnel Kanban personalizable

Crear board Kanban con columnas dinámicas, drag and drop y configuración de etapas.

## Fase 5 — Flujos específicos de venta y alquiler

Separar correctamente lógica, campos, documentos, métricas y reglas de venta y alquiler.

## Fase 6 — Dashboards reales

Conectar dashboard general y dashboard por usuario con métricas reales.

## Fase 7 — Tareas, documentos y actividad

Agregar trazabilidad operativa y seguimiento.

## Fase 8 — Configuración SaaS

Permitir configuración por organización: etapas, estados, usuarios, permisos y catálogos.

## Fase 9 — QA y preparación productiva

Reforzar permisos, errores, auditoría, responsive, seeds, pruebas y documentación mínima.

---

## Decisiones asumidas hasta nuevo aviso

- La aplicación será multiusuario.
- Debe existir separación por organización o tenant.
- El dashboard general y el dashboard por usuario son obligatorios.
- El Kanban debe ser personalizable.
- Venta y alquiler deben diferenciarse desde el dominio.
- Clientes deben gestionarse en un CRM centralizado.
- La UI debe estar en español.
- Los nombres técnicos del código deben preferirse en inglés.
- Los componentes deben ser reutilizables.
- La navegación visual es parte central del producto.

---

## Preguntas abiertas no bloqueantes

Estas preguntas ayudan a afinar el producto, pero no deben detener la construcción modular inicial.

1. ¿El SaaS será por inmobiliaria/empresa con múltiples usuarios o también para agentes independientes?
2. ¿Qué roles exactos se usarán en producción desde el inicio?
3. ¿Habrá planes de suscripción desde la primera versión productiva?
4. ¿Qué moneda principal se usará inicialmente?
5. ¿Qué país o mercado se tomará como base legal y comercial inicial?
6. ¿Se integrarán calendarios, WhatsApp, email o portales inmobiliarios en fases posteriores?
7. ¿Las propiedades pueden estar simultáneamente en venta y alquiler?
8. ¿El funnel debe configurarse por usuario, equipo, organización o tipo de operación?

---

## Norte del producto

SoyRE debe sentirse como un centro de control inmobiliario: visual, claro, rápido y confiable.

Cada decisión debe responder a esta pregunta:

> ¿Esto ayuda a que el usuario entienda, gestione y cierre mejor sus operaciones inmobiliarias?
