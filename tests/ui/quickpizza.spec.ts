import { expect, test } from '@playwright/test';
import { QuickPizzaPage } from '../../pages/QuickPizzaPage';
import { getQuickPizzaToken } from '../../utils/quickpizza-auth';

test.describe('QuickPizza — interface real', () => {
  test('abre a página inicial e apresenta a ação principal', async ({ page }) => {
    const quickPizza = new QuickPizzaPage(page);

    await quickPizza.goto();

    await expect(page).toHaveTitle(/QuickPizza/i);
    await quickPizza.expectReady();
  });

  test('gera e exibe uma recomendação de pizza', async ({ page }) => {
    const quickPizza = new QuickPizzaPage(page);
    await getQuickPizzaToken(page.context().request);
    await quickPizza.goto();
    await quickPizza.expectReady();

    const response = await quickPizza.requestPizza();
    expect(response.ok()).toBeTruthy();

    const recommendation = (await response.json()) as {
      pizza: { name: string; ingredients: unknown[]; dough: { name: string } };
      calories: number;
    };
    expect(recommendation.pizza.name).toBeTruthy();
    expect(recommendation.pizza.ingredients.length).toBeGreaterThan(0);
    expect(recommendation.pizza.dough.name).toBeTruthy();
    expect(recommendation.calories).toBeGreaterThan(0);
    await expect(quickPizza.recommendationHeading).toBeVisible();
    await expect(page.getByRole('button', { name: 'Love it!' })).toBeVisible();
  });
});
