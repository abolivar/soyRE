import { expect, test, type Page } from '@playwright/test';

const enabled = process.env.LISTING_WORKSPACE_E2E_MUTATING === 'true';
const sessionCookie = process.env.LISTING_WORKSPACE_E2E_COOKIE ?? '';

test.describe('authenticated listing workspace', () => {
  test.skip(
    !enabled,
    'Set LISTING_WORKSPACE_E2E_MUTATING=true to use isolated remote fixtures.',
  );

  test('completes preparation, approval, publication and withdrawal', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    const marker =
      testInfo.project.name === 'chromium-mobile'
        ? (process.env.LISTING_WORKSPACE_E2E_MOBILE_MARKER ?? '')
        : (process.env.LISTING_WORKSPACE_E2E_DESKTOP_MARKER ?? '');
    expect(marker).not.toBe('');
    const separator = sessionCookie.indexOf('=');
    expect(separator).toBeGreaterThan(0);
    await page.context().addCookies([
      {
        name: sessionCookie.slice(0, separator),
        url: String(testInfo.project.use.baseURL),
        value: sessionCookie.slice(separator + 1),
      },
    ]);

    await page.goto('/listings');
    await expect(page).toHaveURL(/\/listings$/);
    await expect(
      page.getByRole('heading', { name: 'Publicaciones', exact: true }),
    ).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: marker });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Ver', exact: true }).click();
    await expect(page.getByText('Preparación completa')).toBeVisible();

    await page
      .getByRole('button', { name: 'Agregar material', exact: true })
      .click();
    await page.getByLabel('Tipo').selectOption('VIDEO_LINK');
    await page.getByLabel('Nombre').fill(`Recorrido ${marker}`);
    await page
      .getByLabel('URL HTTPS')
      .fill(`https://video.example.test/${marker}`);
    await page.locator('button[form="listing-material-form"]').click();
    await expect(page.getByText(`Recorrido ${marker}`)).toBeVisible({
      timeout: 30_000,
    });

    await runAction(page, 'Declarar listo');
    await expect(statusInRow(page, marker, 'Listo')).toBeVisible({
      timeout: 30_000,
    });
    await runAction(page, 'Aprobar');
    await expect(statusInRow(page, marker, 'Aprobado')).toBeVisible({
      timeout: 30_000,
    });
    await runAction(page, 'Publicar');
    await expect(statusInRow(page, marker, 'Publicado')).toBeVisible({
      timeout: 30_000,
    });
    await runAction(page, 'Pausar', 'Pausa E2E controlada.');
    await expect(statusInRow(page, marker, 'Pausado')).toBeVisible({
      timeout: 30_000,
    });
    await runAction(page, 'Reanudar');
    await expect(statusInRow(page, marker, 'Publicado')).toBeVisible({
      timeout: 30_000,
    });
    await runAction(page, 'Retirar', 'Retiro E2E definitivo.');
    await expect(statusInRow(page, marker, 'Retirado')).toBeVisible({
      timeout: 30_000,
    });

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  });
});

async function runAction(page: Page, label: string, reason?: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const submit = page.locator('button[form="listing-action-form"]');
  await expect(submit).toBeVisible();
  if (reason) await page.getByLabel('Motivo').fill(reason);
  await submit.click();
  await expect(submit).toBeHidden({ timeout: 30_000 });
}

function statusInRow(page: Page, marker: string, label: string) {
  return page
    .getByRole('row')
    .filter({ hasText: marker })
    .getByText(label, { exact: true });
}
