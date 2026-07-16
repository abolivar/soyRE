import { expect, test, type Page } from '@playwright/test';

const enabled = process.env.MANDATE_WORKSPACE_E2E_MUTATING === 'true';
const sessionCookie = process.env.MANDATE_WORKSPACE_E2E_COOKIE ?? '';

test.describe('authenticated mandate workspace', () => {
  test.skip(
    !enabled,
    'Set MANDATE_WORKSPACE_E2E_MUTATING=true to use isolated remote fixtures.',
  );

  test('completes list, detail, evidence, signature and activation', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const marker =
      testInfo.project.name === 'chromium-mobile'
        ? (process.env.MANDATE_WORKSPACE_E2E_MOBILE_MARKER ?? '')
        : (process.env.MANDATE_WORKSPACE_E2E_DESKTOP_MARKER ?? '');
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

    await page.goto('/mandates');
    await expect(page).toHaveURL(/\/mandates$/);
    await expect(
      page.getByRole('heading', { name: 'Mandatos', exact: true }),
    ).toBeVisible();
    const matchingRow = page.getByRole('row').filter({ hasText: marker });
    await expect(matchingRow).toBeVisible();
    await matchingRow.getByRole('button', { name: 'Ver', exact: true }).click();
    await expect(page.getByText('Expediente operativo')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Enviar para firma', exact: true }),
    ).toBeVisible();

    await runAction(page, 'Enviar para firma');
    await expect(statusInRow(page, marker, 'Pendiente de firma')).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByRole('button', { name: 'Agregar evidencia', exact: true })
      .click();
    await page.getByLabel('Nombre').fill(`Mandato firmado ${marker}`);
    await page.getByLabel('Archivo').fill(`${marker}.pdf`);
    await page.getByLabel('Ruta segura').fill(`mandates/e2e/${marker}.pdf`);
    const documentSubmit = page.locator('button[form="mandate-document-form"]');
    await documentSubmit.click();
    await expect(documentSubmit).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText(`Mandato firmado ${marker}`)).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByRole('button', { name: 'Registrar firma', exact: true })
      .click();
    await page
      .getByLabel('Evidencia aprobada')
      .selectOption({ label: `Mandato firmado ${marker}` });
    const signatureSubmit = page.locator('button[form="mandate-action-form"]');
    await signatureSubmit.click();
    await expect(signatureSubmit).toBeHidden({ timeout: 30_000 });
    await expect(statusInRow(page, marker, 'Docs pendientes')).toBeVisible({
      timeout: 30_000,
    });

    await runAction(page, 'Activar');
    await expect(statusInRow(page, marker, 'Activo')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText('Listo para preparación comercial'),
    ).toBeVisible();
    await expect(page.getByText('4 evento(s)')).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
});

async function runAction(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const submit = page.locator('button[form="mandate-action-form"]');
  await expect(submit).toBeVisible();
  await submit.click();
  await expect(submit).toBeHidden({ timeout: 30_000 });
}

function statusInRow(page: Page, marker: string, label: string) {
  return page
    .getByRole('row')
    .filter({ hasText: marker })
    .getByText(label, { exact: true });
}
