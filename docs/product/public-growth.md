# Crecimiento Público De SoyPMS

## Propósito

Este documento fija el contrato de posicionamiento, contenido y adquisición de
la superficie pública de SoyPMS. El objetivo no es maximizar visitas
indiscriminadas, sino atraer agencias y equipos inmobiliarios que necesitan
control operativo de su cartera y convertir ese interés en una conversación de
demo trazable.

## Posicionamiento

- Categoría: software de operación inmobiliaria.
- Mercado: Latinoamérica.
- Cliente ideal: owners, brokers, responsables de operaciones y equipos con
  varios agentes y una cartera compartida.
- Diferenciador: SoyPMS toma la continuidad operativa desde la captación hasta
  la comisión sin obligar al equipo a reemplazar su CRM.
- Estado comercial: alpha guiada.

`PMS inmobiliario` pertenece a la marca, pero no se usa como keyword genérica
principal porque puede confundirse con property management y hospitality.

## Arquitectura De Intención

El home responde la intención de categoría `software inmobiliario para agencias
y equipos`. Las páginas públicas profundizan intenciones distintas:

| Ruta                          | Intención principal                       |
| ----------------------------- | ----------------------------------------- |
| `/`                           | software inmobiliario para agencias       |
| `/producto`                   | software de operación inmobiliaria        |
| `/mandatos-y-expedientes`     | mandatos y expedientes inmobiliarios      |
| `/comisiones-inmobiliarias`   | control de comisiones inmobiliarias       |
| `/crm-inmobiliario-vs-soypms` | CRM inmobiliario vs. operación de cartera |

No se crean páginas por país hasta que exista oferta, vocabulario, soporte y
evidencia reales para esa jurisdicción.

## Copy Canónico

- Title del home: `Software inmobiliario para agencias y equipos | SoyPMS`.
- Description: `Centraliza propiedades, mandatos, expedientes, tareas, ofertas,
cierres y comisiones. SoyPMS opera tu cartera sin reemplazar tu CRM. Solicita
una demo.`
- Eyebrow: `Software inmobiliario para agencias y equipos`.
- H1: `Opera toda tu cartera, de la captación a la comisión.`
- Diferenciador secundario: `Tu CRM persigue el lead. SoyPMS opera la cartera.`
- Estado comercial visible: `Alpha guiada`.

## Vocabulario Y Keywords

La keyword principal se integra en títulos, introducciones y enlaces cuando
describe naturalmente la página. Los clusters secundarios son:

- operación y cartera inmobiliaria;
- propiedades, mandatos y expedientes;
- tareas, ofertas, cierres y comisiones;
- agencias, brokers y equipos inmobiliarios;
- CRM inmobiliario frente a software operativo.

No se repiten variantes para aumentar densidad. Se priorizan definiciones
claras, relaciones entre entidades y respuestas completas a la intención.

## Enlazado Interno

El home enlaza las cuatro páginas mediante textos descriptivos. Cada página
incluye enlaces contextuales y un bloque de siguientes lecturas. Los anchors del
home se reservan para secciones del recorrido y no sustituyen las URLs
indexables.

## Claims Permitidos

El contenido puede describir comportamiento verificable del producto, su
arquitectura multiusuario, el aislamiento por organización y los recorridos
implementados. Debe declarar cuándo una vista es ilustrativa o cuándo una
capacidad sigue en alpha.

No se publican:

- cifras de ahorro o productividad sin metodología;
- clientes, logos o testimonios sin autorización;
- ratings, precios u ofertas inexistentes;
- cumplimiento legal o regulatorio automático;
- funciones planificadas como si ya estuvieran disponibles.

## Descubribilidad En IA

La estrategia usa contenido visible, semántico, original y consistente con el
producto. Se permiten crawlers de búsqueda y citación, y se bloquean tokens de
entrenamiento conocidos según `docs/architecture/public-site.md`.

No se mantiene `llms.txt` porque no forma parte del contrato de Google Search.
Las páginas usan un H1 único, secciones con H2, definiciones autocontenidas,
migas de pan y enlaces que explican la relación. Esto facilita lectura humana,
extracción y citación sin crear contenido exclusivo para bots.

## Métricas

Las métricas primarias son demos recibidas y calificadas, conversión del
formulario, consultas orgánicas relevantes, páginas citadas y Core Web Vitals.
Tráfico bruto o posiciones sin conversión son señales diagnósticas, no objetivos
finales.

El embudo público usa estos eventos:

| Evento                | Pregunta que responde                         |
| --------------------- | --------------------------------------------- |
| `demo_cta_click`      | ¿Qué CTA abre el recorrido de demo?           |
| `demo_form_view`      | ¿Cuántas visitas llegan al formulario?        |
| `demo_form_start`     | ¿Cuántas comienzan a completarlo?             |
| `demo_form_submit`    | ¿Cuántas intentan enviarlo?                    |
| `demo_form_success`   | ¿Cuántas solicitudes fueron aceptadas?        |
| `demo_form_error`     | ¿Cuántas encuentran un error técnico?         |
| `login_click`         | ¿Cuánto tráfico público busca entrar?         |
| `content_link_click`  | ¿Qué contenido profundiza la intención?       |
| `web_vital`           | ¿Cómo rinde la experiencia en dispositivos?   |

Los eventos solo aceptan parámetros cerrados como ubicación del CTA, ruta de
destino, tipo técnico de error y métricas de rendimiento. Nombre, correo,
empresa, país, reto, referrer completo y UTMs nunca se envían como parámetros
de GA4.

## Conversión Y Consentimiento

Todos los CTA públicos apuntan a `/#demo`. El formulario solicita únicamente:

- nombre;
- correo laboral;
- empresa;
- país;
- tamaño del equipo;
- reto operativo opcional;
- consentimiento obligatorio.

La URL, referrer y UTMs viajan como atribución oculta. La versión de la política
no la decide el navegador: la API toma `DEMO_CONSENT_POLICY_VERSION` del entorno.
El formulario permanece visible pero desactivado hasta que privacidad, cookies
y términos sean aprobados y publicados. Los borradores legales usan `noindex`.

El lead se persiste antes de intentar la notificación. Una falla de Resend no
convierte una solicitud válida en error ni elimina la evidencia de
consentimiento.

## Operación De Crecimiento

Después de publicar y solicitar indexación:

- día 7: confirmar cobertura, canonical, sitemap, primeras consultas, errores
  de formulario y Core Web Vitals de laboratorio;
- día 30: revisar consultas por intención, landing pages, conversión
  CTA→inicio→éxito y referencias desde asistentes;
- día 60: ajustar títulos, respuestas y enlaces solo con evidencia acumulada;
- día 90: decidir contenido editorial o localización por país como inversión
  de producto, no como generación masiva.

Las referencias desde ChatGPT, Copilot, Perplexity y otros asistentes se
analizan mediante hostname de referrer y UTMs en la tabla de solicitudes, y de
forma agregada en las fuentes de adquisición de GA4. No se crean páginas ni
claims para manipular respuestas generativas.
