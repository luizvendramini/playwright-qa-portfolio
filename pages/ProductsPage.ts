import { Page, Locator } from '@playwright/test';

/**
 * Page Object para o catalogo de produtos.
 */
export class ProductsPage {
  readonly page: Page;
  readonly cartCount: Locator;
  readonly cartLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartCount = page.getByTestId('cart-count');
    this.cartLink = page.getByTestId('nav-cart');
  }

  async goto() {
    await this.page.goto('/products');
  }

  addToCartButton(productId: number): Locator {
    return this.page.getByTestId(`add-to-cart-${productId}`);
  }

  async addProductToCart(productId: number) {
    await this.addToCartButton(productId).click();
  }

  async goToCart() {
    await this.cartLink.click();
  }
}
