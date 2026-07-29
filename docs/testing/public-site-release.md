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

## Consentimiento Y Analítica

- [ ] Con `NEXT_PUBLIC_ANALYTICS_ENABLED=false` no hay banner, script ni
      solicitudes a Google Tag Manager.
- [ ] Con el gate abierto, Consent Mode inicia con `analytics_storage=denied`.
- [ ] Antes de aceptar no se descarga `gtag.js` ni se emiten eventos.
- [ ] Aceptar carga GA4 una sola vez y habilita los nueve eventos documentados.
- [ ] Rechazar o reabrir preferencias vuelve a `denied`.
- [ ] Nombre, correo, empresa, país, reto, referrer completo y UTMs no aparecen
      en `dataLayer`, URL de evento ni payload de red.
- [ ] `page_location` excluye query string y fragmento.
- [ ] `web_vital` informa nombre, valor, delta y rating, sin identificadores de
      usuario.

Ejecutar la E2E de consentimiento contra un build de QA con:

```bash
NEXT_PUBLIC_ANALYTICS_ENABLED=true \
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-SOYPMS01 \
NEXT_PUBLIC_DEMO_FORM_ENABLED=true \
NEXT_PUBLIC_API_URL=https://api.soypms.test \
pnpm --filter @soyre/web build

E2E_PUBLIC_ANALYTICS_ENABLED=true \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 \
pnpm --filter @soyre/web test:e2e public-pages.spec.ts
```

Playwright intercepta `gtag.js` y la API; esta prueba no envía medición ni
crea leads reales.

## Rendimiento

Medir Lighthouse móvil en build de producción, con caché limpia y al menos tres
corridas. Guardar la mediana y el reporte:

- Performance ≥ 90;
- LCP ≤ 2.5 s;
- TBT ≤ 200 ms;
- CLS ≤ 0.1;
- transferencia total ≤ 235 KiB, o desviación documentada.

Si Performance, LCP, TBT o CLS incumplen de forma reproducible, abrir
`debt(web): reducir hidratación y TBT del home público` y relacionarlo con #49
en vez de duplicar el warning de hidratación existente. El payload puede
documentar una desviación cuando la compresión o las imágenes generadas hagan
que la cifra bruta no represente el costo transferido real.

Baseline local del 28/07/2026, build de producción con formulario, medición,
verificaciones e indexación habilitados en modo QA; Lighthouse 13.0.1, Chrome
149, simulación móvil. Se hicieron tres corridas:

| Métrica       | Corrida 1 | Corrida 2 | Corrida 3 | Mediana | Objetivo |
| ------------- | --------- | --------- | --------- | ------- | -------- |
| Performance   | 96        | 98        | 92        | 96      | ≥ 90     |
| LCP           | 2109 ms   | 2003 ms   | 2737 ms   | 2109 ms | ≤ 2500   |
| TBT           | 194 ms    | 144 ms    | 213 ms    | 194 ms  | ≤ 200    |
| CLS           | 0.0008    | 0.0008    | 0.0008    | 0.0008  | ≤ 0.1    |
| Transferencia | 254 KiB   | 254 KiB   | 254 KiB   | 254 KiB | ≤ 235 KiB |

La transferencia excede 19 KiB (8.1 %). Se acepta como desviación inicial:
aproximadamente 108 KiB corresponden al runtime comprimido de Next/React y
36 KiB a DM Sans local; no se descargan fotografías, trackers ni `gtag.js`
antes del consentimiento. La mediana de rendimiento y las tres métricas Core
Web Vitals cumplen. Accesibilidad, Best Practices y SEO obtuvieron 100 en la
corrida integral. Reabrir optimización si el payload crece o la mediana deja de
cumplir; no se crea deuda web solo por esta desviación documentada.

## Verificación E Indexación

1. Verificar el apex en Google Search Console y Bing Webmaster Tools.
2. Confirmar que sus meta tags aparecen solo con el gate aprobado.
3. Enviar `https://soypms.com/sitemap.xml` en ambos productos.
4. Validar JSON-LD en Rich Results Test y Schema Markup Validator.
5. Ejecutar el crawler smoke con Googlebot, Bingbot, OAI-SearchBot,
   PerplexityBot, GPTBot y Google-Extended.
6. Verificar `/soypms-indexnow-key.txt` y ejecutar `pnpm indexnow:submit`.
7. Solicitar indexación únicamente después de aprobar toda la sección
   “Gate De Infraestructura”.

No se considera evidencia una meta etiqueta sin verificación del proveedor ni
una respuesta local de IndexNow.

## Seguimiento 7/30/60/90

| Momento | Revisión                                                    |
| ------- | ----------------------------------------------------------- |
| Día 7   | cobertura, sitemap, canonical, errores y Web Vitals         |
| Día 30  | consultas, páginas, asistentes y embudo de demo             |
| Día 60  | títulos, respuestas, enlazado y calidad del tráfico         |
| Día 90  | expansión editorial/localización basada en evidencia        |

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
