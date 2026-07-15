import { expect, test } from '@playwright/test';

const protectedDocumentRoutes = [
  '/documents',
  '/businesses/00000000-0000-4000-8000-000000000103/documents?organizationId=00000000-0000-4000-8000-000000000203',
];

for (const path of protectedDocumentRoutes) {
  test(`document route ${path} requires authentication without horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole('heading', { name: 'Ingresar' })).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow-x', 'scroll');

    const horizontalOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(horizontalOverflow).toBe(false);
  });
}
