# Guía De Alpha Testing Guiado

## Objetivo

Esta guía permite que una persona pruebe SoyPMS de punta a punta como usuario
real, entienda por qué existe cada prueba, sepa qué resultado debe obtener y
deje en GitHub evidencia suficiente para que el equipo pueda reproducir,
corregir y volver a verificar cada hallazgo.

La corrida principal cubre el flujo disponible hoy:

1. Acceso, organización y sesión.
2. Usuarios, roles y permisos.
3. Cliente y documento de identidad.
4. Propiedad, agente, documento y mandato.
5. Preparación comercial, visita y oferta.
6. Negocio, pagos y comisiones.
7. Tareas, funnel, finanzas, reportes y auditoría.
8. Aislamiento, responsive, mensajes y cierre de sesión.

Esta es una prueba manual guiada. No reemplaza las pruebas automatizadas ni los
protocolos adversariales especializados.

---

## Reglas Del Juego

Estas reglas son obligatorias durante toda la corrida.

### 1. Prueba Como Usuario, Documenta Como Investigador

- Sigue los casos en el orden indicado. El resultado de una fase alimenta la
  siguiente.
- Usa la interfaz visible siempre que la acción exista en la UI.
- No corrijas silenciosamente un dato inesperado. Primero toma evidencia y
  registra qué ocurrió.
- No repitas una acción de guardar o confirmar por impaciencia. Si tarda, espera
  hasta 15 segundos, toma evidencia y revisa la pestaña `Network` antes de
  intentarlo otra vez.
- No inventes que una prueba pasó. Si no pudiste ejecutarla, márcala
  `BLOQUEADA` y explica la causa.
- Un mensaje confuso, un dato perdido o una acción sin feedback también es un
  hallazgo, aunque el flujo pueda continuar.

### 2. Una Corrida, Un Identificador

Antes de empezar crea un identificador:

```text
ALPHA-<AAAAMMDD>-<INICIALES>-<NÚMERO>
```

Ejemplo:

```text
ALPHA-20260722-DB-01
```

Usa ese identificador en la organización, clientes, propiedad, agentes,
negocio, capturas y títulos de GitHub. No reutilices datos de otra corrida.

### 3. No Uses Datos Reales Ni Publiques Secretos

- Usa personas, correos, teléfonos, documentos e imágenes ficticias aprobadas
  para QA.
- Nunca publiques contraseñas, cookies, tokens, claves, encabezados
  `Authorization`, referencias privadas de proveedores ni documentos reales.
- Antes de subir una captura, revisa que no muestre datos personales o secretos.
- Si una respuesta de red contiene un secreto, copia solo los campos necesarios
  y reemplaza el valor sensible por `[REDACTADO]`.
- No incluyas un archivo HAR completo en GitHub sin sanearlo.

### 4. Registra El Resultado En El Momento

Cada caso debe terminar con uno de estos estados:

| Estado         | Uso                                                                   |
| -------------- | --------------------------------------------------------------------- |
| `PASA`         | El resultado observado coincide completamente con el esperado.        |
| `FALLA`        | Existe una diferencia reproducible entre lo esperado y lo observado.  |
| `BLOQUEADA`    | No se puede ejecutar por ambiente, credenciales o dependencia previa. |
| `NO EJECUTADA` | Quedó fuera de la corrida; requiere justificación.                    |

No uses `PASA` si existe una observación pendiente. Si la diferencia no rompe el
flujo, el caso sigue siendo `FALLA` y el issue puede ser P2 o P3.

### 5. Un Defecto, Un Issue

- Crea un issue separado por cada comportamiento con una causa o corrección
  potencialmente distinta.
- No mezcles, por ejemplo, un cálculo incorrecto de comisión con un botón
  desalineado.
- Si el mismo defecto aparece en varios casos, crea un solo issue y agrega todos
  los casos afectados.
- Busca primero si ya existe. Si es duplicado, no abras otro: comenta nueva
  evidencia en el issue existente y enlázalo desde la corrida.
- Una sugerencia de producto no es un bug. Regístrala como `enhancement`.
- Una duda sobre el resultado esperado no es un bug. Regístrala como
  `question`.

### 6. Conserva El Estado Que Ayuda A Reproducir

- No borres el registro que produjo el defecto.
- No retires ni reemplaces la evidencia hasta que el equipo confirme que ya no
  la necesita.
- Si debes continuar con datos nuevos, crea otro registro con sufijo `-R2`,
  `-R3`, etc.
- Anota cualquier workaround usado. Una prueba que solo pasa con workaround no
  se considera aprobada.

### 7. Detente Ante Un P0

Detén la fase afectada y avisa de inmediato si ocurre cualquiera de estos casos:

- Datos visibles o modificables entre organizaciones.
- Contraseñas, cookies, tokens o documentos privados expuestos.
- Montos de pagos o comisiones incorrectos después de confirmar.
- Duplicación de negocio, cobro, comisión o entidad financiera.
- Pérdida o corrupción de datos ya confirmados.
- Imposibilidad general de registrarse, iniciar sesión o confirmar un negocio
  válido.

Solo continúa con fases no relacionadas cuando el coordinador de la prueba lo
autorice.

### 8. No Pruebes Como Bug Lo Que Está Fuera Del Alpha

No son parte de esta corrida:

- Publicación real en portales externos.
- Firma electrónica avanzada.
- Marketplace público o app móvil nativa.
- Contabilidad completa o movimiento bancario real.
- Edición persistente de moneda y zona horaria desde `Configuración`.
- Acceso a `Backoffice` sin ser administrador de plataforma.

Si una pantalla promete explícitamente una de estas capacidades y permite
intentar usarla como si estuviera disponible, registra la inconsistencia como
hallazgo de producto.

---

## Cómo Documentar La Corrida En GitHub

