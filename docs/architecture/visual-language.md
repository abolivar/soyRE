# Lenguaje Visual SoyPMS

Este documento fija el brief visual operativo de SoyPMS. Se consulta junto con `CODEX.md`, `design.md` y `docs/architecture/design-system.md` antes de construir o ajustar pantallas.

## Principio

Convención donde ayuda la predictibilidad. Personalidad donde se gana el derecho a tenerla.

Las pantallas operativas deben ser rápidas de reconocer y usar. Login, onboarding, wizards y estados vacíos son los momentos donde el producto puede expresar más marca sin afectar velocidad.

## Color

- Teal es el único acento con carga de marca: `#1A9E8F`, fuerte `#0D6B61`, suave `#D0F0EC`.
- El teal se usa en acción primaria, foco, enlaces y en el único dato realmente activo de una pantalla.
- El resto de la interfaz es neutra, salvo urgencias reales.
- Venta, alquiler y destacada se usan solo para etiquetar tipo de operación inmobiliaria.
- El teal oscuro `#0D3F38` es la superficie de marca para sidebar, login y onboarding.

## Tipografía

Solo hay tres niveles de peso:

- `400`: cuerpo, valores de input y descripciones.
- `500`: etiquetas, enlaces y acciones secundarias.
- `600-700`: titular de página y acción primaria.

No se usa `800/850` como peso por defecto.

## Forma

- `8px` es el radio base para botones, inputs, cards y paneles.
- Las píldoras completas se reservan para badges de estado o tags semánticos.

## Copy

- La interfaz visible está en español correcto y con acentos.
- No se muestran mensajes técnicos crudos al usuario final.
- No se usa lenguaje interno como `backend`, `wizard`, `dry run`, `jobs` o nombres de eventos.
- El usuario ve lenguaje operativo: borrador, revisión, vista previa, acciones programadas, validación.
- Fechas visibles se formatean como `dd/mm/aaaa`.

## Revelación Progresiva

- Los paneles de resumen muestran solo información que ya es cierta.
- Los contadores de errores y avisos aparecen cuando el usuario intenta avanzar o validar.
- No se llena la pantalla inicial con ceros, pendientes o errores prematuros.

## Componentes

- Un patrón de interacción se resuelve una vez y se reutiliza.
- Para elecciones binarias o múltiples, usar una tarjeta seleccionable con tinte teal y check, no checkboxes nativos sin estado visual.
- Las primitivas reutilizables viven en `packages/ui`.

## No Hacer

- No aplicar el mismo peso fuerte a varios elementos de la misma pantalla.
- No usar el ícono de chispa para nada que no sea IA real.
- No dejar contenido por defecto que parezca dato real.
- No duplicar el mismo dato en dos lugares de la misma pantalla.
- No inventar colores decorativos por tarjeta.
