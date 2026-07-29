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
    heading: 'Tu CRM persigue el lead. SoyPMS opera la cartera.',
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
      name: 'Lo que tu CRM no estaba hecho para resolver.',
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
      name: 'Ordena la operación antes de automatizarla.',
    }),
  ).toBeVisible();

  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Ingresar' }).first(),
  ).toHaveAttribute('href', '/login');

  const demoLinks = page.getByRole('link', { name: 'Ver una demo' });
  await expect(demoLinks).toHaveCount(3);
  for (const demoLink of await demoLinks.all()) {
    await expect(demoLink).toHaveAttribute(
      'href',
      'mailto:hola@soypms.com?subject=Quiero%20ver%20una%20demo%20de%20SoyPMS',
    );
  }

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
    .getByRole('link', { name: 'Producto', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#producto$/);

  await expect
    .poll(() =>
      page
        .locator('#producto')
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
