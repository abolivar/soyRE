import { expect, test } from '@playwright/test';

const pages = [
  {
    cta: 'Entrar al workspace',
    heading: 'SoyPMS',
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
    heading: 'Crear organizacion',
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
    await expect(page.getByRole('link', { name: /SoyPMS inicio/ }).first()).toBeVisible();

    const callToAction = page
      .getByRole('button', { name: pageSpec.cta })
      .or(page.getByRole('link', { name: pageSpec.cta }))
      .first();

    await expect(callToAction).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

    expect(horizontalOverflow).toBe(false);

    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`${pageSpec.name}.png`),
    });
  });
}
