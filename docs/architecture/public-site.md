# Arquitectura Del Sitio Público

## Dominio Y Gate De Indexación

La URL canónica se obtiene de `NEXT_PUBLIC_SITE_URL`. Mientras el dominio
definitivo, el correo y los textos legales no estén verificados,
`PUBLIC_SITE_INDEXING_ENABLED` debe permanecer en `false`.

El fallback verificable es `https://soypms-alpha.vercel.app`. El dominio
objetivo es `https://soypms.com`, pero no se declara canónico mientras no
resuelva DNS.

Cuando el gate está cerrado:

- el HTML emite `noindex, nofollow`;
- `robots.txt` bloquea todo crawling;
- `sitemap.xml` sigue respondiendo para permitir validación técnica.

Cuando está abierto:

- Googlebot, Bingbot y crawlers generales pueden acceder al contenido público;
- OAI-SearchBot y PerplexityBot están permitidos;
- GPTBot y Google-Extended están bloqueados;
- `/api/` permanece fuera de crawling.

## Metadata Y Entidades

El layout público centraliza `metadataBase`, nombre, descripción, Open Graph,
Twitter Cards, manifest e iconos. El home publica un grafo JSON-LD con
`WebSite`, `Organization` y `WebApplication`.

El grafo solo incluye datos verificables. No contiene ratings, ofertas,
dirección legal ni perfiles sociales sin confirmar. Las rutas de autenticación
y la aplicación operativa usan `noindex, follow`.

Las rutas de intención `/producto`, `/mandatos-y-expedientes`,
`/comisiones-inmobiliarias` y `/crm-inmobiliario-vs-soypms` declaran metadata,
canonical y `BreadcrumbList` propios. Todas forman parte del sitemap. El home
conserva el grafo de entidades del sitio; los breadcrumbs no se inventan para la
ruta raíz.

Los componentes de marketing compartidos viven en `apps/web/components`:

- `public-marketing.tsx`: header, CTA temporal y footer;
- `public-content-page.tsx`: estructura semántica de páginas de intención;
- `public-breadcrumb-json-ld.tsx`: datos estructurados de navegación.

Todos los CTA usan `/#demo`. El formulario queda detrás de
`NEXT_PUBLIC_DEMO_FORM_ENABLED` y la API detrás de `DEMO_REQUESTS_ENABLED`.
Ambos gates permanecen en `false` hasta completar la revisión legal y el correo.

## Solicitudes De Demo

`POST /api/public/demo-requests` es una ruta Nest pública pero validada:

- `201 { requestId, status: "received" }` para solicitudes aceptadas;
- `400` para DTOs inválidos;
- `429` después de cinco intentos por huella en 15 minutos;
- `503` mientras el gate operativo esté cerrado o no exista versión de
  consentimiento.

El navegador envía datos del formulario, URL, referrer y UTMs. La API normaliza
texto y correo, fija `consentedAt` y usa la versión de política configurada en el
servidor. El honeypot devuelve una respuesta indistinguible sin persistir ni
notificar. La huella antiabuso es SHA-256 y solo vive en memoria; no se almacena
IP cruda. El reemplazo por rate limiting distribuido se sigue en #170.

`DemoRequest` es una entidad de plataforma sin `organizationId`. Conserva:

- estado `NEW`, `CONTACTED`, `QUALIFIED`, `CLOSED` o `SPAM`;
- identidad laboral y contexto del equipo;
- consentimiento, versión y fecha;
- atribución de página/referrer/UTMs;
- estado, intentos y último error de notificación.

La tabla `demo_requests` habilita RLS, revoca permisos de `anon` y
`authenticated` y no define políticas. La escritura ocurre exclusivamente por
la API backend. La fuente canónica es la migración
`20260728220000_public_demo_requests`.

## Resend

Después de persistir, la API llama `POST https://api.resend.com/emails` con
texto plano, `reply_to` del solicitante e `Idempotency-Key` derivado del
`requestId`. Un error se guarda como `FAILED` y el endpoint mantiene el `201`.
No existe todavía un worker de reintentos; si permanece así al cierre, se
registra como deuda técnica en #171.

## Redirecciones Y Correo

Antes de habilitar indexación:

1. `soypms.com` y `www.soypms.com` ya están conectados al proyecto Vercel
   `soypms-alpha`; falta crear en el proveedor DNS los registros A a
   `76.76.21.21` solicitados por Vercel;
