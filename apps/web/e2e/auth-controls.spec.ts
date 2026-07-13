import { expect, test } from '@playwright/test';

const authPages = [
  { name: 'login', path: '/login' },
  { name: 'register', path: '/register' },
];

for (const authPage of authPages) {
  test(`${authPage.name} toggles password visibility`, async ({ page }) => {
    await page.goto(authPage.path);

    const passwordInput = page.getByRole('textbox', { name: 'Contraseña' });

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
}
