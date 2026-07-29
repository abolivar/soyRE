# Protocolo De Release Del Sitio Público

## Gate De Infraestructura

Antes de solicitar indexación:

- `soypms.com` resuelve y presenta certificado válido;
- todas las variantes redirigen al canonical;
- `hola@soypms.com` recibe correo;
- SPF, DKIM y DMARC están verificados;
- privacidad, cookies y términos tienen aprobación;
- el formulario y la medición respetan consentimiento.

## SEO Técnico

Verificar en HTML renderizado:

- title y description únicos;
- title, description, eyebrow, H1 y diferenciador del home coinciden con
  `docs/product/public-growth.md`;
- canonical absoluto;
- Open Graph y Twitter image;
- `lang="es-419"`;
- JSON-LD válido y consistente con el texto visible;
- home y páginas de contenido indexables solo con el gate abierto;
- login, registro y aplicación autenticada con `noindex, follow`.
- `/producto`, `/mandatos-y-expedientes`, `/comisiones-inmobiliarias` y
  `/crm-inmobiliario-vs-soypms` tienen un H1, metadata, canonical y
  `BreadcrumbList`;
- los enlaces internos describen el destino;
- los mockups se rotulan como ilustrativos y no contienen claims de datos
  reales;
- no hay precios, ratings, testimonios, métricas o perfiles inventados.

Verificar endpoints:

- `/robots.txt`;
- `/sitemap.xml`;
- `/manifest.webmanifest`;
- `/opengraph-image`;
- `/twitter-image`.

El sitemap contiene las cinco rutas públicas y ninguna ruta de autenticación o
aplicación.

## Crawlers

Ejecutar smoke con user agents Googlebot, Bingbot, OAI-SearchBot,
PerplexityBot, GPTBot y Google-Extended. Los cuatro primeros deben recibir la
superficie pública cuando el gate esté abierto; los dos últimos deben quedar
bloqueados por `robots.txt`.

## Calidad

Revisar teclado, foco, jerarquía H1-H2-H3, contraste, FAQ expandible y ausencia
de overflow horizontal en 1440 px, 768 px y 390-412 px.

Ejecutar:

```bash
pnpm check:design-system
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @soyre/web test:e2e public-pages.spec.ts
```

El cierre integral también exige Lighthouse móvil, Schema Markup Validator,
Rich Results Test, verificación en Search Console y Bing Webmaster Tools, y
smoke sobre el despliegue productivo.