Repositorio:
[abolivar/soyRE](https://github.com/abolivar/soyRE)

### Issue Maestro De La Corrida

Antes de abrir SoyPMS, crea un issue maestro con este título:

```text
[ALPHA][ALPHA-AAAAMMDD-XX-01] Corrida guiada completa
```

Usa esta plantilla:

```markdown
## Identificación

- Run ID: `ALPHA-AAAAMMDD-XX-01`
- Tester:
- Fecha y hora de inicio:
- Fecha y hora de cierre:
- Entorno:
- URL:
- Versión o commit informado:
- Navegador y versión:
- Sistema operativo:
- Viewport escritorio:
- Viewport móvil:
- Organización creada:
- Roles utilizados:

## Alcance

- [ ] Acceso y sesión
- [ ] Usuarios y permisos
- [ ] Cliente e identidad
- [ ] Propiedad y agente
- [ ] Documento y mandato
- [ ] Publicación, visita y oferta
- [ ] Negocio
- [ ] Pagos y comisiones
- [ ] Tareas, funnel y finanzas
- [ ] Reportes y auditoría
- [ ] Aislamiento y responsive

## Resultado Por Caso

| Caso  | Estado       | Issue o evidencia | Nota |
| ----- | ------------ | ----------------- | ---- |
| GA-01 | NO EJECUTADA |                   |      |
| GA-02 | NO EJECUTADA |                   |      |
| GA-03 | NO EJECUTADA |                   |      |
| GA-04 | NO EJECUTADA |                   |      |
| GA-05 | NO EJECUTADA |                   |      |
| GA-06 | NO EJECUTADA |                   |      |
| GA-07 | NO EJECUTADA |                   |      |
| GA-08 | NO EJECUTADA |                   |      |
| GA-09 | NO EJECUTADA |                   |      |
| GA-10 | NO EJECUTADA |                   |      |
| GA-11 | NO EJECUTADA |                   |      |
| GA-12 | NO EJECUTADA |                   |      |
| GA-13 | NO EJECUTADA |                   |      |
| GA-14 | NO EJECUTADA |                   |      |
| GA-15 | NO EJECUTADA |                   |      |
| GA-16 | NO EJECUTADA |                   |      |
| GA-17 | NO EJECUTADA |                   |      |
| GA-18 | NO EJECUTADA |                   |      |
| GA-19 | NO EJECUTADA |                   |      |
| GA-20 | NO EJECUTADA |                   |      |
| GA-21 | NO EJECUTADA |                   |      |
| GA-22 | NO EJECUTADA |                   |      |
| GA-23 | NO EJECUTADA |                   |      |
| GA-24 | NO EJECUTADA |                   |      |
| GA-25 | NO EJECUTADA |                   |      |
| GA-26 | NO EJECUTADA |                   |      |
| GA-27 | NO EJECUTADA |                   |      |
| GA-28 | NO EJECUTADA |                   |      |
| GA-29 | NO EJECUTADA |                   |      |
| GA-30 | NO EJECUTADA |                   |      |

## Defectos

| Severidad | Issue | Resumen |
| --------- | ----- | ------- |
|           |       |         |

## Bloqueos De Ambiente

- Ninguno.

## Resultado General

- [ ] PASA
- [ ] PASA CON DEFECTOS ACEPTADOS
- [ ] NO PASA

### Totales

- Casos que pasan:
- Casos que fallan:
- Casos bloqueados:
- Casos no ejecutados:
- P0:
- P1:
- P2:
- P3:

## Observaciones Finales

Pendiente.
```

Actualiza este issue al terminar cada fase. No esperes al final de la jornada
para reconstruir lo ocurrido de memoria.

### Issue De Defecto

El título debe permitir entender el problema sin abrirlo:

```text
[P1][Alpha][GA-18 Negocio] El borrador pierde el cliente al volver desde Montos
```

Usa la etiqueta `bug`. Como el repositorio no tiene actualmente etiquetas
propias de severidad, `P0`, `P1`, `P2` o `P3` deben aparecer en el título y en
el cuerpo.

Plantilla obligatoria:

```markdown
## Clasificación

- Severidad: `P0 | P1 | P2 | P3`
- Caso: `GA-XX`
- Corrida madre: `#NÚMERO`
- Frecuencia: `Siempre | Intermitente | Una vez`
- Regresión conocida: `Sí | No | No sé`

## Contexto

- Entorno:
- URL exacta:
- Versión o commit informado:
- Navegador y versión:
- Sistema operativo:
- Viewport:
- Rol:
- Organización:
- Registro afectado:

## Precondiciones

1.
2.

## Pasos Para Reproducir

1.
2.
3.

## Resultado Esperado

Describe el dato, estado, mensaje o cálculo exacto que debía aparecer.

## Resultado Observado

Describe exactamente qué apareció. No uses solo “no funciona”.

## Impacto

Explica qué tarea del usuario queda bloqueada, incorrecta o confusa.

## Evidencia

- Captura antes:
- Captura después:
- Video, si aplica:
- Estado HTTP:
- Endpoint o acción:
- Respuesta saneada:
- Error de consola saneado:

## Workaround

`No existe` o pasos exactos del workaround.

## Notas

Información adicional útil para reproducir.
```

### Evidencia Mínima Por Defecto

Todo issue debe incluir:

1. URL exacta de la pantalla.
2. Rol y organización usados.
3. Datos o código visible del registro afectado.
4. Pasos numerados desde un estado conocido.
5. Resultado esperado.
6. Resultado observado.
7. Al menos una captura o video.
8. Frecuencia de reproducción.
9. Enlace al issue maestro.

Cuando el problema involucre una petición:

- Registra método, endpoint, estado HTTP y duración aproximada.
- Copia únicamente la parte saneada de la respuesta que demuestre el problema.
- Distingue un error de producto de un error de conectividad.

### Nombre De Archivos De Evidencia

```text
<RUN-ID>_<CASO>_<PASO>_<DESCRIPCION>.<ext>
```

Ejemplos:

```text
ALPHA-20260722-DB-01_GA-18_P07_cliente-perdido.png
ALPHA-20260722-DB-01_GA-21_P04_comision-incorrecta.mp4
```

### Severidades

| Severidad | Cuándo Usarla                                                     | Ejemplos                                                                                      |
| --------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `P0`      | Riesgo de seguridad, datos o dinero; el alpha no puede continuar. | Cruce entre organizaciones, duplicación, cálculo confirmado incorrecto, secretos expuestos.   |
| `P1`      | Bloquea un flujo principal o no existe workaround razonable.      | Error 5xx al guardar, no se puede confirmar un negocio válido, datos del borrador se pierden. |
| `P2`      | Función incorrecta pero el flujo puede completarse.               | Filtro incorrecto, feedback engañoso, permiso visible de forma inconsistente.                 |
| `P3`      | Problema visual o de texto sin impacto funcional relevante.       | Acento, alineación, truncado menor, espaciado.                                                |

### Mejoras Y Preguntas

- Para una mejora usa título
  `[Enhancement][Alpha][Módulo] Descripción` y etiqueta `enhancement`.
- Para una duda usa título `[Question][Alpha][Caso] Descripción` y etiqueta
  `question`.
- Para un defecto en esta misma guía usa etiqueta `documentation`.

### Reprueba De Una Corrección

No abras un issue nuevo. Comenta en el original:

```markdown
## Reprueba

- Fecha:
- Tester:
- Entorno:
- Versión o commit:
- Mismos pasos ejecutados: Sí / No
- Resultado: CORREGIDO / SIGUE FALLANDO / PARCIAL
- Evidencia:
- Observaciones:
```

El issue solo debe cerrarse después de una reprueba aprobada o de una decisión
explícita del equipo.

---

## Preparación De La Corrida

### Ambiente

- URL alpha: la indicada por el coordinador. Referencia actual:
  `https://soypms-alpha.vercel.app`.
- Ejecutar contra el ambiente remoto autorizado.
- No usar Postgres local, Docker ni una VM local.
- Registrar la versión o commit que se está probando.
- Activar captura de pantalla y tener disponible `Network` y `Console` del
  navegador.

### Roles Necesarios

- Un `OWNER` para ejecutar la corrida principal.
- Un `READONLY` activo para validar solo lectura.
- Un `AGENT` activo para validar alcance operativo.
- Recomendado: un `ADMIN` u `OPERATIONS` para comparar permisos.

Si el tester no puede obtener alguno, debe marcar los casos dependientes como
`BLOQUEADA`; no debe compartir credenciales por GitHub.

### Datos Base

Reemplaza `<RUN-ID>` por el identificador de la corrida.

| Entidad                  | Valor                           |
| ------------------------ | ------------------------------- |
| Organización             | `Organización <RUN-ID>`         |
| Owner                    | `Owner <RUN-ID>`                |
| Solo lectura             | `Lectura <RUN-ID>`              |
| Agente usuario           | `Agente Usuario <RUN-ID>`       |
| Cliente comprador        | `Comprador <RUN-ID>`            |
| Cliente propietario      | `Propietario <RUN-ID>`          |
| Agente externo principal | `Agente Principal <RUN-ID>`     |
| Co-agente externo        | `Coagente <RUN-ID>`             |
| Propiedad                | `Penthouse <RUN-ID>`            |
| Mandato                  | Venta exclusiva, 3% de comisión |
| Listing                  | `Penthouse comercial <RUN-ID>`  |
| Oferta                   | `450,000.00 USD`                |
| Negocio                  | `Venta avanzada <RUN-ID>`       |

Usa correos únicos aprobados para QA. La firma del mandato debe usar hoy o una
fecha pasada válida; su inicio debe incluir el día de la prueba y su fin debe
estar en el futuro. La firma esperada del negocio, la visita, los vencimientos y
el cierre del negocio deben estar en el futuro. Registra en el issue maestro las
fechas concretas usadas.

### Montos De Referencia

| Concepto                             |            Valor |
| ------------------------------------ | ---------------: |
| Precio publicado                     | `475,000.00 USD` |
| Precio negociado y total contractual | `462,500.00 USD` |
| Incremento referencial               |   `8,750.00 USD` |
| Descuento referencial                |   `2,250.00 USD` |
| Neto referencial                     |   `6,500.00 USD` |
| Comisión bruta, 3%                   |  `13,875.00 USD` |

---

## Resumen De Casos

| Caso  | Prueba                               | Criticidad |
| ----- | ------------------------------------ | ---------- |
| GA-01 | Home y salud pública                 | P1         |
| GA-02 | Registro de organización             | P0         |
| GA-03 | Sesión, login, logout y recuperación | P0         |
| GA-04 | Dashboard y estado vacío             | P1         |
| GA-05 | Usuarios y ciclo de membresía        | P0         |
| GA-06 | Permisos `READONLY` y `AGENT`        | P0         |
| GA-07 | Cliente y documentos de identidad    | P1         |
| GA-08 | Propiedad                            | P0         |
| GA-09 | Aislamiento por organización         | P0         |
| GA-10 | Agentes externos                     | P1         |
| GA-11 | Documento operativo                  | P1         |
| GA-12 | Mandato completo                     | P1         |
| GA-13 | Listing interno                      | P1         |
| GA-14 | Visita                               | P1         |
| GA-15 | Oferta                               | P1         |
| GA-16 | Contexto de nuevo negocio            | P0         |
| GA-17 | Persistencia del borrador            | P0         |
| GA-18 | Montos y ajustes referenciales       | P0         |
| GA-19 | Plan de pagos exacto                 | P0         |
| GA-20 | Comisiones compartidas exactas       | P0         |
| GA-21 | Validaciones negativas y preview     | P0         |
| GA-22 | Confirmación e idempotencia          | P0         |
| GA-23 | Negocios y funnel                    | P1         |
| GA-24 | Tareas                               | P1         |
| GA-25 | Cobranza, comisiones y liquidaciones | P1         |
| GA-26 | Dashboard, reportes y auditoría      | P1         |
| GA-27 | Búsqueda, filtros y actualización    | P2         |
| GA-28 | Responsive, idioma y feedback        | P2         |
| GA-29 | Retiro de propiedad e historial      | P1         |
| GA-30 | Cierre de sesión y acceso posterior  | P0         |

---

## Fase 1: Acceso, Organización Y Permisos

### GA-01 — Home Y Salud Pública

**Por qué:** confirma que el ambiente correcto está disponible antes de crear
datos y que la superficie pública no expone información interna.

**Pasos:**

1. Abre la URL alpha en una ventana privada.
2. Revisa la home en escritorio.
3. Abre `/api/health`.
4. Intenta abrir `/dashboard` sin sesión.

**Resultado esperado:**

- La marca visible es `SoyPMS`.
- La home carga sin errores visuales ni mensajes técnicos.
- `/api/health` responde correctamente, sin secretos ni trazas.
- `/dashboard` redirige a login o niega acceso; nunca muestra datos.

**Evidencia:** home, respuesta saneada de health y destino al abrir dashboard.

### GA-02 — Registro De Organización

**Por qué:** el alta de organización crea el límite de datos del SaaS y al owner
que administrará la operación.

**Pasos:**

1. Registra `Organización <RUN-ID>` con el owner autorizado.
2. Conserva el slug generado.
3. Al terminar, abre el dashboard.

**Resultado esperado:**

- El registro acepta datos válidos y rechaza campos inválidos con mensajes en
  español.
- Se crea una sola organización.
- El usuario queda autenticado como `OWNER` con membresía activa.
- La organización visible en el sidebar coincide con la creada.
- No aparece información de otra organización.

**Evidencia:** último paso del registro, sidebar y dashboard inicial.

### GA-03 — Sesión, Login, Logout Y Recuperación

**Por qué:** valida que el acceso protegido se mantenga estable y que un fallo de
credenciales no filtre información.

**Pasos:**

1. Cierra sesión.
2. Abre `/dashboard` directamente.
3. Intenta login con contraseña incorrecta.
4. Inicia sesión con la contraseña correcta.
5. Recarga la página.
6. Abre el flujo de recuperación de contraseña sin completar un cambio real no
   autorizado.

**Resultado esperado:**

- Sin sesión no hay acceso a la aplicación.
- Una contraseña incorrecta produce un mensaje claro y no revela si existen
  datos privados.
- Con credenciales correctas se restaura la organización y el rol.
- Recargar no cierra la sesión ni cambia de organización.
- Recuperación muestra feedback seguro y no expone cuentas.

**Evidencia:** redirección, error controlado y sesión restaurada.

### GA-04 — Dashboard Y Estado Vacío

**Por qué:** una organización nueva debe ser operable sin datos precargados ni
contenido de otros clientes.

**Pasos:**

1. Abre `Dashboard` antes de crear clientes o propiedades.
2. Revisa métricas, actividad, negocios recientes y próximos eventos.
3. Usa `Actualizar`.

**Resultado esperado:**

- Las métricas muestran cero o un estado vacío coherente.
- No aparecen nombres, montos, propiedades ni actividad ajenos.
- `Actualizar` conserva el estado correcto y muestra feedback de carga.
- No hay `NaN`, valores negativos, IDs crudos ni errores 5xx.

**Evidencia:** dashboard completo antes de crear datos.

### GA-05 — Usuarios Y Ciclo De Membresía

**Por qué:** los permisos dependen de la membresía y su estado; una asignación
incorrecta compromete toda la organización.

**Pasos:**

1. Como owner abre `Usuarios`.
2. Crea `Agente Usuario <RUN-ID>` con rol `AGENT`.
3. Valida o activa su membresía.
4. Cambia temporalmente el rol a `OPERATIONS` y verifica la lista.
5. Devuélvelo a `AGENT`.
6. Suspéndelo y confirma que el estado cambió.
7. Reactívalo si el flujo autorizado lo permite.
8. Crea `Lectura <RUN-ID>` con rol `READONLY` y déjalo activo.

**Resultado esperado:**

- Solo roles administradores pueden gestionar membresías.
- Cada cambio aparece una sola vez y persiste después de recargar.
- Un usuario suspendido no conserva acceso operativo.
- El sistema no permite dejar a la organización sin owner activo.
- Los roles y estados se muestran en español.

**Evidencia:** lista antes y después de cada cambio relevante.

### GA-06 — Permisos `READONLY` Y `AGENT`

**Por qué:** ocultar botones no basta; el servidor también debe impedir acciones
no autorizadas.

**Pasos:**

1. Inicia sesión como `READONLY`.
2. Abre clientes, propiedades, negocios y finanzas.
3. Intenta crear o modificar una propiedad desde la UI.
4. Si la UI oculta la acción, registra el comportamiento; no fuerces peticiones
   manuales fuera del alcance acordado.
5. Repite como `AGENT` sobre registros asignados y no asignados.

**Resultado esperado:**

- `READONLY` puede consultar únicamente lo permitido y no puede escribir.
- Las acciones no autorizadas están ocultas o deshabilitadas.
- Si se intenta una escritura, el servidor responde `403` sin mutar datos.
- `AGENT` opera solo dentro de su alcance y no administra usuarios.
- Finanzas sensibles no aparecen a roles sin permiso.

**Evidencia:** vista permitida, acción bloqueada y estado final sin cambios.

---

## Fase 2: Cliente, Propiedad Y Preparación Comercial

### GA-07 — Cliente Y Documentos De Identidad

**Por qué:** el cliente es una persona central reutilizable; no debe duplicarse
entre propiedades y negocios.

**Pasos:**

1. Como owner crea `Comprador <RUN-ID>` con roles comerciales `BUYER` y
   `SELLER`.
2. Agrega contacto, preferencias y consentimiento.
3. Crea `Propietario <RUN-ID>` como `SELLER`.
4. Prueba el alta con pasaporte.
5. Repite en registros separados con cédula de Colombia y cédula de Panamá.
6. Corrige un dato OCR antes de guardar.
7. Busca cada persona por nombre.
8. Abre el detalle y descarga el documento con un rol autorizado.

**Resultado esperado:**

- Cada persona aparece una sola vez en el módulo central.
- Colombia aparece primero cuando corresponda en el selector.
- La cédula colombiana se guarda sin puntos ni separadores.
- La cédula panameña conserva guiones y prefijos válidos.
- El dato corregido antes de guardar es el que persiste.
- La descarga requiere permiso y no usa una URL pública permanente.
- La búsqueda devuelve únicamente registros de la organización.

**Evidencia:** formularios, fichas finales, búsqueda y descarga saneada.

### GA-08 — Propiedad

**Por qué:** la propiedad es la entidad central del ciclo operativo.

**Pasos:**

1. Crea `Penthouse <RUN-ID>`.
2. Selecciona venta y alquiler si la UI permite ambas operaciones.
3. Usa Panamá / Panamá / Costa del Este.
4. Asocia `Propietario <RUN-ID>`.
5. Registra precio de venta `475,000.00 USD`, precio de alquiler, áreas,
   estacionamientos, notas y tags.
6. Guarda, recarga y busca por título, código y zona.
7. Abre el detalle.

**Resultado esperado:**

- Se crea una sola propiedad activa.
- Propietario, organización, responsable, precios y ubicación persisten.
- Venta y alquiler se distinguen sin mezclar sus montos.
- Búsqueda y filtros encuentran el mismo registro.
- Los montos tienen formato consistente y no cambian al recargar.

**Evidencia:** creación, resultado de búsqueda y detalle.

### GA-09 — Aislamiento Por Organización

**Por qué:** es la barrera de seguridad más importante del SaaS.

**Precondición:** el coordinador debe proporcionar una segunda organización de
QA o una membresía autorizada para crearla.

**Pasos:**

1. Registra el ID o URL de la propiedad de la primera organización.
2. Cambia a la segunda organización.
3. Busca el cliente y la propiedad de la primera.
4. Intenta abrir la URL directa del registro.
5. Repite con un negocio o documento cuando ya existan.

**Resultado esperado:**

- La búsqueda no devuelve registros de la primera organización.
- La URL directa responde `404` o acceso denegado.
- Nunca se muestran nombre, monto, documento, notas ni metadatos del otro
  cliente SaaS.
- Volver a la primera organización restaura únicamente sus datos.

**Evidencia:** búsqueda vacía y acceso directo negado. Cualquier fuga es P0.

### GA-10 — Agentes Externos

**Por qué:** una operación puede incluir colaboradores que no son usuarios de la
organización.

**Pasos:**

1. Crea `Agente Principal <RUN-ID>`.
2. Crea `Coagente <RUN-ID>`.
3. Agrega al menos un canal de contacto a cada uno.
4. Busca y abre ambos registros.

**Resultado esperado:**

- Se crean dos agentes distintos, activos y sin duplicados.
- El contacto persiste.
- Ambos aparecen después en selectores de visita y comisión.
- Crear un agente externo no crea automáticamente un usuario de acceso.

**Evidencia:** lista, búsqueda y detalle de ambos agentes.

### GA-11 — Documento Operativo

**Por qué:** clientes, propiedades y negocios necesitan un expediente
relacionado y protegido.

**Pasos:**

1. Abre `Documentos`.
2. Crea `Documento propiedad <RUN-ID>` como requerido.
3. Relaciónalo con `Penthouse <RUN-ID>`.
4. Agrega tipo, nombre, fecha requerida, vencimiento y notas.
5. Guarda, busca y recarga.
6. Como `READONLY`, intenta la acción de escritura.

**Resultado esperado:**

- El documento queda relacionado con la propiedad correcta.
- Estado, fechas y notas persisten.
- No aparece bajo una entidad u organización distinta.
- `READONLY` no puede crear ni alterar el documento.
- No se expone una ruta de storage sensible como enlace público.

**Evidencia:** formulario, fila final y bloqueo de permiso.

### GA-12 — Mandato Completo

**Por qué:** el mandato autoriza comercializar la propiedad y debe conservar
vigencia, firma, evidencia e historial.

**Pasos:**

1. Abre `Mandatos` y crea uno de venta para `Penthouse <RUN-ID>`.
2. Selecciona `Propietario <RUN-ID>`, responsable, exclusividad, precio
   `475,000.00 USD`, comisión `3%` y fechas futuras.
3. Guarda como borrador.
4. Intenta avanzar sin un dato obligatorio y registra el bloqueante esperado.
5. Completa los datos y usa `Enviar para firma`.
6. Agrega evidencia aprobada de mandato firmado.
7. Registra la firma usando esa evidencia y una fecha de hoy o pasada.
8. Activa el mandato.
9. Revisa su historial.

**Resultado esperado:**

- El mandato inicia en `Borrador`.
- Los bloqueantes explican en español qué falta.
- La secuencia válida es visible y auditada:
  `Borrador` → `Firma pendiente` → `Documentos pendientes` → `Activo`.
- No se activa sin firma y evidencia requerida.
- Precio, comisión, vigencia, propiedad y propietario permanecen correctos.
- El historial identifica acción, actor y fecha.

**Evidencia:** cada estado, evidencia relacionada e historial.

### GA-13 — Listing Interno

**Por qué:** valida la preparación comercial interna sin confundirla con una
publicación real en portales.

**Pasos:**

1. Abre `Publicaciones`.
2. Crea `Penthouse comercial <RUN-ID>`.
3. Relaciona la propiedad y el mandato activo.
4. Agrega canales de referencia y copy público.
5. Guarda como borrador y recarga.

**Resultado esperado:**

- El listing aparece una sola vez con propiedad y mandato correctos.
- El copy, los canales y el estado persisten.
- No se realiza una publicación externa real.
- La propiedad retirada o sin preparación no debe presentarse engañosamente
  como publicada.

**Evidencia:** formulario y fila final.

### GA-14 — Visita

**Por qué:** conecta inventario, cliente, agente y seguimiento comercial.

**Pasos:**

1. Abre `Visitas`.
2. Programa una fecha y hora futuras.
3. Relaciona propiedad, comprador, agente principal y usuario responsable.
4. Guarda como `Solicitada` o `Confirmada`.
5. Busca el registro después de recargar.

**Resultado esperado:**

- La visita conserva fecha, participantes, responsable y propiedad.
- El estado visible coincide con el seleccionado.
- La fecha se muestra en formato local comprensible.
- No se duplican visitas por una sola acción de guardar.

**Evidencia:** formulario, listado y detalle visible.

### GA-15 — Oferta

**Por qué:** una propuesta debe conservar monto, moneda, vigencia y relaciones
antes de convertirse en negocio.

**Pasos:**

1. Abre `Ofertas`.
2. Crea una oferta de venta por `450,000.00 USD`.
3. Relaciona comprador y propiedad.
4. Agrega fecha de vencimiento y términos.
5. Guarda como borrador.
6. Recarga y busca la oferta.

**Resultado esperado:**

- La oferta conserva cliente, propiedad, monto, moneda, términos y vencimiento.
- El monto se muestra como `450,000.00 USD`.
- El estado es `Borrador`.
- No aparece relacionada con otro cliente o inmueble.

**Evidencia:** alta y fila final.

---

## Fase 3: Negocio, Pagos Y Comisiones

### GA-16 — Contexto De Nuevo Negocio

**Por qué:** el wizard depende de catálogos y relaciones de la organización; si
el contexto es incorrecto, todo el negocio será incorrecto.

**Pasos:**

1. Abre `Negocios` → `Nuevo negocio`.
2. Revisa tipos de contrato, clientes, propiedades, agentes, usuarios, presets
   de pago y opciones de comisión.
3. Usa `Actualizar` si está disponible.

**Resultado esperado:**

- Aparecen los registros creados en esta corrida.
- No aparecen registros de otra organización.
- Existen contratos de venta que requieren plan de pagos y comisión.
- El usuario autorizado puede confirmar; un rol sin permiso no.
- Actualizar no borra el progreso actual.

**Evidencia:** opciones visibles en los pasos clave.

### GA-17 — Persistencia Del Borrador

**Por qué:** un negocio extenso debe poder continuarse sin perder información.

**Pasos:**

1. Selecciona operación `Venta`, modo `Avanzado` y moneda `USD`.
2. Usa título `Venta avanzada <RUN-ID>`.
3. Define firma futura y cierre posterior.
4. Selecciona `Comprador <RUN-ID>`.
5. Selecciona `Penthouse <RUN-ID>`.
6. Elige un contrato de venta con pagos y comisiones.
7. Cambia de paso, vuelve atrás y recarga la página.
8. Reabre el borrador desde `Negocios`.

**Resultado esperado:**

- El borrador se guarda con código o ID y versión.
- Cliente, inmueble, contrato, fechas y modo persisten.
- Volver atrás o recargar no duplica participantes.
- La fecha de cierre anterior a firma se rechaza.
- Solo aparecen relaciones de la organización activa.

**Evidencia:** antes de recargar y después de reabrir.

### GA-18 — Montos Y Ajustes Referenciales

**Por qué:** separa el valor contractual de explicaciones de negociación que no
deben alterar pagos ni comisión.

**Pasos:**

1. En `Montos` registra:
   - Precio base: `475,000.00`.
   - Precio negociado: `462,500.00`.
   - Total contrato: `462,500.00`.
   - Monto pagable: `462,500.00`.
   - Base de comisión: `462,500.00`.
2. Agrega incremento referencial `8,750.00`.
3. Agrega descuento referencial `2,250.00`.
4. Cambia de paso, recarga y vuelve a `Montos`.

**Resultado esperado:**

- Incrementos: `8,750.00 USD`.
- Descuentos: `2,250.00 USD`.
- Neto referencial: `6,500.00 USD`.
- Total contractual, monto pagable y base de comisión siguen en
  `462,500.00 USD`.
- Los ajustes persisten con efecto informativo y no cambian automáticamente el
  plan de pagos.

**Evidencia:** resumen de montos antes y después de recargar.

### GA-19 — Plan De Pagos Exacto

**Por qué:** cualquier diferencia de centavos puede afectar cobranza, tareas y
reportes.

**Pasos:**

1. Selecciona plan `Personalizado`.
2. Usa fechas futuras en orden.
3. Crea estas seis líneas:

| Línea           |        Monto |
| --------------- | -----------: |
| Reserva inicial |   `5,000.00` |
| Pago a la firma |  `87,500.00` |
| Cuota 1         |  `80,000.00` |
| Cuota 2         |  `80,000.00` |
| Cuota 3         |  `80,000.00` |
| Saldo al cierre | `130,000.00` |

4. Ejecuta el cálculo.
5. Cambia de paso y vuelve.

**Resultado esperado:**

- Total contrato: `462,500.00 USD`.
- Total programado: `462,500.00 USD`.
- Diferencia: `0.00 USD`.
- Existen seis líneas, en orden de fecha y sin duplicados.
- Volver al paso conserva los importes exactos.

**Evidencia:** tabla completa y resumen de cálculo.

### GA-20 — Comisiones Compartidas Exactas

**Por qué:** comprueba dinero, identidad del receptor y roles múltiples; un error
no es meramente visual.

**Pasos:**

1. Usa base `Precio negociado`, comisión simple `3%` y liberación general al
   cierre.
2. Selecciona `Agente Principal <RUN-ID>`.
3. Agrega `Coagente <RUN-ID>`.
4. Usa al comprador ya registrado como referido; no crees una segunda persona.
5. Crea estas reglas:

| Receptor                | Cálculo           | Resultado esperado |
| ----------------------- | ----------------- | -----------------: |
| Agente principal        | `1.5%` de venta   |     `6,937.50 USD` |
| Co-agente               | `30%` de comisión |     `4,162.50 USD` |
| Comprador como referido | `20%` de comisión |     `2,775.00 USD` |

6. Ejecuta el cálculo.

**Resultado esperado:**

- Comisión bruta: `13,875.00 USD`.
- Total asignado: `13,875.00 USD`.
- Existen exactamente tres asignaciones.
- Cada fila identifica al receptor correcto y sus roles.
- El comprador aparece una sola vez como persona y puede mostrar los roles
  `Comprador` y `Referido`.
- No hay IDs crudos, nombres repetidos indebidamente ni errores en inglés.

**Evidencia:** resumen y tabla completa de asignaciones.

### GA-21 — Validaciones Negativas Y Preview

**Por qué:** el sistema debe impedir confirmar datos incorrectos, no solo avisar.

Ejecuta cada negativa en un borrador separado con sufijo `-NEG-A`, `-NEG-B`,
etc.

#### A. Pago Descuadrado

Cambia el saldo final a `129,999.99`.

**Esperado:** diferencia `0.01 USD`, error visible y confirmación bloqueada.

#### B. Cierre Antes De Firma

Usa cierre anterior a firma.

**Esperado:** error en español y confirmación bloqueada.

#### C. Comisión Sin Participante

Intenta crear una regla sin agente principal.

**Esperado:** la UI solicita participante y no crea una regla vacía.

#### D. Comisión Duplicada

Agrega dos reglas iguales para el mismo receptor y cálculo.

**Esperado:** se detecta duplicado y no se permite confirmar.

#### E. Porcentaje Fuera De Rango

Usa `101%`.

**Esperado:** se indica rango válido y el dato queda disponible para corregir.

#### F. Relación De Otra Organización

Intenta usar por URL o estado previo un cliente o propiedad de otra organización.

**Esperado:** `404` o acceso denegado sin filtrar datos.

Después restaura la corrida principal y abre `Vista previa`.

**Resultado esperado del preview válido:**

- Cero errores bloqueantes.
- Diferencia de pagos `0.00 USD`.
- Comisión estimada `13,875.00 USD`.
- Cliente, propiedad, contrato, pagos, receptores y acciones son los correctos.
- Los avisos informativos no se presentan como errores.

**Evidencia:** cada error esperado y preview válido final.

### GA-22 — Confirmación E Idempotencia

**Por qué:** confirmar materializa contratos, pagos, comisiones y tareas; no
puede duplicarse.

**Pasos:**

1. Confirma una sola vez la corrida principal válida.
2. Espera el resultado sin volver a presionar.
3. Abre el negocio confirmado.
4. Recarga.
5. Usa solo el mecanismo autorizado de repetición o reintento si el coordinador
   pide validar idempotencia; no manipules claves manualmente desde la UI.

**Resultado esperado:**

- El negocio avanzado cambia de `Borrador` a `Revisión`.
- Se conservan código, cliente, propiedad, contrato y montos.
- Se crean un plan de pagos con seis líneas, un plan de comisión con tres
  asignaciones, snapshots y tareas programadas.
- Una repetición con la misma intención no crea un segundo negocio ni duplica
  líneas, comisiones o tareas.
- Recargar muestra exactamente los mismos totales.

**Evidencia:** resultado inmediato, detalle recargado y conteos visibles.

---

## Fase 4: Operación, Finanzas Y Control

### GA-23 — Negocios Y Funnel

**Por qué:** el negocio confirmado debe alimentar las vistas operativas sin
reescribir su estado.

**Pasos:**

1. Abre `Negocios` y busca por título o código.
2. Abre `Funnel`.
3. Filtra por venta y por estado `Revisión`.
4. Revisa la tarjeta y el gráfico de operaciones.

**Resultado esperado:**

- El negocio aparece una vez.
- Está en la columna `Revisión`.
- Cliente, inmueble, monto y fecha de cierre son correctos.
- El filtro reduce resultados sin cambiar datos.
- El gráfico y los contadores coinciden con las tarjetas visibles.

**Evidencia:** listado, funnel filtrado y gráfico.

### GA-24 — Tareas

**Por qué:** los planes deben convertirse en trabajo operativo rastreable.

**Pasos:**

1. Abre `Tareas`.
2. Busca por negocio.
3. Filtra por cobro programado, firma y comisión.
4. Completa una tarea no crítica autorizada.
5. Abre el filtro `Completadas`.

**Resultado esperado:**

- Existen tareas derivadas de pagos, firma y comisión según lo configurado.
- Cada tarea apunta al negocio correcto y tiene fecha.
- Completar mueve una sola tarea a `Completadas`.
- La nota de cierre persiste.
- Actualizar no reabre ni duplica la tarea.

**Evidencia:** pendientes antes, acción y completadas después.

### GA-25 — Cobranza, Comisiones Y Liquidaciones

**Por qué:** las vistas financieras deben derivarse del negocio confirmado, no
de números manuales desconectados.

**Pasos:**

1. Abre `Cobranza`.
2. Busca el próximo pago del negocio.
3. Abre `Comisiones`.
4. Busca el negocio y compara con `13,875.00 USD`.
5. Abre `Liquidaciones`.

**Resultado esperado:**

- Cobranza muestra la siguiente línea de pago con importe y fecha correctos.
- Comisiones permite identificar el negocio y su agente principal sin exponer
  datos a roles no autorizados.
- Los resúmenes y gráficos coinciden con las filas visibles.
- Liquidaciones solo muestra negocios en estados elegibles; que el negocio en
  `Revisión` todavía no aparezca puede ser correcto.
- Ninguna pantalla permite simular un pago bancario real.

**Evidencia:** las tres vistas y comparación con el negocio.

### GA-26 — Dashboard, Reportes Y Auditoría

**Por qué:** las decisiones operativas dependen de métricas y trazas coherentes
con los registros fuente.

**Pasos:**

1. Vuelve a `Dashboard` y actualiza.
2. Abre `Reportes`.
3. Compara negocios abiertos, distribución por operación, próximos cobros y
   comisiones.
4. Abre `Auditoría`.
5. Busca actividad relacionada con alta, cambios sensibles y confirmación.

**Resultado esperado:**

- Dashboard y reportes reflejan al menos el negocio de la corrida.
- Las cifras coinciden entre métricas, gráficos y registros fuente.
- No se suman borradores negativos como negocios confirmados.
- Auditoría identifica acción, actor, recurso y fecha cuando el evento está
  disponible.
- Ningún evento muestra secretos o payloads privados completos.

**Evidencia:** métricas comparadas y eventos relevantes.

### GA-27 — Búsqueda, Filtros Y Actualización

**Por qué:** el producto debe seguir siendo operable cuando existe más de un
registro.

**Pasos:**

1. En clientes, propiedades, mandatos, negocios, tareas y ofertas busca el
   `<RUN-ID>`.
2. Combina búsqueda con un filtro de estado u operación.
3. Limpia filtros.
4. Usa `Actualizar`.
5. Prueba una búsqueda sin resultados.

**Resultado esperado:**

- La búsqueda encuentra únicamente registros coincidentes.
- Los filtros se pueden combinar y limpiar.
- Un resultado vacío se explica claramente.
- Actualizar no duplica ni borra datos.
- Los contadores y gráficos respetan el filtro actual.

**Evidencia:** al menos un ejemplo positivo, combinado y vacío.

### GA-28 — Responsive, Idioma Y Feedback

**Por qué:** el alpha debe poder operarse sin perder acciones o entender
mensajes técnicos.

**Pasos:**

1. Repite dashboard, cliente, propiedad, mandato y negocio a `390 × 844`.
2. Abre drawers, tablas y el wizard.
3. Navega con teclado por un formulario principal.
4. Provoca una validación de campo requerido.
5. Observa estados de carga, vacío, error y sin permiso.

**Resultado esperado:**

- No existe scroll horizontal accidental ni botones fuera del viewport.
- Tablas y formularios siguen siendo utilizables.
- El foco visible sigue un orden lógico.
- Etiquetas y mensajes están en español correcto.
- No aparecen términos internos como `backend`, `wizard`, nombres de enum o
  trazas.
- Guardar, cargar, fallar y completar producen feedback claro.

**Evidencia:** capturas de escritorio y móvil del mismo flujo.

### GA-29 — Retiro De Propiedad E Historial

**Por qué:** retirar un inmueble debe conservar su historia y evitar nuevas
operaciones incompatibles.

**Pasos:**

1. Solo después de completar todos los casos dependientes, abre la propiedad.
2. Retírala con una razón que incluya `<RUN-ID>`.
3. Busca la propiedad.
4. Intenta iniciar un nuevo negocio con ella.

**Resultado esperado:**

- El estado cambia a `Retirada`.
- La razón y el historial se conservan.
- El registro sigue consultable para trazabilidad.
- No puede confirmar un nuevo negocio que bloquee reglas de disponibilidad.
- El negocio ya creado no pierde su snapshot histórico.

**Evidencia:** antes, confirmación de retiro, estado final e intento bloqueado.

### GA-30 — Cierre De Sesión Y Acceso Posterior

**Por qué:** el final de la corrida debe confirmar que la sesión realmente deja
de autorizar peticiones.

**Pasos:**

1. Copia una URL protegida del negocio.
2. Cierra sesión desde la UI.
3. Abre la URL copiada.
4. Usa `Atrás` en el navegador.
5. Inicia sesión nuevamente como owner.

**Resultado esperado:**

- Cerrar sesión elimina el acceso.
- La URL protegida redirige o responde `401`.
- `Atrás` no vuelve a mostrar datos operables desde caché.
- Al iniciar sesión de nuevo se restaura la organización correcta.

**Evidencia:** logout, intento sin sesión y reingreso.

---

## Pruebas Especializadas Después De La Corrida Principal

Si la corrida guiada no tiene P0 ni P1 que bloquee el flujo, continúa con:

1. [`client-zero-advanced-business.md`](./client-zero-advanced-business.md):
   variantes y estrés de pagos y comisiones.
2. [`client-zero-finance.md`](./client-zero-finance.md): perfiles pagables,
   erogaciones, compensaciones e idempotencia financiera.
3. [`mandates-adversarial-beta.md`](./mandates-adversarial-beta.md): lifecycle,
   concurrencia, permisos y aislamiento de mandatos.

Cada protocolo debe usar un nuevo sufijo de corrida y enlazarse desde el issue
maestro.

---

## Criterio De Salida Del Alpha

La corrida puede recomendar aprobación solamente cuando:

- Los 30 casos tienen estado explícito.
- No hay P0 abiertos.
- No hay P1 abiertos en registro, sesión, aislamiento, propiedad, negocio,
  pagos, comisiones o confirmación.
- Existe al menos un negocio de venta avanzado confirmado con:
  - total contractual `462,500.00 USD`;
  - pagos programados `462,500.00 USD`;
  - diferencia `0.00 USD`;
  - comisión bruta y asignada `13,875.00 USD`.
- Los roles y el aislamiento por organización pasan.
- Todo caso bloqueado tiene causa, responsable y siguiente acción.
- Todos los defectos están enlazados desde el issue maestro.
- El coordinador acepta explícitamente cualquier P2 o P3 pendiente.

## Cierre De La Corrida

Antes de terminar:

1. Actualiza todos los estados del issue maestro.
2. Verifica que cada defecto tenga evidencia y enlace de regreso.
3. Cuenta P0, P1, P2 y P3.
4. Separa defectos de producto, bloqueos de ambiente, mejoras y preguntas.
5. Registra los datos que deben conservarse para reproducción.
6. No borres la organización ni los registros hasta recibir autorización.
7. Emite una recomendación clara: `PASA`, `PASA CON DEFECTOS ACEPTADOS` o
   `NO PASA`.
