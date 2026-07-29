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

El CTA seguirá usando correo únicamente hasta que el lote de captura habilite
el formulario persistente detrás del gate legal.

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
| `PUBLIC_SITE_CUSTOM_DOMAIN_ENABLED` | Build       | Gate de redirecciones al dominio canónico |
| `PUBLIC_SITE_INDEXING_ENABLED`      | Servidor    | Gate explícito de crawling e indexación   |
| `API_PROXY_URL`                     | Build       | Rewrite same-origin hacia la API          |

Los lotes de leads y medición ampliarán este contrato sin introducir secretos
en variables `NEXT_PUBLIC_*`.
