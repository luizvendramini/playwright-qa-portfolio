import { Page, Locator } from '@playwright/test';

/**
 * Page Object para o carrinho de compras.
 */
export class CartPage {
  readonly page: Page;
  readonly cartTotal: Locator;
  readonly emptyCartMessage: Locator;
  readonly checkoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartTotal = page.getByTestId('cart-total');
    this.emptyCartMessage = page.getByTestId('empty-cart');
    this.checkoutLink = page.getByTestId('checkout-link');
  }

  async goto() {
    await this.page.goto('/cart');
  }

  cartItem(productId: number): Locator {
    return this.page.getByTestId(`cart-item-${productId}`);
  }

  removeButton(productId: number): Locator {
    return this.page.getByTestId(`remove-${productId}`);
  }

  async goToCheckout() {
    await this.checkoutLink.click();
  }
}
