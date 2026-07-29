import { expect, test } from '@playwright/test';

async function revealFullPage(page: import('@playwright/test').Page) {
  await page.evaluate(async () => {
    const pageHeight = document.documentElement.scrollHeight;
    const step = Math.max(Math.floor(window.innerHeight * 0.75), 320);

    for (let y = 0; y < pageHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }

    document
      .querySelectorAll<HTMLElement>('[data-landing-reveal]')
      .forEach((element) => {
        element.classList.add('landing-revealed');
      });
    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(700);
}

const pages = [
  {
    cta: 'Ver una demo',
    heading: 'Opera toda tu cartera, de la captación a la comisión.',
    name: 'home',
    path: '/',
  },
  {
    cta: 'Ingresar',
    heading: 'Ingresar',
    name: 'login',
    path: '/login',
  },
  {
    cta: 'Crear',
    heading: 'Crear organización',
    name: 'register',
    path: '/register',
  },
];

for (const pageSpec of pages) {
  test(`${pageSpec.name} renders without layout overflow`, async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(60_000);
    await page.goto(pageSpec.path);

    await expect(
      page.getByRole('heading', { name: pageSpec.heading }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /SoyPMS inicio/ }).first(),
    ).toBeVisible();

    const callToAction = page
      .getByRole('button', { name: pageSpec.cta })
      .or(page.getByRole('link', { name: pageSpec.cta }))
      .first();

    await expect(callToAction).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );

    expect(horizontalOverflow).toBe(false);
    await revealFullPage(page);

    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${pageSpec.name}.png`),
    });
  });
}

test('home exposes the complete public journey without embedding login', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      name: 'Problemas operativos que el CRM no fue diseñado para resolver.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Cuatro entidades, una sola fuente de verdad.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'No te pedimos que cambies de CRM.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Así se ve por dentro.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Revisa tu operación con el equipo de SoyPMS.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Control desde la arquitectura, no desde una hoja compartida.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      name: 'Lo esencial antes de solicitar una demo.',
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Tu CRM persigue el lead. SoyPMS opera la cartera.'),
  ).toBeVisible();
  await expect(page.getByText('Datos aislados por organización')).toBeVisible();
  await expect(page.getByText(/Alpha guiada/).first()).toBeVisible();

  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Ingresar' }).first(),
  ).toHaveAttribute('href', '/login');

  const demoLinks = page.getByRole('link', { name: 'Ver una demo' });
  await expect(demoLinks).toHaveCount(2);
  for (const demoLink of await demoLinks.all()) {
    await expect(demoLink).toHaveAttribute('href', '/#demo');
  }

  await expect(page.getByLabel('Nombre')).toBeVisible();
  await expect(page.getByLabel('Nombre')).toBeDisabled();
  await expect(
    page.getByText(
      'La captura está desactivada mientras se aprueban privacidad, cookies y términos.',
    ),
  ).toBeVisible();

  const visibleCoralCallsToAction = () =>
    page.evaluate(() => {
      return Array.from(
        document.querySelectorAll<HTMLElement>('.landing-demo-cta-coral'),
      ).filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);

        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth
        );
      }).length;
    });

  await expect.poll(visibleCoralCallsToAction).toBe(1);
  await page.locator('#demo').scrollIntoViewIfNeeded();
  await expect.poll(visibleCoralCallsToAction).toBe(1);
});

test('home anchor navigation accounts for the fixed navigation', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: 'Cómo funciona', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/#como-funciona$/);

  await expect
    .poll(() =>
      page
        .locator('#como-funciona')
        .evaluate((element) => element.getBoundingClientRect().top),
    )
    .toBeGreaterThanOrEqual(60);
});

test('home remains readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const revealElements = page.locator('[data-landing-reveal]');
  await expect(revealElements.first()).toBeVisible();
  await expect(revealElements.last()).toBeVisible();
  await expect(revealElements.first()).toHaveCSS('opacity', '1');
});

test('public discovery metadata is explicit and safe before launch', async ({
  page,
  request,
}) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://soypms-alpha.vercel.app',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(
    1,
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Centraliza propiedades, mandatos, expedientes, tareas, ofertas, cierres y comisiones. SoyPMS opera tu cartera sin reemplazar tu CRM. Solicita una demo.',
  );

  const graph = await page
    .locator('script[type="application/ld+json"]')
    .evaluate((element) => JSON.parse(element.textContent ?? '{}'));
  expect(
    graph['@graph'].map((entity: { '@type': string }) => entity['@type']),
  ).toEqual(['WebSite', 'Organization', 'WebApplication']);

  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Disallow: /');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const sitemapContent = await sitemap.text();
  for (const pathname of [
    '/',
    '/producto',
    '/mandatos-y-expedientes',
    '/comisiones-inmobiliarias',
    '/crm-inmobiliario-vs-soypms',
  ]) {
    expect(sitemapContent).toContain(
      `https://soypms-alpha.vercel.app${pathname}`,
    );
  }

  for (const asset of [
    '/manifest.webmanifest',
    '/opengraph-image',
    '/twitter-image',
  ]) {
    expect((await request.get(asset)).ok()).toBe(true);
  }
});

