import { expect, test } from '@playwright/test';

test('mandates redirects unauthenticated users without layout overflow', async ({
  page,
}) => {
  await page.goto('/mandates');

  await expect(page).toHaveURL(/\/login\?next=%2Fmandates$/);
  await expect(page.getByRole('heading', { name: 'Ingresar' })).toBeVisible();

  const horizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );

  expect(horizontalOverflow).toBe(false);
});