2. escoger el dominio apex como canónico;
3. activar `PUBLIC_SITE_CUSTOM_DOMAIN_ENABLED=true` para habilitar las
   redirecciones 308 desde `www` y el alias público; Vercel fuerza HTTPS;
4. verificar recepción de `hola@soypms.com`;
5. configurar SPF, DKIM y DMARC para el proveedor transaccional.

Estas acciones requieren acceso al DNS y no se sustituyen con valores
hardcodeados en el repositorio. El gate operativo completo se sigue en #173 y
la aplicación/verificación remota de `demo_requests`, en #172.

## Variables

| Variable                            | Visibilidad | Propósito                                 |
| ----------------------------------- | ----------- | ----------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`              | Pública     | Origen absoluto de canonical y metadata   |
| `NEXT_PUBLIC_DEMO_FORM_ENABLED`     | Pública     | Gate de interacción del formulario        |
| `PUBLIC_SITE_CUSTOM_DOMAIN_ENABLED` | Build       | Gate de redirecciones al dominio canónico |
| `PUBLIC_SITE_INDEXING_ENABLED`      | Servidor    | Gate explícito de crawling e indexación   |
| `API_PROXY_URL`                     | Build       | Rewrite same-origin hacia la API          |

Variables exclusivas de backend:

| Variable                         | Propósito                           |
| -------------------------------- | ----------------------------------- |
| `DEMO_REQUESTS_ENABLED`          | Gate del endpoint público           |
| `DEMO_CONSENT_POLICY_VERSION`    | Versión aprobada que se persiste    |
| `DEMO_REQUEST_RATE_LIMIT_SECRET` | Sal de la huella temporal antiabuso |
| `RESEND_API_KEY`                 | Credencial de envío, nunca pública  |
| `DEMO_NOTIFICATION_TO`           | Destinatario interno                |
| `DEMO_FROM_EMAIL`                | Remitente de un dominio verificado  |

## Consentimiento Y GA4

`PublicAnalytics` es el único punto de carga de GA4. Requiere simultáneamente
`NEXT_PUBLIC_ANALYTICS_ENABLED=true`, un ID `G-*` válido y consentimiento
explícito guardado en el navegador. Antes de la decisión solo crea un
`dataLayer` local con Consent Mode en `denied`; no descarga
`googletagmanager.com` ni envía eventos.

Al aceptar:

1. actualiza `analytics_storage` a `granted`;
2. carga `gtag.js` una sola vez;
3. configura una ubicación de página sin query string;
4. habilita eventos con nombres y parámetros allowlisted.

Al rechazar o reabrir preferencias, vuelve a `denied`. El contrato de eventos
vive en `apps/web/lib/public-analytics.ts`; cualquier parámetro no declarado se
descarta antes de llegar a `gtag`. Los campos libres del formulario y la
atribución completa nunca forman parte de analítica.

## Search Console, Bing E IndexNow

Las etiquetas de verificación se emiten solo con
`PUBLIC_SITE_VERIFICATION_ENABLED=true`. Sus valores públicos provienen de
`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` y
`NEXT_PUBLIC_BING_SITE_VERIFICATION`.

IndexNow tiene tres barreras:

- `INDEXNOW_ENABLED=true`;
- dominio custom e indexación habilitados;
- canonical exacto `https://soypms.com`.

La clave pública y estable se sirve únicamente en
`/soypms-indexnow-key.txt` cuando los gates pasan; `INDEXNOW_KEY` debe coincidir
con `soypms-indexnow-key`.
`pnpm indexnow:submit` envía las cinco URLs del sitemap; no descubre ni envía
rutas autenticadas, legales en borrador o endpoints. La operación se ejecuta
solo después de verificar DNS, canonical, legal, formulario y analítica.

Google Search Console y Bing Webmaster Tools requieren acciones de propiedad
externa. El repositorio prepara las etiquetas, sitemap y protocolo, pero no
simula verificación ni solicitud de indexación.

## Variables De Crecimiento

| Variable                               | Propósito                              |
| -------------------------------------- | -------------------------------------- |
| `NEXT_PUBLIC_ANALYTICS_ENABLED`        | Gate público de banner y GA4           |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`        | Identificador público `G-*`            |
| `PUBLIC_SITE_VERIFICATION_ENABLED`     | Gate de etiquetas de propiedad         |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Token público de Search Console         |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION`   | Token público de Bing Webmaster Tools  |
| `INDEXNOW_ENABLED`                     | Gate operativo de IndexNow             |
| `INDEXNOW_KEY`                         | Clave publicada en su ruta `.txt`      |
