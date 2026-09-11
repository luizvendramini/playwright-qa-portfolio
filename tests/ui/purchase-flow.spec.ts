import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductsPage } from '../../pages/ProductsPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { users, products, checkoutInfo } from '../../utils/test-data';

// Cada teste faz login do zero (independencia entre testes) em vez de
// reaproveitar estado de um teste anterior, evitando efeito cascata caso
// um cenario anterior falhe.
test.beforeEach(async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(users.valid.username, users.valid.password);
});

test.describe('Fluxo de compra', () => {
  test('adicionar produto ao carrinho atualiza o contador', async ({ page }) => {
    const productsPage = new ProductsPage(page);

    await productsPage.addProductToCart(products.keyboard.id);

    await expect(productsPage.cartCount).toContainText('1');
  });

  test('carrinho reflete os itens adicionados e permite remocao', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);

    await productsPage.addProductToCart(products.keyboard.id);
    await productsPage.goToCart();

    await expect(cartPage.cartItem(products.keyboard.id)).toBeVisible();

    await cartPage.removeButton(products.keyboard.id).click();
    await expect(cartPage.emptyCartMessage).toBeVisible();
  });

  test('fluxo completo: login -> adicionar produto -> checkout -> confirmacao', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await productsPage.addProductToCart(products.keyboard.id);
    await productsPage.addProductToCart(products.mouse.id);
    await productsPage.goToCart();

    await expect(cartPage.cartTotal).toBeVisible();
    await cartPage.goToCheckout();

    await checkoutPage.completeOrder(checkoutInfo.valid.fullName, checkoutInfo.valid.postalCode);

    await expect(checkoutPage.orderConfirmation).toContainText(checkoutInfo.valid.fullName);
  });

  test('checkout sem preencher os campos obrigatorios exibe erro', async ({ page }) => {
    const productsPage = new ProductsPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);

    await productsPage.addProductToCart(products.keyboard.id);
    await productsPage.goToCart();
    await cartPage.goToCheckout();

    await checkoutPage.submitButton.click();

    await expect(checkoutPage.errorMessage).toBeVisible();
  });
});
