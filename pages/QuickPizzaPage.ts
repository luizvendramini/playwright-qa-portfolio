import { expect, Locator, Page } from '@playwright/test';

export class QuickPizzaPage {
  readonly page: Page;
  readonly pizzaPleaseButton: Locator;
  readonly recommendationHeading: Locator;
  readonly advancedToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pizzaPleaseButton = page.locator('button[name="pizza-please"]');
    this.recommendationHeading = page.locator('#pizza-name');
    this.advancedToggle = page.getByRole('checkbox', { name: 'Advanced' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectReady() {
    await expect(
      this.page.getByRole('heading', {
        name: 'Looking to break out of your pizza routine?',
      }),
    ).toBeVisible();
    await expect(this.pizzaPleaseButton).toBeVisible();
  }

  async requestPizza() {
    const responsePromise = this.page.waitForResponse((response) => {
      return new URL(response.url()).pathname === '/api/pizza';
    });
    await this.pizzaPleaseButton.click();
    return responsePromise;
  }
}
