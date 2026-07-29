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

## Formulario Y API

- [ ] Con gates apagados, los campos se ven desactivados y explican el bloqueo.
- [ ] Todos los CTA usan `/#demo`; no quedan CTA de demo por `mailto:`.
- [ ] Con gates de QA activos, un formulario válido devuelve `201` y muestra la
      referencia.
- [ ] Faltantes, correo inválido, consentimiento falso, enum inválido y campos
      extra devuelven `400`.
- [ ] El sexto intento de una huella en 15 minutos devuelve `429`.
- [ ] El honeypot no crea un registro.
- [ ] La URL y UTMs se conservan; el correo no aparece en URL ni analítica.
- [ ] Un fallo de Resend deja `notification_status=FAILED` y mantiene el `201`.
- [ ] `demo_requests` no tiene `organization_id` ni columna de IP.
- [ ] RLS está activo, sin políticas y sin privilegios para `anon` o
      `authenticated`.
- [ ] `/privacidad`, `/cookies` y `/terminos` dicen “Borrador no aprobado” y
      emiten `noindex, follow`.

Validación SQL remota esperada:

```sql
select relrowsecurity
from pg_class
where oid = 'public.demo_requests'::regclass;

select policyname
from pg_policies
where schemaname = 'public' and tablename = 'demo_requests';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'demo_requests'
  and grantee in ('anon', 'authenticated');
```

El primer query debe devolver `true`; los otros dos, cero filas.

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