const publicContentPages = [
  {
    heading:
      'Software de operación inmobiliaria para organizar toda la cartera',
    path: '/producto',
  },
  {
    heading: 'Mandatos y expedientes inmobiliarios, unidos a cada propiedad',
    path: '/mandatos-y-expedientes',
  },
  {
    heading: 'Comisiones inmobiliarias con reglas visibles desde el cierre',
    path: '/comisiones-inmobiliarias',
  },
  {
    heading: 'CRM inmobiliario y SoyPMS: dos trabajos distintos',
    path: '/crm-inmobiliario-vs-soypms',
  },
];

for (const publicContentPage of publicContentPages) {
  test(`${publicContentPage.path} exposes semantic content and discovery metadata`, async ({
    page,
  }) => {
    await page.goto(publicContentPage.path);

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: publicContentPage.heading,
      }),
    ).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://soypms-alpha.vercel.app${publicContentPage.path}`,
    );
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(1);

    const breadcrumbSchema = await page
      .locator('script[type="application/ld+json"]')
      .evaluate((element) => JSON.parse(element.textContent ?? '{}'));
    expect(breadcrumbSchema['@type']).toBe('BreadcrumbList');
    expect(breadcrumbSchema.itemListElement).toHaveLength(2);

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);
  });
}

for (const path of ['/login', '/register']) {
  test(`${path} stays outside search indexes`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
  });
}

for (const legalPage of [
  { heading: 'Privacidad', path: '/privacidad' },
  { heading: 'Cookies', path: '/cookies' },
  { heading: 'Términos', path: '/terminos' },
]) {
  test(`${legalPage.path} is an explicit noindex legal draft`, async ({
    page,
  }) => {
    await page.goto(legalPage.path);
    await expect(
      page.getByRole('heading', { level: 1, name: legalPage.heading }),
    ).toBeVisible();
    await expect(page.getByText('Borrador no aprobado')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
  });
}

test('enabled demo form submits consent and attribution without PII in the URL', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_DEMO_FORM_ENABLED !== 'true',
    'Run against a build with NEXT_PUBLIC_DEMO_FORM_ENABLED=true.',
  );

  let submittedPayload: Record<string, unknown> | undefined;
  await page.route('**/api/public/demo-requests', async (route) => {
    const corsHeaders = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': new URL(page.url()).origin,
    };

    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ headers: corsHeaders, status: 204 });
      return;
    }

    submittedPayload = route.request().postDataJSON() as Record<
      string,
      unknown
    >;
    await route.fulfill({
      body: JSON.stringify({
        requestId: '00000000-0000-4000-8000-000000000201',
        status: 'received',
      }),
      contentType: 'application/json',
      headers: corsHeaders,
      status: 201,
    });
  });

  await page.goto(
    '/?utm_source=chatgpt.com&utm_medium=referral&utm_campaign=alpha#demo',
  );
  await page.getByLabel('Nombre').fill('Ada Broker');
  await page.getByLabel('Correo laboral').fill('ada@example.com');
  await page.getByLabel('Empresa').fill('Inmobiliaria Ejemplo');
  await page.getByLabel('País').fill('Panamá');
  await page.getByLabel('Tamaño del equipo').selectOption('TWO_TO_FIVE');
  await page
    .getByLabel('Reto operativo (opcional)')
    .fill('Ordenar expedientes');
  await page.getByLabel(/Acepto que SoyPMS use estos datos/).check();
  await page.getByRole('button', { name: 'Solicitar una demo' }).click();

  await expect(page.getByText(/Solicitud recibida. Referencia:/)).toBeVisible();
  expect(submittedPayload).toMatchObject({
    challenge: 'Ordenar expedientes',
    company: 'Inmobiliaria Ejemplo',
    consent: true,
    country: 'Panamá',
    email: 'ada@example.com',
    name: 'Ada Broker',
    teamSize: 'TWO_TO_FIVE',
    utmCampaign: 'alpha',
    utmMedium: 'referral',
    utmSource: 'chatgpt.com',
  });
  expect(submittedPayload).not.toHaveProperty('consentPolicyVersion');
  expect(page.url()).not.toContain('ada@example.com');
});
