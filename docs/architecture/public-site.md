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
IP cruda.

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
registrará como deuda técnica.

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
hardcodeados en el repositorio.

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

El lote de medición ampliará este contrato sin introducir secretos en variables
`NEXT_PUBLIC_*`.
