import { expect, test } from '@playwright/test';
import { getQuickPizzaToken } from '../../utils/quickpizza-auth';

test.describe('QuickPizza — API real', () => {
  test('GET /ready confirma que o serviço está pronto', async ({ request }) => {
    const response = await request.get('/ready');

    expect(response.status()).toBe(200);
  });

  test('GET /api/quotes retorna frases da aplicação', async ({ request }) => {
    const response = await request.get('/api/quotes');

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { quotes: string[] };
    expect(body.quotes.length).toBeGreaterThan(0);
    expect(body.quotes.every((quote) => typeof quote === 'string')).toBeTruthy();
  });

  test('catálogos protegidos rejeitam chamadas sem autenticação', async ({ request }) => {
    const response = await request.get('/api/doughs');

    expect(response.status()).toBe(401);
  });

  test('credenciais incorretas não autenticam', async ({ request }) => {
    const response = await request.post('/api/users/token/login', {
      data: {
        username: `invalid-${Date.now()}`,
        password: 'wrong-password',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('usuário autenticado consulta catálogos de ingredientes e massas', async ({ request }) => {
    const token = await getQuickPizzaToken(request);
    const headers = { Authorization: `Token ${token}` };

    const [doughsResponse, ingredientsResponse, toolsResponse] = await Promise.all([
      request.get('/api/doughs', { headers }),
      request.get('/api/ingredients/topping', { headers }),
      request.get('/api/tools', { headers }),
    ]);

    expect(doughsResponse.status()).toBe(200);
    expect(ingredientsResponse.status()).toBe(200);
    expect(toolsResponse.status()).toBe(200);

    const doughs = (await doughsResponse.json()) as { doughs: unknown[] };
    const ingredients = (await ingredientsResponse.json()) as {
      ingredients: unknown[];
    };
    const tools = (await toolsResponse.json()) as { tools: string[] };
    expect(doughs.doughs.length).toBeGreaterThan(0);
    expect(ingredients.ingredients.length).toBeGreaterThan(0);
    expect(tools.tools.length).toBeGreaterThan(0);
  });

  test('usuário autenticado solicita recomendação respeitando restrições', async ({ request }) => {
    const token = await getQuickPizzaToken(request);
    const response = await request.post('/api/pizza', {
      headers: { Authorization: `Token ${token}` },
      data: {
        mustBeVegetarian: true,
        maxCaloriesPerSlice: 800,
        maxNumberOfToppings: 4,
        minNumberOfToppings: 2,
        excludedIngredients: ['anchovies', 'bacon'],
      },
    });

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      pizza: { ingredients: { name: string }[] };
      calories: number;
      vegetarian: boolean;
    };
    expect(body.vegetarian).toBeTruthy();
    expect(body.calories).toBeLessThanOrEqual(800);
    expect(
      body.pizza.ingredients.some((ingredient) =>
        ['anchovies', 'bacon'].includes(ingredient.name.toLowerCase()),
      ),
    ).toBeFalsy();
  });
});
