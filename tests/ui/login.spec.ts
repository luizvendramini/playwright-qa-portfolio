import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductsPage } from '../../pages/ProductsPage';
import { users } from '../../utils/test-data';

test.describe('Login', () => {
  test('usuario valido consegue autenticar e acessar o catalogo', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const productsPage = new ProductsPage(page);

    await loginPage.goto();
    await loginPage.login(users.valid.username, users.valid.password);

    await expect(page).toHaveURL(/\/products$/);
    await expect(productsPage.cartCount).toContainText('0');
  });

  test('credenciais invalidas exibem mensagem de erro e mantem o usuario na tela de login', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(users.invalid.username, users.invalid.password);

    await expect(page).toHaveURL(/\/login/);
    await loginPage.expectErrorVisible();
  });

  test('usuario bloqueado nao consegue autenticar', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(users.locked.username, users.locked.password);

    await loginPage.expectErrorVisible();
  });

  test('acesso direto ao catalogo sem sessao redireciona para o login', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/\/login/);
  });
});
