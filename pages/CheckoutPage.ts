import { Page, Locator } from '@playwright/test';

/**
 * Page Object para o fluxo de checkout.
 */
export class CheckoutPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly orderConfirmation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.getByTestId('checkout-name');
    this.postalCodeInput = page.getByTestId('checkout-postal');
    this.submitButton = page.getByTestId('checkout-submit');
    this.errorMessage = page.getByTestId('checkout-error');
    this.orderConfirmation = page.getByTestId('order-confirmation');
  }

  async goto() {
    await this.page.goto('/checkout');
  }

  async completeOrder(fullName: string, postalCode: string) {
    await this.nameInput.fill(fullName);
    await this.postalCodeInput.fill(postalCode);
    await this.submitButton.click();
  }
}
